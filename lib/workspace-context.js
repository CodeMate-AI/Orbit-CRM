const ACTIVE_WORKSPACE_STORAGE_KEY = "orbit_active_workspace_id";

function resolveActiveMembership(memberships, preferredWorkspaceId, savedWorkspaceId) {
  if (!memberships.length) {
    return null;
  }

  return (
    memberships.find((membership) => membership.workspaceId === preferredWorkspaceId)
    ?? memberships.find((membership) => membership.workspaceId === savedWorkspaceId)
    ?? memberships[0]
  );
}

function isOwnerRole(role) {
  return role === "OWNER";
}

module.exports = {
  ACTIVE_WORKSPACE_STORAGE_KEY,
  resolveActiveMembership,
  isOwnerRole,
};
