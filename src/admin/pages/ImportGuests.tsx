import { useState } from 'react';
import { guestTemplate, MAX_IMPORT_BYTES, type ImportColumn, type ImportReview } from '../../domain/guestImport.js';
import { ApiError, get, post } from '../../shared/ui/api.js';
import {
  Alert, Breadcrumb, Button, Card, CardHeader, Checkbox, DescriptionList, EmptyState, FormActions, FormField, PageHeader, Skeleton, Stack, Stepper,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from '../../shared/ui/components/index.js';
import { useLoad } from '../../shared/ui/hooks.js';
import { Text } from '../../shared/ui/primitives/index.js';
import type { EventDetail } from './EventShell.js';

const STEPS = ['Upload', 'Map columns', 'Review', 'Done'];
const FIELD_LABEL: Record<string, string> = { name: 'Full name', email: 'Email', group: 'Group', plusOnes: 'Plus-ones' };

interface Upload {
  fileName: string;
  content: string; // base64
}

type Step =
  | { step: 0 }
  | { step: 1; upload: Upload; columns: ImportColumn[]; review: ImportReview }
  | { step: 2; upload: Upload; columns: ImportColumn[]; review: ImportReview }
  | { step: 3; result: { imported: number; skipped: number; failed: number } };

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Import guests from a CSV file (L2-025 to L2-027), as the guest-import mock's four steps. */
export function ImportGuestsPage({ eventId }: { eventId: number }) {
  const event = useLoad(() => get<{ event: EventDetail }>(`/api/events/${eventId}`), [eventId]);
  const [state, setState] = useState<Step>({ step: 0 });

  if (event.loading) return <Skeleton rows={4} label="Loading the event" />;
  if (event.error || !event.data) {
    return <EmptyState tone="error" title="We couldn't load this event" text={event.error ?? ''} actions={<Button onClick={event.reload}>Try again</Button>} />;
  }
  const name = event.data.event.name;
  const guestsHref = `#/events/${eventId}/guests`;

  return (
    <Stack>
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Events', href: '#/events' }, { label: name, href: `#/events/${eventId}` }, { label: 'Guests', href: guestsHref }, { label: 'Import CSV', current: true }]} />}
        title="Import guests"
        subtitle={`${name} · a spreadsheet becomes invitations`}
      />
      <Stepper steps={STEPS} current={state.step} />
      {state.step === 0 && <UploadStep eventId={eventId} eventName={name} onReviewed={(upload, columns, review) => setState({ step: 1, upload, columns, review })} />}
      {state.step === 1 && (
        <MapStep columns={state.columns} onBack={() => setState({ step: 0 })} onNext={() => setState({ ...state, step: 2 })} />
      )}
      {state.step === 2 && (
        <ReviewStep eventId={eventId} upload={state.upload} review={state.review} onBack={() => setState({ step: 0 })} onDone={(result) => setState({ step: 3, result })} />
      )}
      {state.step === 3 && (
        <Card as="section">
          <CardHeader title={`${state.result.imported} ${state.result.imported === 1 ? 'guest' : 'guests'} imported`} subtitle="Nothing was sent yet; schedule the invitation when you are ready." />
          <Stack>
            <DescriptionList
              items={[
                { term: 'Imported', description: state.result.imported },
                { term: 'Skipped', description: state.result.skipped },
                { term: 'Failed', description: state.result.failed },
              ]}
            />
            <FormActions align="start">
              <Button variant="primary" href={guestsHref}>Back to guests</Button>
              <Button href={`#/events/${eventId}/emails`}>Schedule invitations</Button>
            </FormActions>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

function UploadStep({ eventId, eventName, onReviewed }: { eventId: number; eventName: string; onReviewed: (u: Upload, c: ImportColumn[], r: ImportReview) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function next() {
    if (busy) return;
    if (!file) return setError('Choose a .csv file');
    if (!/\.csv$/i.test(file.name)) return setError('Choose a .csv file'); // nothing is sent (L2-025 AC1)
    if (file.size > MAX_IMPORT_BYTES) return setError('The file is over the 5 MB limit');
    setBusy(true);
    setError(undefined);
    try {
      const upload = { fileName: file.name, content: toBase64(new Uint8Array(await file.arrayBuffer())) };
      const res = await post<{ columns: ImportColumn[] } & ImportReview>(`/api/events/${eventId}/guests/import/review`, upload);
      onReviewed(upload, res.columns, { rows: res.rows, counts: res.counts });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.errors.file ?? apiErr.message);
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const t = guestTemplate(eventName); // L2-027
    const url = URL.createObjectURL(new Blob([t.content], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = t.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card as="section">
      <CardHeader title="Upload a CSV" subtitle="Columns: name, email, group, plus-ones. Headers can be in any order. Email is needed to send invitations." />
      <Stack>
        <FormField label="CSV file" id="import-file" error={error} hint="Up to 5 MB and 2,000 rows, saved as CSV (UTF-8).">
          {(control) => <input {...control} type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(undefined); }} />}
        </FormField>
        <FormActions align="between">
          <Button variant="link" onClick={downloadTemplate}>Download the CSV template</Button>
          <Button variant="primary" onClick={next} disabled={busy} loading={busy}>{busy ? 'Reading the file…' : 'Continue'}</Button>
        </FormActions>
      </Stack>
    </Card>
  );
}

function MapStep({ columns, onBack, onNext }: { columns: ImportColumn[]; onBack: () => void; onNext: () => void }) {
  return (
    <Card as="section">
      <CardHeader title="Map columns" subtitle="Each column in your file and the guest field it fills." />
      <Stack>
        <Table caption="Columns in the file" captionHidden>
          <TableHead>
            <TableRow><TableHeaderCell>Column in the file</TableHeaderCell><TableHeaderCell>Imported as</TableHeaderCell></TableRow>
          </TableHead>
          <TableBody>
            {columns.map((c, i) => (
              <TableRow key={i}><TableCell>{c.header || `Column ${i + 1}`}</TableCell><TableCell>{c.field ? FIELD_LABEL[c.field] : 'Not imported'}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
        <FormActions align="between">
          <Button variant="ghost" onClick={onBack}>Choose a different file</Button>
          <Button variant="primary" onClick={onNext}>Continue</Button>
        </FormActions>
      </Stack>
    </Card>
  );
}

function ReviewStep(props: { eventId: number; upload: Upload; review: ImportReview; onBack: () => void; onDone: (r: { imported: number; skipped: number; failed: number }) => void }) {
  const { review } = props;
  const [skipErrors, setSkipErrors] = useState(false);
  const [acceptGroups, setAcceptGroups] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  const problems = review.rows.filter((r) => r.status !== 'ready');
  const notices = review.rows.filter((r) => r.status === 'ready' && r.groupNotice);
  const blocked = (review.counts.error > 0 && !skipErrors) || (notices.length > 0 && !acceptGroups);

  async function importRows() {
    if (busy || blocked) return;
    setBusy(true);
    setFailure(undefined);
    try {
      props.onDone(await post(`/api/events/${props.eventId}/guests/import`, { ...props.upload, skipErrors, acceptGroups }));
    } catch (err) {
      setFailure((err as ApiError).message); // a retry creates no guest twice (L2-026 AC4)
      setBusy(false);
    }
  }

  return (
    <Card as="section">
      <CardHeader
        title={problems.length ? `${problems.length} ${problems.length === 1 ? 'row needs' : 'rows need'} attention` : 'Every row is ready'}
        subtitle={`${review.counts.ready} ${review.counts.ready === 1 ? 'row is' : 'rows are'} ready to import.`}
      />
      <Stack>
        {failure && (
          <Alert tone="danger" live title="The import didn't finish" actions={<Button size="sm" onClick={importRows}>Try again</Button>}>
            {failure} Trying again adds no guest twice.
          </Alert>
        )}
        {problems.length > 0 && (
          <Table caption="Rows that will not be imported" captionHidden>
            <TableHead>
              <TableRow><TableHeaderCell>Row</TableHeaderCell><TableHeaderCell>Name</TableHeaderCell><TableHeaderCell>Email</TableHeaderCell><TableHeaderCell>Problem</TableHeaderCell></TableRow>
            </TableHead>
            <TableBody>
              {problems.map((r) => (
                <TableRow key={r.row}>
                  <TableCell>Row {r.row}</TableCell><TableCell>{r.name || '—'}</TableCell><TableCell>{r.email || '—'}</TableCell>
                  <TableCell>{r.status === 'duplicate' ? `Duplicate: ${r.problem}. Skipped.` : r.problem}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {review.counts.duplicate > 0 && (
          <Text tone="muted">{review.counts.duplicate} duplicate {review.counts.duplicate === 1 ? 'row is' : 'rows are'} skipped.</Text>
        )}
        {review.counts.error > 0 && (
          <Checkbox label={`Leave out the ${review.counts.error} ${review.counts.error === 1 ? 'row' : 'rows'} with errors`} checked={skipErrors} onChange={(e) => setSkipErrors(e.target.checked)} />
        )}
        {notices.length > 0 && (
          <Checkbox
            label={`Group will be set to Friends for ${notices.map((r) => `row ${r.row}`).join(', ')}`}
            description="Only Friends, Family and Work are groups. Accept to continue."
            checked={acceptGroups}
            onChange={(e) => setAcceptGroups(e.target.checked)}
          />
        )}
        <FormActions align="between">
          <Button variant="ghost" onClick={props.onBack}>Fix rows in the file</Button>
          <Button variant="primary" onClick={importRows} disabled={blocked || busy || review.counts.ready === 0} loading={busy}>
            {busy ? 'Importing…' : `Import ${review.counts.ready} ${review.counts.ready === 1 ? 'guest' : 'guests'}`}
          </Button>
        </FormActions>
      </Stack>
    </Card>
  );
}
