import { model, Schema, type InferSchemaType } from 'mongoose';
import { cents, householdRef, isoDate, period } from './common.ts';

/** A bill's checklist entry for one period, stored once something has been entered for it. */
const closeItemSchema = new Schema(
  {
    householdId: householdRef,
    period: { ...period, required: true },
    billId: { type: Schema.Types.ObjectId, ref: 'Bill', required: true },
    status: { type: String, enum: ['awaiting', 'entered', 'scheduled', 'paid'], required: true },
    statementDate: { ...isoDate, default: null },
    dueDate: { ...isoDate, default: null },
    amount: { ...cents, required: true },
    estimated: { type: Boolean, default: false },
    lines: [new Schema({ name: { type: String, required: true }, amount: { ...cents, required: true } }, { _id: false })],
    servicePeriod: { type: new Schema({ start: isoDate, end: isoDate }, { _id: false }), default: null },
    minimumDue: { ...cents, default: null },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    scheduledDate: { ...isoDate, default: null },
    paidDate: { ...isoDate, default: null },
    paidAmount: { ...cents, default: null },
    method: { type: String, enum: ['website', 'autopay', 'bill-pay', 'check', null], default: null },
    confirmation: { type: String, default: null },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
    signedOff: { type: Boolean, default: false },
  },
  { timestamps: true },
);
closeItemSchema.index({ householdId: 1, period: 1, billId: 1 }, { unique: true });

export type CloseItemDoc = InferSchemaType<typeof closeItemSchema>;
export const CloseItemModel = model('CloseItem', closeItemSchema);
