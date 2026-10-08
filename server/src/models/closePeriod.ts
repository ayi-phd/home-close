import { model, Schema, type InferSchemaType } from 'mongoose';
import { householdRef, isoDate, period } from './common.ts';

/** Only closed periods are stored; a period without a record is open. */
const closePeriodSchema = new Schema(
  {
    householdId: householdRef,
    period: { ...period, required: true },
    status: { type: String, enum: ['open', 'closed'], required: true },
    closedAt: { ...isoDate, default: null },
    closedBy: { type: String, default: null },
  },
  { timestamps: true },
);
closePeriodSchema.index({ householdId: 1, period: 1 }, { unique: true });

export type ClosePeriodDoc = InferSchemaType<typeof closePeriodSchema>;
export const ClosePeriodModel = model('ClosePeriod', closePeriodSchema);
