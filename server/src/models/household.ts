import { model, Schema, type InferSchemaType } from 'mongoose';
import { period } from './common.ts';

const householdSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    startPeriod: { ...period, required: true },
    // v0 has one user per household and no real auth; see middleware/session.ts.
    user: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
    },
  },
  { timestamps: true },
);

export type HouseholdDoc = InferSchemaType<typeof householdSchema>;
export const Household = model('Household', householdSchema);
