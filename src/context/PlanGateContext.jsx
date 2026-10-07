import { createContext, useContext } from 'react';

// Feature-level subscription gating. The workspace stays open without a plan; only
// actions that consume plan quota (creating or assigning agents, inviting members)
// ask for one first.
//
// `hasActivePlan` is true or false when the plan is known, and null when it isn't:
// the subscription endpoint is owner-only, so admins and members never know. Unknown
// lets the action through and the backend's 402/403 has the final say.
//
// `requireActivePlan(action)` returns true when the action may go ahead; otherwise it
// shows the upgrade prompt for that action and returns false.
const PlanGateContext = createContext({
  hasActivePlan: null,
  requireActivePlan: () => true,
});

export function PlanGateProvider({ value, children }) {
  return <PlanGateContext.Provider value={value}>{children}</PlanGateContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlanGate() {
  return useContext(PlanGateContext);
}
