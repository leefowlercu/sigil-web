#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

function printUsage() {
  console.log(`Usage:
  pnpm test:acceptance
  pnpm test:acceptance -- "Scenario name"
  pnpm test:acceptance -- --name "Scenario name"
  pnpm test:acceptance:headed -- "Scenario name"
  pnpm test:acceptance:review -- "Scenario name"

Options:
  --headed   Run agent-browser in headed mode
  --review   Run headed with default visual-review pauses
  --step-delay-ms <n>
             Pause after user-like browser actions
  --scenario-pause-ms <n>
             Pause before scenario teardown
  --help     Show this help text

Any additional cucumber-js flags are forwarded through.`)
}

const rawArgs = process.argv.slice(2)
const forwardedArgs = []
const positionalArgs = []
let headed = false
let review = false
let scenarioPauseMs = null
let stepDelayMs = null

for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index]
  if (arg === '--help' || arg === '-h') {
    printUsage()
    process.exit(0)
  }
  if (arg === '--headed') {
    headed = true
    continue
  }
  if (arg === '--review') {
    review = true
    continue
  }
  if (arg === '--step-delay-ms') {
    stepDelayMs = rawArgs[index + 1] ?? ''
    index += 1
    continue
  }
  if (arg === '--scenario-pause-ms') {
    scenarioPauseMs = rawArgs[index + 1] ?? ''
    index += 1
    continue
  }
  if (arg.startsWith('-')) {
    forwardedArgs.push(arg)
    const nextArg = rawArgs[index + 1]
    if (arg === '--name' && nextArg != null && !nextArg.startsWith('-')) {
      forwardedArgs.push(nextArg)
      index += 1
    }
    continue
  }
  positionalArgs.push(arg)
}

const cucumberArgs = ['--config', 'acceptance/cucumber.mjs', '--exit']
if (!forwardedArgs.includes('--name') && positionalArgs.length > 0) {
  cucumberArgs.push('--name', positionalArgs.join(' '))
}
cucumberArgs.push(...forwardedArgs)

if (review) {
  headed = true
}

const reviewEnv = {}
if (review) {
  reviewEnv.AGENT_BROWSER_STEP_DELAY_MS = process.env.AGENT_BROWSER_STEP_DELAY_MS ?? '500'
  reviewEnv.AGENT_BROWSER_SCENARIO_PAUSE_MS = process.env.AGENT_BROWSER_SCENARIO_PAUSE_MS ?? '2500'
}
if (stepDelayMs != null) {
  reviewEnv.AGENT_BROWSER_STEP_DELAY_MS = stepDelayMs
}
if (scenarioPauseMs != null) {
  reviewEnv.AGENT_BROWSER_SCENARIO_PAUSE_MS = scenarioPauseMs
}

const result = spawnSync(
  'node',
  ['--import', 'tsx', './node_modules/@cucumber/cucumber/bin/cucumber-js', ...cucumberArgs],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...reviewEnv,
      ...(headed ? { AGENT_BROWSER_HEADED: 'true' } : {}),
    },
    stdio: 'inherit',
  },
)

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
