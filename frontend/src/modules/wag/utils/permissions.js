// Role helper untuk UX saja — keamanan tetap di backend requireRole().
export const ROLE_RANK = { viewer: 1, operator: 2, admin: 3 };

export const ROLE_LABELS = {
  admin: "Admin",
  operator: "Operator",
  viewer: "Viewer",
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || "—";
}

export function can(user, minRole) {
  const rank = ROLE_RANK[user?.role];
  if (!rank) return false;
  return rank >= (ROLE_RANK[minRole] || ROLE_RANK.viewer);
}
