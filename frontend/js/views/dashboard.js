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

function kpiCard(value, labelKey, color) {
  return `
    <div class="card kpi-tile">
      <span class="kpi-label">${t(labelKey)}</span>
      <span class="kpi-value">${value}</span>
      <span class="kpi-underline" style="background: ${color};"></span>
    </div>
  `;
}

function barRow(name, count, maxCount, color) {
  const pct = maxCount === 0 ? 0 : Math.round((count / maxCount) * 100);
  return `
    <div class="bar-row">
      <span class="bar-label">${name}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${pct}%; background: ${color};"></div>
      </div>
      <span class="bar-count">${count}</span>
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

    const titleWrap = document.createElement('div');
    titleWrap.className = 'recent-ticket-title-wrap';
    titleWrap.innerHTML = `<span class="ticket-id">#${ticket.id}</span><span class="ticket-title">${ticket.title}</span>`;

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
  const statusMax = Math.max(1, ...summary.ticketsByStatus.map((s) => s.count));
  const priorityMax = Math.max(1, ...summary.ticketsByPriority.map((p) => p.count));
  const criticalCount = summary.ticketsByPriority.find((p) => p.priorityId === PRIORITY.CRITICAL)?.count || 0;

  const statusRowsHtml = summary.ticketsByStatus.length > 0
    ? `<div class="bar-list">${summary.ticketsByStatus
        .map((s) => barRow(s.statusName, s.count, statusMax, STATUS_DOT_COLORS[s.statusId] || NEUTRAL_DOT_COLOR))
        .join('')}</div>`
    : `<div class="state-box" style="border: none;"><span>${t('dashboard.noData')}</span></div>`;

  const priorityRowsHtml = summary.ticketsByPriority.length > 0
    ? `<div class="bar-list">${summary.ticketsByPriority
        .map((p) => barRow(p.priorityName, p.count, priorityMax, PRIORITY_DOT_COLORS[p.priorityId] || NEUTRAL_DOT_COLOR))
        .join('')}</div>`
    : `<div class="state-box" style="border: none;"><span>${t('dashboard.noData')}</span></div>`;

  container.innerHTML = `
    <div class="dashboard-kpi-grid">
      ${kpiCard(summary.openTickets, 'dashboard.kpiOpen', 'var(--status-open-fg)')}
      ${kpiCard(criticalCount, 'dashboard.kpiCritical', 'var(--priority-critical-fg)')}
      ${kpiCard(summary.slaAtRiskCount, 'dashboard.kpiSlaRisk', 'var(--status-inprogress-fg)')}
      ${kpiCard(summary.resolvedTodayCount, 'dashboard.kpiResolvedToday', 'var(--status-resolved-fg)')}
      ${kpiCard(summary.totalTickets, 'dashboard.kpiTotal', 'var(--color-accent)')}
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
