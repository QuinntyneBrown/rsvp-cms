import { Badge } from '../shared/ui/components/index.js';

const TONE = { attending: 'success', declined: 'neutral', waiting: 'warning' } as const;
const LABEL = { attending: 'Attending', declined: 'Declined', waiting: 'Waiting' } as const;

/** A guest's reply as the Guests and Responses mocks show it. */
export function ReplyBadge({ reply }: { reply: keyof typeof TONE }) {
  return <Badge tone={TONE[reply]}>{LABEL[reply]}</Badge>;
}
