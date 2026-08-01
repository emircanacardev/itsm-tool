import { render as renderLogin } from './views/login.js';
import { render as renderRegister } from './views/register.js';
import { render as renderTickets } from './views/tickets.js';
import { render as renderTicketDetail } from './views/ticketDetail.js';
import { render as renderNewTicket } from './views/newTicket.js';
import { render as renderNotifications } from './views/notifications.js';

// Her route: path deseni, hangi view modülünün render edeceği, sayfa başlığı için i18n anahtarı.
// public: true olan route'lar giriş yapmadan da görülebilir (login/register); diğerleri auth ister.
const routes = [
  { pattern: /^login$/, view: renderLogin, public: true, titleKey: 'login.title' },
  { pattern: /^register$/, view: renderRegister, public: true, titleKey: 'register.title' },
  { pattern: /^tickets$/, view: renderTickets, titleKey: 'tickets.pageTitle', subtitleKey: 'tickets.pageSubtitle' },
  { pattern: /^tickets\/(\d+)$/, view: renderTicketDetail, titleKey: 'tickets.pageTitle' },
  { pattern: /^new-ticket$/, view: renderNewTicket, titleKey: 'newTicket.pageTitle' },
  { pattern: /^notifications$/, view: renderNotifications, titleKey: 'notifications.pageTitle' }
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

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return hash || 'tickets';
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
  if (user.isAdmin) {
    document.getElementById('adminNavItem').style.display = '';
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
  } catch (error) {
    currentUser = null;
  }
  return currentUser;
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
  const path = parseHash();
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
    setActiveNav(path);
    updateNotificationBadge();
  }

  viewEl.innerHTML = '';
  topbarPageActionsEl.innerHTML = '';
  pageTitleEl.textContent = route.public ? '' : t(route.titleKey);
  pageSubtitleEl.textContent = route.public || !route.subtitleKey ? '' : t(route.subtitleKey);
  document.title = `${t(route.titleKey)} — Pulse ITSM`;

  route.view(viewEl, ...params, currentUser);
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

langToggleButton.addEventListener('click', () => {
  setLanguage(getLanguage() === 'tr' ? 'en' : 'tr');
  updateLangButtonLabel();
  navigate();
});

window.addEventListener('hashchange', navigate);

updateLangButtonLabel();
navigate();
