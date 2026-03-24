import type {
  EventEnvelopeView,
  InitializeResult,
  RunNodeProjectionView,
  RunProjectionView,
  RunStepSummaryView,
  RunSummaryView,
} from './current.generated'

export interface ProtocolAdapter {
  version: string
  initializeResult: (raw: unknown) => InitializeResult
  runSummaryView: (raw: unknown) => RunSummaryView
  runProjectionView: (raw: unknown) => RunProjectionView
  runNodeProjectionView: (raw: unknown) => RunNodeProjectionView
  runStepSummaryView: (raw: unknown) => RunStepSummaryView
  eventEnvelopeView: (raw: unknown) => EventEnvelopeView
}
