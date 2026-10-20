import { describe, expect, it } from 'vitest';
import { checkImportFile, guestTemplate, parseCsv, reviewImport } from '../../../src/domain/guestImport.js';

const bytes = (text: string) => new TextEncoder().encode(text);

describe('parseCsv', () => {
  it('reads quoted fields with commas, escaped quotes, line breaks and CRLF endings', () => {
    expect(parseCsv('name,notes\r\n"Chen, Maya","She said ""hi""\nthen left"\r\nSam,\r\n')).toEqual([
      ['name', 'notes'],
      ['Chen, Maya', 'She said "hi"\nthen left'],
      ['Sam', ''],
    ]);
  });

  it('drops a byte-order mark and blank lines', () => {
    expect(parseCsv('\uFEFFname\n\nMaya\n')).toEqual([['name'], ['Maya']]);
  });
});

describe('L2-025 checkImportFile', () => {
  it('AC1 refuses a file that is not a .csv', () => {
    expect(checkImportFile('guests.xlsx', bytes('name,email'))).toEqual({ ok: false, error: 'Choose a .csv file' });
  });

  it('AC2 refuses a file over 5 MB or over 2,000 data rows, naming the limit', () => {
    expect(checkImportFile('g.csv', new Uint8Array(5 * 1024 * 1024 + 1))).toEqual({ ok: false, error: 'The file is over the 5 MB limit' });
    const rows = Array.from({ length: 2001 }, (_, i) => `G${i},g${i}@x.co`).join('\n');
    expect(checkImportFile('g.csv', bytes(`name,email\n${rows}`))).toEqual({ ok: false, error: 'The file has more than 2,000 rows' });
  });

  it('AC3 maps each detected column to its field, in any order and case', () => {
    const r = checkImportFile('G.CSV', bytes('E-mail,Full name,Plus-ones,Group,Dietary\nmaya@example.com,Maya,1,Friends,none'));
    expect(r.ok && r.columns).toEqual([
      { header: 'E-mail', field: 'email' },
      { header: 'Full name', field: 'name' },
      { header: 'Plus-ones', field: 'plusOnes' },
      { header: 'Group', field: 'group' },
      { header: 'Dietary', field: null },
    ]);
  });

  it('AC4 needs an Email column', () => {
    expect(checkImportFile('g.csv', bytes('name,group\nMaya,Friends'))).toEqual({ ok: false, error: 'Email is needed to send invitations' });
  });

  it('AC5 needs UTF-8', () => {
    expect(checkImportFile('g.csv', new Uint8Array([0x6e, 0x61, 0x6d, 0x65, 0x0a, 0xff, 0xfe]))).toEqual({ ok: false, error: 'The file must be saved as UTF-8' });
  });
});

describe('L2-026 reviewImport', () => {
  const file = (text: string) => {
    const r = checkImportFile('g.csv', bytes(text));
    if (!r.ok) throw new Error(r.error);
    return r;
  };

  it('AC1 lists error rows with their row number and reason; AC2 marks duplicates of the event and of the file', () => {
    const review = reviewImport(file('name,email,plus-ones\nMaya,maya@example.com,1\n,nameless@example.com,0\nSam,bad,0\nAna,ana@example.com,x\nOld,old@example.com,0\nMaya again,MAYA@example.com,0'), ['old@example.com']);
    expect(review.rows.map((r) => [r.row, r.status, r.problem])).toEqual([
      [2, 'ready', undefined],
      [3, 'error', "Add the guest's full name"],
      [4, 'error', 'Enter an email like name@example.com'],
      [5, 'error', 'Plus-ones must be a whole number from 0 to 9'],
      [6, 'duplicate', 'This email is already on the list'],
      [7, 'duplicate', 'This email is already on the list'],
    ]);
    expect(review.counts).toEqual({ ready: 1, error: 3, duplicate: 2 });
  });

  it('AC5 flags a group that is not Friends, Family or Work', () => {
    const review = reviewImport(file('name,email,group\nMaya,maya@example.com,Neighbours\nSam,sam@example.com,family\nAna,ana@example.com,'), []);
    expect(review.rows.map((r) => [r.group, r.groupNotice])).toEqual([
      ['Friends', 'Group will be set to Friends'],
      ['Family', undefined],
      ['', undefined],
    ]);
  });
});

describe('L2-027 guestTemplate', () => {
  it('AC1 names the file after the event slug; AC2 has the four columns and one example row', () => {
    const t = guestTemplate("Maya's 30th Birthday!");
    expect(t.fileName).toBe('mayas-30th-birthday-guests-template.csv');
    expect(parseCsv(t.content)).toEqual([['name', 'email', 'group', 'plus-ones'], ['Maya Chen', 'maya@example.com', 'Friends', '1']]);
  });
});
