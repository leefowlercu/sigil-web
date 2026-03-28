import { describe, expect, it } from 'vitest'
import { runConfigDraftReducer, createRunConfigDraftState } from './run-config-draft'

describe('runConfigDraftReducer', () => {
  it('regenerates yaml from form edits while yaml stays generated', () => {
    const initialState = createRunConfigDraftState()

    const nextState = runConfigDraftReducer(initialState, {
      type: 'FORM_UPDATED',
      formValues: {
        ...initialState.formValues,
        prompt: 'Summarize the operator request.',
      },
    })

    expect(nextState.yamlMode).toBe('generated')
    expect(nextState.yamlText).toContain('prompt: Summarize the operator request.')
  })

  it('preserves manual yaml edits when later form changes arrive', () => {
    const initialState = createRunConfigDraftState()
    const manualState = runConfigDraftReducer(initialState, {
      type: 'YAML_UPDATED',
      yamlText: 'name: manual-run\nprompt: from yaml\ncontext: raw\n',
    })

    const nextState = runConfigDraftReducer(manualState, {
      type: 'FORM_UPDATED',
      formValues: {
        ...manualState.formValues,
        prompt: 'Form prompt should not win.',
      },
    })

    expect(nextState.yamlMode).toBe('manual')
    expect(nextState.yamlText).toBe('name: manual-run\nprompt: from yaml\ncontext: raw\n')
    expect(nextState.generatedYaml).toContain('prompt: Form prompt should not win.')
  })

  it('restores generated yaml when manual yaml is reset', () => {
    const initialState = createRunConfigDraftState()
    const manualState = runConfigDraftReducer(initialState, {
      type: 'YAML_UPDATED',
      yamlText: 'name: manual-run\nprompt: from yaml\ncontext: raw\n',
    })

    const nextState = runConfigDraftReducer(manualState, {
      type: 'RESET_YAML_FROM_FORM',
    })

    expect(nextState.yamlMode).toBe('generated')
    expect(nextState.yamlText).toBe(nextState.generatedYaml)
  })
})
