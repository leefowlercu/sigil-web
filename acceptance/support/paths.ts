import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const supportDir = dirname(fileURLToPath(import.meta.url))

export const ACCEPTANCE_ROOT = resolve(supportDir, '..')
export const SIGIL_WEB_ROOT = resolve(ACCEPTANCE_ROOT, '..')
export const TMP_ROOT = resolve(ACCEPTANCE_ROOT, '.tmp')
export const AGENT_BROWSER_SOCKET_DIR = '/tmp/sigil-web-ab'

export function sanitizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
