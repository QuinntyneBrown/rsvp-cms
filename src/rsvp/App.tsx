import { CodeEntry } from './CodeEntry.js';
import { InvitePage } from './InvitePage.js';

/** Guests arrive at /i/<token> (personal link) or at / to type a code. */
export function App() {
  const match = window.location.pathname.match(/^\/i\/([^/]+)/);
  return match ? <InvitePage token={decodeURIComponent(match[1]!)} /> : <CodeEntry />;
}
