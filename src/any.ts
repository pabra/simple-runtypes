import { Runtype, internalRuntype } from './runtype'

export type Meta = { type: 'any' }

const meta: Meta = { type: 'any' }
const anyRuntype: any = internalRuntype((v) => {
  return v as any
}, true)
anyRuntype.meta = meta

/**
 * A value to check later.
 */
export function any(): Runtype<any> {
  return anyRuntype
}

export function toSchema(): string {
  return 'any'
}
