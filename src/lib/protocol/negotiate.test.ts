import { describe, expect, it } from 'vitest'
import { negotiateAdapter, supportedVersions } from './index'

describe('negotiateAdapter', () => {
  it('returns the registered adapter for supported protocol versions', () => {
    const adapter = negotiateAdapter('sigil.appserver.v1alpha1')

    expect(adapter.version).toBe('sigil.appserver.v1alpha1')
    expect(supportedVersions).toContain('sigil.appserver.v1alpha1')
  })

  it('throws for unsupported protocol versions', () => {
    expect(() => negotiateAdapter('sigil.appserver.v9')).toThrow('unsupported protocol version "sigil.appserver.v9"')
  })
})
