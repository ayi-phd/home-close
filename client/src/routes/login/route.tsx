import { Form, Link, redirect, type ActionFunctionArgs } from 'react-router';
import { api } from '../../api';
import { AuthLayout } from '../../components/AuthLayout';
import { Field } from '../../components/Field';
import { showToast } from '../../components/toast';
import { str } from '../helpers';

// UI only for v0: any input signs in to the sample household.
export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const session = await api.session.login({ email: str(form, 'email'), password: str(form, 'password'), remember: form.has('remember') });
  showToast(`Signed in as ${session.user.firstName} ${session.user.lastName}`);
  return redirect('/');
}

export default function Login() {
  return (
    <AuthLayout>
      <Form method="post" className="auth-form">
        <div className="stack-xs">
          <h2>Sign in</h2>
          <p className="muted">Welcome back. Pick up your close where you left off.</p>
        </div>
        <div className="proto-note">Prototype: sign-in is not connected yet. Any input continues to the app.</div>
        <div className="sso">
          <Link className="btn" to="/">Continue with Google</Link>
          <Link className="btn" to="/">Continue with Apple</Link>
        </div>
        <div className="divider">or with email</div>
        <Field label="Email">{(p) => <input {...p} className="input" type="email" name="email" autoComplete="email" placeholder="you@example.com" />}</Field>
        <Field label="Password" labelExtra={<Link to="/login">Forgot password?</Link>}>
          {(p) => <input {...p} className="input" type="password" name="password" autoComplete="current-password" />}
        </Field>
        <label className="switch">
          <input type="checkbox" name="remember" defaultChecked /> Keep me signed in on this device
        </label>
        <button className="btn primary lg" type="submit">Sign in</button>
        <p className="small muted text-center">
          New to Home Close? <Link to="/signup" className="link-strong">Create an account</Link>
        </p>
      </Form>
    </AuthLayout>
  );
}
