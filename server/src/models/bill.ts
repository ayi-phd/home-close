import { model, Schema, type InferSchemaType } from 'mongoose';
import { cents, householdRef } from './common.ts';

const billSchema = new Schema(
  {
    householdId: householdRef,
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['utilities', 'internet-mobile', 'credit-card', 'loan'], required: true },
    lines: { type: [String], required: true, validate: { validator: (v: string[]) => v.length > 0, message: 'needs at least one line' } },
    frequency: { type: String, enum: ['monthly', 'bimonthly', 'quarterly'], required: true },
    cycleAnchorMonth: { type: Number, min: 1, max: 12, default: null },
    statementDay: { type: Number, min: 1, max: 31, default: null },
    dueRule: {
      kind: { type: String, enum: ['fixed-day', 'days-after-statement'], required: true },
      day: { type: Number, min: 1, max: 31 },
      days: { type: Number, min: 1, max: 90 },
    },
    amountType: { type: String, enum: ['fixed', 'varies'], required: true },
    typicalAmount: { ...cents, required: true, min: 0 },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    autopay: { type: Boolean, default: false },
    reference: { type: String, default: '', match: /^\d{0,4}$/ },
    defaultPayment: { type: String, enum: ['statement', 'minimum', 'fixed', null], default: null },
    loan: {
      type: new Schema({ balance: { ...cents, min: 0 }, paymentsLeft: { type: Number, min: 0 }, aprBps: { type: Number, default: null } }, { _id: false }),
      default: null,
    },
    color: { type: String, required: true },
    initials: { type: String, required: true },
  },
  { timestamps: true },
);

export type BillDoc = InferSchemaType<typeof billSchema>;
export const BillModel = model('Bill', billSchema);
