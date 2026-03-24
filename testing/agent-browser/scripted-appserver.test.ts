import { afterEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import {
  createLiveTimelineScenario,
  LIVE_TIMELINE_FINAL_SEQ,
  LIVE_TIMELINE_INITIAL_SEQ,
  LIVE_TIMELINE_RUN_ID,
} from './fixtures/live-timeline.ts'
import { PROTOCOL_VERSION } from '../../src/lib/protocol/current.generated.ts'
import { createScriptedConnectionController } from './scripted-appserver.ts'
import { JSONRPCWebSocketClient } from './rpc-client.ts'
import { waitFor } from './utils.ts'

const controllers: Array<
  Awaited<ReturnType<typeof createScriptedConnectionController>>
> = []
const clients: JSONRPCWebSocketClient[] = []
const sockets: WebSocket[] = []

async function startController() {
  const controller = await createScriptedConnectionController({
    artifactDir: '/tmp/sigil-web-agent-browser-tests',
    scenario: createLiveTimelineScenario(),
  })
  controllers.push(controller)
  await controller.start()
  return controller
}

async function startHarness() {
  const controller = await startController()
  const client = new JSONRPCWebSocketClient(controller.endpoint)
  clients.push(client)
  await client.connect()
  await waitFor(
    () =>
      controller
        .getReceivedRequests()
        .some((entry) => entry.method === 'initialized')
        ? true
        : undefined,
    {
      description: 'client initialized notification',
      timeoutMs: 1_000,
    },
  )

  return { client, controller }
}

async function openRawSocket(endpoint: string): Promise<WebSocket> {
  const socket = new WebSocket(endpoint)
  sockets.push(socket)
  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve())
    socket.once('error', reject)
  })
  return socket
}

async function readSocketJSON<T>(socket: WebSocket): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      socket.off('close', handleClose)
      socket.off('error', handleError)
      socket.off('message', handleMessage)
    }

    const handleClose = () => {
      cleanup()
      reject(new Error('socket closed before receiving a message'))
    }

    const handleError = (error: Error) => {
      cleanup()
      reject(error)
    }

    const handleMessage = (data: WebSocket.RawData) => {
      cleanup()
      try {
        const raw = typeof data === 'string' ? data : data.toString('utf8')
        resolve(JSON.parse(raw) as T)
      } catch (error) {
        reject(error)
      }
    }

    socket.once('close', handleClose)
    socket.once('error', handleError)
    socket.once('message', handleMessage)
  })
}

afterEach(async () => {
  while (clients.length > 0) {
    const client = clients.pop()
    if (client) {
      await client.close().catch(() => undefined)
    }
  }
  while (sockets.length > 0) {
    const socket = sockets.pop()
    if (socket) {
      await new Promise<void>((resolve) => {
        if (
          socket.readyState === WebSocket.CLOSING ||
          socket.readyState === WebSocket.CLOSED
        ) {
          resolve()
          return
        }
        socket.once('close', () => resolve())
        socket.close()
      }).catch(() => undefined)
    }
  }
  while (controllers.length > 0) {
    const controller = controllers.pop()
    if (controller) {
      await controller.close().catch(() => undefined)
    }
  }
})

describe('scripted app-server controller', () => {
  it('requires initialize and initialized before serving requests', async () => {
    const controller = await startController()
    const socket = await openRawSocket(controller.endpoint)

    socket.send(
      JSON.stringify({ jsonrpc: '2.0', method: 'initialized', params: {} }),
    )
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'pre-init',
        method: 'run/list',
        params: { limit: 100 },
      }),
    )
    const preInitError = await readSocketJSON<{
      id: string
      error: { data?: { code?: string } }
    }>(socket)
    expect(preInitError).toMatchObject({
      id: 'pre-init',
      error: { data: { code: 'handshake_required' } },
    })

    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'init',
        method: 'initialize',
        params: {
          protocolVersions: [PROTOCOL_VERSION],
          client: {
            name: 'sigil-web-agent-browser',
            version: '0.1.0',
          },
        },
      }),
    )
    const initializeResponse = await readSocketJSON<{
      id: string
      result: { protocolVersion: string }
    }>(socket)
    expect(initializeResponse).toMatchObject({
      id: 'init',
      result: { protocolVersion: PROTOCOL_VERSION },
    })

    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'pre-ready',
        method: 'run/list',
        params: { limit: 100 },
      }),
    )
    const preReadyError = await readSocketJSON<{
      id: string
      error: { data?: { code?: string } }
    }>(socket)
    expect(preReadyError).toMatchObject({
      id: 'pre-ready',
      error: { data: { code: 'initialized_required' } },
    })

    socket.send(
      JSON.stringify({ jsonrpc: '2.0', method: 'initialized', params: {} }),
    )
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'ready',
        method: 'run/list',
        params: { limit: 100 },
      }),
    )
    const readyResponse = await readSocketJSON<{
      id: string
      result: { payload: { items: Array<{ runId: string }> } }
    }>(socket)
    expect(readyResponse).toMatchObject({
      id: 'ready',
      result: { payload: { items: [{ runId: LIVE_TIMELINE_RUN_ID }] } },
    })
  })

  it('routes read requests with the current run snapshot', async () => {
    const { client } = await startHarness()

    const runList = await client.request<{
      payload: { items: Array<{ runId: string }> }
    }>('run/list', { limit: 100 })
    expect(runList.payload.items.map((item) => item.runId)).toEqual([
      LIVE_TIMELINE_RUN_ID,
    ])

    const runRead = await client.request<{
      asOfSeq: number
      payload: { run: { state: string } }
    }>('run/read', {
      runId: LIVE_TIMELINE_RUN_ID,
    })
    expect(runRead.asOfSeq).toBe(LIVE_TIMELINE_INITIAL_SEQ)
    expect(runRead.payload.run.state).toBe('running')

    const eventsRead = await client.request<{
      payload: { events: Array<{ seq: number }> }
    }>('run/events/read', {
      runId: LIVE_TIMELINE_RUN_ID,
    })
    expect(eventsRead.payload.events.at(-1)?.seq).toBe(
      LIVE_TIMELINE_INITIAL_SEQ,
    )
  })

  it('advances scheduled notifications in order and replays afterSeq windows', async () => {
    const { client, controller } = await startHarness()
    const notifications: string[] = []
    const unsubscribe = client.subscribeNotifications((notification) => {
      notifications.push(notification.method)
    })

    await client.request('run/subscribe', { runId: LIVE_TIMELINE_RUN_ID })
    await controller.advance(3000)

    await waitFor(
      () =>
        notifications.filter((method) => method === 'run/eventAppended')
          .length === 3
          ? true
          : undefined,
      {
        description: 'three appended notifications',
        timeoutMs: 1_000,
      },
    )

    const replay = await client.request<{
      payload: { replayEvents: Array<{ seq: number }> }
    }>('run/subscribe', {
      runId: LIVE_TIMELINE_RUN_ID,
      afterSeq: 8,
    })
    expect(replay.payload.replayEvents.map((event) => event.seq)).toEqual([9])
    unsubscribe()
  })

  it('pauses and resumes heartbeat emissions under manual advancement', async () => {
    const { client, controller } = await startHarness()
    const notifications: string[] = []
    client.subscribeNotifications((notification) => {
      notifications.push(notification.method)
    })

    await controller.advance(1000)
    await waitFor(
      () => (notifications.includes('server/heartbeat') ? true : undefined),
      {
        description: 'heartbeat notification',
        timeoutMs: 1_000,
      },
    )

    controller.pauseHeartbeats()
    notifications.length = 0
    await controller.advance(3000)
    expect(notifications).not.toContain('server/heartbeat')

    controller.resumeHeartbeats()
    await controller.advance(1000)
    await waitFor(
      () => (notifications.includes('server/heartbeat') ? true : undefined),
      {
        description: 'resumed heartbeat notification',
        timeoutMs: 1_000,
      },
    )
  })

  it('replaces duplicate subscriptions and only delivers each event once', async () => {
    const { client, controller } = await startHarness()
    const deliveredSeqs: number[] = []
    client.subscribeNotifications((notification) => {
      if (notification.method !== 'run/eventAppended') {
        return
      }
      const seq = (notification.params as { seq?: number }).seq
      if (typeof seq === 'number') {
        deliveredSeqs.push(seq)
      }
    })

    await client.request('run/subscribe', { runId: LIVE_TIMELINE_RUN_ID })
    await client.request('run/subscribe', {
      runId: LIVE_TIMELINE_RUN_ID,
      afterSeq: LIVE_TIMELINE_INITIAL_SEQ,
    })
    await controller.advance(1000)

    await waitFor(() => (deliveredSeqs.length === 1 ? true : undefined), {
      description: 'single duplicate-subscription delivery',
      timeoutMs: 1_000,
    })
    expect(deliveredSeqs).toEqual([7])
  })

  it('leaves the connection unsubscribed after an invalid resume cursor', async () => {
    const { client, controller } = await startHarness()
    const deliveredSeqs: number[] = []
    client.subscribeNotifications((notification) => {
      if (notification.method !== 'run/eventAppended') {
        return
      }
      const event = (
        notification.params as { payload?: { event?: { seq?: number } } }
      ).payload?.event
      if (typeof event?.seq === 'number') {
        deliveredSeqs.push(event.seq)
      }
    })

    await expect(
      client.request('run/subscribe', {
        runId: LIVE_TIMELINE_RUN_ID,
        afterSeq: LIVE_TIMELINE_FINAL_SEQ + 1,
      }),
    ).rejects.toMatchObject({
      errorObject: { data: { code: 'invalid_resume_cursor' } },
    })

    await controller.advance(1000)
    await new Promise((resolve) => setTimeout(resolve, 25))

    expect(deliveredSeqs).toEqual([])
  })

  it('records malformed notifications without breaking the transcript stream', async () => {
    const { controller } = await startHarness()

    await controller.emitMalformedNotification('not-json')

    const transcript = controller.getTranscript()
    expect(transcript.some((entry) => entry.payload === 'not-json')).toBe(true)
  })

  it('keeps separate controllers isolated for multi-agent flows', async () => {
    const first = await startHarness()
    const secondController = await createScriptedConnectionController({
      artifactDir: '/tmp/sigil-web-agent-browser-tests-2',
      scenario: createLiveTimelineScenario(),
    })
    controllers.push(secondController)
    await secondController.start()
    const secondClient = new JSONRPCWebSocketClient(secondController.endpoint)
    clients.push(secondClient)
    await secondClient.connect()

    await first.client.request('run/list', { limit: 100 })
    await secondClient.request('run/list', { limit: 100 })

    expect(first.controller.getReceivedRequests().length).toBeGreaterThan(0)
    expect(secondController.getReceivedRequests().length).toBeGreaterThan(0)
    expect(first.controller.endpoint).not.toBe(secondController.endpoint)
  })

  it('surfaces terminal run state after the final scheduled frame', async () => {
    const { client, controller } = await startHarness()

    await client.request('run/subscribe', { runId: LIVE_TIMELINE_RUN_ID })
    await controller.advance(4000)

    const read = await client.request<{
      asOfSeq: number
      payload: { run: { state: string } }
    }>('run/read', {
      runId: LIVE_TIMELINE_RUN_ID,
    })
    expect(read.asOfSeq).toBe(LIVE_TIMELINE_FINAL_SEQ)
    expect(read.payload.run.state).toBe('completed')
  })
})
