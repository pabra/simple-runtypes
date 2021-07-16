import { st } from './helpers'

describe('toSchema', () => {
  it('works with impure string', () => {
    const runtype = st.string({ trim: true })
    window.console.log(
      'runtype.schema in impure tests:',
      (runtype as any).schema,
    ) // TODO: remove DEBUG

    expect(st.toSchema(runtype)).toBe('string')
  })

  it('does not work with pure string', () => {
    const runtype = st.string()
    window.console.log('runtype.schema in pure tests:', (runtype as any).schema) // TODO: remove DEBUG

    expect(st.toSchema(runtype)).toBe('string')
  })
})
