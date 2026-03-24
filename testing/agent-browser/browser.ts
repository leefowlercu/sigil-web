import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import type { AgentBrowserSession, AgentBrowserSnapshot } from './types.ts'

type AgentBrowserResponse<T> = {
  success: boolean
  data: T
  error: string | null
}

function agentBrowserBinPath() {
  return path.join(
    path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..'),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'agent-browser.cmd' : 'agent-browser',
  )
}

async function execAgentBrowser(
  sessionName: string,
  args: string[],
  stdin?: string,
): Promise<string> {
  const commandLogLine = `${agentBrowserBinPath()} --session ${sessionName} ${args.join(' ')}`
  const child = spawn(
    agentBrowserBinPath(),
    ['--session', sessionName, ...args],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )

  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []

  child.stdout.on('data', (chunk: Buffer) => {
    stdoutChunks.push(chunk.toString('utf8'))
  })
  child.stderr.on('data', (chunk: Buffer) => {
    stderrChunks.push(chunk.toString('utf8'))
  })

  if (stdin != null) {
    child.stdin.write(stdin)
  }
  child.stdin.end()

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code) => resolve(code ?? 1))
  })

  const stdout = stdoutChunks.join('').trim()
  const stderr = stderrChunks.join('').trim()
  if (exitCode !== 0) {
    throw new Error(
      `agent-browser command failed (${commandLogLine})\nstdout:\n${stdout}\nstderr:\n${stderr}`,
    )
  }

  return stdout
}

export function createAgentBrowserSession(
  sessionName: string,
): AgentBrowserSession {
  const commandLog: string[] = []

  async function run(args: string[], stdin?: string) {
    const logLine = `agent-browser --session ${sessionName} ${args.join(' ')}`
    commandLog.push(logLine)
    return execAgentBrowser(sessionName, args, stdin)
  }

  return {
    async close() {
      await run(['close'])
    },
    async click(ref: string) {
      await run(['click', ref])
    },
    commandLog() {
      return [...commandLog]
    },
    async evalJSON<T>(script: string) {
      const output = await run(['eval', '--stdin'], script)
      return JSON.parse(output) as T
    },
    async fill(ref: string, value: string) {
      await run(['fill', ref, value])
    },
    async open(url: string) {
      await run(['open', url])
    },
    async saveCommandLog(filePath: string) {
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, `${commandLog.join('\n')}\n`, 'utf8')
    },
    async screenshot(filePath: string) {
      await run(['screenshot', filePath])
    },
    async snapshotInteractive() {
      const output = await run(['snapshot', '-i', '--json'])
      const parsed = JSON.parse(
        output,
      ) as AgentBrowserResponse<AgentBrowserSnapshot>
      if (!parsed.success) {
        throw new Error(parsed.error ?? 'agent-browser snapshot failed')
      }
      return parsed.data
    },
    async wait(value: number | string) {
      await run(['wait', String(value)])
    },
    async waitForLoad(state = 'networkidle') {
      await run(['wait', '--load', state])
    },
  }
}
