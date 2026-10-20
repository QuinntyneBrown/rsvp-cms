import { useState, type FormEvent } from 'react';
import { ApiError, post } from '../shared/ui/api.js';
import { Button, Card, Stack, TextField } from '../shared/ui/components/index.js';
import { GuestLayout } from './GuestLayout.js';

/** "Find my invitation" from the public event mock (L2-037). */
export function CodeEntry() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!code.trim()) {
      setError('Enter your invitation code');
      document.getElementById('code')?.focus();
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const res = await post<{ token: string }>('/api/public/code', { code });
      window.location.assign(`/i/${encodeURIComponent(res.token)}`);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.errors?.code ?? apiErr.message);
      setBusy(false);
      document.getElementById('code')?.focus();
    }
  }

  return (
    <GuestLayout>
      <Card>
        <Stack as="form" onSubmit={submit} noValidate aria-label="Find my invitation">
          <h1>Find my invitation</h1>
          <TextField
            label="Invitation code"
            id="code"
            hint="The code is on your invitation email, like MAYA-7K2Q."
            error={error}
            autoCapitalize="characters"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button variant="primary" type="submit" disabled={busy} loading={busy}>{busy ? 'Checking…' : 'Continue to RSVP'}</Button>
        </Stack>
      </Card>
    </GuestLayout>
  );
}
