function debugValue(v: any, maxLength: number = 512) {
  let s: string

  if (v === undefined) {
    return 'undefined'
  }

  try {
    s = JSON.stringify(v)
  } catch {
    s = `${v}`
  }

  if (s.length > maxLength) {
    return s.slice(maxLength - 1) + '\u2026'
  } else {
    return s
  }
}

/**
 * Thrown if the input does not match the runtype.
 *
 * Use `getFormattedErrorPath`, `getFormattedErrorValue` and
 * `getFormattedError` to convert path and value to a loggable string.
 */
export class RuntypeError extends Error {
  readonly path?: (string | number)[]
  readonly value?: any

  constructor(message: string, value?: any, path?: (string | number)[]) {
    super(message)

    this.name = 'RuntypeError'
    this.path = path
    this.value = value
  }
}

/**
 * Return the object path at which the error occured.
 */
export function getFormattedErrorPath(e: RuntypeError) {
  if (!Array.isArray(e.path)) {
    return '(error is not a RuntypeError!)'
  }

  return e.path
    .map((k) =>
      typeof k === 'number'
        ? `[${k}]`
        : /^([A-z0-9_])+$/.test(k)
        ? `.${k}`
        : `['${JSON.stringify(k)}']`,
    )
    .join('')
    .slice(1)
}

/**
 * Return a string representaiton of the value that failed the runtype check.
 *
 * Cap the size of the returned string at maxLength
 */
export function getFormattedErrorValue(e: RuntypeError, maxLength = 512) {
  return debugValue(e.value, maxLength)
}

/**
 * Return a string representaiton of the value that failed the runtype check.
 *
 * Cap the size of the returned string at maxLength
 */
export function getFormattedError(e: RuntypeError, maxLength = 512) {
  return `${e.toString()} at \`value.${getFormattedErrorPath(
    e,
  )}\` in \`${getFormattedErrorValue(e, maxLength)}\``
}

/**
 * Thrown if the api is misused.
 */
export class RuntypeUsageError extends Error {}

/**
 * Symbol that identifies failed typechecks
 */
export const failSymbol: unique symbol = Symbol('SimpleRuntypesFail')

/**
 * Object to return if a typecheck failed
 */
export interface Fail {
  [failSymbol]: true
  reason: string
  path: (string | number)[]
}

// create a fail or raise the error exception if the called runtype was on top
function createFail(
  failOrThrow: typeof failSymbol | undefined,
  msg: string,
  topLevelValue?: any,
): any {
  if (failOrThrow === undefined) {
    // runtype check failed
    throw new RuntypeError(msg, topLevelValue)
  } else if (failOrThrow === failSymbol) {
    // runtype check failed but it should not throw an exception bc its called
    // internally e.g. as part of a union or because we want to add debug info
    // while unrolling the stack
    return {
      [failSymbol]: true,
      reason: `${msg}`,
      path: [],
    }
  } else {
    throw new RuntypeUsageError(
      `failOrThrow must be undefined or the failSymbol, not ${JSON.stringify(
        failOrThrow,
      )}`,
    )
  }
}

// pass the fail up to the caller or, if on top, raise the error exception
function propagateFail(
  failOrThrow: typeof failSymbol | undefined,
  fail: Fail,
  topLevelValue?: any,
  key?: string | number,
) {
  if (key !== undefined) {
    fail.path.push(key)
  }

  if (failOrThrow === undefined) {
    // runtype check failed
    throw new RuntypeError(
      fail.reason,
      topLevelValue,
      fail.path.length ? fail.path.reverse() : undefined,
    )
  } else if (failOrThrow === failSymbol) {
    return fail
  } else {
    throw new RuntypeUsageError(
      `failOrThrow must be undefined or the failSymbol, not ${JSON.stringify(
        failOrThrow,
      )}`,
    )
  }
}

/**
 * Create a runtype validation error for custom runtypes
 */
export function fail(msg: string) {
  return createFail(failSymbol, msg)
}

/**
 * Check whether a returned value is a failure.
 */
export function isFail(v: unknown): v is Fail {
  if (typeof v !== 'object' || !v) {
    return false
  }

  return failSymbol in v
}

/**
 * Runtype
 *
 * Just a function. The returned value may be a copy of v, depending on the
 * runtypes implementation.
 */
export interface Runtype<T> {
  // a function to check that v 'conforms' to type T
  (v: unknown): T
}

// The internal runtype is one that receives an additional flag that
// determines whether the runtype should throw a RuntypeError or whether it
// should return a Fail up to the caller.
//
// Use this to:
//   * accumulate additional path data when unwinding a fail (propagateFail)
//   * have runtypes return a dedicated fail value to implement union over any
//     runtypes (isFail)
function internalRuntype<T>(
  fn: (v: unknown, failOrThrow?: typeof failSymbol) => T,
): Runtype<T> {
  return fn
}

type InternalRuntype = (
  v: unknown,
  failOrThrow: typeof failSymbol | undefined,
) => any

/**
 * Construct a runtype from a validation function.
 */
export function runtype<T>(fn: (v: unknown) => T | Fail): Runtype<T> {
  return internalRuntype<any>((v, failOrThrow) => {
    const res = fn(v)

    if (isFail(res)) {
      return propagateFail(failOrThrow, res, v)
    }

    return res
  })
}

/// basic types

/**
 * A number. By default reject NaN and Infinity values.
 *
 * Options:
 *
 *   allowNaN .. allow NaN values
 *   allowInfinity .. allow positive and negative Infinity values
 *   min .. reject numbers smaller than that
 *   max .. reject numbers larger than that
 */
export function number(options?: {
  allowNaN?: boolean
  allowInfinity?: boolean
  min?: number
  max?: number
}): Runtype<number> {
  const { allowNaN, allowInfinity, min, max } = options || {}

  return internalRuntype<number>((v, failOrThrow) => {
    if (typeof v !== 'number') {
      return createFail(failOrThrow, 'expected a number', v)
    }

    if (!allowNaN && isNaN(v)) {
      return createFail(failOrThrow, 'expected a number that is not NaN', v)
    }

    if (!allowInfinity && (v === Infinity || v === -Infinity)) {
      return createFail(failOrThrow, 'expected a finite number', v)
    }

    if (min !== undefined && v < min) {
      return createFail(failOrThrow, `expected number to be >= ${min}`, v)
    }

    if (max !== undefined && v > max) {
      return createFail(failOrThrow, `expected number to be <= ${max}`, v)
    }

    return v
  })
}

const integerRuntype = internalRuntype<number>((v, failOrThrow) => {
  if (typeof v === 'number' && Number.isSafeInteger(v)) {
    return v
  }

  return createFail(failOrThrow, 'expected a safe integer', v)
})

/**
 * A Number that is a `isSafeInteger()`
 *
 * Options:
 *
 *   min .. reject numbers smaller than that
 *   max .. reject number larger than that
 */
export function integer(options?: { max?: number; min?: number }) {
  if (!options) {
    return integerRuntype
  }

  const { min, max } = options

  return internalRuntype<number>((v, failOrThrow) => {
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
  })
}

export const stringAsIntegerRuntype = internalRuntype<number>(
  (v, failOrThrow) => {
    if (typeof v === 'string') {
      const parsedNumber = parseInt(v, 10)
      const n: number = (integerRuntype as InternalRuntype)(
        parsedNumber,
        failSymbol,
      )

      if (isFail(n)) {
        return propagateFail(failOrThrow, n, v)
      }

      // ensure that value did only contain that integer, nothing else
      // but also make '+1' === '1' and '-0' === '0'
      const vStringSansLeadingPlus =
        v === '-0' ? '0' : v[0] === '+' ? v.slice(1) : v

      if (n.toString() !== vStringSansLeadingPlus) {
        return createFail(
          failOrThrow,
          'expected string to contain only the safe integer, not additional characters, whitespace or leading zeros',
          v,
        )
      }

      return n
    }

    return createFail(
      failOrThrow,
      'expected a string that contains a safe integer',
      v,
    )
  },
)

/**
 * A string that is parsed as an integer.
 *
 * Parsing is strict, e.g leading/trailing whitespace or leading zeros will
 * result in an error. Exponential notation is not allowed. The resulting
 * number must be a safe integer (`Number.isSafeInteger`).
 * A leading '+' or '-' is allowed.
 *
 * Options:
 *
 *   min .. reject numbers smaller than that
 *   max .. reject number larger than that
 */
export function stringAsInteger(options?: {
  min?: number
  max?: number
}): Runtype<number> {
  if (!options) {
    return stringAsIntegerRuntype
  }

  const { min, max } = options

  return internalRuntype<number>((v, failOrThrow) => {
    const n = (stringAsIntegerRuntype as InternalRuntype)(v, failOrThrow)

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
  })
}

const booleanRuntype = internalRuntype<boolean>((v, failOrThrow) => {
  if (v === true || v === false) {
    return v
  }

  return createFail(failOrThrow, 'expected a boolean', v)
})

/**
 * A boolean.
 */
export function boolean() {
  return booleanRuntype
}

const stringRuntype = internalRuntype<string>((v, failOrThrow) => {
  if (typeof v === 'string') {
    return v
  }

  return createFail(failOrThrow, 'expected a string', v)
})

/**
 * A string.
 *
 * Options:
 *
 *   maxLength .. reject strings that are longer than that
 *   trim .. when true, remove leading and trailing spaces from the string
 */
export function string(options?: { maxLength?: number; trim?: boolean }) {
  if (!options) {
    return stringRuntype
  }

  const { maxLength, trim } = options

  return internalRuntype((v, failOrThrow) => {
    const s: string = (stringRuntype as InternalRuntype)(v, failOrThrow)

    if (isFail(s)) {
      return propagateFail(failOrThrow, s, v)
    }

    if (maxLength !== undefined && s.length > maxLength) {
      return createFail(
        failOrThrow,
        `expected the string length to not exceed ${maxLength}`,
        v,
      )
    }

    return trim ? s.trim() : s
  })
}

/**
 * A literal (string | number | boolean).
 */
export function literal<T extends string>(literal: T): Runtype<T>
export function literal<T extends number>(literal: T): Runtype<T>
export function literal<T extends boolean>(literal: T): Runtype<T>
export function literal(literal: string | number | boolean): Runtype<any> {
  const rt: any = internalRuntype((v, failOrThrow) => {
    if (v === literal) {
      return literal
    }

    return createFail(
      failOrThrow,
      `expected a literal: ${debugValue(literal)}`,
      v,
    )
  })

  // keep the literal as metadata on the runtype itself to be able to use it
  // in record intersections to determine the right record runtype
  rt.literal = literal

  return rt
}

/**
 * A value to check later.
 */
export function unknown(): Runtype<unknown> {
  return internalRuntype((v) => {
    return v
  })
}

/**
 * A value to check later.
 */
export function any(): Runtype<any> {
  return internalRuntype((v) => {
    return v as any
  })
}

/**
 * A value to ignore (typed as unknown and always set to undefined).
 */
export function ignore(): Runtype<unknown> {
  return internalRuntype((_v) => {
    return undefined as unknown
  })
}

type EnumObject = { [key: string]: string | number }

/**
 * Any value defined in the enumObject.
 */
export function enumValue<T extends EnumObject, S extends keyof T>(
  enumObject: T,
): Runtype<T[S]> {
  return internalRuntype((v, failOrThrow) => {
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
  })
}

/**
 * A union of string literals.
 */
export function stringLiteralUnion<A extends string>(a: A): Runtype<A>
export function stringLiteralUnion<A extends string, B extends string>(
  a: A,
  b: B,
): Runtype<A | B>
export function stringLiteralUnion<
  A extends string,
  B extends string,
  C extends string
>(a: A, b: B, c: C): Runtype<A | B | C>
export function stringLiteralUnion<
  A extends string,
  B extends string,
  C extends string,
  D extends string
>(a: A, b: B, c: C, d: D): Runtype<A | B | C | D>
export function stringLiteralUnion<
  A extends string,
  B extends string,
  C extends string,
  D extends string,
  E extends string
>(a: A, b: B, c: C, d: D, e: E): Runtype<A | B | C | D | E>
export function stringLiteralUnion<
  A extends string,
  B extends string,
  C extends string,
  D extends string,
  E extends string,
  F extends string
>(a: A, b: B, c: C, d: D, e: E, f: F): Runtype<A | B | C | D | E | F>
export function stringLiteralUnion<
  A extends string,
  B extends string,
  C extends string,
  D extends string,
  E extends string,
  F extends string,
  G extends string
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G): Runtype<A | B | C | D | E | F | G>
export function stringLiteralUnion(...values: string[]): any {
  const valuesIndex = new Set(values)

  return internalRuntype((v, failOrThrow) => {
    if (typeof v !== 'string' || !valuesIndex.has(v)) {
      return createFail(failOrThrow, `expected one of ${values}`, v)
    }

    return v
  })
}

/// containers

export const arrayRuntype = internalRuntype<unknown[]>((v, failOrThrow) => {
  if (Array.isArray(v)) {
    return v
  }

  return createFail(failOrThrow, `expected an Array`, v)
})

/**
 * An array of a given type.
 *
 * Options:
 *
 *   minLength .. reject arrays shorter than that
 *   maxLength .. reject arrays longer than that
 */
export function array<A>(
  a: Runtype<A>,
  options?: { maxLength?: number; minLength?: number },
): Runtype<A[]> {
  const { maxLength, minLength } = options || {}

  return internalRuntype<any>((v, failOrThrow) => {
    const arrayValue = (arrayRuntype as InternalRuntype)(v, failOrThrow)

    if (isFail(arrayValue)) {
      return propagateFail(failOrThrow, arrayValue, v)
    }

    if (maxLength !== undefined && arrayValue.length > maxLength) {
      return createFail(
        failOrThrow,
        `expected the array to contain at most ${maxLength} elements`,
        v,
      )
    }

    if (minLength !== undefined && arrayValue.length < minLength) {
      return createFail(
        failOrThrow,
        `expected the array to contain at least ${minLength} elements`,
        v,
      )
    }

    const res: A[] = new Array(arrayValue.length)

    for (let i = 0; i < arrayValue.length; i++) {
      const item = (a as InternalRuntype)(arrayValue[i], failSymbol)

      if (isFail(item)) {
        return propagateFail(failOrThrow, item, v, i)
      }

      res[i] = item
    }

    return res
  })
}

/**
 * A tuple.
 */
export function tuple<A>(a: Runtype<A>): Runtype<[A]>
export function tuple<A, B>(a: Runtype<A>, b: Runtype<B>): Runtype<[A, B]>
export function tuple<A, B, C>(
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
): Runtype<[A, B, C]>
export function tuple<A, B, C, D>(
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
  d: Runtype<D>,
): Runtype<[A, B, C, D]>
export function tuple<A, B, C, D, E>(
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
  d: Runtype<D>,
  e: Runtype<E>,
): Runtype<[A, B, C, D, E]>
export function tuple(...types: Runtype<any>[]): Runtype<any> {
  return internalRuntype<any>((v, failOrThrow) => {
    const a = (arrayRuntype as InternalRuntype)(v, failOrThrow)

    if (isFail(a)) {
      return propagateFail(failOrThrow, a, v)
    }

    if (a.length !== types.length) {
      return createFail(
        failOrThrow,
        'tuple array does not have the required length',
        v,
      )
    }

    const res: any[] = new Array(a.length)

    for (let i = 0; i < types.length; i++) {
      const item = (types[i] as InternalRuntype)(a[i], failSymbol)

      if (isFail(item)) {
        return propagateFail(failOrThrow, item, v, i)
      }

      res[i] = item
    }

    return res
  })
}

// cached object runtype
export const objectRuntype = internalRuntype<object>((v, failOrThrow) => {
  if (typeof v === 'object' && !Array.isArray(v) && v !== null) {
    return v
  }

  return createFail(failOrThrow, 'expected an object', v)
})

/**
 * An object that is not an array.
 */
export function object(): Runtype<object> {
  return objectRuntype
}

/**
 * An index with string keys.
 */
export function stringIndex<T>(t: Runtype<T>): Runtype<{ [key: string]: T }> {
  return internalRuntype<any>((v, failOrThrow) => {
    const o: any = (objectRuntype as InternalRuntype)(v, failOrThrow)

    if (isFail(o)) {
      return propagateFail(failOrThrow, o, v)
    }

    const res: { [key: string]: T } = {}

    for (let k in o) {
      if (o.hasOwnProperty(k)) {
        const value = (t as InternalRuntype)(o[k], failSymbol)

        if (isFail(value)) {
          return propagateFail(failOrThrow, value, v, k)
        }

        res[k] = value
      }
    }

    return res
  })
}

/**
 * An index with number keys.
 */
export function numberIndex<T>(t: Runtype<T>): Runtype<{ [key: number]: T }> {
  return internalRuntype<any>((v, failOrThrow) => {
    const o: any = (objectRuntype as InternalRuntype)(v, failOrThrow)

    if (isFail(o)) {
      return propagateFail(failOrThrow, o, v)
    }

    const res: { [key: number]: T } = {}

    for (let k in o) {
      const key = (stringAsIntegerRuntype as InternalRuntype)(k, failOrThrow)

      if (isFail(key)) {
        return propagateFail(failOrThrow, key, v)
      }

      const value = (t as InternalRuntype)(o[key], failSymbol)

      if (isFail(value)) {
        return propagateFail(failOrThrow, value, v, key)
      }

      res[key] = value
    }

    return res
  })
}

/**
 * An object with defined keys and values.
 */
export function record<T extends object>(
  typemap: { [K in keyof T]: Runtype<T[K]> },
): Runtype<T> {
  const rt: Runtype<T> = <any>internalRuntype((v, failOrThrow) => {
    const o: any = (objectRuntype as InternalRuntype)(v, failOrThrow)

    if (isFail(o)) {
      return propagateFail(failOrThrow, o, v)
    }

    // TODO: optimize allocations: only create a copy if any of the key
    // runtypes return a different object - otherwise return value as is
    const res = {} as T

    for (const k in typemap) {
      // nested types should always fail with explicit `Fail` so we can add additional data
      const value = (typemap[k] as InternalRuntype)(o[k], failSymbol)

      if (isFail(value)) {
        return propagateFail(failOrThrow, value, v, k)
      }

      res[k] = value
    }

    const unknownKeys = Object.keys(o).filter((k) => !res.hasOwnProperty(k))

    if (unknownKeys.length) {
      return createFail(
        failOrThrow,
        `invalid keys in record ${debugValue(unknownKeys)}`,
        v,
      )
    }

    return res
  })

  // fields metadata to implement combinators like pick, omit and intersection
  const fields: { [key: string]: any } = {}

  for (const k in typemap) {
    fields[k] = typemap[k]
  }

  ;(<any>rt).fields = fields

  return rt
}

// TODO:
//   export function sloppyRecord<T extends object>(
//     typemap: { [K in keyof T]: Runtype<T[K]> },
//   ): Runtype<T>
// same as `record` but without the 'unknownKeys' validation

/**
 * A runtype based on a type guard
 */
export function guardedBy<F>(typeGuard: (v: unknown) => v is F): Runtype<F> {
  return internalRuntype((v, failOrThrow) => {
    if (!typeGuard(v)) {
      return createFail(failOrThrow, 'expected typeguard to return true', v)
    }

    return v
  })
}

/**
 * Optional (?)
 */
export function optional<A>(t: Runtype<A>): Runtype<undefined | A> {
  return internalRuntype((v, failOrThrow) => {
    if (v === undefined) {
      return undefined
    }

    return (t as InternalRuntype)(v, failOrThrow)
  })
}

/**
 * A type or null.
 */
export function nullable<A>(t: Runtype<A>): Runtype<null | A> {
  return internalRuntype((v, failOrThrow) => {
    if (v === null) {
      return null
    }

    return (t as InternalRuntype)(v, failOrThrow)
  })
}

/**
 * A tagged union with type discriminant 'key'.
 *
 * Runtypes must be created with `record(...)` which contains type metadata to
 * perform an efficient lookup of runtype functions.
 */
export function discriminatedUnion<A>(key: keyof A, a: Runtype<A>): Runtype<A>
export function discriminatedUnion<A, B>(
  key: keyof (A | B),
  a: Runtype<A>,
  b: Runtype<B>,
): Runtype<A | B>
export function discriminatedUnion<A, B, C>(
  key: keyof (A | B | C),
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
): Runtype<A | B | C>
export function discriminatedUnion<A, B, C, D>(
  key: keyof (A | B | C | D),
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
  d: Runtype<D>,
): Runtype<A | B | C | D>
export function discriminatedUnion<A, B, C, D, E>(
  key: keyof (A | B | C | D | E),
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
  d: Runtype<D>,
  e: Runtype<E>,
): Runtype<A | B | C | D | E>
export function discriminatedUnion<A, B, C, D, E, F>(
  key: keyof (A | B | C | D | F),
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
  d: Runtype<D>,
  e: Runtype<E>,
  f: Runtype<F>,
): Runtype<A | B | C | D | E | F>
export function discriminatedUnion<A, B, C, D, E, F, G>(
  key: keyof (A | B | C | D | F | G),
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
  d: Runtype<D>,
  e: Runtype<E>,
  f: Runtype<F>,
  g: Runtype<G>,
): Runtype<A | B | C | D | E | F | G>
export function discriminatedUnion<A, B, C, D, E, F, G, H>(
  key: keyof (A | B | C | D | F | G | H),
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
  d: Runtype<D>,
  e: Runtype<E>,
  f: Runtype<F>,
  g: Runtype<G>,
  h: Runtype<H>,
): Runtype<A | B | C | D | E | F | G | H>
export function discriminatedUnion<A, B, C, D, E, F, G, H, I>(
  key: keyof (A | B | C | D | F | G | H | I),
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
  d: Runtype<D>,
  e: Runtype<E>,
  f: Runtype<F>,
  g: Runtype<G>,
  h: Runtype<H>,
  i: Runtype<I>,
): Runtype<A | B | C | D | E | F | G | H | I>
export function discriminatedUnion<A, B, C, D, E, F, G, H, I, J>(
  key: keyof (A | B | C | D | F | G | H | I | J),
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
  d: Runtype<D>,
  e: Runtype<E>,
  f: Runtype<F>,
  g: Runtype<G>,
  h: Runtype<H>,
  i: Runtype<I>,
  j: Runtype<J>,
): Runtype<A | B | C | D | E | F | G | H | I | J>
export function discriminatedUnion(...args: any[]): Runtype<any> {
  const key: string = args[0]
  const runtypes: Runtype<any>[] = args.slice(1)
  const typeMap = new Map<string | number, Runtype<any>>()

  // build an index for fast runtype lookups by literal
  runtypes.forEach((t: any) => {
    const runtype = t.fields[key]
    const tagValue = runtype.literal

    if (tagValue === undefined) {
      throw new RuntypeUsageError(
        `broken record type definition, ${t}[${key}] is not a literal`,
      )
    }

    if (!(typeof tagValue === 'string' || typeof tagValue === 'number')) {
      throw new RuntypeUsageError(
        `broken record type definition, ${t}[${key}] must be a string or number, not ${debugValue(
          tagValue,
        )}`,
      )
    }

    // use `object` to also allow enums but they can't be used in types
    // for keys of indexes so we need any
    typeMap.set(tagValue, t)
  })

  return internalRuntype((v, failOrThrow) => {
    const o: any = (objectRuntype as InternalRuntype)(v, failOrThrow)

    if (isFail(o)) {
      return propagateFail(failOrThrow, o, v)
    }

    const tagValue = o[key]
    const rt = typeMap.get(tagValue)

    if (rt === undefined) {
      return createFail(
        failOrThrow,
        `no Runtype found for discriminated union tag ${key}: ${debugValue(
          tagValue,
        )}`,
        v,
      )
    }

    return (rt as InternalRuntype)(v, failOrThrow)
  })
}

/**
 * A union of runtypes.
 */
export function union<A, B>(a: Runtype<A>, b: Runtype<B>): Runtype<A | B>
export function union<A, B, C>(
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
): Runtype<A | B | C>
export function union<A, B, C, D>(
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
  d: Runtype<D>,
): Runtype<A | B | C | D>
export function union<A, B, C, D, E>(
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
  d: Runtype<D>,
  e: Runtype<E>,
): Runtype<A | B | C | D | E>
export function union(...runtypes: Runtype<any>[]): Runtype<any> {
  if (!runtypes.length) {
    throw new RuntypeUsageError('no runtypes given to union')
  }

  return internalRuntype((v, failOrThrow) => {
    let lastFail: Fail | undefined

    for (let i = 0; i < runtypes.length; i++) {
      const val = (runtypes[i] as InternalRuntype)(v, failSymbol)

      if (!isFail(val)) {
        return val
      } else {
        lastFail = val
      }
    }

    return propagateFail(failOrThrow, lastFail as any, v)
  })
}

// An intersection of two record runtypes
function recordIntersection<A, B>(
  recordA: Runtype<A>,
  recordB: Runtype<B>,
): Runtype<A & B> {
  const fields: { [key: string]: Runtype<any> } = {}
  const a = (<any>recordA).fields
  const b = (<any>recordB).fields

  for (let k in { ...a, ...b }) {
    if (a[k] && b[k]) {
      fields[k] = intersection(a[k], b[k])
    } else if (a[k]) {
      fields[k] = a[k]
    } else if (b[k]) {
      fields[k] = b[k]
    } else {
      throw new RuntypeUsageError('invalid else')
    }
  }

  return <any>record(fields)
}

/**
 * An intersection of two runtypes
 */
function intersection2<A, B>(a: Runtype<A>, b: Runtype<B>): Runtype<A & B>
function intersection2(a: Runtype<any>, b: Runtype<any>): Runtype<any> {
  if ('fields' in a && 'fields' in b) {
    return recordIntersection(a, b)
  } else {
    return internalRuntype((v, failOrThrow) => {
      const valFromA = (a as InternalRuntype)(v, failOrThrow)
      const valFromB = (b as InternalRuntype)(v, failOrThrow)

      if (isFail(valFromB)) {
        return propagateFail(failOrThrow, valFromB, v)
      }

      if (isFail(valFromA)) {
        return propagateFail(failOrThrow, valFromA, v)
      }

      return valFromB // second runtype arg is preferred
    })
  }
}

/**
 * An intersection of runtypes.
 */
export function intersection<A, B>(a: Runtype<A>, b: Runtype<B>): Runtype<A & B>
export function intersection<A, B, C>(
  a: Runtype<A>,
  b: Runtype<B>,
  c: Runtype<C>,
): Runtype<A & B & C>
export function intersection(...args: Runtype<any>[]): Runtype<any> {
  if (args.length === 2) {
    return intersection2(args[0], args[1])
  } else if (args.length === 3) {
    return intersection(intersection2(args[0], args[1]), args[2])
  } else {
    throw new RuntypeUsageError(
      `unsupported number of arguments ${args.length}`,
    )
  }
}

/**
 * Build a new record runtype that contains some keys from the original
 */
export function pick<T, K extends keyof T>(
  original: Runtype<T>,
  ...keys: K[]
): Runtype<Pick<T, K>> {
  const fields = (<any>original).fields

  if (!fields) {
    throw new RuntypeUsageError(`expected a record runtype`)
  }

  const newRecordFields: any = {}

  keys.forEach((k: any) => {
    newRecordFields[k] = fields[k]
  })

  return record(newRecordFields)
}

// type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

/**
 * Build a new record runtype that omits some keys from the original.
 */
export function omit<T, K extends keyof T>(
  original: Runtype<T>,
  ...keys: K[]
): Runtype<Omit<T, K>> {
  const fields = (<any>original).fields

  if (!fields) {
    throw new RuntypeUsageError(`expected a record runtype`)
  }

  const newRecordFields: any = { ...fields }

  keys.forEach((k: any) => {
    delete newRecordFields[k]
  })

  return record(newRecordFields)
}

// TODO: other combinators like partial, required, ...
