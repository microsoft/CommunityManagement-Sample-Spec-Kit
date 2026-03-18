import type { Role, PermissionAction, EffectiveRole } from "../types/permissions";

/**
 * Role-capability matrix (R-3).
 * Maps each role to the set of actions it can perform.
 */
const ROLE_CAPABILITIES: Record<Role, Set<PermissionAction>> = {
  global_admin: new Set([
    "createEvent", "editEvent", "deleteEvent",
    "createVenue", "editVenue",
    "manageGrants", "approveRequests", "viewAdminPanel",
    "rsvp", "post", "follow",
    "moderateThread", "moderateReports", "approveConcession",
  ]),
  country_admin: new Set([
    "createEvent", "editEvent", "deleteEvent",
    "createVenue", "editVenue",
    "manageGrants", "approveRequests", "viewAdminPanel",
    "rsvp", "post", "follow",
    "moderateThread", "moderateReports", "approveConcession",
  ]),
  city_admin: new Set([
    "createEvent", "editEvent", "deleteEvent",
    "createVenue", "editVenue",
    "manageGrants", "approveRequests", "viewAdminPanel",
    "rsvp", "post", "follow",
    "moderateThread", "moderateReports", "approveConcession",
  ]),
  event_creator: new Set([
    "createEvent", "editEvent",
    "createVenue", "editVenue",
    "rsvp", "post", "follow",
  ]),
};

/** Member capabilities (implicit role for all authenticated users) */
const MEMBER_CAPABILITIES: Set<PermissionAction> = new Set([
  "rsvp", "post", "follow",
]);

export function roleHasCapability(role: Role, action: PermissionAction): boolean {
  return ROLE_CAPABILITIES[role]?.has(action) ?? false;
}

export function effectiveRoleHasCapability(
  role: EffectiveRole,
  action: PermissionAction,
): boolean {
  if (role === "visitor") return false;
  if (role === "member") return MEMBER_CAPABILITIES.has(action);
  return roleHasCapability(role as Role, action);
}
