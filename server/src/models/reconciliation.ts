import { model, Schema, type InferSchemaType } from 'mongoose';
import { cents, householdRef, isoDate, period } from './common.ts';

const reconciliationSchema = new Schema(
  {
    householdId: householdRef,
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    period: { ...period, required: true },
    bankBalance: { ...cents, default: null },
    asOf: { ...isoDate, default: null },
    status: { type: String, enum: ['open', 'signed-off'], default: 'open' },
    signedOffAt: { ...isoDate, default: null },
    signedOffBy: { type: String, default: null },
  },
  { timestamps: true },
);
reconciliationSchema.index({ householdId: 1, accountId: 1, period: 1 }, { unique: true });

export type ReconciliationDoc = InferSchemaType<typeof reconciliationSchema>;
export const ReconciliationModel = model('Reconciliation', reconciliationSchema);
