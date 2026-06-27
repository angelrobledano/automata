import { getInboxSessions } from '../../../../src/dashboard/inbox';
import InboxClient from './InboxClient';

import { cookies } from 'next/headers';
import { verifyToken } from '../../lib/jwt';

export const dynamic = 'force-dynamic';

export default async function ConversacionesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  let commerceId = 'commerce-seed-id';

  if (token) {
    const payload = await verifyToken(token);
    if (payload && payload.commerceId) {
      commerceId = payload.commerceId as string;
    }
  }

  let sessions: any[] = [];
  try {
    sessions = await getInboxSessions(commerceId);
  } catch (error) {
    console.error('Error fetching sessions.', error);
  }

  return (
    <InboxClient initialSessions={sessions} />
  );
}
