import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { promises as fs } from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'

export const sigilWebRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
)

export const projectRoot = path.resolve(sigilWebRoot, '..')
export const sigilRoot = path.join(projectRoot, 'sigil')

export async function sleep(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function withTimeout<T>(
  promise: Promise<T>,
  options: {
    description: string
    timeoutMs: number
  },
): Promise<T> {
  let timer: NodeJS.Timeout | null = null

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`timed out waiting for ${options.description}`))
        }, options.timeoutMs)
      }),
    ])
  } finally {
    if (timer != null) {
      clearTimeout(timer)
    }
  }
}

export async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address == null || typeof address === 'string') {
        reject(new Error('failed to resolve ephemeral port'))
        return
      }
      const { port } = address
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve(port)
      })
    })
  })
}

export async function waitFor<T>(
  fn: () => Promise<T | undefined> | T | undefined,
  options: {
    intervalMs?: number
    timeoutMs?: number
    description: string
  },
): Promise<T> {
  const intervalMs = options.intervalMs ?? 100
  const timeoutMs = options.timeoutMs ?? 10_000
  const deadline = Date.now() + timeoutMs

  while (Date.now() <= deadline) {
    const result = await fn()
    if (result !== undefined) {
      return result
    }
    await sleep(intervalMs)
  }

  throw new Error(`timed out waiting for ${options.description}`)
}

export async function ensureCleanDir(dirPath: string) {
  await fs.rm(dirPath, { force: true, recursive: true })
  await fs.mkdir(dirPath, { recursive: true })
}

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function writeJSONFile(filePath: string, value: unknown) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export async function writeTextFile(filePath: string, value: string) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, value, 'utf8')
}

export function sanitizeForPath(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function waitForHTTPReady(
  url: string,
  timeoutMs = 10_000,
  isReady: (statusCode: number) => boolean = (statusCode) => statusCode >= 200 && statusCode < 500,
) {
  await waitFor(
    async () => {
      try {
        const statusCode = await new Promise<number>((resolve, reject) => {
          const request = http.get(url, (response) => {
            response.resume()
            resolve(response.statusCode ?? 0)
          })
          request.on('error', reject)
        })
        if (isReady(statusCode)) {
          return true
        }
      } catch {
        // Keep polling until the server is ready.
      }
      return undefined
    },
    {
      description: `HTTP readiness for ${url}`,
      timeoutMs,
    },
  )
}

export function spawnLoggedProcess(options: {
  command: string
  args: string[]
  cwd: string
  env?: NodeJS.ProcessEnv
  logPath: string
}) {
  const child = spawn(options.command, options.args, {
    cwd: options.cwd,
    env: {
      ...process.env,
      ...options.env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []

  const appendChunk = async (prefix: string, chunk: Buffer) => {
    await fs.appendFile(options.logPath, `${prefix}${chunk.toString('utf8')}`)
  }

  child.stdout.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf8')
    stdoutChunks.push(text)
    void appendChunk('', chunk)
  })
  child.stderr.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf8')
    stderrChunks.push(text)
    void appendChunk('', chunk)
  })

  return {
    child,
    async stop() {
      if (child.exitCode != null) {
        return
      }
      child.kill('SIGTERM')
      try {
        await withTimeout(once(child, 'exit'), {
          description: `${options.command} shutdown`,
          timeoutMs: 5_000,
        })
      } catch {
        child.kill('SIGKILL')
        try {
          await once(child, 'exit')
        } catch {
          // Ignore race during teardown.
        }
      }
    },
    stdout() {
      return stdoutChunks.join('')
    },
    stderr() {
      return stderrChunks.join('')
    },
  }
}
