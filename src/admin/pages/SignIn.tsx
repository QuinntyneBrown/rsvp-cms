import { useState, type FormEvent } from 'react';
import { ApiError, post } from '../../shared/ui/api.js';
import { Field } from '../../shared/ui/components.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInPage({ onSignedIn, notice }: { onSignedIn: (name: string) => void; notice?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return; // no double submit
    setFormError(undefined);
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Enter an email like name@example.com');
      document.getElementById('si-email')?.focus();
      return;
    }
    setEmailError(undefined);
    setBusy(true);
    try {
      const res = await post<{ name: string }>('/api/auth/sign-in', { email: email.trim(), password, keepSignedIn: keep });
      onSignedIn(res.name);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  }

  return (
    <main id="main" className="auth-layout">
      <div className="auth-card card stack">
        <div>
          <h1>Sign in to Invitely</h1>
          <p className="text-muted">Organisers manage events here. Guests use their invitation link.</p>
        </div>
        {(notice || formError) && <p role="alert" className="field__error">{formError ?? notice}</p>}
        <form className="stack" aria-label="Sign in" onSubmit={submit} noValidate>
          <Field label="Email" id="si-email" error={emailError}>
            <input className="input" id="si-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" id="si-pass">
            <input className="input" id="si-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <label className="choice">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
            <span className="choice__text">Keep me signed in</span>
          </label>
          <button className="btn btn--primary btn--block" type="submit" disabled={busy} aria-busy={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
