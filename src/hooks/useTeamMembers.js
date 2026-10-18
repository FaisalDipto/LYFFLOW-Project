import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

// Short name for a teammate: the part of their email before the @.
export const memberShortName = (member) => (member?.invited_email || '').split('@')[0] || 'Teammate';

/**
 * Active business members, for assigning conversations and naming who sent a reply.
 * Assignment needs each member's `user_id`; members without one can't be picked.
 * `currentUserId` is the signed-in user's, matched by email.
 *
 * @returns {{ members: object[], byUserId: Map<string, object>, currentUserId: string|null, loaded: boolean }}
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
  const byUserId = new Map(list.filter(member => member.user_id).map(member => [member.user_id, member]));
  const email = (currentEmail || '').toLowerCase();
  const currentUserId = list.find(member => member.user_id && member.invited_email?.toLowerCase() === email)?.user_id || null;
  return { members: list, byUserId, currentUserId, loaded: members !== null };
}
