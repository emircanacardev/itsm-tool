// Backend'deki ITSM.Domain/Constants/TicketStatuses.cs ve TicketPriorities.cs
// karşılıkları. Durum/öncelik adları artık dile göre çevriliyor; bu yüzden
// renk, rozet ve "kapandı mı" gibi mantıklar ada göre değil Id'ye göre
// kuruluyor - aksi halde dil değiştirildiğinde arayüz sessizce bozulurdu.

export const STATUS = {
  OPEN: 10,
  IN_PROGRESS: 20,
  ON_HOLD: 30,
  RESOLVED: 40,
  CLOSED: 50
};

export const PRIORITY = {
  CRITICAL: 10,
  HIGH: 20,
  MEDIUM: 30,
  LOW: 40
};

// "Kapanmış" sayılan durumlar (backend'deki TicketStatuses.ClosedStates).
export const CLOSED_STATUS_IDS = [STATUS.RESOLVED, STATUS.CLOSED];

export const STATUS_DOT_COLORS = {
  [STATUS.OPEN]: 'var(--status-open-fg)',
  [STATUS.IN_PROGRESS]: 'var(--status-inprogress-fg)',
  [STATUS.ON_HOLD]: 'var(--status-pending-fg)',
  [STATUS.RESOLVED]: 'var(--status-resolved-fg)',
  [STATUS.CLOSED]: 'var(--status-closed-fg)'
};

export const STATUS_BADGE_MAP = {
  [STATUS.OPEN]: { bg: 'var(--status-open-bg)', fg: 'var(--status-open-fg)' },
  [STATUS.IN_PROGRESS]: { bg: 'var(--status-inprogress-bg)', fg: 'var(--status-inprogress-fg)' },
  [STATUS.ON_HOLD]: { bg: 'var(--status-pending-bg)', fg: 'var(--status-pending-fg)' },
  [STATUS.RESOLVED]: { bg: 'var(--status-resolved-bg)', fg: 'var(--status-resolved-fg)' },
  [STATUS.CLOSED]: { bg: 'var(--status-closed-bg)', fg: 'var(--status-closed-fg)' }
};

export const PRIORITY_BADGE_MAP = {
  [PRIORITY.CRITICAL]: { bg: 'var(--priority-critical-bg)', fg: 'var(--priority-critical-fg)' },
  [PRIORITY.HIGH]: { bg: 'var(--priority-high-bg)', fg: 'var(--priority-high-fg)' },
  [PRIORITY.MEDIUM]: { bg: 'var(--priority-medium-bg)', fg: 'var(--priority-medium-fg)' },
  [PRIORITY.LOW]: { bg: 'var(--priority-low-bg)', fg: 'var(--priority-low-fg)' }
};

export const PRIORITY_DOT_COLORS = {
  [PRIORITY.CRITICAL]: 'var(--priority-critical-fg)',
  [PRIORITY.HIGH]: 'var(--priority-high-fg)',
  [PRIORITY.MEDIUM]: 'var(--priority-medium-fg)',
  [PRIORITY.LOW]: 'var(--priority-low-fg)'
};

export function isClosedStatus(statusId) {
  return CLOSED_STATUS_IDS.includes(statusId);
}

// Backend'deki ITSM.Domain/Constants/Permissions.cs karşılıkları.
export const PERMISSIONS = {
  TICKET_CREATE: 'TICKET_CREATE',
  TICKET_ASSIGN: 'TICKET_ASSIGN',
  TICKET_STATUS_UPDATE: 'TICKET_STATUS_UPDATE',
  ADMIN_MANAGE: 'ADMIN_MANAGE',
  PROJECT_MANAGE: 'PROJECT_MANAGE'
};

// Kullanıcının bir yetkisi var mı? projectId verilirse, o projeye kapsanmış
// yetkiler de sayılıyor - backend'deki HasPermissionAsync ile aynı kural:
// ProjectId null olan yetki her projede, dolu olan sadece kendi projesinde.
// ADMIN_MANAGE her şeyi kapsıyor (bkz. PermissionAuthorizationHandler).
export function hasPermission(currentUser, permissionCode, projectId = null) {
  const permissions = currentUser?.permissions;
  if (!permissions) {
    return false;
  }

  if (permissions.some((p) => p.permissionCode === PERMISSIONS.ADMIN_MANAGE)) {
    return true;
  }

  return permissions.some((p) =>
    p.permissionCode === permissionCode &&
    (p.projectId === null || p.projectId === undefined || p.projectId === Number(projectId)));
}

// Renk haritalarında karşılığı olmayan bir Id gelirse (ör. sonradan eklenen
// bir durum) arayüz kırılmasın diye nötr renge düşülüyor.
export const NEUTRAL_BADGE = { bg: 'var(--color-surface-alt)', fg: 'var(--color-text-muted)' };
export const NEUTRAL_DOT_COLOR = 'var(--color-text-muted)';
