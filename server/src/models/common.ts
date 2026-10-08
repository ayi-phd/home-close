import { Schema } from 'mongoose';

/** Money is stored as integer cents. */
export const cents = {
  type: Number,
  validate: { validator: (v: unknown) => v == null || Number.isSafeInteger(v), message: 'must be integer cents' },
} as const;
export const isoDate = { type: String, match: /^\d{4}-\d{2}-\d{2}$/ } as const;
export const period = { type: String, match: /^\d{4}-\d{2}$/ } as const;
/** Every document belongs to one household; queries always filter on it. */
export const householdRef = { type: Schema.Types.ObjectId, ref: 'Household', required: true, index: true } as const;
