import type { ProtocolAdapter } from '../adapter'
import type {
  EventEnvelopeView,
  InitializeResult,
  RunNodeProjectionView,
  RunProjectionView,
  RunStepSummaryView,
  RunSummaryView,
} from '../current.generated'

export const v1alpha1Adapter: ProtocolAdapter = {
  version: 'sigil.appserver.v1alpha1',
  initializeResult: (raw) => raw as InitializeResult,
  runSummaryView: (raw) => raw as RunSummaryView,
  runProjectionView: (raw) => raw as RunProjectionView,
  runNodeProjectionView: (raw) => raw as RunNodeProjectionView,
  runStepSummaryView: (raw) => raw as RunStepSummaryView,
  eventEnvelopeView: (raw) => raw as EventEnvelopeView,
}
