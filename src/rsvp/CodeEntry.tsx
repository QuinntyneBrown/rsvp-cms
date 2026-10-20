import { useState, type FormEvent } from 'react';
import { ApiError, post } from '../shared/ui/api.js';
import { Field } from '../shared/ui/components.js';

export function CodeEntry() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await post<{ token: string }>('/api/public/code', { code });
      window.location.assign(`/i/${encodeURIComponent(res.token)}`);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.errors?.code ?? apiErr.message);
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={submit} noValidate aria-label="Find your invitation">
      <h1>Find your invitation</h1>
      <p className="text-muted">Type the code from your invitation email, like MAYA-7K2Q.</p>
      <Field label="Invitation code" id="code" error={error}>
        <input className="input" id="code" autoCapitalize="characters" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
      </Field>
      <button className="btn btn--primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Looking…' : 'Find my invitation'}</button>
    </form>
  );
}
