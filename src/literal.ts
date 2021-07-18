import { debugValue } from './runtypeError'
import { createFail, internalRuntype, Runtype } from './runtype'

type Literal = string | number | boolean
export type Meta = { type: 'literal'; literal: Literal }

/**
 * A literal string, number, boolean or enum.
 */
export function literal<T extends string>(lit: T): Runtype<T>
export function literal<T extends number>(lit: T): Runtype<T>
export function literal<T extends boolean>(lit: T): Runtype<T>
export function literal(lit: Literal): Runtype<any> {
  const rt: any = internalRuntype((v, failOrThrow) => {
    if (v === lit) {
      return lit
    }

    return createFail(failOrThrow, `expected a literal: ${debugValue(lit)}`, v)
  }, true)

  // keep the literal as metadata on the runtype itself to be able to use it
  // in record intersections to determine the right record runtype
  const meta: Meta = { type: 'literal', literal: lit }
  rt.meta = meta

  return rt
}

export function toSchema(runtype: Runtype<any>): string {
  const meta: Meta = (runtype as any).meta
  const lit = meta.literal

  return JSON.stringify(lit)
}
