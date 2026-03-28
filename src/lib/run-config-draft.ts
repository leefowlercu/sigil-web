import { buildRunConfigYaml, createDefaultRunConfigFormValues } from './run-config'
import type { RunConfigFormValues } from './run-config'

export type RunConfigDraftState = {
  formValues: RunConfigFormValues
  generatedYaml: string
  yamlMode: 'generated' | 'manual'
  yamlText: string
}

export type RunConfigDraftAction =
  | {
      type: 'FORM_UPDATED'
      formValues: RunConfigFormValues
    }
  | {
      type: 'RESET'
      formValues?: RunConfigFormValues
    }
  | {
      type: 'RESET_YAML_FROM_FORM'
    }
  | {
      type: 'YAML_UPDATED'
      yamlText: string
    }

export function createRunConfigDraftState(formValues = createDefaultRunConfigFormValues()): RunConfigDraftState {
  const generatedYaml = buildRunConfigYaml(formValues)
  return {
    formValues,
    generatedYaml,
    yamlMode: 'generated',
    yamlText: generatedYaml,
  }
}

export function runConfigDraftReducer(state: RunConfigDraftState, action: RunConfigDraftAction): RunConfigDraftState {
  switch (action.type) {
    case 'RESET':
      return createRunConfigDraftState(action.formValues ?? createDefaultRunConfigFormValues())

    case 'FORM_UPDATED': {
      const generatedYaml = buildRunConfigYaml(action.formValues)
      return {
        formValues: action.formValues,
        generatedYaml,
        yamlMode: state.yamlMode,
        yamlText: state.yamlMode === 'manual' ? state.yamlText : generatedYaml,
      }
    }

    case 'YAML_UPDATED':
      return {
        ...state,
        yamlMode: 'manual',
        yamlText: action.yamlText,
      }

    case 'RESET_YAML_FROM_FORM':
      return {
        ...state,
        yamlMode: 'generated',
        yamlText: state.generatedYaml,
      }
  }
}
