import { createContext, useContext, useMemo } from 'react';

// Mirrors the backend's role_at_least(): owner > admin > member.
const ROLE_RANK = { member: 0, admin: 1, owner: 2 };

// eslint-disable-next-line react-refresh/only-export-components
export const roleAtLeast = (role, minimum) =>
  role in ROLE_RANK && ROLE_RANK[role] >= ROLE_RANK[minimum];

// eslint-disable-next-line react-refresh/only-export-components
export const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Member' };

const BusinessContext = createContext({
  business: null,
  role: null,
  refreshBusiness: async () => {},
});

/**
 * Holds the session's active business (from GET /v1/business) for the dashboard tree.
 * The role here only decides what the UI offers; the backend enforces the same rules
 * and answers 403 regardless.
 */
export function BusinessProvider({ business, role, refreshBusiness, children }) {
  const value = useMemo(
    () => ({ business, role, refreshBusiness }),
    [business, role, refreshBusiness]
  );
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBusiness() {
  const { business, role, refreshBusiness } = useContext(BusinessContext);
  return {
    business,
    role,
    refreshBusiness,
    isOwner: role === 'owner',
    // Admin-or-owner: business settings, members, pages, agents, knowledge, products.
    canManage: roleAtLeast(role, 'admin'),
  };
}
