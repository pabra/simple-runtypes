import { createFail, internalRuntype, Runtype } from './runtype'

export type Meta = { type: 'guardedBy' }

const meta: Meta = { type: 'guardedBy' }

/**
 * A runtype based on a type guard
 */
export function guardedBy<F>(typeGuard: (v: unknown) => v is F): Runtype<F> {
  const runtype = internalRuntype((v, failOrThrow) => {
    if (!typeGuard(v)) {
      return createFail(failOrThrow, 'expected typeguard to return true', v)
    }

    return v
  }, true)

  ;(runtype as any).meta = meta

  return runtype
}

export function toSchema(): string {
  return 'any'
}
