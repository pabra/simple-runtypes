import { internalRuntype, Runtype } from './runtype'

export type Meta = { type: 'ignore' }

const meta: Meta = { type: 'ignore' }
const ignoreRuntype: any = internalRuntype(() => {
  return undefined as unknown
}, true)
ignoreRuntype.meta = meta

/**
 * A value to ignore (typed as unknown and always set to undefined).
 */
export function ignore(): Runtype<unknown> {
  return ignoreRuntype
}

export function toSchema(): string {
  return 'any'
}
