import { useState, type FormEvent } from 'react';
import { ApiError, post } from '../../shared/ui/api.js';
import { Alert, AuthLayout, Button, Checkbox, Stack, TextField } from '../../shared/ui/components/index.js';

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
    <AuthLayout title="Sign in to Invitely" description="Organisers manage events here. Guests use their invitation link.">
      {(notice || formError) && <Alert tone="danger" live>{formError ?? notice}</Alert>}
      <Stack as="form" aria-label="Sign in" onSubmit={submit} noValidate>
        <TextField label="Email" id="si-email" type="email" autoComplete="username" error={emailError} value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" id="si-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Checkbox label="Keep me signed in" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
        <Button variant="primary" type="submit" block disabled={busy} loading={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>
    </AuthLayout>
  );
}
