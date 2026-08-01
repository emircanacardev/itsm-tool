import { enhanceSelect } from '../customSelect.js';

const STATUS_DOT_COLORS = {
  'Açık': 'var(--status-open-fg)',
  'Devam Ediyor': 'var(--status-inprogress-fg)',
  'Beklemede': 'var(--status-pending-fg)',
  'Çözüldü': 'var(--status-resolved-fg)',
  'Kapatıldı': 'var(--status-closed-fg)'
};

const PRIORITY_BADGE_MAP = {
  'Kritik': { bg: 'var(--priority-critical-bg)', fg: 'var(--priority-critical-fg)' },
  'Yüksek': { bg: 'var(--priority-high-bg)', fg: 'var(--priority-high-fg)' },
  'Orta': { bg: 'var(--priority-medium-bg)', fg: 'var(--priority-medium-fg)' },
  'Düşük': { bg: 'var(--priority-low-bg)', fg: 'var(--priority-low-fg)' }
};

const CLOSED_STATUS_NAMES = ['Çözüldü', 'Kapatıldı'];

function statusDot(name) {
  const span = document.createElement('span');
  span.className = 'status-dot';
  span.style.setProperty('--dot-color', STATUS_DOT_COLORS[name] || 'var(--color-text-muted)');
  span.textContent = name;
  return span;
}

function priorityBadge(name) {
  const colors = PRIORITY_BADGE_MAP[name] || { bg: 'var(--color-surface-alt)', fg: 'var(--color-text-muted)' };
  const span = document.createElement('span');
  span.className = 'badge';
  span.style.background = colors.bg;
  span.style.color = colors.fg;
  span.style.border = `1px solid ${colors.fg}`;
  span.textContent = name;
  return span;
}

function getInitials(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(getLanguage() === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function renderDueCell(ticket) {
  if (CLOSED_STATUS_NAMES.includes(ticket.statusName)) {
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

function debounce(fn, delayMs) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

export function render(container) {
  const topbarPageActions = document.getElementById('topbarPageActions');
  topbarPageActions.innerHTML = `
    <a class="btn-primary" href="#/new-ticket">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      <span data-i18n="tickets.newTicket"></span>
    </a>
  `;

  container.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group filter-group-search">
        <label for="searchInput" data-i18n="tickets.searchLabel"></label>
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
          <input type="text" id="searchInput" data-i18n-placeholder="tickets.searchPlaceholder">
        </div>
      </div>
      <div class="filter-group">
        <label for="filterStatus" data-i18n="tickets.filterStatus"></label>
        <select id="filterStatus">
          <option value="" data-i18n="tickets.filterAll"></option>
        </select>
      </div>
      <div class="filter-group">
        <label for="filterPriority" data-i18n="tickets.filterPriority"></label>
        <select id="filterPriority">
          <option value="" data-i18n="tickets.filterAll"></option>
        </select>
      </div>
      <div class="filter-group">
        <label for="filterProject" data-i18n="tickets.filterProject"></label>
        <select id="filterProject">
          <option value="" data-i18n="tickets.filterAll"></option>
        </select>
      </div>
      <button class="btn-secondary" id="clearFiltersButton" data-i18n="tickets.clearFilters"></button>
    </div>

    <div class="ticket-table-wrap">
      <table>
        <thead>
          <tr>
            <th data-i18n="tickets.colTitle"></th>
            <th data-i18n="tickets.colProject"></th>
            <th data-i18n="tickets.colStatus"></th>
            <th data-i18n="tickets.colPriority"></th>
            <th data-i18n="tickets.colAssignee"></th>
            <th data-i18n="tickets.colDue"></th>
            <th class="col-center" data-i18n="tickets.colCreated"></th>
          </tr>
        </thead>
        <tbody id="ticketTableBody">
          <tr><td colspan="7" class="state-message">${t('tickets.loading')}</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const ticketTableBody = container.querySelector('#ticketTableBody');
  const searchInput = container.querySelector('#searchInput');
  const filterStatus = container.querySelector('#filterStatus');
  const filterPriority = container.querySelector('#filterPriority');
  const filterProject = container.querySelector('#filterProject');

  function renderTickets(tickets) {
    ticketTableBody.innerHTML = '';

    if (tickets.length === 0) {
      ticketTableBody.innerHTML = `
        <tr><td colspan="7" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2"/>
              <path d="M3 9h18M9 4v5"/>
            </svg>
            <span>${t('tickets.empty')}</span>
          </div>
        </td></tr>`;
      return;
    }

    tickets.forEach((ticket) => {
      const row = document.createElement('tr');
      row.addEventListener('click', () => {
        window.location.hash = `#/tickets/${ticket.id}`;
      });

      const titleCell = document.createElement('td');
      titleCell.innerHTML = `<span class="ticket-id">#${ticket.id}</span><span class="ticket-title">${ticket.title}</span>`;

      const projectCell = document.createElement('td');
      projectCell.textContent = ticket.projectName;

      const statusCell = document.createElement('td');
      statusCell.appendChild(statusDot(ticket.statusName));

      const priorityCell = document.createElement('td');
      priorityCell.appendChild(priorityBadge(ticket.priorityName));

      const assigneeCell = document.createElement('td');
      if (ticket.assignedToName) {
        assigneeCell.innerHTML = `
          <div class="assignee-cell">
            <span class="assignee-avatar">${getInitials(ticket.assignedToName)}</span>
            <span>${ticket.assignedToName}</span>
          </div>`;
      } else {
        assigneeCell.textContent = t('tickets.unassigned');
      }

      const due = renderDueCell(ticket);
      const dueCell = document.createElement('td');
      dueCell.className = `due-cell ${due.className}`;
      dueCell.textContent = due.text;

      const createdCell = document.createElement('td');
      createdCell.innerHTML = `
        <div class="row-end">
          <span>${formatDate(ticket.createdAt)}</span>
          <svg class="row-chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
            <path d="M9 6l6 6-6 6"/>
          </svg>
        </div>
      `;

      row.append(titleCell, projectCell, statusCell, priorityCell, assigneeCell, dueCell, createdCell);
      ticketTableBody.appendChild(row);
    });
  }

  function populateSelect(selectEl, items, labelKey, valueKey) {
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item[valueKey];
      option.textContent = item[labelKey];
      selectEl.appendChild(option);
    });
  }

  function buildQueryString() {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (filterStatus.value) params.set('statusId', filterStatus.value);
    if (filterPriority.value) params.set('priorityId', filterPriority.value);
    if (filterProject.value) params.set('projectId', filterProject.value);
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  async function loadTickets() {
    ticketTableBody.innerHTML = `<tr><td colspan="7" class="state-message">${t('tickets.loading')}</td></tr>`;
    try {
      const tickets = await apiRequest(`/ticket${buildQueryString()}`);
      renderTickets(tickets);
    } catch (error) {
      ticketTableBody.innerHTML = `
        <tr><td colspan="7" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>${t('tickets.error')}</span>
          </div>
        </td></tr>`;
    }
  }

  async function loadFilterOptions() {
    try {
      const [statuses, priorities, projects] = await Promise.all([
        apiRequest('/status'),
        apiRequest('/priority'),
        apiRequest('/project')
      ]);
      populateSelect(filterStatus, statuses, 'name', 'id');
      populateSelect(filterPriority, priorities, 'name', 'id');
      populateSelect(filterProject, projects, 'name', 'id');
    } catch (error) {
      // Filtre seçenekleri yüklenemese bile liste filtresiz çalışmaya devam eder.
    }
    enhanceSelect(filterStatus);
    enhanceSelect(filterPriority);
    enhanceSelect(filterProject);
  }

  const debouncedLoad = debounce(loadTickets, 300);

  searchInput.addEventListener('input', debouncedLoad);
  filterStatus.addEventListener('change', loadTickets);
  filterPriority.addEventListener('change', loadTickets);
  filterProject.addEventListener('change', loadTickets);

  container.querySelector('#clearFiltersButton').addEventListener('click', () => {
    searchInput.value = '';
    filterStatus.value = '';
    filterPriority.value = '';
    filterProject.value = '';
    enhanceSelect(filterStatus);
    enhanceSelect(filterPriority);
    enhanceSelect(filterProject);
    loadTickets();
  });

  loadFilterOptions();
  loadTickets();
}
