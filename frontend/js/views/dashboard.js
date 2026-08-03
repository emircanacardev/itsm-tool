import { pulseLoader } from '../loading.js';
import {
  PRIORITY,
  STATUS_DOT_COLORS,
  PRIORITY_DOT_COLORS,
  NEUTRAL_DOT_COLOR,
  isClosedStatus
} from '../constants.js';

function statusDot(statusId, name) {
  const span = document.createElement('span');
  span.className = 'status-dot';
  span.style.setProperty('--dot-color', STATUS_DOT_COLORS[statusId] || NEUTRAL_DOT_COLOR);
  span.textContent = name;
  return span;
}

function priorityBadge(priorityId, name) {
  const color = PRIORITY_DOT_COLORS[priorityId] || NEUTRAL_DOT_COLOR;
  const span = document.createElement('span');
  span.className = 'badge';
  span.style.color = color;
  span.style.border = `1px solid ${color}`;
  span.textContent = name;
  return span;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString(getLanguage() === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

// tickets.js'teki renderDueCell ile aynı eşikler (2 saat içinde/geçmiş =
// risk altında) - backend'deki SlaAtRiskCount hesabıyla da tutarlı.
function renderDueCell(ticket) {
  if (isClosedStatus(ticket.statusId)) {
    return { text: t('tickets.dueDone'), className: 'due-done' };
  }
  if (!ticket.dueAt) {
    return { text: t('tickets.noDueDate'), className: '' };
  }
  const due = new Date(ticket.dueAt);
  const diffMs = due.getTime() - Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  if (diffMs < 0) {
    return { text: `${t('tickets.dueOverdue')} · ${formatDate(ticket.dueAt)}`, className: 'due-overdue' };
  }
  if (diffMs < twoHoursMs) {
    return { text: `${t('tickets.dueSoon')} · ${formatDate(ticket.dueAt)}`, className: 'due-soon' };
  }
  return { text: formatDate(ticket.dueAt), className: 'due-ok' };
}

// Dikkat isteyen sayaçlar (kritik, SLA riski) sıfırken vurgulanmıyor: sıfır
// gecikme iyi haber, kırmızı bir rakamla duyurulması yanlış alarm oluyor.
function kpiCard(value, labelKey, color, { alert = false } = {}) {
  const isAlerting = alert && value > 0;
  return `
    <div class="card kpi-tile${isAlerting ? ' is-alerting' : ''}" style="--kpi-color: ${color};">
      <span class="kpi-label">${t(labelKey)}</span>
      <span class="kpi-value">${value}</span>
      <span class="kpi-underline"></span>
    </div>
  `;
}

// Dolgu oranı toplama göre hesaplanıyor, en büyük satıra göre değil. Eskiden
// en yüksek sayı barı sonuna kadar doldurduğu için, dört durumdan biri
// hafif öndeyken bile "hepsi bunda" izlenimi veriyordu; artık barların
// toplamı %100 ediyor ve paylar birbiriyle karşılaştırılabiliyor.
function barRow(name, count, total, color) {
  const ratio = total === 0 ? 0 : (count / total) * 100;
  // Payı çok küçük olan bir durum barı büsbütün görünmez kalmasın diye
  // sıfırdan büyük her değere en az bir iz genişliği veriliyor.
  const width = count > 0 ? Math.max(ratio, 1.5) : 0;
  return `
    <div class="bar-row">
      <span class="bar-label">${name}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${width}%; background: ${color};"></div>
      </div>
      <span class="bar-count">${count}</span>
      <span class="bar-percent">${Math.round(ratio)}%</span>
    </div>
  `;
}

function renderErrorState(container) {
  container.innerHTML = `
    <div class="state-box">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
      <span>${t('dashboard.error')}</span>
    </div>
  `;
}

function renderRecentTickets(listEl, tickets) {
  if (tickets.length === 0) {
    listEl.innerHTML = `<div class="state-box" style="border: none;"><span>${t('dashboard.noData')}</span></div>`;
    return;
  }

  listEl.innerHTML = '';
  tickets.forEach((ticket) => {
    const row = document.createElement('div');
    row.className = 'recent-ticket-row';
    row.addEventListener('click', () => {
      window.location.hash = `#/tickets/${ticket.id}`;
    });

    // Başlık kullanıcı girdisi - textContent ile basılıyor (tasarım dili §8).
    const titleWrap = document.createElement('div');
    titleWrap.className = 'recent-ticket-title-wrap';
    const idBadge = document.createElement('span');
    idBadge.className = 'ticket-id';
    idBadge.textContent = `#${ticket.id}`;
    const titleText = document.createElement('span');
    titleText.className = 'ticket-title';
    titleText.textContent = ticket.title;
    titleWrap.append(idBadge, titleText);

    const meta = document.createElement('div');
    meta.className = 'recent-ticket-meta';
    meta.appendChild(priorityBadge(ticket.priorityId, ticket.priorityName));
    meta.appendChild(statusDot(ticket.statusId, ticket.statusName));

    const due = renderDueCell(ticket);
    const dueSpan = document.createElement('span');
    dueSpan.className = `due-cell ${due.className}`;
    dueSpan.textContent = due.text;
    meta.appendChild(dueSpan);

    const chevron = document.createElement('svg');
    chevron.setAttribute('class', 'row-chevron');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('stroke-width', '2');
    chevron.setAttribute('stroke-linecap', 'round');
    chevron.setAttribute('stroke-linejoin', 'round');
    chevron.style.width = '16px';
    chevron.style.height = '16px';
    chevron.innerHTML = '<path d="M9 6l6 6-6 6"/>';
    meta.appendChild(chevron);

    row.append(titleWrap, meta);
    listEl.appendChild(row);
  });
}

function renderSummary(container, summary) {
  // Her iki dağılımın toplamı da tüm talepleri kapsıyor; yine de summary
  // üzerinden değil kendi dizisinden toplanıyor, çünkü bir durum/öncelik
  // hiç talep içermiyorsa listede satırı da olmuyor.
  const statusTotal = summary.ticketsByStatus.reduce((sum, s) => sum + s.count, 0);
  const priorityTotal = summary.ticketsByPriority.reduce((sum, p) => sum + p.count, 0);
  const criticalCount = summary.ticketsByPriority.find((p) => p.priorityId === PRIORITY.CRITICAL)?.count || 0;

  const statusRowsHtml = summary.ticketsByStatus.length > 0
    ? `<div class="bar-list">${summary.ticketsByStatus
        .map((s) => barRow(s.statusName, s.count, statusTotal, STATUS_DOT_COLORS[s.statusId] || NEUTRAL_DOT_COLOR))
        .join('')}</div>`
    : `<div class="state-box" style="border: none;"><span>${t('dashboard.noData')}</span></div>`;

  const priorityRowsHtml = summary.ticketsByPriority.length > 0
    ? `<div class="bar-list">${summary.ticketsByPriority
        .map((p) => barRow(p.priorityName, p.count, priorityTotal, PRIORITY_DOT_COLORS[p.priorityId] || NEUTRAL_DOT_COLOR))
        .join('')}</div>`
    : `<div class="state-box" style="border: none;"><span>${t('dashboard.noData')}</span></div>`;

  container.innerHTML = `
    <!-- Sıra rastgele değil, okuma sırasını izliyor: önce iş hacmi (toplam,
         açık), sonra dikkat isteyenler (kritik, SLA riski), en sonda bugünkü
         çıktı. Eskiden beş kart eşit ağırlıkta ve karışık sıradaydı, hangi
         sayının önce okunacağı belli değildi. -->
    <div class="dashboard-kpi-grid">
      ${kpiCard(summary.totalTickets, 'dashboard.kpiTotal', 'var(--color-accent)')}
      ${kpiCard(summary.openTickets, 'dashboard.kpiOpen', 'var(--status-open-fg)')}
      ${kpiCard(criticalCount, 'dashboard.kpiCritical', 'var(--priority-critical-fg)', { alert: true })}
      ${kpiCard(summary.slaAtRiskCount, 'dashboard.kpiSlaRisk', 'var(--sla-urgent)', { alert: true })}
      ${kpiCard(summary.resolvedTodayCount, 'dashboard.kpiResolvedToday', 'var(--status-resolved-fg)')}
    </div>
    <div class="dashboard-chart-grid">
      <div class="card">
        <h3 class="dashboard-card-title">${t('dashboard.byStatus')}</h3>
        ${statusRowsHtml}
      </div>
      <div class="card">
        <h3 class="dashboard-card-title">${t('dashboard.byPriority')}</h3>
        ${priorityRowsHtml}
      </div>
    </div>
    <div class="card dashboard-recent-card">
      <h3 class="dashboard-card-title">${t('dashboard.recentTickets')}</h3>
      <div id="dashboardRecentList"></div>
    </div>
  `;

  renderRecentTickets(container.querySelector('#dashboardRecentList'), summary.recentTickets);
}

export function render(container) {
  container.innerHTML = pulseLoader(t('dashboard.loading'));

  apiRequest('/dashboard/summary')
    .then((summary) => renderSummary(container, summary))
    .catch(() => renderErrorState(container));
}
