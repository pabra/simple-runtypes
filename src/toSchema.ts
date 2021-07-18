import type { Runtype } from './runtype'
import { toSchema as anyToSchema } from './any'
import type { Meta as AnyMeta } from './any'
import { toSchema as arrayToSchema } from './array'
import type { Meta as ArrayMeta } from './array'
import { toSchema as booleanToSchema } from './boolean'
import type { Meta as BooleanMeta } from './boolean'
import { toSchema as customToSchema } from './custom'
import type { Meta as CustomMeta } from './custom'
import { toSchema as dictionaryToSchema } from './dictionary'
import type { Meta as DictionaryMeta } from './dictionary'
import { toSchema as enumToSchema } from './enum'
import type { Meta as EnumMeta } from './enum'
import { toSchema as guardedByToSchema } from './guardedBy'
import type { Meta as GuardedByMeta } from './guardedBy'
import { toSchema as ignoreToSchema } from './ignore'
import type { Meta as IgnoreMeta } from './ignore'
import { toSchema as integerToSchema } from './integer'
import type { Meta as IntegerMeta } from './integer'
import { toSchema as jsonToSchema } from './json'
import type { Meta as JsonMeta } from './json'
import { toSchema as literalToSchema } from './literal'
import type { Meta as LiteralMeta } from './literal'
import { toSchema as recordToSchema } from './record'
import type { Meta as RecordMeta } from './record'
import { toSchema as stringToSchema } from './string'
import type { Meta as StringMeta } from './string'

export type Meta =
  | AnyMeta
  | ArrayMeta
  | BooleanMeta
  | CustomMeta
  | DictionaryMeta
  | EnumMeta
  | GuardedByMeta
  | IgnoreMeta
  | IntegerMeta
  | JsonMeta
  | LiteralMeta
  | RecordMeta
  | StringMeta

function assertNever(x: never): never {
  throw new Error(`unexpected object ${x}`)
}

export function toSchema(runtype: Runtype<any>): string {
  const meta: Meta = (runtype as any).meta

  // TODO: remove
  if (meta === undefined) {
    throw new Error(`undefined meta: ${runtype}`)
  }

  switch (meta.type) {
    case 'any':
      return anyToSchema()

    case 'array':
      return arrayToSchema(runtype, toSchema)

    case 'boolean':
      return booleanToSchema()

    case 'custom':
      return customToSchema()

    case 'dictionary':
      return dictionaryToSchema(runtype, toSchema)

    case 'enum':
      return enumToSchema(runtype)

    case 'guardedBy':
      return guardedByToSchema()

    case 'ignore':
      return ignoreToSchema()

    case 'integer':
      return integerToSchema()

    case 'json':
      return jsonToSchema()

    case 'literal':
      return literalToSchema(runtype)

    case 'record':
      return recordToSchema(runtype, toSchema)

    case 'string':
      return stringToSchema()

    default:
      assertNever(meta)
  }
}
