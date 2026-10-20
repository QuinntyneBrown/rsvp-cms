import type { ReactNode } from 'react';
import { Container, Footer, SkipLink, TopBar, TopBarBrand } from '../shared/ui/components/index.js';
import { Icon, Text } from '../shared/ui/primitives/index.js';

/** The guest page shell from the RSVP mocks: the event as the brand, who it is from, and the footer. */
export function GuestLayout({ title = 'Invitely', href = '/', host, children }: { title?: string; href?: string; host?: string; children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <TopBar
        brand={<TopBarBrand href={href} logo={<Icon name="gift" />}>{title}</TopBarBrand>}
        actions={host ? <Text as="span" variant="caption">From {host}</Text> : undefined}
      />
      <Container as="main" id="main" narrow>
        {children}
      </Container>
      <Footer><Text as="span" variant="caption">Sent with Invitely</Text></Footer>
    </>
  );
}
