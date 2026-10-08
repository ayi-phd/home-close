import { Form, Link, redirect, useLoaderData, type ActionFunctionArgs } from 'react-router';
import { api } from '../../api';
import { addMonths } from '../../api/dates';
import { AuthLayout } from '../../components/AuthLayout';
import { Field } from '../../components/Field';
import { formatPeriod } from '../../components/format';
import { showToast } from '../../components/toast';
import { str } from '../helpers';

export async function loader() {
  const { currentPeriod } = await api.session.get();
  return { periods: [currentPeriod, addMonths(currentPeriod, -1), addMonths(currentPeriod, 1)] };
}

// UI only for v0: submitting creates nothing real and continues into the app.
export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  await api.session.signup({
    firstName: str(form, 'firstName'),
    lastName: str(form, 'lastName'),
    householdName: str(form, 'householdName'),
    email: str(form, 'email'),
    password: str(form, 'password'),
    startPeriod: str(form, 'startPeriod'),
  });
  showToast('Household created');
  return redirect('/');
}

export default function Signup() {
  const { periods } = useLoaderData<typeof loader>();
  return (
    <AuthLayout>
      <Form method="post" className="auth-form">
        <div className="stack-xs">
          <span className="eyebrow">Step 1 of 3 · Account</span>
          <h2>Create your household</h2>
          <p className="muted">Next you'll add your checking accounts, then your recurring bills.</p>
        </div>
        <div className="proto-note">Prototype: sign-up is not connected yet. Any input continues to the app.</div>
        <div className="grid2">
          <Field label="First name">{(p) => <input {...p} className="input" name="firstName" autoComplete="given-name" placeholder="Alex" />}</Field>
          <Field label="Last name">{(p) => <input {...p} className="input" name="lastName" autoComplete="family-name" placeholder="Rivera" />}</Field>
        </div>
        <Field label="Household name" hint="Shown on your monthly close reports.">
          {(p) => <input {...p} className="input" name="householdName" placeholder="Rivera Household" />}
        </Field>
        <Field label="Email">{(p) => <input {...p} className="input" type="email" name="email" autoComplete="email" placeholder="you@example.com" />}</Field>
        <Field label="Password" hint="At least 12 characters.">
          {(p) => <input {...p} className="input" type="password" name="password" autoComplete="new-password" />}
        </Field>
        <Field label="Start closing from">
          {(p) => (
            <select {...p} className="input" name="startPeriod">
              {periods.map((period) => (
                <option key={period} value={period}>
                  {formatPeriod(period)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <button className="btn primary lg" type="submit">Create account</button>
        <p className="small muted text-center">
          Already have an account? <Link to="/login" className="link-strong">Sign in</Link>
        </p>
      </Form>
    </AuthLayout>
  );
}
