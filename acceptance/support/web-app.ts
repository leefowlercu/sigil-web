import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { SIGIL_WEB_ROOT, TMP_ROOT } from './paths'

export type AppMode = 'demo' | 'live'

type ManagedWebApp = {
  baseUrl: string
  logPath: string
  logStream: ReturnType<typeof createWriteStream>
  mode: AppMode
  process: ReturnType<typeof spawn>
}

let currentWebApp: ManagedWebApp | null = null

async function reservePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address == null || typeof address === 'string') {
        server.close(() => reject(new Error('failed to reserve a loopback port')))
        return
      }
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve(address.port)
      })
    })
  })
}

async function isHealthy(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(baseUrl, {
      signal: AbortSignal.timeout(1_000),
    })
    return response.ok
  } catch {
    return false
  }
}

async function waitForUrl(baseUrl: string, timeoutMs = 30_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (currentWebApp?.process.exitCode != null) {
      throw new Error(`sigil-web ${currentWebApp.mode} server exited early; see ${currentWebApp.logPath}`)
    }
    if (await isHealthy(baseUrl)) {
      return
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 250)
    })
  }
  throw new Error(`Timed out waiting for sigil-web server at ${baseUrl}`)
}

async function runVpCommand(
  args: string[],
  logStream: ReturnType<typeof createWriteStream>,
  mode: AppMode,
  logPath: string,
) {
  const child = spawn('pnpm', ['exec', 'vp', ...args], {
    cwd: SIGIL_WEB_ROOT,
    env: {
      ...process.env,
      NO_COLOR: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout?.pipe(logStream, { end: false })
  child.stderr?.pipe(logStream, { end: false })

  await new Promise<void>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`sigil-web ${mode} ${args[0]} exited with code ${code}; see ${logPath}`))
    })
  })
}

async function stopCurrentWebApp() {
  if (currentWebApp == null) {
    return
  }

  const active = currentWebApp
  currentWebApp = null
  active.process.kill('SIGTERM')

  await Promise.race([
    new Promise<void>((resolve) => {
      active.process.once('exit', () => resolve())
    }),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        active.process.kill('SIGKILL')
        resolve()
      }, 5_000)
    }),
  ])

  active.logStream.end()
}

export async function ensureWebApp(mode: AppMode) {
  if (currentWebApp?.mode === mode && (await isHealthy(currentWebApp.baseUrl))) {
    return currentWebApp.baseUrl
  }

  await stopCurrentWebApp()
  await mkdir(TMP_ROOT, { recursive: true })

  const port = await reservePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const logPath = join(TMP_ROOT, `web-app-${mode}.log`)
  const logStream = createWriteStream(logPath, { flags: 'w' })
  await runVpCommand(['build', ...(mode === 'demo' ? ['--mode', 'demo'] : [])], logStream, mode, logPath)
  const child = spawn(
    'pnpm',
    ['exec', 'vp', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: SIGIL_WEB_ROOT,
      env: {
        ...process.env,
        NO_COLOR: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  child.stdout?.pipe(logStream)
  child.stderr?.pipe(logStream)
  currentWebApp = {
    baseUrl,
    logPath,
    logStream,
    mode,
    process: child,
  }

  await waitForUrl(baseUrl)
  return baseUrl
}

export async function stopManagedWebApp() {
  await stopCurrentWebApp()
}
