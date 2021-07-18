import { createFail, internalRuntype, Runtype } from './runtype'

export type Meta = { type: 'null' }
const meta: Meta = { type: 'null' }
const nullRt: any = internalRuntype<null>((v, failOrThrow) => {
  if (v !== null) {
    return createFail(failOrThrow, 'expected null', v)
  }

  return v
}, true)
nullRt.meta = meta

/**
 * null
 */
// eslint-disable-next-line no-shadow-restricted-names
function nullRuntype(): Runtype<null> {
  return nullRt
}

export { nullRuntype as null }

export function toSchema(): string {
  return 'null'
}
