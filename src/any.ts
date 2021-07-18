import { Runtype, internalRuntype } from './runtype'

export type Meta = { type: 'any' }

const meta: Meta = { type: 'any' }

/**
 * A value to check later.
 */
export function any(): Runtype<any> {
  const runtype = internalRuntype((v) => {
    return v as any
  }, true)

  ;(runtype as any).meta = meta

  return runtype
}

export function toSchema(): string {
  return 'any'
}
