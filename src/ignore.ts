import { internalRuntype, Runtype } from './runtype'

export type Meta = { type: 'ignore' }

const meta: Meta = { type: 'ignore' }

/**
 * A value to ignore (typed as unknown and always set to undefined).
 */
export function ignore(): Runtype<unknown> {
  const runtype = internalRuntype(() => {
    return undefined as unknown
  }, true)

  ;(runtype as any).meta = meta

  return runtype
}

export function toSchema(): string {
  return 'any'
}
