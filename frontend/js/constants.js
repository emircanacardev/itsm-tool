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
  TICKET_CLOSE: 'TICKET_CLOSE',
  REPORT_VIEW: 'REPORT_VIEW',
  KB_MANAGE: 'KB_MANAGE',
  PROJECT_MANAGE: 'PROJECT_MANAGE',
  USER_MANAGE: 'USER_MANAGE',
  AUDIT_VIEW: 'AUDIT_VIEW',
  ADMIN_MANAGE: 'ADMIN_MANAGE'
};

// Yönetim ekranındaki sekmelerin gerektirdiği yetkiler (admin.js'teki TABS
// listesiyle aynı küme). Bağlantı bu listeye göre gösteriliyor: yalnızca
// ADMIN_MANAGE'e bakmak USER_MANAGE'i olan bir sistem yöneticisini kendi
// ekranından dışarıda bırakırdı.
//
// KB_MANAGE bilinçli olarak yok: bilgi bankasının yönetim ekranında bir
// sekmesi bulunmuyor, listeye eklenseydi yalnızca KB_MANAGE'i olan bir
// kullanıcı bağlantıyı görüp boş bir sayfaya düşerdi.
export const ADMIN_AREA_PERMISSIONS = [
  PERMISSIONS.USER_MANAGE,
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.PROJECT_MANAGE,
  PERMISSIONS.ADMIN_MANAGE
];

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

// Verilen yetkilerden herhangi birine sahip mi?
export function hasAnyPermission(currentUser, permissionCodes, projectId = null) {
  return permissionCodes.some((code) => hasPermission(currentUser, code, projectId));
}

// Yetki, hangi projede olduğuna bakılmaksızın var mı?
//
// Menü/sekme görünürlüğü için gerekli: PROJECT_MANAGE'i yalnızca tek bir
// projeye kapsanmış bir kullanıcı, hasPermission(user, code) çağrısında
// (projectId = null) eşleşmez ve yönetim bağlantısını hiç göremezdi.
// Asıl yetki kontrolü backend'de, ilgili projenin id'siyle yapılıyor.
export function hasPermissionInAnyProject(currentUser, permissionCode) {
  const permissions = currentUser?.permissions;
  if (!permissions) {
    return false;
  }

  if (permissions.some((p) => p.permissionCode === PERMISSIONS.ADMIN_MANAGE)) {
    return true;
  }

  return permissions.some((p) => p.permissionCode === permissionCode);
}

export function hasAnyPermissionInAnyProject(currentUser, permissionCodes) {
  return permissionCodes.some((code) => hasPermissionInAnyProject(currentUser, code));
}

// Renk haritalarında karşılığı olmayan bir Id gelirse (ör. sonradan eklenen
// bir durum) arayüz kırılmasın diye nötr renge düşülüyor.
export const NEUTRAL_BADGE = { bg: 'var(--color-surface-alt)', fg: 'var(--color-text-muted)' };
export const NEUTRAL_DOT_COLOR = 'var(--color-text-muted)';
