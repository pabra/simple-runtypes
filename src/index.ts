/// infrastructure

// context variable: the current processed key in object to provide better error messages
let _currentKey: string | undefined

function currentKey() {
  if (!_currentKey) {
    return ''
  }

  return ` (key: ${_currentKey})`
}

function debugValue(v: any, maxLength: number = 128) {
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

export class RuntypeError extends Error {}

function createError(msg: string, value: any) {
  return new RuntypeError(`${msg}, value: ${debugValue(value)}${currentKey()}`)
}

export interface Runtype<T> {
  // a function to check that v 'conforms' to type T
  (v: unknown): T
}

// subtype to help with discriminatedUnion
export interface LiteralRuntype<T> extends Runtype<T> {
  literal: T
}

// subtype to help with discriminatedUnion
export interface RecordRuntype<T> extends Runtype<T> {
  // keys which are constant in case that T is a record type to help
  // identifying the correct function for a discriminatedUnion type
  constants: { [key: string]: string | number }
}

/// basic types

/**
 * A number.
 *
 * Explicitly pass true for allowNaN to not fail on NaNs
 */
export function number(allowNaN: boolean = false): Runtype<number> {
  return (v: unknown): number => {
    if (typeof v === 'number') {
      if (!allowNaN && isNaN(v)) {
        throw createError('expected a number and not NaN', v)
      }

      return v
    }

    throw createError('expected a number', v)
  }
}

/**
 * A number without decimals and within +-MAX_SAFE_INTEGER.
 */
export function integer(): Runtype<number> {
  return (v: unknown) => {
    if (
      typeof v === 'number' &&
      Number.isInteger(v) &&
      -Number.MAX_SAFE_INTEGER <= v &&
      v <= Number.MAX_SAFE_INTEGER
    ) {
      return v
    }

    throw createError('expected an integer', v)
  }
}

/**
 * A boolean.
 */
export function boolean(): Runtype<boolean> {
  return (v: unknown) => {
    if (v === true || v === false) {
      return v
    }

    throw createError('expected a boolean', v)
  }
}

/**
 * A string.
 */
export function string(): Runtype<string> {
  return (v: unknown) => {
    if (typeof v === 'string') {
      return v
    }

    throw createError('expected a string', v)
  }
}

/**
 * A literal (string | number | boolean).
 */
export function literal<T extends string>(literal: T): LiteralRuntype<T>
export function literal<T extends number>(literal: T): LiteralRuntype<T>
export function literal<T extends boolean>(literal: T): LiteralRuntype<T>
export function literal(
  literal: string | number | boolean,
): LiteralRuntype<any> {
  return Object.assign(
    (v: unknown) => {
      if (v === literal) {
        return literal
      }

      throw createError(`expected a literal: ${debugValue(literal)}`, v)
    },
    { literal },
  )
}

/**
 * A value to check later.
 */
export function unknown(): Runtype<unknown> {
  return (v: unknown) => {
    return v
  }
}

/**
 * A value to check later.
 */
export function any(): Runtype<any> {
  return (v: unknown) => {
    return v as any
  }
}

/**
 * A value to ignore (typed as unknown and always set to undefined).
 */
export function ignore(): Runtype<unknown> {
  return (_v: unknown) => {
    return undefined as unknown
  }
}

type EnumObject = { [key: string]: string | number }

/**
 * Any value defined in the enumObject.
 */
export function enumValue<T extends EnumObject, S extends keyof T>(
  enumObject: T,
): Runtype<T[S]> {
  return (v: unknown) => {
    // use the fast reverse lookup of number enums to check whether v is a
    // value of the enum
    if (typeof v === 'number' && (enumObject as any)[v as any] !== undefined) {
      return (v as unknown) as T[S]
    }

    if (Object.values(enumObject).indexOf(v as any) !== -1) {
      return v as T[S]
    }

    throw createError(
      `expected a value that belongs to the enum ${debugValue(enumObject)}`,
      v,
    )
  }
}

/// containers

export function arrayRuntype(v: unknown) {
  if (Array.isArray(v)) {
    return v
  }

  throw createError(`expected an Array`, v)
}

/**
 * An array.
 */
export function array(): Runtype<unknown[]> {
  return arrayRuntype
}

/**
 * A tuple.
 */
export function tuple<A>(t: [Runtype<A>]): Runtype<[A]>
export function tuple<A, B>(t: [Runtype<A>, Runtype<B>]): Runtype<[A, B]>
export function tuple<A, B, C>(
  t: [Runtype<A>, Runtype<B>, Runtype<C>],
): Runtype<[A, B, C]>
export function tuple<A, B, C, D>(
  t: [Runtype<A>, Runtype<B>, Runtype<C>, Runtype<D>],
): Runtype<[A, B, C, D]>
export function tuple<A, B, C, D, E>(
  t: [Runtype<A>, Runtype<B>, Runtype<C>, Runtype<D>, Runtype<E>],
): Runtype<[A, B, C, D, E]>
export function tuple(types: Runtype<any>[]): any {
  return (v: unknown) => {
    const a = arrayRuntype(v)

    return types.map((t, i) => t(a[i]))
  }
}

export function objectRuntype(v: unknown) {
  if (typeof v === 'object' && !Array.isArray(v) && v !== null) {
    return v
  }

  throw createError('expected an object', v)
}

/**
 * An object that is not an array.
 */
export function object(): Runtype<object> {
  return objectRuntype
}

/**
 * An object with defined keys and values.
 */
export function record<T extends object>(
  typemap: { [K in keyof T]: Runtype<T[K]> },
): RecordRuntype<T> {
  const rt: RecordRuntype<T> = Object.assign(
    (v: unknown) => {
      const o: any = objectRuntype(v)
      const res = {} as T
      const currentKey = _currentKey

      for (const k in typemap) {
        _currentKey = k
        res[k] = typemap[k](o[k])
      }

      _currentKey = currentKey

      const unknownKeys = Object.keys(o).filter(k => !res.hasOwnProperty(k))

      if (unknownKeys.length) {
        throw createError('invalid keys in record', unknownKeys)
      }

      return res
    },
    { constants: {} },
  )

  for (const k in typemap) {
    const tagLiteral = (typemap[k] as LiteralRuntype<any>).literal

    if (tagLiteral !== undefined) {
      rt.constants[k] = tagLiteral
    }
  }

  return rt
}

/// combinators

/**
 * Optional (?)
 */
export function optional<A>(t: Runtype<A>): Runtype<undefined | A> {
  return (v: unknown) => {
    if (v === undefined) {
      return undefined
    }

    return t(v)
  }
}

/**
 * A type or null.
 */
export function nullable<A>(t: Runtype<A>): Runtype<null | A> {
  return (v: unknown) => {
    if (v === null) {
      return null
    }

    return t(v)
  }
}

/**
 * A tagged union with type discriminant 'key'.
 *
 * Runtypes must be created with `record(...)` which contains type metadata to
 * perform an efficient lookup of runtype functions.
 */
export function discriminatedUnion<A>(
  key: keyof A,
  a: RecordRuntype<A>,
): RecordRuntype<A>
export function discriminatedUnion<A, B>(
  key: keyof (A | B),
  a: RecordRuntype<A>,
  b: RecordRuntype<B>,
): RecordRuntype<A | B>
export function discriminatedUnion<A, B, C>(
  key: keyof (A | B | C),
  a: RecordRuntype<A>,
  b: RecordRuntype<B>,
  c: RecordRuntype<C>,
): RecordRuntype<A | B | C>
export function discriminatedUnion<A, B, C, D>(
  key: keyof (A | B | C | D),
  a: RecordRuntype<A>,
  b: RecordRuntype<B>,
  c: RecordRuntype<C>,
  d: RecordRuntype<D>,
): Runtype<A | B | C | D>
export function discriminatedUnion<A, B, C, D, E>(
  key: keyof (A | B | C | D | E),
  a: RecordRuntype<A>,
  b: RecordRuntype<B>,
  c: RecordRuntype<C>,
  d: RecordRuntype<D>,
  e: RecordRuntype<E>,
): Runtype<A | B | C | D | E>
export function discriminatedUnion<A, B, C, D, E, F>(
  key: keyof (A | B | C | D | F),
  a: RecordRuntype<A>,
  b: RecordRuntype<B>,
  c: RecordRuntype<C>,
  d: RecordRuntype<D>,
  e: RecordRuntype<E>,
  f: RecordRuntype<F>,
): Runtype<A | B | C | D | E | F>
export function discriminatedUnion<A, B, C, D, E, F, G>(
  key: keyof (A | B | C | D | F | G),
  a: RecordRuntype<A>,
  b: RecordRuntype<B>,
  c: RecordRuntype<C>,
  d: RecordRuntype<D>,
  e: RecordRuntype<E>,
  f: RecordRuntype<F>,
  g: RecordRuntype<G>,
): Runtype<A | B | C | D | E | F | G>
export function discriminatedUnion<A, B, C, D, E, F, G, H>(
  key: keyof (A | B | C | D | F | G | H),
  a: RecordRuntype<A>,
  b: RecordRuntype<B>,
  c: RecordRuntype<C>,
  d: RecordRuntype<D>,
  e: RecordRuntype<E>,
  f: RecordRuntype<F>,
  g: RecordRuntype<G>,
  h: RecordRuntype<H>,
): Runtype<A | B | C | D | E | F | G | H>
export function discriminatedUnion<A, B, C, D, E, F, G, H, I>(
  key: keyof (A | B | C | D | F | G | H | I),
  a: RecordRuntype<A>,
  b: RecordRuntype<B>,
  c: RecordRuntype<C>,
  d: RecordRuntype<D>,
  e: RecordRuntype<E>,
  f: RecordRuntype<F>,
  g: RecordRuntype<G>,
  h: RecordRuntype<H>,
  i: RecordRuntype<I>,
): Runtype<A | B | C | D | E | F | G | H | I>
export function discriminatedUnion<A, B, C, D, E, F, G, H, I, J>(
  key: keyof (A | B | C | D | F | G | H | I | J),
  a: RecordRuntype<A>,
  b: RecordRuntype<B>,
  c: RecordRuntype<C>,
  d: RecordRuntype<D>,
  e: RecordRuntype<E>,
  f: RecordRuntype<F>,
  g: RecordRuntype<G>,
  h: RecordRuntype<H>,
  i: RecordRuntype<I>,
  j: RecordRuntype<J>,
): Runtype<A | B | C | D | E | F | G | H | I | J>
export function discriminatedUnion(
  // key: any,
  // ...runtypes: Array<RecordRuntype<any>>
  ...args: any[]
): Runtype<any> {
  const key = args[0]
  const runtypes = args.slice(1)
  const typeMap: any = {}

  runtypes.forEach(t => {
    const tagValue = t.constants[key]

    if (!(typeof tagValue === 'string' || typeof tagValue === 'number')) {
      throw new Error(
        `broken record type definition, ${t}[${key}] must be a string or number, not ${debugValue(
          tagValue,
        )}`,
      )
    }

    // use `object` to also allow enums but they can't be used in types
    // for keys of indexes so we need any
    typeMap[tagValue as any] = t
  })

  return (v: unknown) => {
    const o: any = objectRuntype(v)
    const tagValue = o[key]
    const rt = typeMap[tagValue]

    if (rt === undefined) {
      throw createError(
        `no Runtype found for discriminated union tag ${key}: ${debugValue(
          tagValue,
        )}`,
        v,
      )
    }

    return rt(v)
  }
}

// TODO: extends(record, record)
// export function intersection<A, B>(
//   recordA: RecordRuntype<A>,
//   recordB: RecordRuntype<B>,
// ): Runtype<A & B> {
//
// }
