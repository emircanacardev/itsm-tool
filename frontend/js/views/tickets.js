import { enhanceSelect, searchableSelectOptions } from '../customSelect.js';
import { enhanceDateInput } from '../customDatePicker.js';
import { pulseLoader } from '../loading.js';
import {
  STATUS_DOT_COLORS,
  PRIORITY_BADGE_MAP,
  NEUTRAL_BADGE,
  NEUTRAL_DOT_COLOR,
  isClosedStatus
} from '../constants.js';

// Sıralanabilir kolonlar - backend'in beklediği sortBy anahtarları burada
// tanımlı, başlık satırı bu listeden üretiliyor (tek kaynak).
const SORTABLE_COLUMNS = [
  { key: 'title', i18nKey: 'tickets.colTitle' },
  { key: 'projectName', i18nKey: 'tickets.colProject' },
  { key: 'status', i18nKey: 'tickets.colStatus' },
  { key: 'priority', i18nKey: 'tickets.colPriority' },
  { key: 'assignedToName', i18nKey: 'tickets.colAssignee' },
  { key: 'dueAt', i18nKey: 'tickets.colDue' },
  { key: 'createdAt', i18nKey: 'tickets.colCreated', className: 'col-center' }
];

const PAGE_SIZE = 20;

// Renk Id'den, metin çevrilmiş addan geliyor: dil değişince renk sabit kalır.
function statusDot(statusId, name) {
  const span = document.createElement('span');
  span.className = 'status-dot';
  span.style.setProperty('--dot-color', STATUS_DOT_COLORS[statusId] || NEUTRAL_DOT_COLOR);
  span.textContent = name;
  return span;
}

function priorityBadge(priorityId, name) {
  const colors = PRIORITY_BADGE_MAP[priorityId] || NEUTRAL_BADGE;
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

function debounce(fn, delayMs) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

export function render(container, currentUser, query) {
  const topbarPageActions = document.getElementById('topbarPageActions');
  const canCreateTicket = currentUser?.permissions?.some((p) => p.permissionCode === 'TICKET_CREATE');
  topbarPageActions.innerHTML = canCreateTicket
    ? `
    <a class="btn-primary" href="#/new-ticket">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      <span data-i18n="tickets.newTicket"></span>
    </a>
  `
    : '';

  const columnsHtml = SORTABLE_COLUMNS.map((col) => `
    <th class="col-sortable ${col.className || ''}" data-sort-key="${col.key}">
      <div class="th-inner">
        <span data-i18n="${col.i18nKey}"></span>
        <svg class="sort-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
    </th>
  `).join('');

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
      <div class="filter-group">
        <label for="filterFromDate" data-i18n="tickets.filterFrom"></label>
        <input type="date" id="filterFromDate">
      </div>
      <div class="filter-group">
        <label for="filterToDate" data-i18n="tickets.filterTo"></label>
        <input type="date" id="filterToDate">
      </div>
      <button type="button" class="btn-secondary btn-icon-only" id="clearFiltersButton" data-i18n-title="tickets.clearFilters" title="">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
          <path d="M3 12a9 9 0 1 0 2.64-6.36"/>
          <path d="M3 4v5h5"/>
        </svg>
      </button>
    </div>

    <div class="ticket-table-wrap">
      <table>
        <thead>
          <tr>${columnsHtml}</tr>
        </thead>
        <tbody id="ticketTableBody">
          <tr><td colspan="7" style="padding: 0; border-bottom: none;">${pulseLoader(t('tickets.loading'))}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="pagination-bar">
      <span class="pagination-info" id="paginationInfo"></span>
      <div class="pagination-controls">
        <button type="button" class="btn-secondary pagination-btn" id="prevPageButton" data-i18n-title="tickets.prevPage" title="">‹</button>
        <span class="page-indicator" id="pageIndicator"></span>
        <button type="button" class="btn-secondary pagination-btn" id="nextPageButton" data-i18n-title="tickets.nextPage" title="">›</button>
      </div>
    </div>
  `;

  const ticketTableBody = container.querySelector('#ticketTableBody');
  const searchInput = container.querySelector('#searchInput');
  const filterStatus = container.querySelector('#filterStatus');
  const filterPriority = container.querySelector('#filterPriority');
  const filterProject = container.querySelector('#filterProject');
  const filterFromDate = container.querySelector('#filterFromDate');
  const filterToDate = container.querySelector('#filterToDate');
  const paginationInfo = container.querySelector('#paginationInfo');
  const pageIndicator = container.querySelector('#pageIndicator');
  const prevPageButton = container.querySelector('#prevPageButton');
  const nextPageButton = container.querySelector('#nextPageButton');

  // Sıralama ve sayfalama durumu - her render() çağrısında (her sayfa
  // girişinde) sıfırdan başlar, sekme içinde kalıcı değildir.
  let sortField = 'createdAt';
  let sortDescending = true;
  let currentPage = 1;

  function updateSortHeaderUI() {
    container.querySelectorAll('.col-sortable').forEach((th) => {
      const isActive = th.dataset.sortKey === sortField;
      th.classList.toggle('is-active', isActive);
      th.classList.toggle('is-asc', isActive && !sortDescending);
    });
  }

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

      // Başlık kullanıcı girdisi: innerHTML ile basılırsa başlığa yazılan
      // HTML çalışır (tasarım dili §8). İskelet element olarak kuruluyor,
      // metin textContent ile veriliyor.
      const titleCell = document.createElement('td');
      const idBadge = document.createElement('span');
      idBadge.className = 'ticket-id';
      idBadge.textContent = `#${ticket.id}`;
      const titleText = document.createElement('span');
      titleText.className = 'ticket-title';
      titleText.textContent = ticket.title;
      titleCell.append(idBadge, titleText);

      const projectCell = document.createElement('td');
      projectCell.textContent = ticket.projectName;

      const statusCell = document.createElement('td');
      statusCell.appendChild(statusDot(ticket.statusId, ticket.statusName));

      const priorityCell = document.createElement('td');
      priorityCell.appendChild(priorityBadge(ticket.priorityId, ticket.priorityName));

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

  function updatePaginationUI(result) {
    if (!result || result.totalCount === 0) {
      paginationInfo.textContent = '';
      pageIndicator.textContent = '';
      prevPageButton.disabled = true;
      nextPageButton.disabled = true;
      return;
    }

    const from = (result.page - 1) * result.pageSize + 1;
    const to = Math.min(result.page * result.pageSize, result.totalCount);
    paginationInfo.textContent = t('tickets.paginationInfo')
      .replace('{from}', from)
      .replace('{to}', to)
      .replace('{total}', result.totalCount);
    pageIndicator.textContent = `${result.page} / ${result.totalPages}`;
    prevPageButton.disabled = result.page <= 1;
    nextPageButton.disabled = result.page >= result.totalPages;
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
    if (filterFromDate.value) params.set('fromDate', filterFromDate.value);
    // Bitiş tarihini günün sonuna çekiyoruz, yoksa seçilen günün kendisi filtre dışı kalır.
    if (filterToDate.value) params.set('toDate', `${filterToDate.value}T23:59:59`);
    params.set('sortBy', sortField);
    params.set('sortDescending', String(sortDescending));
    params.set('page', String(currentPage));
    params.set('pageSize', String(PAGE_SIZE));
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  async function loadTickets() {
    ticketTableBody.innerHTML = `<tr><td colspan="7" style="padding: 0; border-bottom: none;">${pulseLoader(t('tickets.loading'))}</td></tr>`;
    try {
      const result = await apiRequest(`/ticket${buildQueryString()}`);
      renderTickets(result.items);
      updatePaginationUI(result);
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
      updatePaginationUI(null);
    }
  }

  function resetPageAndLoad() {
    currentPage = 1;
    loadTickets();
  }

  function handleSortClick(key) {
    if (sortField === key) {
      sortDescending = !sortDescending;
    } else {
      sortField = key;
      sortDescending = true;
    }
    currentPage = 1;
    updateSortHeaderUI();
    loadTickets();
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

      // Başlangıç filtresi (ör. proje detayından #/tickets?projectId=3 ile
      // gelindiyse) ancak seçenekler dolduktan sonra atanabiliyor - option
      // henüz DOM'da yokken value ataması sessizce boşa giderdi.
      const initialProjectId = query?.get('projectId');
      if (initialProjectId && filterProject.querySelector(`option[value="${initialProjectId}"]`)) {
        filterProject.value = initialProjectId;
      }
    } catch (error) {
      // Filtre seçenekleri yüklenemese bile liste filtresiz çalışmaya devam eder.
    }
    enhanceSelect(filterStatus);
    enhanceSelect(filterPriority);
    // Proje sayısı kurum büyüdükçe yüzlere çıkabiliyor ve o listede
    // kaydırarak proje bulmak çalışmıyor; durum/öncelik ise sabit ve kısa
    // birer liste, aramaya gerek yok.
    enhanceSelect(filterProject, searchableSelectOptions());
  }

  const debouncedSearch = debounce(resetPageAndLoad, 300);

  searchInput.addEventListener('input', debouncedSearch);
  filterStatus.addEventListener('change', resetPageAndLoad);
  filterPriority.addEventListener('change', resetPageAndLoad);
  filterProject.addEventListener('change', resetPageAndLoad);
  filterFromDate.addEventListener('change', resetPageAndLoad);
  filterToDate.addEventListener('change', resetPageAndLoad);

  container.querySelectorAll('.col-sortable').forEach((th) => {
    th.addEventListener('click', () => handleSortClick(th.dataset.sortKey));
  });

  prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadTickets();
    }
  });

  nextPageButton.addEventListener('click', () => {
    currentPage += 1;
    loadTickets();
  });

  container.querySelector('#clearFiltersButton').addEventListener('click', () => {
    searchInput.value = '';
    filterStatus.value = '';
    filterPriority.value = '';
    filterProject.value = '';
    filterFromDate.value = '';
    filterToDate.value = '';
    enhanceSelect(filterStatus);
    enhanceSelect(filterPriority);
    enhanceSelect(filterProject, searchableSelectOptions());
    enhanceDateInput(filterFromDate);
    enhanceDateInput(filterToDate);
    resetPageAndLoad();
  });

  enhanceDateInput(filterFromDate);
  enhanceDateInput(filterToDate);
  updateSortHeaderUI();
  // Önce filtre seçenekleri (ve varsa başlangıç filtresi), sonra liste -
  // aksi halde ilk istek projectId'siz gidip sonuçlar bir an filtresiz görünürdü.
  loadFilterOptions().then(loadTickets);
}
