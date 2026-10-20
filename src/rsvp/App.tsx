import { Container, SkipLink } from '../shared/ui/components/index.js';
import { CodeEntry } from './CodeEntry.js';
import { InvitePage } from './InvitePage.js';

/** Guests arrive at /i/<token> (personal link) or at / to type a code. */
export function App() {
  const match = window.location.pathname.match(/^\/i\/([^/]+)/);
  return (
    <>
      <SkipLink />
      <Container as="main" id="main" narrow>
        {match ? <InvitePage token={decodeURIComponent(match[1]!)} /> : <CodeEntry />}
      </Container>
    </>
  );
}
