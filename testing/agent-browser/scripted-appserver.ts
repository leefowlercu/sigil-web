import { promises as fs } from 'node:fs'
import path from 'node:path'
import { WebSocketServer } from 'ws'
import type { WebSocket } from 'ws'
import { findFreePort, writeJSONFile, writeTextFile } from './utils.ts'
import type {
  JsonRPCErrorEnvelope,
  JsonRPCNotificationEnvelope,
  JsonRPCRequestEnvelope,
  JsonRPCSuccessEnvelope,
  ScriptedAppServerScenario,
  ScriptedConnectionController,
  ScriptedRequestLogEntry,
  ScriptedRunFixture,
  ScriptedServerFrame,
  ScriptedTranscriptEntry,
} from './types.ts'

type ScriptedRunState = {
  currentSeq: number
}

type ConnectionRecord = {
  connectionID: number
  initialized: boolean
  ready: boolean
  socket: WebSocket
  subscriptions: Map<string, { attachedSeq: number }>
}

const websocketPath = '/app-server'

function errorEnvelope(
  id: string,
  code: number,
  message: string,
  domainCode: string,
): JsonRPCErrorEnvelope {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data: {
        code: domainCode,
      },
    },
  }
}

function successEnvelope(id: string, result: unknown): JsonRPCSuccessEnvelope {
  return {
    jsonrpc: '2.0',
    id,
    result,
  }
}

function normalizeData(data: unknown): string {
  if (typeof data === 'string') {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf8')
  }
  if (Array.isArray(data)) {
    return Buffer.concat(data as Buffer[]).toString('utf8')
  }
  return Buffer.from(data as Buffer).toString('utf8')
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null
}

function runFixtureByID(
  scenario: ScriptedAppServerScenario,
  runId: string,
): ScriptedRunFixture | null {
  return scenario.runs.find((run) => run.runId === runId) ?? null
}

function runIDFromParams(params: unknown): string | null {
  const record = objectRecord(params)
  return typeof record?.runId === 'string' ? record.runId : null
}

export async function createScriptedConnectionController(options: {
  artifactDir: string
  scenario: ScriptedAppServerScenario
}): Promise<ScriptedConnectionController> {
  const port = await findFreePort()
  const endpoint = `ws://127.0.0.1:${port}${websocketPath}`

  let currentTimeMs = 0
  let heartbeatPaused = false
  let nextConnectionID = 1
  let nextHeartbeatAtMs = options.scenario.heartbeatIntervalMs
  let scheduledCursor = 0
  let server: WebSocketServer | null = null

  const connections = new Map<WebSocket, ConnectionRecord>()
  const requestLog: ScriptedRequestLogEntry[] = []
  const transcript: ScriptedTranscriptEntry[] = []
  const runStates = new Map<string, ScriptedRunState>(
    options.scenario.runs.map((run) => [
      run.runId,
      {
        currentSeq: run.initialSeq,
      },
    ]),
  )

  const scheduledFrames = options.scenario.runs
    .flatMap((run) =>
      run.scheduled.map((scheduled, index) => ({
        ...scheduled,
        order: index,
        runId: run.runId,
      })),
    )
    .sort(
      (left, right) =>
        left.atMs - right.atMs ||
        left.runId.localeCompare(right.runId) ||
        left.order - right.order,
    )

  async function appendTranscript(
    connectionID: number,
    direction: 'inbound' | 'outbound',
    payload: unknown,
  ) {
    transcript.push({
      atMs: currentTimeMs,
      connectionID,
      direction,
      payload,
    })
  }

  function stateForRun(runId: string) {
    const fixture = runFixtureByID(options.scenario, runId)
    if (fixture == null) {
      return null
    }
    const state = runStates.get(runId)
    return fixture.stateAtSeq(state?.currentSeq ?? fixture.initialSeq)
  }

  function sendMessage(connection: ConnectionRecord, payload: unknown) {
    if (connection.socket.readyState !== connection.socket.OPEN) {
      return
    }
    void appendTranscript(connection.connectionID, 'outbound', payload)
    connection.socket.send(JSON.stringify(payload))
  }

  function emitToMatchingConnections(frame: ScriptedServerFrame) {
    if (frame.kind === 'raw') {
      for (const connection of connections.values()) {
        if (!connection.ready) {
          continue
        }
        void appendTranscript(connection.connectionID, 'outbound', frame.raw)
        connection.socket.send(frame.raw)
      }
      return
    }

    const notification: JsonRPCNotificationEnvelope = {
      jsonrpc: '2.0',
      method: frame.method,
      params: frame.params,
    }

    const runId = runIDFromParams(frame.params)
    for (const connection of connections.values()) {
      if (!connection.ready) {
        continue
      }
      if (runId != null && !connection.subscriptions.has(runId)) {
        continue
      }
      sendMessage(connection, notification)
    }
  }

  function updateRunStateForFrame(frame: ScriptedServerFrame) {
    if (frame.kind !== 'notification') {
      return
    }

    const params = objectRecord(frame.params)
    const runId = runIDFromParams(frame.params)
    if (runId == null) {
      return
    }
    const state = runStates.get(runId)
    if (state == null) {
      return
    }

    if (frame.method === 'run/eventAppended') {
      const payload = objectRecord(params?.payload)
      const event = objectRecord(payload?.event)
      const seq = typeof event?.seq === 'number' ? event.seq : undefined
      if (seq != null) {
        state.currentSeq = Math.max(state.currentSeq, seq)
      }
      return
    }

    if (
      frame.method === 'run/statusChanged' ||
      frame.method === 'run/completed' ||
      frame.method === 'run/started'
    ) {
      const seq = typeof params?.seq === 'number' ? params.seq : undefined
      if (seq != null) {
        state.currentSeq = Math.max(state.currentSeq, seq)
      }
    }
  }

  function heartbeatNotification(): JsonRPCNotificationEnvelope {
    return {
      jsonrpc: '2.0',
      method: 'server/heartbeat',
      params: {
        instanceId: options.scenario.server.instanceId,
        serverTime: new Date(
          Date.parse('2026-03-22T18:00:00Z') + currentTimeMs,
        ).toISOString(),
        heartbeatIntervalMs: options.scenario.heartbeatIntervalMs,
      },
    }
  }

  function emitHeartbeat() {
    const heartbeat = heartbeatNotification()
    for (const connection of connections.values()) {
      if (!connection.ready) {
        continue
      }
      sendMessage(connection, heartbeat)
    }
  }

  async function emitFrames(frames: ScriptedServerFrame[]) {
    for (const frame of frames) {
      updateRunStateForFrame(frame)
      emitToMatchingConnections(frame)
    }
  }

  async function disconnectAll() {
    for (const connection of connections.values()) {
      connection.socket.close()
    }
  }

  async function handleRequest(
    connection: ConnectionRecord,
    request: JsonRPCRequestEnvelope,
  ) {
    const { id, method, params } = request

    if (method === 'initialize') {
      if (connection.initialized) {
        sendMessage(
          connection,
          errorEnvelope(
            id,
            -32600,
            'connection already initialized',
            'already_initialized',
          ),
        )
        return
      }
      connection.initialized = true
      sendMessage(connection, successEnvelope(id, options.scenario.server))
      return
    }

    if (!connection.initialized) {
      sendMessage(
        connection,
        errorEnvelope(
          id,
          -32600,
          'initialize is required before other requests',
          'handshake_required',
        ),
      )
      return
    }

    if (!connection.ready) {
      sendMessage(
        connection,
        errorEnvelope(
          id,
          -32600,
          'initialized notification is required before other requests',
          'initialized_required',
        ),
      )
      return
    }

    if (method === 'server/ping') {
      sendMessage(
        connection,
        successEnvelope(id, {
          serverName: options.scenario.server.serverName,
          serverVersion: options.scenario.server.serverVersion,
          instanceId: options.scenario.server.instanceId,
          protocolVersion: options.scenario.server.protocolVersion,
          serverTime: new Date(
            Date.parse('2026-03-22T18:00:00Z') + currentTimeMs,
          ).toISOString(),
        }),
      )
      return
    }

    switch (method) {
      case 'run/list': {
        const items = options.scenario.runs.map((run) => {
          const snapshot = stateForRun(run.runId)
          if (snapshot == null) {
            throw new Error(`missing run snapshot for ${run.runId}`)
          }
          return snapshot.summary
        })
        sendMessage(
          connection,
          successEnvelope(id, {
            payload: {
              items,
            },
          }),
        )
        return
      }

      case 'run/read':
      case 'run/tree/read':
      case 'run/steps/list':
      case 'run/events/read':
      case 'run/subscribe':
      case 'run/unsubscribe': {
        const runId = runIDFromParams(params)
        if (runId == null) {
          sendMessage(
            connection,
            errorEnvelope(id, -32602, 'runId is required', 'invalid_params'),
          )
          return
        }
        const snapshot = stateForRun(runId)
        if (snapshot == null) {
          sendMessage(
            connection,
            errorEnvelope(id, -32602, 'run not found', 'run_not_found'),
          )
          return
        }

        if (method === 'run/read') {
          sendMessage(
            connection,
            successEnvelope(id, {
              runId,
              asOfSeq: snapshot.events.at(-1)?.seq ?? 0,
              payload: {
                run: snapshot.projection,
              },
            }),
          )
          return
        }

        if (method === 'run/tree/read') {
          sendMessage(
            connection,
            successEnvelope(id, {
              runId,
              asOfSeq: snapshot.events.at(-1)?.seq ?? 0,
              payload: snapshot.tree,
            }),
          )
          return
        }

        if (method === 'run/steps/list') {
          sendMessage(
            connection,
            successEnvelope(id, {
              runId,
              asOfSeq: snapshot.events.at(-1)?.seq ?? 0,
              payload: {
                steps: snapshot.steps,
              },
            }),
          )
          return
        }

        if (method === 'run/events/read') {
          sendMessage(
            connection,
            successEnvelope(id, {
              runId,
              payload: {
                firstSeq: snapshot.events[0]?.seq,
                lastSeq: snapshot.events.at(-1)?.seq,
                events: snapshot.events,
              },
            }),
          )
          return
        }

        if (method === 'run/unsubscribe') {
          connection.subscriptions.delete(runId)
          sendMessage(
            connection,
            successEnvelope(id, {
              runId,
              payload: {
                unsubscribed: true,
              },
            }),
          )
          return
        }

        const paramsRecord = objectRecord(params)
        const afterSeq =
          typeof paramsRecord?.afterSeq === 'number'
            ? paramsRecord.afterSeq
            : undefined
        if (afterSeq == null) {
          connection.subscriptions.set(runId, {
            attachedSeq: snapshot.events.at(-1)?.seq ?? 0,
          })
          sendMessage(
            connection,
            successEnvelope(id, {
              runId,
              snapshotAsOfSeq: snapshot.events.at(-1)?.seq ?? 0,
              payload: {
                snapshot: {
                  run: snapshot.projection,
                  tree: snapshot.tree,
                  terminal: snapshot.terminal,
                },
                terminal: snapshot.terminal,
              },
            }),
          )
          return
        }

        if (afterSeq > (snapshot.events.at(-1)?.seq ?? 0)) {
          sendMessage(
            connection,
            errorEnvelope(
              id,
              -32602,
              'afterSeq exceeds run watermark',
              'invalid_resume_cursor',
            ),
          )
          return
        }

        connection.subscriptions.set(runId, {
          attachedSeq: snapshot.events.at(-1)?.seq ?? 0,
        })
        sendMessage(
          connection,
          successEnvelope(id, {
            runId,
            snapshotAsOfSeq: snapshot.events.at(-1)?.seq ?? 0,
            payload: {
              replayEvents: snapshot.events.filter(
                (event) => event.seq > afterSeq,
              ),
              terminal: snapshot.terminal,
            },
          }),
        )
        return
      }

      default:
        sendMessage(
          connection,
          errorEnvelope(id, -32601, 'method not found', 'method_not_found'),
        )
    }
  }

  return {
    endpoint,
    scenario: options.scenario,
    async start() {
      if (server != null) {
        return
      }
      await fs.mkdir(options.artifactDir, { recursive: true })
      server = new WebSocketServer({
        host: '127.0.0.1',
        path: websocketPath,
        port,
      })

      await new Promise<void>((resolve, reject) => {
        server?.once('listening', () => resolve())
        server?.once('error', reject)
      })

      server.on('connection', (socket) => {
        const connection: ConnectionRecord = {
          connectionID: nextConnectionID++,
          initialized: false,
          ready: false,
          socket,
          subscriptions: new Map(),
        }
        connections.set(socket, connection)

        socket.on('close', () => {
          connections.delete(socket)
        })

        socket.on('message', (data) => {
          const raw = normalizeData(data)
          let parsed: unknown
          try {
            parsed = JSON.parse(raw)
          } catch {
            requestLog.push({
              atMs: currentTimeMs,
              connectionID: connection.connectionID,
              raw,
            })
            void appendTranscript(connection.connectionID, 'inbound', raw)
            return
          }

          requestLog.push({
            atMs: currentTimeMs,
            connectionID: connection.connectionID,
            id:
              parsed != null &&
              typeof parsed === 'object' &&
              typeof (parsed as { id?: unknown }).id === 'string'
                ? (parsed as { id: string }).id
                : undefined,
            method:
              parsed != null &&
              typeof parsed === 'object' &&
              typeof (parsed as { method?: unknown }).method === 'string'
                ? (parsed as { method: string }).method
                : undefined,
            params:
              parsed != null &&
              typeof parsed === 'object' &&
              'params' in (parsed as Record<string, unknown>)
                ? (parsed as { params?: unknown }).params
                : undefined,
            raw: parsed,
          })
          void appendTranscript(connection.connectionID, 'inbound', parsed)

          if (parsed == null || typeof parsed !== 'object') {
            return
          }

          const notification = parsed as Partial<JsonRPCNotificationEnvelope>
          if (
            typeof notification.method === 'string' &&
            typeof (parsed as Partial<JsonRPCRequestEnvelope>).id !== 'string'
          ) {
            if (notification.method === 'initialized') {
              if (connection.initialized && !connection.ready) {
                connection.ready = true
              }
            }
            return
          }

          const request = parsed as Partial<JsonRPCRequestEnvelope>
          if (
            typeof request.id !== 'string' ||
            typeof request.method !== 'string'
          ) {
            return
          }
          void handleRequest(connection, request)
        })
      })
    },
    async advance(ms: number) {
      const targetTimeMs = currentTimeMs + ms
      for (;;) {
        const nextScheduledAtMs =
          scheduledCursor < scheduledFrames.length
            ? scheduledFrames[scheduledCursor].atMs
            : Number.POSITIVE_INFINITY
        const nextDueAtMs = Math.min(
          nextScheduledAtMs,
          heartbeatPaused ? Number.POSITIVE_INFINITY : nextHeartbeatAtMs,
        )
        if (!Number.isFinite(nextDueAtMs) || nextDueAtMs > targetTimeMs) {
          break
        }
        currentTimeMs = nextDueAtMs
        if (!heartbeatPaused && nextHeartbeatAtMs === currentTimeMs) {
          emitHeartbeat()
          nextHeartbeatAtMs += options.scenario.heartbeatIntervalMs
        }
        while (scheduledFrames[scheduledCursor]?.atMs === currentTimeMs) {
          await emitFrames(scheduledFrames[scheduledCursor].frames)
          scheduledCursor++
        }
      }
      currentTimeMs = targetTimeMs
    },
    async emit(...frames: ScriptedServerFrame[]) {
      await emitFrames(frames)
    },
    async emitMalformedNotification(raw: string) {
      await emitFrames([{ kind: 'raw', raw }])
    },
    pauseHeartbeats() {
      heartbeatPaused = true
    },
    resumeHeartbeats() {
      if (!heartbeatPaused) {
        return
      }
      heartbeatPaused = false
      nextHeartbeatAtMs = currentTimeMs + options.scenario.heartbeatIntervalMs
    },
    async disconnect() {
      await disconnectAll()
    },
    getReceivedRequests() {
      return [...requestLog]
    },
    getTranscript() {
      return [...transcript]
    },
    async writeArtifacts() {
      await writeJSONFile(
        path.join(options.artifactDir, 'scripted-controller-scenario.json'),
        options.scenario,
      )
      await writeJSONFile(
        path.join(options.artifactDir, 'scripted-controller-requests.json'),
        requestLog,
      )
      await writeJSONFile(
        path.join(options.artifactDir, 'scripted-controller-transcript.json'),
        transcript,
      )
      await writeTextFile(
        path.join(options.artifactDir, 'scripted-controller-endpoint.txt'),
        `${endpoint}\n`,
      )
    },
    async close() {
      await disconnectAll()
      if (server == null) {
        return
      }
      const currentServer = server
      server = null
      await new Promise<void>((resolve, reject) => {
        currentServer.close((error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })
    },
  }
}
