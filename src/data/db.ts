import { DatabaseSync } from 'node:sqlite';

export type Db = DatabaseSync;

const SCHEMA = `
create table if not exists organisers (
  id integer primary key autoincrement,
  email text not null unique,
  name text not null,
  password_hash text not null,
  password_version integer not null default 1
);
create table if not exists sessions (
  id text primary key,
  organiser_id integer not null references organisers(id),
  password_version integer not null,
  last_seen integer not null,
  expires_at integer
);
create table if not exists events (
  id integer primary key autoincrement,
  organiser_id integer not null references organisers(id),
  type text not null,
  name text not null,
  date text not null,
  start_time text not null,
  venue text not null default '',
  status text not null default 'Draft',
  invite_open text not null,
  invite_close text not null,
  created_at text not null
);
create table if not exists guests (
  id integer primary key autoincrement,
  event_id integer not null references events(id) on delete cascade,
  name text not null,
  email text not null,
  group_name text not null default '',
  plus_ones integer not null default 0,
  token text not null unique,
  code text not null unique,
  created_at text not null,
  unique (event_id, email)
);
create table if not exists pages (
  event_id integer primary key references events(id) on delete cascade,
  draft text not null default '[]',
  published text,
  draft_saved_at text,
  published_at text
);
create table if not exists emails (
  id integer primary key autoincrement,
  event_id integer not null references events(id) on delete cascade,
  kind text not null,
  audience text not null,
  subject text not null,
  send_at text not null,
  status text not null,
  recipients integer not null,
  sender_name text not null default '',
  reply_to text not null default ''
);
create table if not exists responses (
  guest_id integer primary key references guests(id) on delete cascade,
  attending integer not null,
  party_size integer not null,
  meal text,
  guest_names text not null default '[]',
  dietary text not null default '',
  song text not null default '',
  message text not null default '',
  updated_at text not null
);
`;

export function openDb(path = ':memory:'): Db {
  const db = new DatabaseSync(path);
  db.exec('pragma foreign_keys = on');
  db.exec(SCHEMA);
  return db;
}
