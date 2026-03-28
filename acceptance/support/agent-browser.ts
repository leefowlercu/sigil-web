import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { AGENT_BROWSER_SOCKET_DIR, SIGIL_WEB_ROOT } from './paths'

const execFileAsync = promisify(execFile)
const agentBrowserBin = process.env.AGENT_BROWSER_BIN || 'agent-browser'
const agentBrowserStepDelayMs = parseDelayMs(process.env.AGENT_BROWSER_STEP_DELAY_MS)

function parseDelayMs(value: string | undefined): number {
  if (value == null || value.trim().length === 0) {
    return 0
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function pause(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

function shouldPauseAfterCommand(command: string): boolean {
  return new Set([
    'back',
    'check',
    'click',
    'dblclick',
    'drag',
    'fill',
    'focus',
    'forward',
    'hover',
    'keyboard',
    'open',
    'press',
    'reload',
    'scroll',
    'scrollintoview',
    'select',
    'type',
    'uncheck',
    'upload',
  ]).has(command)
}

export function hasAcceptanceReviewDelay() {
  return agentBrowserStepDelayMs > 0
}

export async function pauseBetweenReviewSteps() {
  if (agentBrowserStepDelayMs < 1) {
    return
  }

  await pause(agentBrowserStepDelayMs)
}

export async function assertAgentBrowserAvailable() {
  await execFileAsync(agentBrowserBin, ['--version'], {
    cwd: SIGIL_WEB_ROOT,
  })
}

export async function closeAllAgentBrowserSessions() {
  try {
    await execFileAsync(agentBrowserBin, ['close', '--all'], {
      cwd: SIGIL_WEB_ROOT,
      env: {
        ...process.env,
        AGENT_BROWSER_SOCKET_DIR,
      },
      timeout: 5_000,
    })
  } catch {
    // Best effort cleanup only.
  }
}

export class AgentBrowserSession {
  private readonly artifactDir: string
  private readonly sessionName: string

  constructor(sessionName: string, artifactDir: string) {
    this.sessionName = sessionName
    this.artifactDir = artifactDir
  }

  async captureDiagnostics(prefix: string) {
    await mkdir(this.artifactDir, { recursive: true })
    const snapshotPath = join(this.artifactDir, `${prefix}.snapshot.txt`)
    const screenshotPath = join(this.artifactDir, `${prefix}.png`)
    await writeFile(snapshotPath, await this.snapshotInteractive(), 'utf8')
    await this.screenshot(screenshotPath)
  }

  async click(selector: string) {
    await this.run(['click', selector])
  }

  async close() {
    await this.run(['close'], { allowFailure: true, timeoutMs: 5_000 })
  }

  async fill(selector: string, value: string) {
    await this.run(['fill', selector, value])
  }

  async getCount(selector: string): Promise<number> {
    return Number.parseInt((await this.run(['get', 'count', selector])).trim(), 10)
  }

  async getAttr(selector: string, name: string): Promise<string> {
    return (await this.run(['get', 'attr', selector, name])).trim()
  }

  async getText(selector: string): Promise<string> {
    return (await this.run(['get', 'text', selector])).trim()
  }

  async getUrl(): Promise<string> {
    return (await this.run(['get', 'url'])).trim()
  }

  async getValue(selector: string): Promise<string> {
    return (await this.run(['get', 'value', selector])).trim()
  }

  async open(url: string) {
    await this.run(['open', url])
    await this.run(['wait', '--load', 'networkidle'])
  }

  async select(selector: string, value: string) {
    await this.run(['select', selector, value])
  }

  async screenshot(path: string) {
    await this.run(['screenshot', path])
  }

  async snapshotInteractive(): Promise<string> {
    return this.run(['snapshot', '-i'])
  }

  async waitForSelector(selector: string) {
    await this.run(['wait', selector])
  }

  private async run(args: string[], options?: { allowFailure?: boolean; timeoutMs?: number }): Promise<string> {
    try {
      const { stdout } = await execFileAsync(agentBrowserBin, ['--session', this.sessionName, ...args], {
        cwd: SIGIL_WEB_ROOT,
        env: {
          ...process.env,
          AGENT_BROWSER_SOCKET_DIR,
          AGENT_BROWSER_SESSION: this.sessionName,
        },
        maxBuffer: 10_000_000,
        timeout: options?.timeoutMs ?? 15_000,
      })
      if (shouldPauseAfterCommand(args[0] ?? '')) {
        await pauseBetweenReviewSteps()
      }
      return stdout
    } catch (error) {
      if (options?.allowFailure) {
        return ''
      }
      if (error instanceof Error) {
        throw new Error(`agent-browser ${args.join(' ')} failed: ${error.message}`)
      }
      throw error
    }
  }
}
