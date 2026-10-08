import { model, Schema, type InferSchemaType } from 'mongoose';
import { cents, householdRef, isoDate, period } from './common.ts';

const transactionSchema = new Schema(
  {
    householdId: householdRef,
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    date: { ...isoDate, required: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    kind: { type: String, enum: ['expense', 'deposit', 'transfer', 'bill-payment'], required: true },
    /** Signed cents: negative is money out of the account. */
    amount: { ...cents, required: true },
    cleared: { type: Boolean, default: false },
    billId: { type: Schema.Types.ObjectId, ref: 'Bill', default: null },
    billPeriod: { ...period, default: null },
  },
  { timestamps: true },
);
transactionSchema.index({ householdId: 1, accountId: 1, date: 1 });

export type TransactionDoc = InferSchemaType<typeof transactionSchema>;
export const TransactionModel = model('Transaction', transactionSchema);
