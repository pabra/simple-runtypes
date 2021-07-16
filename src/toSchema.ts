import type { Runtype } from './runtype'
import { toSchema as stringToSchema } from './string'

export function toSchema(runtype: Runtype<any>): string {
  switch ((runtype as any)?.schema?.type) {
    case 'string':
      return stringToSchema(runtype)

    default:
      throw new Error(`${(runtype as any)?.schema}`)
  }
}
