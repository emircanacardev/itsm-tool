import { enhanceSelect } from '../customSelect.js';
import { enhanceDateInput } from '../customDatePicker.js';
import { pulseLoader } from '../loading.js';

const ACTION_BADGE_MAP = {
  Added: { i18nKey: 'admin.actionAdded', bg: 'var(--status-resolved-bg)', fg: 'var(--status-resolved-fg)' },
  Modified: { i18nKey: 'admin.actionModified', bg: 'var(--status-inprogress-bg)', fg: 'var(--status-inprogress-fg)' },
  Deleted: { i18nKey: 'admin.actionDeleted', bg: 'var(--priority-critical-bg)', fg: 'var(--priority-critical-fg)' }
};

const AUDIT_PAGE_SIZE = 20;
const PROJECT_PAGE_SIZE = 20;
const USER_PAGE_SIZE = 20;
const GROUP_PAGE_SIZE = 20;

function debounce(fn, delayMs) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

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

// Yeni bir sekme eklemek için buraya bir kayıt eklemek yeterli - buton ve
// panel DOM'u, aktifleştirme/lazy-load mantığı hepsi bu listeden üretiliyor.
const TABS = [
  { key: 'users', i18nKey: 'admin.tabUsers', render: renderUsersSection },
  { key: 'groups', i18nKey: 'admin.tabGroups', render: renderGroupsSection },
  { key: 'projects', i18nKey: 'admin.tabProjects', render: renderProjectsSection },
  { key: 'permissions', i18nKey: 'admin.tabPermissions', render: renderPermissionsSection },
  { key: 'auditLog', i18nKey: 'admin.tabAuditLog', render: renderAuditLogSection }
];

export function render(container) {
  const tabButtonsHtml = TABS.map((tab, index) => `
    <button type="button" class="admin-tab ${index === 0 ? 'is-active' : ''}" data-tab-key="${tab.key}" data-i18n="${tab.i18nKey}"></button>
  `).join('');
  const panelsHtml = TABS.map((tab, index) => `
    <div id="panel-${tab.key}" style="${index === 0 ? '' : 'display: none;'}"></div>
  `).join('');

  container.innerHTML = `
    <div class="admin-tabs">${tabButtonsHtml}</div>
    ${panelsHtml}
  `;
  applyTranslations();

  const loadedTabs = new Set();

  function activateTab(activeKey) {
    TABS.forEach((tab) => {
      const isActive = tab.key === activeKey;
      container.querySelector(`[data-tab-key="${tab.key}"]`).classList.toggle('is-active', isActive);
      const panel = container.querySelector(`#panel-${tab.key}`);
      panel.style.display = isActive ? '' : 'none';

      if (isActive && !loadedTabs.has(tab.key)) {
        loadedTabs.add(tab.key);
        tab.render(panel);
      }
    });
  }

  TABS.forEach((tab) => {
    container.querySelector(`[data-tab-key="${tab.key}"]`).addEventListener('click', () => activateTab(tab.key));
  });

  activateTab(TABS[0].key);
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
            <th class="col-center"><span data-i18n="admin.colAction"></span></th>
          </tr>
        </thead>
        <tbody id="userTableBody">
          <tr><td colspan="6" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.usersLoading'))}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="pagination-bar">
      <span class="pagination-info" id="userPaginationInfo"></span>
      <div class="pagination-controls">
        <button type="button" class="btn-secondary pagination-btn" id="userPrevPageButton" data-i18n-title="tickets.prevPage" title="">‹</button>
        <span class="page-indicator" id="userPageIndicator"></span>
        <button type="button" class="btn-secondary pagination-btn" id="userNextPageButton" data-i18n-title="tickets.nextPage" title="">›</button>
      </div>
    </div>
    <div class="toast" id="userToast" style="display: none;"></div>
  `;
  applyTranslations();

  const userTableBody = section.querySelector('#userTableBody');
  const userSearchInput = section.querySelector('#userSearchInput');
  const userToast = section.querySelector('#userToast');
  const paginationInfo = section.querySelector('#userPaginationInfo');
  const pageIndicator = section.querySelector('#userPageIndicator');
  const prevPageButton = section.querySelector('#userPrevPageButton');
  const nextPageButton = section.querySelector('#userNextPageButton');

  let currentPage = 1;

  function showToast(key, isError) {
    userToast.textContent = t(key);
    userToast.className = `toast ${isError ? 'error' : 'success'}`;
    userToast.style.display = 'block';
    setTimeout(() => { userToast.style.display = 'none'; }, 3000);
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
      showToast('admin.statusUpdated', false);
      loadUsers();
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
      actionCell.className = 'col-center';
      const actionButton = document.createElement('button');
      actionButton.type = 'button';
      actionButton.className = 'btn-secondary';
      const actionIcon = user.isActive
        ? `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px; color: var(--priority-critical-fg);"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px; color: var(--status-resolved-fg);"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>`;
      actionButton.innerHTML = `${actionIcon}<span>${t(user.isActive ? 'admin.deactivate' : 'admin.activate')}</span>`;
      actionButton.addEventListener('click', () => toggleUserStatus(user, actionButton));
      actionCell.appendChild(actionButton);

      row.append(nameCell, emailCell, groupCell, statusCell, createdCell, actionCell);
      userTableBody.appendChild(row);
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

  // Kullanıcı sayısı binlere çıkabileceği için tam listeyi çekip arayüzde
  // filtrelemek yerine (aynı gerekçe: Yetkilendirme sekmesindeki arama
  // kutusu) sunucu tarafında hem arama hem sayfalama yapıyoruz.
  async function loadUsers() {
    userTableBody.innerHTML = `<tr><td colspan="6" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.usersLoading'))}</td></tr>`;
    try {
      const search = userSearchInput.value.trim();
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(currentPage));
      params.set('pageSize', String(USER_PAGE_SIZE));

      const result = await apiRequest(`/user?${params.toString()}`);
      renderRows(result.items);
      updatePaginationUI(result);
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
      updatePaginationUI(null);
    }
  }

  function resetPageAndLoad() {
    currentPage = 1;
    loadUsers();
  }

  userSearchInput.addEventListener('input', debounce(resetPageAndLoad, 300));

  prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadUsers();
    }
  });

  nextPageButton.addEventListener('click', () => {
    currentPage += 1;
    loadUsers();
  });

  loadUsers();
}

function renderGroupsSection(section) {
  section.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group">
        <label for="groupNameInput" data-i18n="admin.groupName"></label>
        <input type="text" id="groupNameInput" data-i18n-placeholder="admin.groupNamePlaceholder">
      </div>
      <div class="filter-group" style="flex: 1;">
        <label for="groupDescriptionInput" data-i18n="admin.groupDescription"></label>
        <input type="text" id="groupDescriptionInput" data-i18n-placeholder="admin.groupDescriptionPlaceholder">
      </div>
      <button type="button" class="btn-primary" id="addGroupButton">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span data-i18n="admin.addGroup"></span>
      </button>
    </div>
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>
            <th><span data-i18n="admin.colGroupName"></span></th>
            <th><span data-i18n="admin.colDescription"></span></th>
            <th class="col-center"><span data-i18n="admin.colCreated"></span></th>
            <th class="col-center"><span data-i18n="admin.colAction"></span></th>
          </tr>
        </thead>
        <tbody id="groupTableBody">
          <tr><td colspan="4" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.groupsLoading'))}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="pagination-bar">
      <span class="pagination-info" id="groupPaginationInfo"></span>
      <div class="pagination-controls">
        <button type="button" class="btn-secondary pagination-btn" id="groupPrevPageButton" data-i18n-title="tickets.prevPage" title="">‹</button>
        <span class="page-indicator" id="groupPageIndicator"></span>
        <button type="button" class="btn-secondary pagination-btn" id="groupNextPageButton" data-i18n-title="tickets.nextPage" title="">›</button>
      </div>
    </div>
    <div class="toast" id="groupToast" style="display: none;"></div>
  `;
  applyTranslations();

  const groupTableBody = section.querySelector('#groupTableBody');
  const groupNameInput = section.querySelector('#groupNameInput');
  const groupDescriptionInput = section.querySelector('#groupDescriptionInput');
  const addGroupButton = section.querySelector('#addGroupButton');
  const groupToast = section.querySelector('#groupToast');
  const paginationInfo = section.querySelector('#groupPaginationInfo');
  const pageIndicator = section.querySelector('#groupPageIndicator');
  const prevPageButton = section.querySelector('#groupPrevPageButton');
  const nextPageButton = section.querySelector('#groupNextPageButton');

  let currentPage = 1;

  function showToast(key, isError) {
    groupToast.textContent = t(key);
    groupToast.className = `toast ${isError ? 'error' : 'success'}`;
    groupToast.style.display = 'block';
    setTimeout(() => { groupToast.style.display = 'none'; }, 3000);
  }

  function enterEditMode(row, group) {
    const [nameCell, descriptionCell, , actionCell] = row.children;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'table-edit-input';
    nameInput.value = group.name;
    nameCell.innerHTML = '';
    nameCell.appendChild(nameInput);

    const descriptionInput = document.createElement('input');
    descriptionInput.type = 'text';
    descriptionInput.className = 'table-edit-input';
    descriptionInput.value = group.description || '';
    descriptionCell.innerHTML = '';
    descriptionCell.appendChild(descriptionInput);

    actionCell.innerHTML = '';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'btn-secondary';
    saveButton.style.marginRight = '6px';
    saveButton.textContent = t('admin.save');
    saveButton.addEventListener('click', async () => {
      const newName = nameInput.value.trim();
      if (!newName) return;
      saveButton.disabled = true;
      try {
        await apiRequest(`/group/${group.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: newName, description: descriptionInput.value.trim() || null })
        });
        showToast('admin.groupUpdated', false);
        loadGroups();
      } catch (error) {
        showToast('admin.groupUpdateError', true);
        saveButton.disabled = false;
      }
    });

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn-secondary';
    cancelButton.textContent = t('admin.cancel');
    cancelButton.addEventListener('click', () => loadGroups());

    actionCell.append(saveButton, cancelButton);
  }

  function renderRows(groups) {
    groupTableBody.innerHTML = '';

    if (groups.length === 0) {
      groupTableBody.innerHTML = `
        <tr><td colspan="4" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M8 12h8"/>
            </svg>
            <span>${t('admin.groupsEmpty')}</span>
          </div>
        </td></tr>`;
      return;
    }

    groups.forEach((group) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = group.name;

      const descriptionCell = document.createElement('td');
      descriptionCell.textContent = group.description || '-';

      const createdCell = document.createElement('td');
      createdCell.className = 'col-center';
      createdCell.textContent = formatDate(group.createdAt);

      const actionCell = document.createElement('td');
      actionCell.className = 'col-center';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn-secondary';
      editButton.textContent = t('admin.edit');
      editButton.addEventListener('click', () => enterEditMode(row, group));
      actionCell.appendChild(editButton);

      row.append(nameCell, descriptionCell, createdCell, actionCell);
      groupTableBody.appendChild(row);
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

  // Grup sayısı binlere çıkabileceği için (aynı gerekçe: Kullanıcılar ve
  // Projeler sekmeleri) tam listeyi çekmek yerine sunucu tarafında sayfalıyoruz.
  async function loadGroups() {
    groupTableBody.innerHTML = `<tr><td colspan="4" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.groupsLoading'))}</td></tr>`;
    try {
      const result = await apiRequest(`/group?page=${currentPage}&pageSize=${GROUP_PAGE_SIZE}`);
      renderRows(result.items);
      updatePaginationUI(result);
    } catch (error) {
      groupTableBody.innerHTML = `
        <tr><td colspan="4" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>${t('admin.groupsError')}</span>
          </div>
        </td></tr>`;
      updatePaginationUI(null);
    }
  }

  prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadGroups();
    }
  });

  nextPageButton.addEventListener('click', () => {
    currentPage += 1;
    loadGroups();
  });

  addGroupButton.addEventListener('click', async () => {
    const name = groupNameInput.value.trim();
    if (!name) return;
    addGroupButton.disabled = true;
    try {
      await apiRequest('/group', {
        method: 'POST',
        body: JSON.stringify({ name, description: groupDescriptionInput.value.trim() || null })
      });
      groupNameInput.value = '';
      groupDescriptionInput.value = '';
      showToast('admin.groupCreated', false);
      currentPage = 1;
      loadGroups();
    } catch (error) {
      showToast('admin.groupCreateError', true);
    } finally {
      addGroupButton.disabled = false;
    }
  });

  loadGroups();
}

function renderProjectsSection(section) {
  section.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group">
        <label for="projectNameInput" data-i18n="admin.projectName"></label>
        <input type="text" id="projectNameInput" data-i18n-placeholder="admin.projectNamePlaceholder">
      </div>
      <div class="filter-group">
        <label for="projectCodeInput" data-i18n="admin.projectCode"></label>
        <input type="text" id="projectCodeInput" data-i18n-placeholder="admin.projectCodePlaceholder">
      </div>
      <div class="filter-group" style="flex: 1;">
        <label for="projectDescriptionInput" data-i18n="admin.groupDescription"></label>
        <input type="text" id="projectDescriptionInput" data-i18n-placeholder="admin.projectDescriptionPlaceholder">
      </div>
      <button type="button" class="btn-primary" id="addProjectButton">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span data-i18n="admin.addProject"></span>
      </button>
    </div>
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>
            <th><span data-i18n="admin.colProjectName"></span></th>
            <th><span data-i18n="admin.colProjectCode"></span></th>
            <th><span data-i18n="admin.colDescription"></span></th>
            <th><span data-i18n="admin.colStatus"></span></th>
            <th class="col-center"><span data-i18n="admin.colCreated"></span></th>
            <th class="col-center"><span data-i18n="admin.colAction"></span></th>
          </tr>
        </thead>
        <tbody id="projectTableBody">
          <tr><td colspan="6" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.projectsLoading'))}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="pagination-bar">
      <span class="pagination-info" id="projectPaginationInfo"></span>
      <div class="pagination-controls">
        <button type="button" class="btn-secondary pagination-btn" id="projectPrevPageButton" data-i18n-title="tickets.prevPage" title="">‹</button>
        <span class="page-indicator" id="projectPageIndicator"></span>
        <button type="button" class="btn-secondary pagination-btn" id="projectNextPageButton" data-i18n-title="tickets.nextPage" title="">›</button>
      </div>
    </div>
    <div class="toast" id="projectToast" style="display: none;"></div>
  `;
  applyTranslations();

  const projectTableBody = section.querySelector('#projectTableBody');
  const projectNameInput = section.querySelector('#projectNameInput');
  const projectCodeInput = section.querySelector('#projectCodeInput');
  const projectDescriptionInput = section.querySelector('#projectDescriptionInput');
  const addProjectButton = section.querySelector('#addProjectButton');
  const projectToast = section.querySelector('#projectToast');
  const paginationInfo = section.querySelector('#projectPaginationInfo');
  const pageIndicator = section.querySelector('#projectPageIndicator');
  const prevPageButton = section.querySelector('#projectPrevPageButton');
  const nextPageButton = section.querySelector('#projectNextPageButton');

  let currentPage = 1;

  function showToast(key, isError) {
    projectToast.textContent = t(key);
    projectToast.className = `toast ${isError ? 'error' : 'success'}`;
    projectToast.style.display = 'block';
    setTimeout(() => { projectToast.style.display = 'none'; }, 3000);
  }

  function enterEditMode(row, project) {
    const [nameCell, , descriptionCell, statusCell, , actionCell] = row.children;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'table-edit-input';
    nameInput.value = project.name;
    nameCell.innerHTML = '';
    nameCell.appendChild(nameInput);

    const descriptionInput = document.createElement('input');
    descriptionInput.type = 'text';
    descriptionInput.className = 'table-edit-input';
    descriptionInput.value = project.description || '';
    descriptionCell.innerHTML = '';
    descriptionCell.appendChild(descriptionInput);

    const statusSelect = document.createElement('select');
    statusSelect.id = `projectStatusSelect-${project.id}`;
    const activeOption = document.createElement('option');
    activeOption.value = 'true';
    activeOption.textContent = t('admin.statusActive');
    const inactiveOption = document.createElement('option');
    inactiveOption.value = 'false';
    inactiveOption.textContent = t('admin.statusInactive');
    statusSelect.append(activeOption, inactiveOption);
    statusSelect.value = String(project.isActive);
    statusCell.innerHTML = '';
    statusCell.appendChild(statusSelect);
    enhanceSelect(statusSelect);

    actionCell.innerHTML = '';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'btn-secondary';
    saveButton.style.marginRight = '6px';
    saveButton.textContent = t('admin.save');
    saveButton.addEventListener('click', async () => {
      const newName = nameInput.value.trim();
      if (!newName) return;
      saveButton.disabled = true;
      try {
        await apiRequest(`/project/${project.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: newName,
            description: descriptionInput.value.trim() || null,
            isActive: statusSelect.value === 'true'
          })
        });
        showToast('admin.projectUpdated', false);
        loadProjects();
      } catch (error) {
        showToast('admin.projectUpdateError', true);
        saveButton.disabled = false;
      }
    });

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn-secondary';
    cancelButton.textContent = t('admin.cancel');
    cancelButton.addEventListener('click', () => loadProjects());

    actionCell.append(saveButton, cancelButton);
  }

  function renderRows(projects) {
    projectTableBody.innerHTML = '';

    if (projects.length === 0) {
      projectTableBody.innerHTML = `
        <tr><td colspan="6" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M8 12h8"/>
            </svg>
            <span>${t('admin.projectsEmpty')}</span>
          </div>
        </td></tr>`;
      return;
    }

    projects.forEach((project) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = project.name;

      const codeCell = document.createElement('td');
      codeCell.textContent = project.code;

      const descriptionCell = document.createElement('td');
      descriptionCell.textContent = project.description || '-';

      const statusCell = document.createElement('td');
      statusCell.appendChild(statusBadge(project.isActive));

      const createdCell = document.createElement('td');
      createdCell.className = 'col-center';
      createdCell.textContent = formatDate(project.createdAt);

      const actionCell = document.createElement('td');
      actionCell.className = 'col-center';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn-secondary';
      editButton.textContent = t('admin.edit');
      editButton.addEventListener('click', () => enterEditMode(row, project));
      actionCell.appendChild(editButton);

      row.append(nameCell, codeCell, descriptionCell, statusCell, createdCell, actionCell);
      projectTableBody.appendChild(row);
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

  // Proje sayısı binlere çıkabileceği için (aynı gerekçe: kullanıcı arama
  // endpoint'i) tam listeyi çekmek yerine sunucu tarafında sayfalıyoruz -
  // bkz. ProjectController.GetAllProjects'teki opsiyonel page/pageSize.
  async function loadProjects() {
    projectTableBody.innerHTML = `<tr><td colspan="6" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.projectsLoading'))}</td></tr>`;
    try {
      const result = await apiRequest(`/project?page=${currentPage}&pageSize=${PROJECT_PAGE_SIZE}`);
      renderRows(result.items);
      updatePaginationUI(result);
    } catch (error) {
      projectTableBody.innerHTML = `
        <tr><td colspan="6" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>${t('admin.projectsError')}</span>
          </div>
        </td></tr>`;
      updatePaginationUI(null);
    }
  }

  prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadProjects();
    }
  });

  nextPageButton.addEventListener('click', () => {
    currentPage += 1;
    loadProjects();
  });

  addProjectButton.addEventListener('click', async () => {
    const name = projectNameInput.value.trim();
    const code = projectCodeInput.value.trim();
    if (!name || !code) return;
    addProjectButton.disabled = true;
    try {
      await apiRequest('/project', {
        method: 'POST',
        body: JSON.stringify({
          name,
          code,
          description: projectDescriptionInput.value.trim() || null
        })
      });
      projectNameInput.value = '';
      projectCodeInput.value = '';
      projectDescriptionInput.value = '';
      showToast('admin.projectCreated', false);
      currentPage = 1;
      loadProjects();
    } catch (error) {
      showToast('admin.projectCreateError', true);
    } finally {
      addProjectButton.disabled = false;
    }
  });

  loadProjects();
}

function renderPermissionsSection(section) {
  section.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group" style="min-width: 280px;">
        <label for="permissionUserSearch" data-i18n="admin.selectUserLabel"></label>
        <div style="position: relative;">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/>
              <path d="M21 21l-4.3-4.3"/>
            </svg>
            <input type="text" id="permissionUserSearch" autocomplete="off" data-i18n-placeholder="admin.selectUserPlaceholder">
          </div>
          <div class="custom-select-menu" id="permissionUserResults"></div>
        </div>
      </div>
    </div>
    <div id="permissionUserPanel" style="display: none;">
      <div class="ticket-table-wrap table-static">
        <table>
          <thead>
            <tr>
              <th><span data-i18n="admin.colPermission"></span></th>
              <th><span data-i18n="admin.colProject"></span></th>
              <th class="col-center"><span data-i18n="admin.colGrantedAt"></span></th>
              <th class="col-center"><span data-i18n="admin.colAction"></span></th>
            </tr>
          </thead>
          <tbody id="permissionTableBody"></tbody>
        </table>
      </div>
      <div class="filter-bar" style="margin-top: var(--space-4);">
        <div class="filter-group" style="min-width: 220px;">
          <label for="grantPermissionSelect" data-i18n="admin.grantPermissionLabel"></label>
          <select id="grantPermissionSelect"></select>
        </div>
        <div class="filter-group" style="min-width: 200px;">
          <label for="grantProjectSelect" data-i18n="admin.grantProjectLabel"></label>
          <select id="grantProjectSelect">
            <option value="" data-i18n="admin.allProjects"></option>
          </select>
        </div>
        <button type="button" class="btn-primary" id="grantPermissionButton">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span data-i18n="admin.grantPermission"></span>
        </button>
      </div>
    </div>
    <div class="toast" id="permissionToast" style="display: none;"></div>
  `;
  applyTranslations();

  const userSearchInput = section.querySelector('#permissionUserSearch');
  const userResultsPanel = section.querySelector('#permissionUserResults');
  const userPanel = section.querySelector('#permissionUserPanel');
  const permissionTableBody = section.querySelector('#permissionTableBody');
  const grantPermissionSelect = section.querySelector('#grantPermissionSelect');
  const grantProjectSelect = section.querySelector('#grantProjectSelect');
  const grantPermissionButton = section.querySelector('#grantPermissionButton');
  const permissionToast = section.querySelector('#permissionToast');

  let allProjects = [];
  let currentUserId = null;

  function showToast(key, isError) {
    permissionToast.textContent = t(key);
    permissionToast.className = `toast ${isError ? 'error' : 'success'}`;
    permissionToast.style.display = 'block';
    setTimeout(() => { permissionToast.style.display = 'none'; }, 3000);
  }

  async function revokePermission(permission, button) {
    if (!window.confirm(t('admin.confirmRevoke').replace('{name}', permission.permissionName))) {
      return;
    }
    button.disabled = true;
    try {
      await apiRequest(`/users/${currentUserId}/permissions/${permission.id}`, { method: 'DELETE' });
      showToast('admin.permissionRevoked', false);
      loadUserPermissions();
    } catch (error) {
      showToast('admin.revokeError', true);
      button.disabled = false;
    }
  }

  function renderPermissionRows(permissions) {
    permissionTableBody.innerHTML = '';

    if (permissions.length === 0) {
      permissionTableBody.innerHTML = `
        <tr><td colspan="4" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>
            </svg>
            <span>${t('admin.permissionsEmpty')}</span>
          </div>
        </td></tr>`;
      return;
    }

    permissions.forEach((permission) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = permission.permissionName;

      const projectCell = document.createElement('td');
      const project = permission.projectId ? allProjects.find((p) => p.id === permission.projectId) : null;
      projectCell.textContent = project ? project.name : t('admin.allProjects');

      const grantedCell = document.createElement('td');
      grantedCell.className = 'col-center';
      grantedCell.textContent = formatDate(permission.grantedAt);

      const actionCell = document.createElement('td');
      actionCell.className = 'col-center';
      const revokeButton = document.createElement('button');
      revokeButton.type = 'button';
      revokeButton.className = 'btn-secondary';
      revokeButton.textContent = t('admin.revoke');
      revokeButton.addEventListener('click', () => revokePermission(permission, revokeButton));
      actionCell.appendChild(revokeButton);

      row.append(nameCell, projectCell, grantedCell, actionCell);
      permissionTableBody.appendChild(row);
    });
  }

  async function loadUserPermissions() {
    permissionTableBody.innerHTML = `<tr><td colspan="4" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.permissionsLoading'))}</td></tr>`;
    try {
      const permissions = await apiRequest(`/users/${currentUserId}/permissions`);
      renderPermissionRows(permissions);
    } catch (error) {
      permissionTableBody.innerHTML = `
        <tr><td colspan="4" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>${t('admin.permissionsError')}</span>
          </div>
        </td></tr>`;
    }
  }

  // Kullanıcı sayısı binlere çıkabileceği için tüm listeyi çekip bir
  // dropdown'a doldurmak yerine, yazarken (debounce'lu) sunucudan arama
  // yapıyoruz - backend en fazla 20 eşleşme dönüyor. Bkz. UserRepository.GetAllAsync.
  function renderUserResults(users) {
    userResultsPanel.innerHTML = '';

    if (users.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'custom-select-option';
      empty.style.cursor = 'default';
      empty.style.color = 'var(--color-text-muted)';
      empty.textContent = t('admin.noUsersFound');
      userResultsPanel.appendChild(empty);
    } else {
      users.forEach((user) => {
        const item = document.createElement('div');
        item.className = 'custom-select-option';
        item.textContent = `${user.fullName} (${user.email})`;
        item.addEventListener('click', () => selectUser(user));
        userResultsPanel.appendChild(item);
      });
    }

    userResultsPanel.style.display = 'block';
  }

  function selectUser(user) {
    currentUserId = user.id;
    userSearchInput.value = `${user.fullName} (${user.email})`;
    userResultsPanel.style.display = 'none';
    userResultsPanel.innerHTML = '';
    userPanel.style.display = '';
    loadUserPermissions();
  }

  const debouncedUserSearch = debounce(async () => {
    const query = userSearchInput.value.trim();
    if (query.length < 2) {
      userResultsPanel.style.display = 'none';
      userResultsPanel.innerHTML = '';
      return;
    }
    try {
      const users = await apiRequest(`/user?search=${encodeURIComponent(query)}`);
      renderUserResults(users);
    } catch (error) {
      userResultsPanel.style.display = 'none';
      userResultsPanel.innerHTML = '';
    }
  }, 300);

  userSearchInput.addEventListener('input', () => {
    currentUserId = null;
    userPanel.style.display = 'none';
    debouncedUserSearch();
  });

  userSearchInput.addEventListener('focus', () => {
    if (userResultsPanel.innerHTML) {
      userResultsPanel.style.display = 'block';
    }
  });

  document.addEventListener('click', (event) => {
    if (!section.contains(event.target)) return;
    if (event.target !== userSearchInput && !userResultsPanel.contains(event.target)) {
      userResultsPanel.style.display = 'none';
    }
  });

  grantPermissionButton.addEventListener('click', async () => {
    if (!currentUserId || !grantPermissionSelect.value) return;
    grantPermissionButton.disabled = true;
    try {
      await apiRequest(`/users/${currentUserId}/permissions`, {
        method: 'POST',
        body: JSON.stringify({
          permissionId: Number(grantPermissionSelect.value),
          projectId: grantProjectSelect.value ? Number(grantProjectSelect.value) : null
        })
      });
      showToast('admin.permissionGranted', false);
      loadUserPermissions();
    } catch (error) {
      showToast('admin.grantError', true);
    } finally {
      grantPermissionButton.disabled = false;
    }
  });

  async function loadInitialData() {
    try {
      const [permissions, projects] = await Promise.all([
        apiRequest('/permissions'),
        apiRequest('/project')
      ]);

      allProjects = projects;

      permissions.forEach((permission) => {
        const option = document.createElement('option');
        option.value = permission.id;
        option.textContent = permission.name;
        grantPermissionSelect.appendChild(option);
      });
      enhanceSelect(grantPermissionSelect);

      projects.forEach((project) => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        grantProjectSelect.appendChild(option);
      });
      enhanceSelect(grantProjectSelect);
    } catch (error) {
      // Seçenekler yüklenemese de kullanıcı seçim kutusu boş kalır, kritik değil.
    }
  }

  loadInitialData();
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
      <button type="button" class="btn-secondary btn-icon-only" id="auditClearFiltersButton" data-i18n-title="tickets.clearFilters" title="">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
          <path d="M3 12a9 9 0 1 0 2.64-6.36"/>
          <path d="M3 4v5h5"/>
        </svg>
      </button>
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
      entityCell.innerHTML = `${log.entityName} <span class="ticket-id">#${log.entityId}</span>`;

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

  filterEntity.addEventListener('input', debounce(resetPageAndLoad, 300));
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
    enhanceDateInput(filterFromDate);
    enhanceDateInput(filterToDate);
    resetPageAndLoad();
  });

  enhanceDateInput(filterFromDate);
  enhanceDateInput(filterToDate);
  loadAuditLog();
}
