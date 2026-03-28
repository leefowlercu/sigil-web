import { World, setWorldConstructor } from '@cucumber/cucumber'
import type { IWorldOptions } from '@cucumber/cucumber'
import type { AgentBrowserSession } from './agent-browser'
import { MockSigilAppServer } from './mock-app-server'
import { ensureWebApp } from './web-app'

export class SigilWebWorld extends World {
  artifactDir = ''
  browser!: AgentBrowserSession
  rememberedRunName: string | null = null
  mockServer: MockSigilAppServer | null = null

  constructor(options: IWorldOptions) {
    super(options)
  }

  async ensureMockServer() {
    if (this.mockServer == null) {
      this.mockServer = new MockSigilAppServer()
      await this.mockServer.start()
    }
    return this.mockServer
  }

  async openDemo(path: string) {
    const baseUrl = await ensureWebApp('demo')
    await this.browser.open(`${baseUrl}${path}`)
  }

  async openLive(path: string) {
    const baseUrl = await ensureWebApp('live')
    await this.ensureMockServer()
    await this.browser.open(`${baseUrl}${path}`)
  }

  async cleanup() {
    if (this.mockServer) {
      await this.mockServer.stop()
      this.mockServer = null
    }
    if (this.browser) {
      await this.browser.close()
    }
  }
}

setWorldConstructor(SigilWebWorld)
