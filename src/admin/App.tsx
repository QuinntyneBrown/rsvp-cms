import { useEffect, useState } from 'react';
import { ApiError, get, post } from '../shared/ui/api.js';
import { Skeleton } from '../shared/ui/components.js';
import { EventShell } from './pages/EventShell.js';
import { EventsPage } from './pages/Events.js';
import { NewEventPage } from './pages/NewEvent.js';
import { SignInPage } from './pages/SignIn.js';
import { go, useRoute } from './router.js';

type Auth = { state: 'checking' } | { state: 'out'; notice?: string } | { state: 'in'; name: string };

export function App() {
  const route = useRoute();
  const [auth, setAuth] = useState<Auth>({ state: 'checking' });

  useEffect(() => {
    get<{ name: string }>('/api/auth/me').then(
      (me) => setAuth({ state: 'in', name: me.name }),
      (e: ApiError) => setAuth({ state: 'out', notice: e.message === 'Your session ended. Sign in again.' ? e.message : undefined }),
    );
  }, []);

  if (auth.state === 'checking') return <main className="container"><Skeleton /></main>;

  if (auth.state === 'out') {
    return <SignInPage notice={auth.notice} onSignedIn={(name) => { setAuth({ state: 'in', name }); go('events'); }} />;
  }

  const signOut = async () => {
    await post('/api/auth/sign-out');
    setAuth({ state: 'out' });
  };
  const [section, id, tab] = route;

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="topbar">
        <a className="topbar__brand" href="#/events">Invitely</a>
        <span className="topbar__spacer" />
        <span>{auth.name}</span>
        <button className="btn btn--ghost" type="button" onClick={signOut}>Sign out</button>
      </header>
      <main id="main" className="container">
        {section === 'events' && id === 'new' ? (
          <NewEventPage />
        ) : section === 'events' && id ? (
          <EventShell eventId={Number(id)} tab={tab ?? 'overview'} />
        ) : (
          <EventsPage />
        )}
      </main>
    </>
  );
}
