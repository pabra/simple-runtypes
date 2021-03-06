import { objectRuntype } from './object'
import {
  createFail,
  internalRuntype,
  isFail,
  isPureRuntype,
  propagateFail,
} from './runtype'
import { debugValue } from './runtypeError'
import type { Runtype, InternalRuntype, Fail } from './runtype'

function dictionaryRuntype<T extends string, U>(
  keyRuntype: Runtype<T>,
  valueRuntype: Runtype<U>,
) {
  const isPure = isPureRuntype(keyRuntype) && isPureRuntype(valueRuntype)

  return internalRuntype<Record<T, U>>((v, failOrThrow) => {
    const o: object | Fail = (objectRuntype as InternalRuntype)(v, failOrThrow)

    if (isFail(o)) {
      return propagateFail(failOrThrow, o, v)
    }

    if (Object.getOwnPropertySymbols(o).length) {
      return createFail(
        failOrThrow,
        `invalid key in dictionary: ${debugValue(
          Object.getOwnPropertySymbols(o),
        )}`,
        v,
      )
    }

    // optimize allocations: only create a copy if any of the key runtypes
    // return a different object - otherwise return value as is
    const res = (isPure ? o : {}) as { [key: string]: U }

    for (const key in o) {
      if (!Object.prototype.hasOwnProperty.call(o, key)) {
        continue
      }

      if (key === '__proto__') {
        // e.g. someone tried to sneak __proto__ into this object and that
        // will cause havoc when assigning it to a new object (in case its impure)
        return createFail(
          failOrThrow,
          `invalid key in dictionary: ${debugValue(key)}`,
          v,
        )
      }
      const keyOrFail: T | Fail = (keyRuntype as InternalRuntype)(
        key,
        failOrThrow,
      )

      if (isFail(keyOrFail)) {
        return propagateFail(failOrThrow, keyOrFail, v)
      }

      const value = o[key as keyof typeof o]
      const valueOrFail: U | Fail = (valueRuntype as InternalRuntype)(
        value,
        failOrThrow,
      )

      if (isFail(valueOrFail)) {
        return propagateFail(failOrThrow, valueOrFail, v)
      }

      if (!isPure) {
        res[keyOrFail] = valueOrFail
      }
    }

    return res
  }, isPure)
}

/**
 * An object that matches a Typecript `Record<KeyType, ValueType>` type.
 *
 * You pass a runtype for the objects keys and one for its values.
 * Keeps you save from unwanted propertiers and evil __proto__ injections.
 */
export function dictionary<T extends Runtype<any>, U extends Runtype<any>>(
  keyRuntype: T,
  valueRuntype: U,
): Runtype<Record<ReturnType<T>, ReturnType<U>>> {
  return dictionaryRuntype(keyRuntype, valueRuntype)
}
