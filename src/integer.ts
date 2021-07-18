import {
  createFail,
  InternalRuntype,
  internalRuntype,
  isFail,
  propagateFail,
  Runtype,
} from './runtype'

export type Meta = { type: 'integer' }

const meta: Meta = { type: 'integer' }

export const integerRuntype = internalRuntype<number>((v, failOrThrow) => {
  if (typeof v === 'number' && Number.isSafeInteger(v)) {
    return v
  }

  return createFail(failOrThrow, 'expected a safe integer', v)
}, true)
;(integerRuntype as any).meta = meta

/**
 * A Number that is a `isSafeInteger()`
 *
 * Options:
 *
 *   min .. reject numbers smaller than that
 *   max .. reject number larger than that
 */
export function integer(options?: {
  max?: number
  min?: number
}): Runtype<number> {
  if (!options) {
    return integerRuntype
  }

  const { min, max } = options

  const runtype = internalRuntype<number>((v, failOrThrow) => {
    const n = (integerRuntype as InternalRuntype)(v, failOrThrow)

    if (isFail(n)) {
      return propagateFail(failOrThrow, n, v)
    }

    if (min !== undefined && n < min) {
      return createFail(failOrThrow, `expected the integer to be >= ${min}`, v)
    }

    if (max !== undefined && n > max) {
      return createFail(failOrThrow, `expected the integer to be <= ${max}`, v)
    }

    return n
  }, true)

  ;(runtype as any).meta = meta

  return runtype
}

export function toSchema(): string {
  return 'number'
}
