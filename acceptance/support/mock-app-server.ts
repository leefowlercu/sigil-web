import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebSocketServer } from 'ws'
import type { WebSocket } from 'ws'
import type {
  EventEnvelopeView,
  RunProjectionView,
  RunStepSummaryView,
  RunSummaryView,
  RunTreeReadPayload,
} from '#/lib/protocol'
import { parseRunConfigMetadataFromYaml } from '#/lib/run-config'
import {
  LIVE_AGENT_INSTANCE_ID,
  LIVE_RUN_ID,
  createInitializeResult,
  createLiveRunEvents,
  createLiveRunProjection,
  createLiveRunSteps,
  createLiveRunSummary,
  createLiveRunTree,
} from '#/test-fixtures/live-session'

type JsonRpcMessage = {
  id?: string
  jsonrpc?: string
  method?: string
  params?: unknown
}

type FixtureState = {
  events: EventEnvelopeView[]
  projection: RunProjectionView
  runSummary: RunSummaryView
  steps: RunStepSummaryView[]
  tree: RunTreeReadPayload
}

type JsonRpcError = {
  code: number
  data?: Record<string, unknown>
  message: string
}

function createDefaultFixtureState(state: 'running' | 'completed'): FixtureState {
  return {
    events: createLiveRunEvents(),
    projection: createLiveRunProjection(state),
    runSummary: createLiveRunSummary(state),
    steps: createLiveRunSteps(state),
    tree: createLiveRunTree(state),
  }
}

function createStartedRunFixture(runId: string, name: string, maxDepth: number): FixtureState {
  const queuedAt = new Date().toISOString()
  const rootNodeId = `${runId}-root`
  const projection: RunProjectionView = {
    runId,
    name,
    state: 'running',
    runDir: `/tmp/sigil-web-live/runs/${runId}`,
    eventsPath: `/tmp/sigil-web-live/runs/${runId}/events.jsonl`,
    source: 'app-server.fixture',
    queuedAt,
    startedAt: queuedAt,
    executor: 'fixture',
    maxDepth,
    pidStatus: 'current',
    stopRequested: false,
    nodeCount: 1,
    stepCount: 0,
    actionCount: 0,
    subcallCount: 0,
    nodes: [
      {
        nodeId: rootNodeId,
        depth: 0,
        role: 'root',
        state: 'running',
        startedAt: queuedAt,
        stepCount: 0,
      },
    ],
  }

  return {
    events: [],
    projection,
    runSummary: {
      runId,
      name,
      state: 'running',
      source: 'app-server.fixture',
      queuedAt,
      startedAt: queuedAt,
      eventsPath: projection.eventsPath,
      pidStatus: 'current',
      stopRequested: false,
    },
    steps: [],
    tree: {
      rootNodeId,
      nodes: projection.nodes,
    },
  }
}

function readRunID(params: unknown): string | null {
  if (params == null || typeof params !== 'object' || Array.isArray(params)) {
    return null
  }

  const runId = (params as Record<string, unknown>).runId
  return typeof runId === 'string' && runId.length > 0 ? runId : null
}

function readRunConfigYAML(params: unknown): string | null {
  if (params == null || typeof params !== 'object' || Array.isArray(params)) {
    return null
  }

  const runConfigYaml = (params as Record<string, unknown>).runConfigYaml
  return typeof runConfigYaml === 'string' ? runConfigYaml : null
}

function sortRunsNewestFirst(runs: RunSummaryView[]): RunSummaryView[] {
  return [...runs].sort((left, right) => {
    const leftTime = left.queuedAt ?? left.startedAt ?? left.terminalAt ?? ''
    const rightTime = right.queuedAt ?? right.startedAt ?? right.terminalAt ?? ''
    if (leftTime === rightTime) {
      return right.runId.localeCompare(left.runId)
    }
    return rightTime.localeCompare(leftTime)
  })
}

export class MockSigilAppServer {
  private readonly heartbeatIntervalMs = 100
  private readonly heartbeatTimers = new Map<WebSocket, NodeJS.Timeout>()
  private heartbeatsEnabled = true
  private readonly httpServer = createServer()
  private initializePaused = false
  private latestStartedRunID: string | null = null
  private lastSeq = 0
  private nextStartedRunOrdinal = 2
  private readonly pendingInitializeReplies: Array<{ id: string; socket: WebSocket }> = []
  private port = 0
  private readonly runFixtures = new Map<string, FixtureState>([[LIVE_RUN_ID, createDefaultFixtureState('running')]])
  private runsRevision = 1
  private readonly wss = new WebSocketServer({ noServer: true })

  constructor() {
    this.httpServer.on('upgrade', (request, socket, head) => {
      if (request.url !== '/app-server') {
        socket.destroy()
        return
      }
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws)
      })
    })

    this.wss.on('connection', (socket) => {
      socket.on('message', (raw) => {
        void this.handleMessage(socket, String(raw))
      })
      socket.on('close', () => {
        this.stopHeartbeat(socket)
      })
    })
  }

  async start() {
    await new Promise<void>((resolve) => {
      this.httpServer.listen(0, '127.0.0.1', () => resolve())
    })
    this.port = (this.httpServer.address() as AddressInfo).port
  }

  async stop() {
    for (const socket of this.wss.clients) {
      this.stopHeartbeat(socket)
      socket.close()
    }
    this.pendingInitializeReplies.length = 0
    await new Promise<void>((resolve) => {
      this.wss.close(() => resolve())
    })
    await new Promise<void>((resolve) => {
      this.httpServer.close(() => resolve())
    })
  }

  endpoint(): string {
    return `ws://127.0.0.1:${this.port}/app-server`
  }

  latestStartedRunId(): string | null {
    return this.latestStartedRunID
  }

  pauseHeartbeats() {
    this.heartbeatsEnabled = false
    for (const socket of this.wss.clients) {
      this.stopHeartbeat(socket)
    }
  }

  pauseInitializeResponses() {
    this.initializePaused = true
  }

  resumeHeartbeats() {
    this.heartbeatsEnabled = true
    for (const socket of this.wss.clients) {
      this.startHeartbeats(socket)
    }
  }

  resumeInitializeResponses() {
    this.initializePaused = false
    const pendingReplies = this.pendingInitializeReplies.splice(0)
    for (const pending of pendingReplies) {
      this.reply(pending.socket, pending.id, createInitializeResult())
    }
  }

  completeRun() {
    const completedFixture = createDefaultFixtureState('completed')
    this.runFixtures.set(LIVE_RUN_ID, completedFixture)
    this.runsRevision += 1
    this.lastSeq += 1

    this.broadcast({
      jsonrpc: '2.0',
      method: 'runs/changed',
      params: {
        revision: this.runsRevision,
        payload: {
          kind: 'upsert',
          run: completedFixture.runSummary,
        },
      },
    })
    this.broadcast({
      jsonrpc: '2.0',
      method: 'run/statusChanged',
      params: {
        runId: LIVE_RUN_ID,
        seq: this.lastSeq,
        payload: {
          state: 'completed',
          terminal: true,
        },
      },
    })
    this.broadcast({
      jsonrpc: '2.0',
      method: 'run/completed',
      params: {
        runId: LIVE_RUN_ID,
        seq: this.lastSeq,
        payload: {
          state: 'completed',
          terminal: true,
        },
      },
    })
  }

  private broadcast(message: object) {
    const encoded = JSON.stringify(message)
    for (const socket of this.wss.clients) {
      if (socket.readyState === 1) {
        socket.send(encoded)
      }
    }
  }

  private fixtureForRun(runId: string | null): FixtureState | null {
    if (runId == null) {
      return null
    }
    return this.runFixtures.get(runId) ?? null
  }

  private listRunSummaries(): RunSummaryView[] {
    return sortRunsNewestFirst([...this.runFixtures.values()].map((fixture) => fixture.runSummary))
  }

  private async handleMessage(socket: WebSocket, raw: string) {
    const message = JSON.parse(raw) as JsonRpcMessage
    if (!message.id || !message.method) {
      if (message.method === 'initialized') {
        this.startHeartbeats(socket)
      }
      return
    }

    switch (message.method) {
      case 'initialize':
        if (this.initializePaused) {
          this.pendingInitializeReplies.push({ id: message.id, socket })
          return
        }
        this.reply(socket, message.id, createInitializeResult())
        return
      case 'runs/list':
        this.reply(socket, message.id, {
          payload: {
            items: this.listRunSummaries(),
          },
        })
        return
      case 'runs/subscribe':
        this.reply(socket, message.id, {
          payload: {
            items: this.listRunSummaries(),
            revision: this.runsRevision,
          },
        })
        return
      case 'runs/unsubscribe':
        this.reply(socket, message.id, {
          payload: {
            unsubscribed: true,
          },
        })
        return
      case 'run/read': {
        const fixture = this.fixtureForRun(readRunID(message.params))
        if (fixture == null) {
          this.replyError(socket, message.id, {
            code: -32602,
            message: 'run not found',
          })
          return
        }

        this.reply(socket, message.id, {
          runId: fixture.projection.runId,
          asOfSeq: this.lastSeq,
          payload: {
            run: fixture.projection,
          },
        })
        return
      }
      case 'run/tree/read': {
        const fixture = this.fixtureForRun(readRunID(message.params))
        if (fixture == null) {
          this.replyError(socket, message.id, {
            code: -32602,
            message: 'run not found',
          })
          return
        }

        this.reply(socket, message.id, {
          runId: fixture.projection.runId,
          asOfSeq: this.lastSeq,
          payload: fixture.tree,
        })
        return
      }
      case 'run/steps/list': {
        const fixture = this.fixtureForRun(readRunID(message.params))
        if (fixture == null) {
          this.replyError(socket, message.id, {
            code: -32602,
            message: 'run not found',
          })
          return
        }

        this.reply(socket, message.id, {
          runId: fixture.projection.runId,
          asOfSeq: this.lastSeq,
          payload: {
            steps: fixture.steps,
          },
        })
        return
      }
      case 'run/events/read': {
        const fixture = this.fixtureForRun(readRunID(message.params))
        if (fixture == null) {
          this.replyError(socket, message.id, {
            code: -32602,
            message: 'run not found',
          })
          return
        }

        this.reply(socket, message.id, {
          runId: fixture.projection.runId,
          payload: {
            firstSeq: fixture.events[0]?.seq,
            lastSeq: fixture.events.at(-1)?.seq,
            events: fixture.events,
          },
        })
        return
      }
      case 'run/subscribe': {
        const fixture = this.fixtureForRun(readRunID(message.params))
        if (fixture == null) {
          this.replyError(socket, message.id, {
            code: -32602,
            message: 'run not found',
          })
          return
        }

        this.reply(socket, message.id, {
          runId: fixture.projection.runId,
          snapshotAsOfSeq: this.lastSeq,
          payload: {
            snapshot: {
              run: fixture.projection,
              tree: fixture.tree,
              activeNodeId: fixture.projection.nodes[0]?.nodeId,
              activeStepId: fixture.steps[0]?.stepId,
              terminal: fixture.projection.state === 'completed',
            },
            replayEvents: [],
            terminal: fixture.projection.state === 'completed',
          },
        })
        return
      }
      case 'run/start': {
        const runConfigYaml = readRunConfigYAML(message.params)
        const metadata = runConfigYaml == null ? null : parseRunConfigMetadataFromYaml(runConfigYaml)
        if (metadata == null) {
          this.replyError(socket, message.id, {
            code: -32602,
            message: 'invalid run config yaml',
            data: {
              error: 'invalid run config yaml',
            },
          })
          return
        }

        const runId = `019d2000-0000-7000-8000-${String(this.nextStartedRunOrdinal).padStart(12, '0')}`
        this.nextStartedRunOrdinal += 1
        this.latestStartedRunID = runId

        const fixture = createStartedRunFixture(runId, metadata.name, metadata.maxDepth)
        this.runFixtures.set(runId, fixture)
        this.runsRevision += 1
        this.lastSeq += 1

        this.reply(socket, message.id, {
          runId,
          asOfSeq: this.lastSeq,
          payload: {
            run: fixture.projection,
          },
        })

        this.broadcast({
          jsonrpc: '2.0',
          method: 'run/started',
          params: {
            runId,
            seq: this.lastSeq,
            payload: {
              run: fixture.projection,
            },
          },
        })
        this.broadcast({
          jsonrpc: '2.0',
          method: 'runs/changed',
          params: {
            revision: this.runsRevision,
            payload: {
              kind: 'upsert',
              run: fixture.runSummary,
            },
          },
        })
        return
      }
      case 'run/unsubscribe':
        this.reply(socket, message.id, {
          payload: {
            unsubscribed: true,
          },
        })
        return
      case 'server/ping':
        this.reply(socket, message.id, {
          serverName: 'sigil',
          protocolVersion: createInitializeResult().protocolVersion,
        })
        return
      default:
        this.replyError(socket, message.id, {
          code: -32601,
          message: `unknown method ${message.method}`,
        })
    }
  }

  private reply(socket: WebSocket, id: string, result: unknown) {
    if (socket.readyState !== 1) {
      return
    }
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        result,
      }),
    )
  }

  private replyError(socket: WebSocket, id: string, error: JsonRpcError) {
    if (socket.readyState !== 1) {
      return
    }
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        error,
      }),
    )
  }

  private sendHeartbeat(socket: WebSocket) {
    if (socket.readyState !== 1 || !this.heartbeatsEnabled) {
      return
    }
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'server/heartbeat',
        params: {
          instanceId: LIVE_AGENT_INSTANCE_ID,
          serverTime: new Date().toISOString(),
          heartbeatIntervalMs: this.heartbeatIntervalMs,
        },
      }),
    )
  }

  private startHeartbeats(socket: WebSocket) {
    this.stopHeartbeat(socket)
    if (!this.heartbeatsEnabled) {
      return
    }
    this.sendHeartbeat(socket)
    const timer = setInterval(() => {
      this.sendHeartbeat(socket)
    }, this.heartbeatIntervalMs)
    this.heartbeatTimers.set(socket, timer)
  }

  private stopHeartbeat(socket: WebSocket) {
    const timer = this.heartbeatTimers.get(socket)
    if (timer == null) {
      return
    }
    clearInterval(timer)
    this.heartbeatTimers.delete(socket)
  }
}
