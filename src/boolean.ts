import { createFail, internalRuntype, Runtype } from './runtype'

export type Meta = {
  type: 'boolean'
}

const meta: Meta = { type: 'boolean' }
const booleanRuntype: any = internalRuntype<boolean>((v, failOrThrow) => {
  if (v === true || v === false) {
    return v
  }

  return createFail(failOrThrow, 'expected a boolean', v)
}, true)

booleanRuntype.meta = meta

/**
 * A boolean.
 */
export function boolean(): Runtype<boolean> {
  return booleanRuntype
}

export function toSchema(): string {
  return 'boolean'
}
