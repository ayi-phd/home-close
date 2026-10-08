import { model, Schema, type InferSchemaType } from 'mongoose';
import { cents, householdRef, isoDate } from './common.ts';

const accountSchema = new Schema(
  {
    householdId: householdRef,
    name: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    type: { type: String, enum: ['checking', 'savings'], required: true },
    last4: { type: String, required: true, match: /^\d{4}$/ },
    openingBalance: { ...cents, required: true },
    openingDate: { ...isoDate, required: true },
    role: { type: String, default: '' },
    color: { type: String, required: true },
  },
  { timestamps: true },
);

export type AccountDoc = InferSchemaType<typeof accountSchema>;
export const AccountModel = model('Account', accountSchema);
