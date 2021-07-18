import { createFail, internalRuntype, Runtype } from './runtype'

const booleanRuntype = internalRuntype<boolean>((v, failOrThrow) => {
  if (v === true || v === false) {
    return v
  }

  return createFail(failOrThrow, 'expected a boolean', v)
}, true)

export type Meta = {
  type: 'boolean'
}

const meta: Meta = { type: 'boolean' }

;(booleanRuntype as any).meta = meta

/**
 * A boolean.
 */
export function boolean(): Runtype<boolean> {
  return booleanRuntype
}

export function toSchema(): string {
  return 'boolean'
}
