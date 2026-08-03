import { render as renderLogin } from './views/login.js';
import { render as renderRegister } from './views/register.js';
import { render as renderDashboard } from './views/dashboard.js';
import { render as renderTickets } from './views/tickets.js';
import { render as renderTicketDetail } from './views/ticketDetail.js';
import { render as renderNewTicket } from './views/newTicket.js';
import { render as renderNotifications } from './views/notifications.js';
import { render as renderProjects } from './views/projects.js';
import { render as renderProjectDetail } from './views/projectDetail.js';
import { render as renderAdmin } from './views/admin.js';
import { PERMISSIONS, ADMIN_AREA_PERMISSIONS, hasPermission, hasAnyPermissionInAnyProject } from './constants.js';

// Her route: path deseni, hangi view modülünün render edeceği, sayfa başlığı için i18n anahtarı.
// public: true olan route'lar giriş yapmadan da görülebilir (login/register); diğerleri auth ister.
// requiredPermissions: verilen yetkilerden en az birine sahip olmayan kullanıcı
// talep listesine yönlendirilir. Backend zaten 403 dönüyor; bu kontrol
// kullanıcının boş/hatalı bir sayfayla karşılaşmasını önlüyor.
const routes = [
  { pattern: /^login$/, view: renderLogin, public: true, titleKey: 'login.title' },
  { pattern: /^register$/, view: renderRegister, public: true, titleKey: 'register.title' },
  { pattern: /^dashboard$/, view: renderDashboard, titleKey: 'dashboard.pageTitle', subtitleKey: 'dashboard.pageSubtitle', requiredPermissions: [PERMISSIONS.REPORT_VIEW] },
  { pattern: /^tickets$/, view: renderTickets, titleKey: 'tickets.pageTitle', subtitleKey: 'tickets.pageSubtitle' },
  { pattern: /^tickets\/(\d+)$/, view: renderTicketDetail, titleKey: 'tickets.pageTitle' },
  { pattern: /^new-ticket$/, view: renderNewTicket, titleKey: 'newTicket.pageTitle' },
  { pattern: /^projects$/, view: renderProjects, titleKey: 'projects.pageTitle', subtitleKey: 'projects.pageSubtitle' },
  // Başlık projenin kendi adıyla değiştirileceği için (bkz. projectDetail.js)
  // buradaki titleKey sadece yükleme anındaki geçici başlık.
  { pattern: /^projects\/(\d+)$/, view: renderProjectDetail, titleKey: 'projects.pageTitle' },
  { pattern: /^notifications$/, view: renderNotifications, titleKey: 'notifications.pageTitle' },
  { pattern: /^admin$/, view: renderAdmin, titleKey: 'admin.pageTitle', subtitleKey: 'admin.pageSubtitle', requiredPermissions: ADMIN_AREA_PERMISSIONS }
];

const viewEl = document.getElementById('view');
const appShell = document.getElementById('appShell');
const pageTitleEl = document.getElementById('pageTitle');
const pageSubtitleEl = document.getElementById('pageSubtitle');
const topbarPageActionsEl = document.getElementById('topbarPageActions');
const langToggleButton = document.getElementById('langToggleButton');
const themeToggleButton = document.getElementById('themeToggleButton');
const logoutButton = document.getElementById('logoutButton');
const notificationBellButton = document.getElementById('notificationBellButton');
const notificationBadgeEl = document.getElementById('notificationBadge');

let currentUser = null;

async function updateNotificationBadge() {
  try {
    const notifications = await apiRequest('/notification');
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    if (unreadCount > 0) {
      notificationBadgeEl.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
      notificationBadgeEl.style.display = '';
    } else {
      notificationBadgeEl.style.display = 'none';
    }
  } catch (error) {
    notificationBadgeEl.style.display = 'none';
  }
}

function getInitials(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

// Hash'i yol ve sorgu dizesi olarak ayırıyoruz: #/tickets?projectId=3
// gibi bağlantılar sayesinde bir sayfa, başlangıç filtresiyle açılabiliyor
// (ör. proje detayından "tüm talepleri gör"). Sorgu kısmı route desenine
// karışmasın diye eşleştirmeden önce ayrılıyor.
function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, queryString = ''] = raw.split('?');
  return {
    path: path || 'tickets',
    query: new URLSearchParams(queryString)
  };
}

function matchRoute(path) {
  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      return { route, params: match.slice(1) };
    }
  }
  return null;
}

function applyCurrentUserToSidebar(user) {
  document.getElementById('sidebarUserName').textContent = user.fullName;
  document.getElementById('sidebarUserEmail').textContent = user.groupName;
  document.getElementById('sidebarUserEmail').title = user.email;
  document.getElementById('sidebarAvatar').textContent = getInitials(user.fullName);
  // Yönetim bağlantısı yalnızca ADMIN_MANAGE'e değil, yönetim alanındaki
  // herhangi bir yetkiye bakıyor: USER_MANAGE'i olan bir sistem yöneticisi
  // de kendi sekmesine ulaşabilmeli.
  const canSeeAdminArea = hasAnyPermissionInAnyProject(user, ADMIN_AREA_PERMISSIONS);
  document.getElementById('adminNavItem').style.display = canSeeAdminArea ? '' : 'none';

  // Panel REPORT_VIEW istiyor; yetkisi olmayan kullanıcı için bağlantıyı
  // gizliyoruz, aksi halde tıkladığında boş bir sayfa görürdü.
  const dashboardNavItem = document.getElementById('dashboardNavItem');
  if (dashboardNavItem) {
    dashboardNavItem.style.display = hasPermission(user, PERMISSIONS.REPORT_VIEW) ? '' : 'none';
  }
}

async function loadCurrentUser() {
  // Önbellekte kullanıcı varsa tekrar fetch atmıyoruz, ama sidebar'ı
  // her navigasyonda yeniden dolduruyoruz - böylece herhangi bir
  // sayfa geçişinde sidebar bilgisi boş kalmıyor.
  if (currentUser) {
    applyCurrentUserToSidebar(currentUser);
    return currentUser;
  }
  try {
    currentUser = await apiRequest('/auth/me');
    applyCurrentUserToSidebar(currentUser);
    applyStoredLanguagePreference(currentUser);
  } catch (error) {
    currentUser = null;
  }
  return currentUser;
}

// Kullanıcının hesabına kayıtlı dili, bu tarayıcıda seçili olandan
// farklıysa uygular. Böylece başka bir cihazda yapılan dil tercihi
// giriş yapıldığında da geçerli oluyor.
function applyStoredLanguagePreference(user) {
  if (!user?.preferredLanguage || user.preferredLanguage === getLanguage()) {
    return;
  }

  setLanguage(user.preferredLanguage);
  updateLangButtonLabel();
}

function setActiveNav(path) {
  const topLevel = path.split('/')[0];
  document.querySelectorAll('.nav-list a').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === topLevel);
  });
}

function updateLangButtonLabel() {
  langToggleButton.textContent = getLanguage() === 'tr' ? 'EN' : 'TR';
}

async function navigate() {
  const { path, query } = parseHash();
  const matched = matchRoute(path);

  if (!matched) {
    window.location.hash = '#/tickets';
    return;
  }

  const { route, params } = matched;
  const authed = isAuthenticated();

  if (!route.public && !authed) {
    window.location.hash = '#/login';
    return;
  }

  if (route.public && authed) {
    window.location.hash = '#/tickets';
    return;
  }

  if (route.public) {
    // login/register görülüyor demek ki eski oturum bitmiş olabilir
    // (logout ya da 401) - önbelleğe alınmış kullanıcıyı temizle ki
    // bir sonraki başarılı girişte /auth/me yeniden çekilsin.
    currentUser = null;
  }

  appShell.classList.toggle('shell-auth-page', !!route.public);

  if (!route.public) {
    await loadCurrentUser();

    if (route.requiredPermissions && !hasAnyPermissionInAnyProject(currentUser, route.requiredPermissions)) {
      window.location.hash = '#/tickets';
      return;
    }

    setActiveNav(path);
    updateNotificationBadge();
  }

  viewEl.innerHTML = '';
  topbarPageActionsEl.innerHTML = '';
  pageTitleEl.textContent = route.public ? '' : t(route.titleKey);
  pageSubtitleEl.textContent = route.public || !route.subtitleKey ? '' : t(route.subtitleKey);
  document.title = `${t(route.titleKey)} — Pulse ITSM`;

  // query en sonda: mevcut view'ların (container, ...params, currentUser)
  // imzası bozulmasın, sadece ihtiyacı olan view ek parametreyi okusun.
  route.view(viewEl, ...params, currentUser, query);
  applyTranslations();
}

logoutButton.addEventListener('click', () => {
  currentUser = null;
  logout();
});

themeToggleButton.addEventListener('click', toggleTheme);

notificationBellButton.addEventListener('click', () => {
  window.location.hash = '#/notifications';
});

langToggleButton.addEventListener('click', async () => {
  const nextLanguage = getLanguage() === 'tr' ? 'en' : 'tr';

  setLanguage(nextLanguage);
  updateLangButtonLabel();

  // Tercihi backend'e de yazıyoruz: HTTP isteği olmayan bağlamlar
  // (SLA ihlal taraması, bildirim e-postaları) Accept-Language göremediği
  // için kullanıcının kayıtlı dilini kullanıyor.
  if (isAuthenticated()) {
    try {
      await apiRequest('/auth/me/language', {
        method: 'PUT',
        body: JSON.stringify({ language: nextLanguage })
      });
      if (currentUser) {
        currentUser.preferredLanguage = nextLanguage;
      }
    } catch (error) {
      // Tercih kaydedilemese bile arayüz dili değişmiş olmalı;
      // sadece e-postalar eski dilde gelmeye devam eder.
    }
  }

  // Durum/öncelik adları ve bildirim metinleri backend'den geliyor,
  // bu yüzden statik metinleri çevirmek yetmiyor - veri yeniden çekiliyor.
  navigate();
});

window.addEventListener('hashchange', navigate);

updateLangButtonLabel();
navigate();
