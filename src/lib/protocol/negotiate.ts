import type { ProtocolAdapter } from './adapter'
import { v1alpha1Adapter } from './adapters/v1alpha1'

const adapterRegistry: Partial<Record<string, ProtocolAdapter>> = {
  'sigil.appserver.v1alpha1': v1alpha1Adapter,
}

export const supportedVersions = Object.keys(adapterRegistry)

export function negotiateAdapter(serverVersion: string): ProtocolAdapter {
  const adapter = adapterRegistry[serverVersion]
  if (!adapter) {
    throw new Error(
      `unsupported protocol version "${serverVersion}"; supported: ${supportedVersions.join(', ')}`,
    )
  }
  return adapter
}
