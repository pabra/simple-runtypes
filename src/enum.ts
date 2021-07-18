import { createFail, internalRuntype, Runtype } from './runtype'
import { debugValue } from './runtypeError'

type EnumObject = { [key: string]: string | number }
export type Meta = { type: 'enum' }

const meta: Meta = { type: 'enum' }

/**
 * Any value defined in the enumObject.
 */
function enumRuntype<T extends EnumObject, S extends keyof T>(
  enumObject: T,
): Runtype<T[S]> {
  const runtype = internalRuntype((v, failOrThrow) => {
    // use the fast reverse lookup of number enums to check whether v is a
    // value of the enum
    if (typeof v === 'number' && (enumObject as any)[v as any] !== undefined) {
      return (v as unknown) as T[S]
    }

    if (Object.values(enumObject).indexOf(v as any) !== -1) {
      return v as T[S]
    }

    return createFail(
      failOrThrow,
      `expected a value that belongs to the enum ${debugValue(enumObject)}`,
      v,
    )
  }, true)

  ;(runtype as any).meta = meta

  return runtype
}

export { enumRuntype as enum }

export function toSchema(): string {
  return 'string | number'
}
