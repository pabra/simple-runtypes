import { st } from './helpers'

describe('toSchema', () => {
  it('should work with any', () => {
    const runtype = st.any()
    expect(st.toSchema(runtype)).toBe('any')
  })

  it('should work with array', () => {
    const strArr = st.array(st.string())
    const boolArr = st.array(st.boolean())

    expect(st.toSchema(strArr)).toBe('string[]')
    expect(st.toSchema(boolArr)).toBe('boolean[]')
  })

  it('should work with boolean', () => {
    const runtype = st.boolean()
    expect(st.toSchema(runtype)).toBe('boolean')
  })

  it('should work with custom', () => {
    const runtype = st.runtype((v) => v)
    expect(st.toSchema(runtype)).toBe('any')
  })

  it('should work with dictionary', () => {
    const runtype = st.dictionary(st.string(), st.boolean())
    expect(st.toSchema(runtype)).toBe('Record<string, boolean>')
  })

  it('should work with enum', () => {
    const runtype = st.enum({ '1': 'one', 2: 'two' })
    expect(st.toSchema(runtype)).toBe('"1" | "2"')
  })

  it('should work with guardedBy', () => {
    const runtype = st.guardedBy((v): v is boolean => !!v)
    expect(st.toSchema(runtype)).toBe('any')
  })

  it('should work with ignore', () => {
    const runtype = st.ignore()
    expect(st.toSchema(runtype)).toBe('any')
  })

  it('should work with integer', () => {
    const runtype = st.integer()
    const minRuntype = st.integer({ min: 1 })

    expect(st.toSchema(runtype)).toBe('number')
    expect(st.toSchema(minRuntype)).toBe('number')
  })

  it('should work with json', () => {
    const runtype = st.json(st.array(st.integer()))
    expect(st.toSchema(runtype)).toBe('string')
  })

  it('should work with literal', () => {
    const abcRt = st.literal('abc')
    const oneRt = st.literal(1)
    const falseRt = st.literal(false)
    expect(st.toSchema(abcRt)).toBe('"abc"')
    expect(st.toSchema(oneRt)).toBe('1')
    expect(st.toSchema(falseRt)).toBe('false')
  })

  it('should work with record', () => {
    const runtype = st.record({ a: st.string() })
    expect(st.toSchema(runtype)).toBe(
      [
        // force multi line
        '{',
        '  a: string;',
        '}',
      ].join('\n'),
    )
  })

  it('should work with sloppy record', () => {
    const runtype = st.sloppyRecord({ a: st.string() })
    expect(st.toSchema(runtype)).toBe(
      [
        // force multi line
        '{',
        '  a: string;',
        '}',
      ].join('\n'),
    )
  })

  it('should work with string', () => {
    const impureRuntype = st.string({ trim: true })
    const pureRuntype = st.string()

    expect(st.toSchema(impureRuntype)).toBe('string')
    expect(st.toSchema(pureRuntype)).toBe('string')
  })
})
