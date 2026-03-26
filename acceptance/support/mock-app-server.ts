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
  revision: number
  runSummary: RunSummaryView
  steps: RunStepSummaryView[]
  tree: RunTreeReadPayload
}

export class MockSigilAppServer {
  private readonly heartbeatIntervalMs = 100
  private readonly heartbeatTimers = new Map<WebSocket, NodeJS.Timeout>()
  private heartbeatsEnabled = true
  private readonly httpServer = createServer()
  private lastSeq = 0
  private port = 0
  private readonly state: FixtureState = {
    events: createLiveRunEvents(),
    projection: createLiveRunProjection('running'),
    revision: 1,
    runSummary: createLiveRunSummary('running'),
    steps: createLiveRunSteps('running'),
    tree: createLiveRunTree('running'),
  }
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

  pauseHeartbeats() {
    this.heartbeatsEnabled = false
    for (const socket of this.wss.clients) {
      this.stopHeartbeat(socket)
    }
  }

  resumeHeartbeats() {
    this.heartbeatsEnabled = true
    for (const socket of this.wss.clients) {
      this.startHeartbeats(socket)
    }
  }

  completeRun() {
    this.state.runSummary = createLiveRunSummary('completed')
    this.state.projection = createLiveRunProjection('completed')
    this.state.tree = createLiveRunTree('completed')
    this.state.steps = createLiveRunSteps('completed')
    this.state.revision += 1
    this.lastSeq += 1

    this.broadcast({
      jsonrpc: '2.0',
      method: 'runs/changed',
      params: {
        revision: this.state.revision,
        payload: {
          kind: 'upsert',
          run: this.state.runSummary,
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
        this.reply(socket, message.id, createInitializeResult())
        return
      case 'runs/list':
        this.reply(socket, message.id, {
          payload: {
            items: [this.state.runSummary],
          },
        })
        return
      case 'runs/subscribe':
        this.reply(socket, message.id, {
          payload: {
            items: [this.state.runSummary],
            revision: this.state.revision,
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
      case 'run/read':
        this.reply(socket, message.id, {
          runId: LIVE_RUN_ID,
          asOfSeq: this.lastSeq,
          payload: {
            run: this.state.projection,
          },
        })
        return
      case 'run/tree/read':
        this.reply(socket, message.id, {
          runId: LIVE_RUN_ID,
          asOfSeq: this.lastSeq,
          payload: this.state.tree,
        })
        return
      case 'run/steps/list':
        this.reply(socket, message.id, {
          runId: LIVE_RUN_ID,
          asOfSeq: this.lastSeq,
          payload: {
            steps: this.state.steps,
          },
        })
        return
      case 'run/events/read':
        this.reply(socket, message.id, {
          runId: LIVE_RUN_ID,
          payload: {
            firstSeq: this.state.events[0]?.seq,
            lastSeq: this.state.events.at(-1)?.seq,
            events: this.state.events,
          },
        })
        return
      case 'run/subscribe':
        this.reply(socket, message.id, {
          runId: LIVE_RUN_ID,
          snapshotAsOfSeq: this.lastSeq,
          payload: {
            snapshot: {
              run: this.state.projection,
              tree: this.state.tree,
              activeNodeId: this.state.projection.nodes[0]?.nodeId,
              activeStepId: this.state.steps[0]?.stepId,
              terminal: this.state.projection.state === 'completed',
            },
            replayEvents: [],
            terminal: this.state.projection.state === 'completed',
          },
        })
        return
      case 'run/unsubscribe':
        this.reply(socket, message.id, {
          runId: LIVE_RUN_ID,
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
        this.reply(socket, message.id, {
          error: {
            code: -32601,
            message: `unknown method ${message.method}`,
          },
        })
    }
  }

  private reply(socket: WebSocket, id: string, result: unknown) {
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        result,
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
