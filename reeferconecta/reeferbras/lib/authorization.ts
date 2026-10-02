export const pieceManagementRoles = ["almox", "dev", "enc", "master"] as const;
export const pedidoSectorRoles = ["lab.eletronica", "lab.elétrica", "cereco"] as const;
export const teamsAccessRoles = ["dev", "enc", "master"] as const;
export const chamadosViewAllRoles = ["dev"] as const;
export const reportNotificationRoles = ["enc", "almox"] as const;
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

const roleDisplayLabels: Record<string, string> = {
  "lab.elétrica": "Laboratório de Elétrica",
  "lab.eletronica": "Laboratório de Eletrônica",
  cereco: "Centro de Recondicionamento de Compressores",
  enc: "Encarregado",
};

// Converte o valor técnico de um setor/role (ex.: "cereco") no texto que deve ser exibido ao usuário.
export function formatRoleLabel(role: string | undefined): string {
  if (!role) return "";
  return roleDisplayLabels[role.trim().toLowerCase()] ?? role;
}

export function canManagePieces(role: string | undefined) {
  return hasRole(role, pieceManagementRoles);
}

export function canCreatePedidos(role: string | undefined) {
  return hasRole(role, pieceManagementRoles);
}

export function canAccessPedidos(role: string | undefined) {
  return hasRole(role, pieceManagementRoles) || hasRole(role, pedidoSectorRoles);
}

export function canReceiveReportNotifications(role: string | undefined) {
  return hasRole(role, reportNotificationRoles);
}


export function canAccessTeams(role: string | undefined) {
  return hasRole(role, teamsAccessRoles);
}

export function canViewAllChamados(role: string | undefined) {
  return hasRole(role, chamadosViewAllRoles);
}

export function canDeleteChamados(role: string | undefined) {
  return hasRole(role, chamadosViewAllRoles);
}

export const reportFullDeleteRoles = ["dev", "enc", "master"] as const;

// dev/enc/master podem excluir qualquer relatório; os demais setores só o próprio (checado no autor pela API).
export function canDeleteAnyReport(role: string | undefined) {
  return hasRole(role, reportFullDeleteRoles);
}

export function canDeletePedidos(role: string | undefined) {
  return canManagePieces(role);
}

export function canDeletePecas(role: string | undefined) {
  return canManagePieces(role);
}
