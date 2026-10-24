import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

// Short name for a teammate: the part of their email before the @.
export const memberShortName = (member) => (member?.invited_email || '').split('@')[0] || 'Teammate';

/**
 * Active business members, for assigning conversations and naming who sent a reply.
 * Inside a business teammates are identified by `member_id` (assignments, senders,
 * order creators). `currentMemberId` is the signed-in user's, matched by email.
 *
 * @returns {{ members: object[], byMemberId: Map<string, object>, currentMemberId: string|null, loaded: boolean }}
 */
export function useTeamMembers(currentEmail) {
  const [members, setMembers] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiService.getBusinessMembers()
      .then(list => {
        if (!cancelled) setMembers((Array.isArray(list) ? list : []).filter(member => member.status === 'active'));
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Failed to load team members:', error);
        setMembers([]);
      });
    return () => { cancelled = true; };
  }, []);

  const list = members || [];
  const byMemberId = new Map(list.map(member => [member.member_id, member]));
  const email = (currentEmail || '').toLowerCase();
  const currentMemberId = list.find(member => member.invited_email?.toLowerCase() === email)?.member_id || null;
  return { members: list, byMemberId, currentMemberId, loaded: members !== null };
}
