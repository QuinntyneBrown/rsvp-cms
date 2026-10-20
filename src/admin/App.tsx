import { useEffect, useState } from 'react';
import { ApiError, get, post, setUnauthorizedHandler } from '../shared/ui/api.js';
import { Avatar, Button, Container, Sidebar, SidebarLayout, SkipLink, Skeleton, TopBar, TopBarBrand } from '../shared/ui/components/index.js';
import { Icon, Text } from '../shared/ui/primitives/index.js';
import { EventShell } from './pages/EventShell.js';
import { EventsPage } from './pages/Events.js';
import { NewEventPage } from './pages/NewEvent.js';
import { SignInPage } from './pages/SignIn.js';
import { go, useRoute } from './router.js';

type Auth = { state: 'checking' } | { state: 'out'; notice?: string } | { state: 'in'; name: string };

const SESSION_ENDED = 'Your session ended. Sign in again.';

export function App() {
  const route = useRoute();
  const [auth, setAuth] = useState<Auth>({ state: 'checking' });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    get<{ name: string }>('/api/auth/me').then(
      (me) => setAuth({ state: 'in', name: me.name }),
      (e: ApiError) => setAuth({ state: 'out', notice: e.message === SESSION_ENDED ? e.message : undefined }),
    );
  }, []);

  // Any request that finds the session gone sends the organiser back to Sign in (L2-005 AC1).
  const signedIn = auth.state === 'in';
  useEffect(() => {
    if (!signedIn) return;
    setUnauthorizedHandler(() => setAuth({ state: 'out', notice: SESSION_ENDED }));
    return () => setUnauthorizedHandler(null);
  }, [signedIn]);

  if (auth.state === 'checking') {
    return <Container as="main" id="main" narrow><Skeleton rows={3} label="Checking your session" /></Container>;
  }

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
      <SkipLink />
      <SidebarLayout
        sidebar={
          <Sidebar
            id="primary-nav"
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onNavigate={() => setMenuOpen(false)}
            brand={<TopBarBrand href="#/events" logo={<Icon name="gift" />}>Invitely</TopBarBrand>}
            groups={[{ items: [{ href: '#/events', label: 'Events', icon: <Icon name="calendar" />, current: section === 'events' || !section }] }]}
          />
        }
      >
        <TopBar
          onMenuToggle={() => setMenuOpen((o) => !o)}
          menuOpen={menuOpen}
          menuControls="primary-nav"
          actions={
            <>
              <Avatar name={auth.name} size="sm" decorative />
              <Text as="span" variant="body-sm">{auth.name}</Text>
              <Button variant="ghost" onClick={signOut}>Sign out</Button>
            </>
          }
        />
        <Container as="main" id="main">
          {section === 'events' && id === 'new' ? (
            <NewEventPage />
          ) : section === 'events' && id ? (
            <EventShell eventId={Number(id)} tab={tab ?? 'overview'} />
          ) : (
            <EventsPage />
          )}
        </Container>
      </SidebarLayout>
    </>
  );
}
