import { optional } from './optional'
import { record } from './record'
import { Runtype, RuntypeUsageError } from './runtype'
import type { Meta } from './toSchema'

/**
 * Build a new record runtype that marks all keys as optional.
 *
 * This is the runtype counterpart to `Partial<T>`.
 */
export function partial<T, K extends keyof T>(
  original: Runtype<T>,
): Runtype<Partial<T>> {
  const meta: Meta = (original as any).meta

  // TODO: remove line below
  if (!meta || meta.type !== 'record') {
    // if (meta.type !== 'record') {
    throw new RuntypeUsageError(`expected a record runtype`)
  }

  const { fields } = meta
  const newRecordFields: any = {}

  for (const k in fields) {
    if (Object.prototype.hasOwnProperty.call(fields, k)) {
      // TODO: detect whether field is already optional and do not apply
      // optional a second time
      newRecordFields[k] = optional(fields[k])
    }
  }

  // TODO: keep 'sloppyness'
  return record(newRecordFields) as Runtype<any>
}
