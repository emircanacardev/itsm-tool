import { enhanceSelect } from '../customSelect.js';
import { pulseLoader } from '../loading.js';

const ACTION_BADGE_MAP = {
  Added: { i18nKey: 'admin.actionAdded', bg: 'var(--status-resolved-bg)', fg: 'var(--status-resolved-fg)' },
  Modified: { i18nKey: 'admin.actionModified', bg: 'var(--status-inprogress-bg)', fg: 'var(--status-inprogress-fg)' },
  Deleted: { i18nKey: 'admin.actionDeleted', bg: 'var(--priority-critical-bg)', fg: 'var(--priority-critical-fg)' }
};

const AUDIT_PAGE_SIZE = 20;

function formatDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleDateString(getLanguage() === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function formatDateTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString(getLanguage() === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function actionBadge(action) {
  const meta = ACTION_BADGE_MAP[action];
  const span = document.createElement('span');
  span.className = 'badge';
  if (meta) {
    span.style.background = meta.bg;
    span.style.color = meta.fg;
    span.style.border = `1px solid ${meta.fg}`;
    span.textContent = t(meta.i18nKey);
  } else {
    span.style.background = 'var(--color-surface-alt)';
    span.style.color = 'var(--color-text-muted)';
    span.style.border = '1px solid var(--color-text-muted)';
    span.textContent = action;
  }
  return span;
}

function statusBadge(isActive) {
  const span = document.createElement('span');
  span.className = 'badge';
  if (isActive) {
    span.style.background = 'var(--status-resolved-bg)';
    span.style.color = 'var(--status-resolved-fg)';
    span.style.border = '1px solid var(--status-resolved-fg)';
    span.textContent = t('admin.statusActive');
  } else {
    span.style.background = 'var(--priority-critical-bg)';
    span.style.color = 'var(--priority-critical-fg)';
    span.style.border = '1px solid var(--priority-critical-fg)';
    span.textContent = t('admin.statusInactive');
  }
  return span;
}

export function render(container) {
  container.innerHTML = `
    <div class="admin-tabs">
      <button type="button" class="admin-tab is-active" id="tabUsersButton" data-i18n="admin.tabUsers"></button>
      <button type="button" class="admin-tab" id="tabAuditLogButton" data-i18n="admin.tabAuditLog"></button>
    </div>
    <div id="usersSection"></div>
    <div id="auditLogSection" style="display: none;"></div>
  `;
  applyTranslations();

  const tabUsersButton = container.querySelector('#tabUsersButton');
  const tabAuditLogButton = container.querySelector('#tabAuditLogButton');
  const usersSection = container.querySelector('#usersSection');
  const auditLogSection = container.querySelector('#auditLogSection');

  let usersLoaded = false;
  let auditLoaded = false;

  function activateTab(tab) {
    const isUsers = tab === 'users';
    tabUsersButton.classList.toggle('is-active', isUsers);
    tabAuditLogButton.classList.toggle('is-active', !isUsers);
    usersSection.style.display = isUsers ? '' : 'none';
    auditLogSection.style.display = isUsers ? 'none' : '';

    if (isUsers && !usersLoaded) {
      usersLoaded = true;
      renderUsersSection(usersSection);
    }
    if (!isUsers && !auditLoaded) {
      auditLoaded = true;
      renderAuditLogSection(auditLogSection);
    }
  }

  tabUsersButton.addEventListener('click', () => activateTab('users'));
  tabAuditLogButton.addEventListener('click', () => activateTab('auditLog'));

  activateTab('users');
}

function renderUsersSection(section) {
  section.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group filter-group-search">
        <label for="userSearchInput" data-i18n="admin.searchLabel"></label>
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
          <input type="text" id="userSearchInput" data-i18n-placeholder="admin.userSearchPlaceholder">
        </div>
      </div>
    </div>
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>
            <th><span data-i18n="admin.colName"></span></th>
            <th><span data-i18n="admin.colEmail"></span></th>
            <th><span data-i18n="admin.colGroup"></span></th>
            <th><span data-i18n="admin.colStatus"></span></th>
            <th class="col-center"><span data-i18n="admin.colCreated"></span></th>
            <th class="col-right"><span data-i18n="admin.colAction"></span></th>
          </tr>
        </thead>
        <tbody id="userTableBody">
          <tr><td colspan="6" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.usersLoading'))}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="toast" id="userToast" style="display: none;"></div>
  `;
  applyTranslations();

  const userTableBody = section.querySelector('#userTableBody');
  const userSearchInput = section.querySelector('#userSearchInput');
  const userToast = section.querySelector('#userToast');

  let allUsers = [];

  function showToast(key, isError) {
    userToast.textContent = t(key);
    userToast.className = `toast ${isError ? 'error' : 'success'}`;
    userToast.style.display = 'block';
    setTimeout(() => { userToast.style.display = 'none'; }, 3000);
  }

  function filterUsers() {
    const query = userSearchInput.value.trim().toLowerCase();
    if (!query) return allUsers;
    return allUsers.filter((user) =>
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query));
  }

  async function toggleUserStatus(user, button) {
    const nextActive = !user.isActive;
    const confirmKey = nextActive ? 'admin.confirmActivate' : 'admin.confirmDeactivate';
    if (!window.confirm(t(confirmKey).replace('{name}', user.fullName))) {
      return;
    }
    button.disabled = true;
    try {
      await apiRequest(`/user/${user.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: nextActive })
      });
      user.isActive = nextActive;
      showToast('admin.statusUpdated', false);
      renderRows(filterUsers());
    } catch (error) {
      showToast('admin.updateError', true);
      button.disabled = false;
    }
  }

  function renderRows(users) {
    userTableBody.innerHTML = '';

    if (users.length === 0) {
      userTableBody.innerHTML = `
        <tr><td colspan="6" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M8 12h8"/>
            </svg>
            <span>${t('admin.usersEmpty')}</span>
          </div>
        </td></tr>`;
      return;
    }

    users.forEach((user) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = user.fullName;

      const emailCell = document.createElement('td');
      emailCell.textContent = user.email;

      const groupCell = document.createElement('td');
      groupCell.textContent = user.groupName;

      const statusCell = document.createElement('td');
      statusCell.appendChild(statusBadge(user.isActive));

      const createdCell = document.createElement('td');
      createdCell.className = 'col-center';
      createdCell.textContent = formatDate(user.createdAt);

      const actionCell = document.createElement('td');
      actionCell.className = 'col-right';
      const actionButton = document.createElement('button');
      actionButton.type = 'button';
      actionButton.className = 'btn-secondary';
      actionButton.textContent = t(user.isActive ? 'admin.deactivate' : 'admin.activate');
      actionButton.addEventListener('click', () => toggleUserStatus(user, actionButton));
      actionCell.appendChild(actionButton);

      row.append(nameCell, emailCell, groupCell, statusCell, createdCell, actionCell);
      userTableBody.appendChild(row);
    });
  }

  async function loadUsers() {
    userTableBody.innerHTML = `<tr><td colspan="6" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.usersLoading'))}</td></tr>`;
    try {
      allUsers = await apiRequest('/user');
      renderRows(filterUsers());
    } catch (error) {
      userTableBody.innerHTML = `
        <tr><td colspan="6" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>${t('admin.usersError')}</span>
          </div>
        </td></tr>`;
    }
  }

  userSearchInput.addEventListener('input', () => renderRows(filterUsers()));

  loadUsers();
}

function renderAuditLogSection(section) {
  section.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group">
        <label for="auditFilterEntity" data-i18n="admin.filterEntity"></label>
        <input type="text" id="auditFilterEntity" data-i18n-placeholder="admin.filterEntityPlaceholder">
      </div>
      <div class="filter-group">
        <label for="auditFilterAction" data-i18n="admin.filterAction"></label>
        <select id="auditFilterAction">
          <option value="" data-i18n="tickets.filterAll"></option>
          <option value="Added" data-i18n="admin.actionAdded"></option>
          <option value="Modified" data-i18n="admin.actionModified"></option>
          <option value="Deleted" data-i18n="admin.actionDeleted"></option>
        </select>
      </div>
      <div class="filter-group">
        <label for="auditFilterFromDate" data-i18n="tickets.filterFrom"></label>
        <input type="date" id="auditFilterFromDate">
      </div>
      <div class="filter-group">
        <label for="auditFilterToDate" data-i18n="tickets.filterTo"></label>
        <input type="date" id="auditFilterToDate">
      </div>
      <button class="btn-secondary" type="button" id="auditClearFiltersButton" data-i18n="tickets.clearFilters"></button>
    </div>
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>
            <th><span data-i18n="admin.auditColDate"></span></th>
            <th><span data-i18n="admin.auditColUser"></span></th>
            <th><span data-i18n="admin.auditColEntity"></span></th>
            <th><span data-i18n="admin.auditColAction"></span></th>
            <th><span data-i18n="admin.auditColDetails"></span></th>
          </tr>
        </thead>
        <tbody id="auditTableBody">
          <tr><td colspan="5" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.auditLoading'))}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="pagination-bar">
      <span class="pagination-info" id="auditPaginationInfo"></span>
      <div class="pagination-controls">
        <button type="button" class="btn-secondary pagination-btn" id="auditPrevPageButton" data-i18n-title="tickets.prevPage" title="">‹</button>
        <span class="page-indicator" id="auditPageIndicator"></span>
        <button type="button" class="btn-secondary pagination-btn" id="auditNextPageButton" data-i18n-title="tickets.nextPage" title="">›</button>
      </div>
    </div>
  `;
  applyTranslations();

  const auditTableBody = section.querySelector('#auditTableBody');
  const filterEntity = section.querySelector('#auditFilterEntity');
  const filterAction = section.querySelector('#auditFilterAction');
  const filterFromDate = section.querySelector('#auditFilterFromDate');
  const filterToDate = section.querySelector('#auditFilterToDate');
  const paginationInfo = section.querySelector('#auditPaginationInfo');
  const pageIndicator = section.querySelector('#auditPageIndicator');
  const prevPageButton = section.querySelector('#auditPrevPageButton');
  const nextPageButton = section.querySelector('#auditNextPageButton');

  enhanceSelect(filterAction);

  let currentPage = 1;

  function renderRows(logs) {
    auditTableBody.innerHTML = '';

    if (logs.length === 0) {
      auditTableBody.innerHTML = `
        <tr><td colspan="5" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2"/>
              <path d="M3 9h18M9 4v5"/>
            </svg>
            <span>${t('admin.auditEmpty')}</span>
          </div>
        </td></tr>`;
      return;
    }

    logs.forEach((log) => {
      const row = document.createElement('tr');

      const dateCell = document.createElement('td');
      dateCell.textContent = formatDateTime(log.createdAt);

      const userCell = document.createElement('td');
      userCell.textContent = log.userFullName || t('admin.systemUser');

      const entityCell = document.createElement('td');
      entityCell.textContent = `${log.entityName} #${log.entityId}`;

      const actionCell = document.createElement('td');
      actionCell.appendChild(actionBadge(log.action));

      const detailsCell = document.createElement('td');
      detailsCell.textContent = log.details || '-';

      row.append(dateCell, userCell, entityCell, actionCell, detailsCell);
      auditTableBody.appendChild(row);
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
    paginationInfo.textContent = t('admin.auditPaginationInfo')
      .replace('{from}', from)
      .replace('{to}', to)
      .replace('{total}', result.totalCount);
    pageIndicator.textContent = `${result.page} / ${result.totalPages}`;
    prevPageButton.disabled = result.page <= 1;
    nextPageButton.disabled = result.page >= result.totalPages;
  }

  function buildQueryString() {
    const params = new URLSearchParams();
    if (filterEntity.value.trim()) params.set('entityName', filterEntity.value.trim());
    if (filterAction.value) params.set('action', filterAction.value);
    if (filterFromDate.value) params.set('fromDate', filterFromDate.value);
    if (filterToDate.value) params.set('toDate', `${filterToDate.value}T23:59:59`);
    params.set('page', String(currentPage));
    params.set('pageSize', String(AUDIT_PAGE_SIZE));
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  async function loadAuditLog() {
    auditTableBody.innerHTML = `<tr><td colspan="5" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.auditLoading'))}</td></tr>`;
    try {
      const result = await apiRequest(`/auditlog${buildQueryString()}`);
      renderRows(result.items);
      updatePaginationUI(result);
    } catch (error) {
      auditTableBody.innerHTML = `
        <tr><td colspan="5" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>${t('admin.auditError')}</span>
          </div>
        </td></tr>`;
      updatePaginationUI(null);
    }
  }

  function resetPageAndLoad() {
    currentPage = 1;
    loadAuditLog();
  }

  filterEntity.addEventListener('change', resetPageAndLoad);
  filterAction.addEventListener('change', resetPageAndLoad);
  filterFromDate.addEventListener('change', resetPageAndLoad);
  filterToDate.addEventListener('change', resetPageAndLoad);

  prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadAuditLog();
    }
  });

  nextPageButton.addEventListener('click', () => {
    currentPage += 1;
    loadAuditLog();
  });

  section.querySelector('#auditClearFiltersButton').addEventListener('click', () => {
    filterEntity.value = '';
    filterAction.value = '';
    filterFromDate.value = '';
    filterToDate.value = '';
    enhanceSelect(filterAction);
    resetPageAndLoad();
  });

  loadAuditLog();
}
