import { record } from './record'
import { Runtype, RuntypeUsageError } from './runtype'
import type { Meta } from './toSchema'

/**
 * Build a new record runtype that contains some keys from the original
 */
export function pick<T, K extends keyof T>(
  original: Runtype<T>,
  ...keys: K[]
): Runtype<Pick<T, K>> {
  const meta: Meta = (original as any).meta

  // TODO: remove line below
  if (!meta || meta.type !== 'record') {
    // if (meta.type !== 'record') {
    throw new RuntypeUsageError(`expected a record runtype`)
  }

  const newRecordFields: any = {}

  keys.forEach((k: any) => {
    newRecordFields[k] = meta.fields[k]
  })

  // TODO: keep 'sloppyness'
  return record(newRecordFields) as Runtype<any>
}
