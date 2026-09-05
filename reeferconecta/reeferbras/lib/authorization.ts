export const pieceManagementRoles = ["almox", "dev", "enc", "master"] as const;
export const teamsAccessRoles = ["dev", "enc", "master"] as const;
export const employeeRoles = [
  "almox",
  "dev",
  "enc",
  "master",
  "cereco",
  "lab.eletronica",
  "lab.elétrica",
] as const;

export function hasRole(role: string | undefined, allowedRoles: readonly string[]) {
  return Boolean(role && allowedRoles.includes(role.toLowerCase()));
}

export function canManagePieces(role: string | undefined) {
  return hasRole(role, pieceManagementRoles);
}

export function canAccessTeams(role: string | undefined) {
  return hasRole(role, teamsAccessRoles);
}
