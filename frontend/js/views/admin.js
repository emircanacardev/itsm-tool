import { enhanceSelect } from '../customSelect.js';
import { enhanceDateInput } from '../customDatePicker.js';
import { pulseLoader } from '../loading.js';
import { showConfirmDialog } from '../confirmDialog.js';

const ACTION_BADGE_MAP = {
  Added: { i18nKey: 'admin.actionAdded', bg: 'var(--status-resolved-bg)', fg: 'var(--status-resolved-fg)' },
  Modified: { i18nKey: 'admin.actionModified', bg: 'var(--status-inprogress-bg)', fg: 'var(--status-inprogress-fg)' },
  Deleted: { i18nKey: 'admin.actionDeleted', bg: 'var(--priority-critical-bg)', fg: 'var(--priority-critical-fg)' }
};

const AUDIT_PAGE_SIZE = 20;
const PROJECT_PAGE_SIZE = 10;
const USER_PAGE_SIZE = 10;
const GROUP_PAGE_SIZE = 10;

// Tablolardaki düzenle/sil/kaldır butonları için ortak ikonlar - metin yerine
// sadece ikon + title tooltip kullanıyoruz, satırlar daha az kalabalık oluyor.
const EDIT_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 15px; height: 15px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const DELETE_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 15px; height: 15px;"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

// Sekmeler lazy-render edilip birbirinden bağımsız closure'lar olarak
// yaşadığı için, Projeler <-> Proje Ayarları arasındaki çapraz-sekme
// iletişimi (Düzenle'ye basınca Proje Ayarları'na geçip ilgili projeyi
// seçtirme, orada kaydedince Projeler listesini tazeleme) bu paylaşımlı
// referanslar üzerinden yapılıyor.
let activateAdminTab = null;
const adminCrossTab = {
  projectsTab: null, // { reload() }
  projectSettingsTab: null // { selectProject(id): Promise }
};

function debounce(fn, delayMs) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

// Sıralanabilir kolon başlığı - tickets.js'teki aynı işaret ok ikonlu th
// pattern'i, admin panelindeki tüm tablolar (Users, Groups, Projects, SLA,
// Permissions, Audit Log) bunu paylaşıyor. col: { key, i18nKey, className }
function sortableColumnHtml(col) {
  return `
    <th class="col-sortable ${col.className || ''}" data-sort-key="${col.key}">
      <div class="th-inner">
        <span data-i18n="${col.i18nKey}"></span>
        <svg class="sort-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
    </th>
  `;
}

// Bir tablodaki .col-sortable başlıklarını tıklanabilir yapar; state nesnesi
// { sortField, sortDescending } tutar, tıklanınca günceller ve onChange'i
// çağırır (genelde currentPage'i 1'e çekip listeyi yeniden yükleyen fonksiyon).
function wireSortableHeaders(section, state, onChange) {
  function updateUI() {
    section.querySelectorAll('.col-sortable').forEach((th) => {
      const isActive = th.dataset.sortKey === state.sortField;
      th.classList.toggle('is-active', isActive);
      th.classList.toggle('is-asc', isActive && !state.sortDescending);
    });
  }

  section.querySelectorAll('.col-sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sortKey;
      if (state.sortField === key) {
        state.sortDescending = !state.sortDescending;
      } else {
        state.sortField = key;
        state.sortDescending = true;
      }
      updateUI();
      onChange();
    });
  });

  updateUI();
  return updateUI;
}

// Backend'de sayfalanmayan (tam liste tek seferde çekilen) SLA ve Permissions
// tabloları için istemci tarafında sıralama - accessor değeri sayı ise sayısal,
// değilse dile duyarlı (tr/en) metin karşılaştırması yapar.
function sortItemsBy(items, accessor, descending) {
  const sorted = [...items].sort((a, b) => {
    const va = accessor(a);
    const vb = accessor(b);
    if (typeof va === 'number' && typeof vb === 'number') {
      return va - vb;
    }
    return String(va ?? '').localeCompare(String(vb ?? ''), getLanguage() === 'tr' ? 'tr' : 'en', { sensitivity: 'base' });
  });
  return descending ? sorted.reverse() : sorted;
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

// Ticket listesindeki öncelik rozetleriyle aynı renk/desen - kullanıcı aynı
// önceliği hem talep listesinde hem admin panelinde aynı renkte tanısın.
const PRIORITY_BADGE_MAP = {
  'Kritik': { bg: 'var(--priority-critical-bg)', fg: 'var(--priority-critical-fg)' },
  'Yüksek': { bg: 'var(--priority-high-bg)', fg: 'var(--priority-high-fg)' },
  'Orta': { bg: 'var(--priority-medium-bg)', fg: 'var(--priority-medium-fg)' },
  'Düşük': { bg: 'var(--priority-low-bg)', fg: 'var(--priority-low-fg)' }
};

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
  // Kendi başına bir sekmesi yok - Projeler tab'ındaki Düzenle butonundan
  // activateAdminTab('projectSettings') ile ulaşılıyor (bkz. renderProjectsSection),
  // burada ayrıca bir giriş noktası olması aynı ekrana çift yoldan gitmeyi
  // gerektirirdi. Panel yine de burada kayıtlı, çünkü lazy-render/activateTab
  // mantığı tüm sekmeler için ortak. parentKey sayesinde bu panel açıkken
  // sekme çubuğunda "Projects" seçili görünmeye devam ediyor.
  { key: 'projectSettings', i18nKey: 'admin.tabProjectSettings', render: renderProjectSettingsSection, hidden: true, parentKey: 'projects' },
  { key: 'sla', i18nKey: 'admin.tabSla', render: renderSlaSection },
  { key: 'permissions', i18nKey: 'admin.tabPermissions', render: renderPermissionsSection },
  { key: 'auditLog', i18nKey: 'admin.tabAuditLog', render: renderAuditLogSection }
];

export function render(container) {
  const visibleTabs = TABS.filter((tab) => !tab.hidden);
  const tabButtonsHtml = visibleTabs.map((tab, index) => `
    <button type="button" class="admin-tab ${index === 0 ? 'is-active' : ''}" data-tab-key="${tab.key}" data-i18n="${tab.i18nKey}"></button>
  `).join('');
  const panelsHtml = TABS.map((tab) => `
    <div id="panel-${tab.key}" style="${!tab.hidden && tab.key === visibleTabs[0].key ? '' : 'display: none;'}"></div>
  `).join('');

  // .admin-view sarmalayıcısı sadece bu sayfaya özel buton renklendirmesi
  // (bkz. app.css) için var - container (#view) her sayfa geçişinde sadece
  // innerHTML ile temizleniyor, class'ı temizlenmiyor; bu yüzden rengi
  // container'a değil kendi iç div'imize veriyoruz ki başka sayfaya
  // geçildiğinde iz bırakmasın.
  container.innerHTML = `
    <div class="admin-view">
      <div class="admin-tabs">${tabButtonsHtml}</div>
      ${panelsHtml}
    </div>
  `;
  applyTranslations();

  const loadedTabs = new Set();

  function activateTab(activeKey) {
    // Gizli sekmelerin (ör. projectSettings) kendi butonu yok - parentKey
    // ile işaretlendiği sekmenin butonu seçili görünmeye devam ediyor,
    // yani Projeler'den Düzenle'ye basınca sekme çubuğunda hâlâ "Projects"
    // altı çizili kalıyor, sadece panel Proje Ayarları'na değişiyor.
    const activatingTab = TABS.find((tab) => tab.key === activeKey);
    const activeButtonKey = (activatingTab && activatingTab.parentKey) || activeKey;

    TABS.forEach((tab) => {
      const isActive = tab.key === activeKey;
      const button = container.querySelector(`[data-tab-key="${tab.key}"]`);
      if (button) button.classList.toggle('is-active', tab.key === activeButtonKey);
      const panel = container.querySelector(`#panel-${tab.key}`);
      panel.style.display = isActive ? '' : 'none';

      if (isActive && !loadedTabs.has(tab.key)) {
        loadedTabs.add(tab.key);
        tab.render(panel);
      }
    });
  }

  activateAdminTab = activateTab;

  visibleTabs.forEach((tab) => {
    container.querySelector(`[data-tab-key="${tab.key}"]`).addEventListener('click', () => activateTab(tab.key));
  });

  activateTab(visibleTabs[0].key);
}

const USER_SORTABLE_COLUMNS = [
  { key: 'fullName', i18nKey: 'admin.colName' },
  { key: 'email', i18nKey: 'admin.colEmail' },
  { key: 'group', i18nKey: 'admin.colGroup' },
  { key: 'status', i18nKey: 'admin.colStatus' },
  { key: 'createdAt', i18nKey: 'admin.colCreated', className: 'col-center' }
];

function renderUsersSection(section) {
  const columnsHtml = USER_SORTABLE_COLUMNS.map(sortableColumnHtml).join('');
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
            ${columnsHtml}
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
  const sortState = { sortField: 'fullName', sortDescending: false };

  function showToast(key, isError) {
    userToast.textContent = t(key);
    userToast.className = `toast ${isError ? 'error' : 'success'}`;
    userToast.style.display = 'block';
    setTimeout(() => { userToast.style.display = 'none'; }, 3000);
  }

  async function toggleUserStatus(user, button) {
    const nextActive = !user.isActive;
    const confirmKey = nextActive ? 'admin.confirmActivate' : 'admin.confirmDeactivate';
    const confirmed = await showConfirmDialog(t(confirmKey).replace('{name}', user.fullName), { danger: !nextActive });
    if (!confirmed) {
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
      actionButton.textContent = t(user.isActive ? 'admin.deactivate' : 'admin.activate');
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
      params.set('sortBy', sortState.sortField);
      params.set('sortDescending', String(sortState.sortDescending));
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

  wireSortableHeaders(section, sortState, resetPageAndLoad);

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

const GROUP_SORTABLE_COLUMNS = [
  { key: 'name', i18nKey: 'admin.colGroupName' },
  { key: 'description', i18nKey: 'admin.colDescription' },
  { key: 'createdAt', i18nKey: 'admin.colCreated', className: 'col-center' }
];

function renderGroupsSection(section) {
  const columnsHtml = GROUP_SORTABLE_COLUMNS.map(sortableColumnHtml).join('');
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
    <div class="filter-bar">
      <div class="filter-group filter-group-search">
        <label for="groupSearchInput" data-i18n="admin.searchLabel"></label>
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
          <input type="text" id="groupSearchInput" data-i18n-placeholder="admin.groupSearchPlaceholder">
        </div>
      </div>
    </div>
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>
            ${columnsHtml}
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
  const groupSearchInput = section.querySelector('#groupSearchInput');
  const groupToast = section.querySelector('#groupToast');
  const paginationInfo = section.querySelector('#groupPaginationInfo');
  const pageIndicator = section.querySelector('#groupPageIndicator');
  const prevPageButton = section.querySelector('#groupPrevPageButton');
  const nextPageButton = section.querySelector('#groupNextPageButton');

  let currentPage = 1;
  const sortState = { sortField: 'name', sortDescending: false };

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
      editButton.className = 'btn-secondary btn-icon-only';
      editButton.title = t('admin.edit');
      editButton.innerHTML = EDIT_ICON;
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
  // Projeler sekmeleri) tam listeyi çekmek yerine sunucu tarafında arayıp sayfalıyoruz.
  async function loadGroups() {
    groupTableBody.innerHTML = `<tr><td colspan="4" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.groupsLoading'))}</td></tr>`;
    try {
      const search = groupSearchInput.value.trim();
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('sortBy', sortState.sortField);
      params.set('sortDescending', String(sortState.sortDescending));
      params.set('page', String(currentPage));
      params.set('pageSize', String(GROUP_PAGE_SIZE));

      const result = await apiRequest(`/group?${params.toString()}`);
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

  function resetPageAndLoad() {
    currentPage = 1;
    loadGroups();
  }

  wireSortableHeaders(section, sortState, resetPageAndLoad);

  groupSearchInput.addEventListener('input', debounce(resetPageAndLoad, 300));

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

const PROJECT_SORTABLE_COLUMNS = [
  { key: 'name', i18nKey: 'admin.colProjectName' },
  { key: 'code', i18nKey: 'admin.colProjectCode' },
  { key: 'description', i18nKey: 'admin.colDescription' },
  { key: 'status', i18nKey: 'admin.colStatus' },
  { key: 'createdAt', i18nKey: 'admin.colCreated', className: 'col-center' }
];

function renderProjectsSection(section) {
  const columnsHtml = PROJECT_SORTABLE_COLUMNS.map(sortableColumnHtml).join('');
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
    <div class="filter-bar">
      <div class="filter-group filter-group-search">
        <label for="projectSearchInput" data-i18n="admin.searchLabel"></label>
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
          <input type="text" id="projectSearchInput" data-i18n-placeholder="admin.projectSearchPlaceholder">
        </div>
      </div>
    </div>
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>
            ${columnsHtml}
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
  const projectSearchInput = section.querySelector('#projectSearchInput');
  const projectToast = section.querySelector('#projectToast');
  const paginationInfo = section.querySelector('#projectPaginationInfo');
  const pageIndicator = section.querySelector('#projectPageIndicator');
  const prevPageButton = section.querySelector('#projectPrevPageButton');
  const nextPageButton = section.querySelector('#projectNextPageButton');

  let currentPage = 1;
  const sortState = { sortField: 'name', sortDescending: false };

  function showToast(key, isError) {
    projectToast.textContent = t(key);
    projectToast.className = `toast ${isError ? 'error' : 'success'}`;
    projectToast.style.display = 'block';
    setTimeout(() => { projectToast.style.display = 'none'; }, 3000);
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
      editButton.className = 'btn-secondary btn-icon-only';
      editButton.title = t('admin.edit');
      editButton.innerHTML = EDIT_ICON;
      // Projeler tab'ında artık satır içi düzenleme yok - proje adı/açıklama/
      // durum artık Kategoriler ve Kurallarla aynı ekranda (Proje Ayarları)
      // düzenleniyor, tekrarlı iki ekran olmasın diye oraya yönlendiriyoruz.
      editButton.addEventListener('click', () => {
        if (activateAdminTab) activateAdminTab('projectSettings');
        if (adminCrossTab.projectSettingsTab) adminCrossTab.projectSettingsTab.selectProject(project.id);
      });
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
      const search = projectSearchInput.value.trim();
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('sortBy', sortState.sortField);
      params.set('sortDescending', String(sortState.sortDescending));
      params.set('page', String(currentPage));
      params.set('pageSize', String(PROJECT_PAGE_SIZE));

      const result = await apiRequest(`/project?${params.toString()}`);
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

  function resetPageAndLoad() {
    currentPage = 1;
    loadProjects();
  }

  wireSortableHeaders(section, sortState, resetPageAndLoad);

  projectSearchInput.addEventListener('input', debounce(resetPageAndLoad, 300));

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

  // Proje Ayarları'ndan (Proje Bilgileri paneli) kaydedince bu liste bayat
  // kalmasın diye tazeleme fonksiyonunu paylaşımlı registry'ye kaydediyoruz.
  adminCrossTab.projectsTab = { reload: loadProjects };

  loadProjects();
}

function renderProjectSettingsSection(section) {
  section.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group" style="min-width: 260px;">
        <label for="psProjectSelect" data-i18n="admin.selectProjectLabel"></label>
        <select id="psProjectSelect">
          <option value="" data-i18n="admin.selectProjectPlaceholder"></option>
        </select>
      </div>
    </div>
    <div class="state-box" id="psEmptyState">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7h5l2 2h11v10a2 2 0 0 1-2 2H3z"/>
      </svg>
      <span data-i18n="admin.selectProjectHint"></span>
    </div>
    <div id="psPanels" style="display: none;">
      <div style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--color-text); margin: var(--space-2) 0 var(--space-3);" data-i18n="admin.projectInfoHeading"></div>
      <div class="filter-bar">
        <div class="filter-group">
          <label for="psInfoNameInput" data-i18n="admin.projectName"></label>
          <input type="text" id="psInfoNameInput">
        </div>
        <div class="filter-group">
          <label for="psInfoCodeInput" data-i18n="admin.colProjectCode"></label>
          <input type="text" id="psInfoCodeInput" disabled>
        </div>
        <div class="filter-group" style="flex: 1;">
          <label for="psInfoDescriptionInput" data-i18n="admin.groupDescription"></label>
          <input type="text" id="psInfoDescriptionInput">
        </div>
        <div class="filter-group">
          <label for="psInfoStatusSelect" data-i18n="admin.colStatus"></label>
          <select id="psInfoStatusSelect">
            <option value="true" data-i18n="admin.statusActive"></option>
            <option value="false" data-i18n="admin.statusInactive"></option>
          </select>
        </div>
        <button type="button" class="btn-primary" id="psSaveInfoButton" data-i18n="admin.save"></button>
      </div>

      <div style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--color-text); margin: var(--space-6) 0 var(--space-3);" data-i18n="admin.categoriesHeading"></div>
      <div class="filter-bar">
        <div class="filter-group">
          <label for="categoryNameInput" data-i18n="admin.categoryName"></label>
          <input type="text" id="categoryNameInput" data-i18n-placeholder="admin.categoryNamePlaceholder">
        </div>
        <div class="filter-group" style="flex: 1;">
          <label for="categoryDescriptionInput" data-i18n="admin.groupDescription"></label>
          <input type="text" id="categoryDescriptionInput" data-i18n-placeholder="admin.projectDescriptionPlaceholder">
        </div>
        <button type="button" class="btn-primary" id="addCategoryButton">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span data-i18n="admin.addCategory"></span>
        </button>
      </div>
      <div class="ticket-table-wrap table-static">
        <table>
          <thead>
            <tr>
              <th><span data-i18n="admin.colCategoryName"></span></th>
              <th><span data-i18n="admin.colDescription"></span></th>
              <th class="col-center"><span data-i18n="admin.colAction"></span></th>
            </tr>
          </thead>
          <tbody id="categoryTableBody"></tbody>
        </table>
      </div>

      <div style="font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--color-text); margin: var(--space-6) 0 var(--space-3);" data-i18n="admin.rulesHeading"></div>
      <p style="font-size: var(--text-sm); color: var(--color-text-muted); margin: 0 0 var(--space-3);" data-i18n="admin.rulesHint"></p>
      <div class="filter-bar">
        <div class="filter-group">
          <label for="ruleCategorySelect" data-i18n="admin.slaCategoryLabel"></label>
          <select id="ruleCategorySelect">
            <option value="" data-i18n="admin.allCategories"></option>
          </select>
        </div>
        <div class="filter-group" style="min-width: 220px;">
          <label for="ruleUserSearch" data-i18n="admin.assignToUserLabel"></label>
          <div style="position: relative;">
            <div class="search-box">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="7"/>
                <path d="M21 21l-4.3-4.3"/>
              </svg>
              <input type="text" id="ruleUserSearch" autocomplete="off" data-i18n-placeholder="admin.selectUserPlaceholder">
            </div>
            <div class="custom-select-menu" id="ruleUserResults"></div>
          </div>
        </div>
        <div class="filter-group">
          <label for="ruleGroupSelect" data-i18n="admin.assignToGroupLabel"></label>
          <select id="ruleGroupSelect">
            <option value="" data-i18n="admin.noneOption"></option>
          </select>
        </div>
        <div class="filter-group">
          <label for="rulePriorityOrderInput" data-i18n="admin.priorityOrderLabel"></label>
          <input type="number" min="0" id="rulePriorityOrderInput" class="table-edit-input" style="width: 80px;" value="0">
        </div>
        <button type="button" class="btn-primary" id="addRuleButton">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span data-i18n="admin.addRule"></span>
        </button>
      </div>
      <div class="ticket-table-wrap table-static">
        <table>
          <thead>
            <tr>
              <th><span data-i18n="admin.colCategory"></span></th>
              <th><span data-i18n="admin.colAssignedTo"></span></th>
              <th class="col-center"><span data-i18n="admin.colPriorityOrder"></span></th>
              <th class="col-center"><span data-i18n="admin.colAction"></span></th>
            </tr>
          </thead>
          <tbody id="ruleTableBody"></tbody>
        </table>
      </div>
    </div>
    <div class="toast" id="psToast" style="display: none;"></div>
  `;
  applyTranslations();

  const psProjectSelect = section.querySelector('#psProjectSelect');
  const psEmptyState = section.querySelector('#psEmptyState');
  const psPanels = section.querySelector('#psPanels');
  const psToast = section.querySelector('#psToast');

  const psInfoNameInput = section.querySelector('#psInfoNameInput');
  const psInfoCodeInput = section.querySelector('#psInfoCodeInput');
  const psInfoDescriptionInput = section.querySelector('#psInfoDescriptionInput');
  const psInfoStatusSelect = section.querySelector('#psInfoStatusSelect');
  const psSaveInfoButton = section.querySelector('#psSaveInfoButton');
  enhanceSelect(psInfoStatusSelect);

  const categoryTableBody = section.querySelector('#categoryTableBody');
  const categoryNameInput = section.querySelector('#categoryNameInput');
  const categoryDescriptionInput = section.querySelector('#categoryDescriptionInput');
  const addCategoryButton = section.querySelector('#addCategoryButton');

  const ruleTableBody = section.querySelector('#ruleTableBody');
  const ruleCategorySelect = section.querySelector('#ruleCategorySelect');
  const ruleUserSearch = section.querySelector('#ruleUserSearch');
  const ruleUserResults = section.querySelector('#ruleUserResults');
  const ruleGroupSelect = section.querySelector('#ruleGroupSelect');
  const rulePriorityOrderInput = section.querySelector('#rulePriorityOrderInput');
  const addRuleButton = section.querySelector('#addRuleButton');

  let currentProjectId = null;
  let currentCategories = [];
  let allGroups = [];
  let allProjects = [];
  let selectedRuleUserId = null;
  const userCache = {};

  function showToast(key, isError) {
    psToast.textContent = t(key);
    psToast.className = `toast ${isError ? 'error' : 'success'}`;
    psToast.style.display = 'block';
    setTimeout(() => { psToast.style.display = 'none'; }, 3000);
  }

  // --- Proje Bilgileri ---

  psSaveInfoButton.addEventListener('click', async () => {
    if (!currentProjectId) return;
    const newName = psInfoNameInput.value.trim();
    if (!newName) return;
    psSaveInfoButton.disabled = true;
    try {
      const isActive = psInfoStatusSelect.value === 'true';
      const description = psInfoDescriptionInput.value.trim() || null;
      await apiRequest(`/project/${currentProjectId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName, description, isActive })
      });

      const project = allProjects.find((p) => p.id === currentProjectId);
      if (project) {
        project.name = newName;
        project.description = description;
        project.isActive = isActive;
        const option = psProjectSelect.querySelector(`option[value="${currentProjectId}"]`);
        if (option) option.textContent = newName;
        enhanceSelect(psProjectSelect);
      }

      showToast('admin.projectUpdated', false);
      // Projeler tab'ı daha önce render edildiyse listesi bayat kalmasın diye tazele.
      if (adminCrossTab.projectsTab) adminCrossTab.projectsTab.reload();
    } catch (error) {
      showToast('admin.projectUpdateError', true);
    } finally {
      psSaveInfoButton.disabled = false;
    }
  });

  async function resolveUserName(userId) {
    if (userCache[userId]) return userCache[userId];
    try {
      const user = await apiRequest(`/user/${userId}`);
      userCache[userId] = user.fullName;
    } catch (error) {
      userCache[userId] = `#${userId}`;
    }
    return userCache[userId];
  }

  // --- Kategoriler ---

  function enterCategoryEditMode(row, category) {
    const [nameCell, descriptionCell, actionCell] = row.children;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'table-edit-input';
    nameInput.value = category.name;
    nameCell.innerHTML = '';
    nameCell.appendChild(nameInput);

    const descriptionInput = document.createElement('input');
    descriptionInput.type = 'text';
    descriptionInput.className = 'table-edit-input';
    descriptionInput.value = category.description || '';
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
        await apiRequest(`/project/${currentProjectId}/categories/${category.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: newName, description: descriptionInput.value.trim() || null })
        });
        showToast('admin.categoryUpdated', false);
        loadCategories();
      } catch (error) {
        showToast('admin.categoryUpdateError', true);
        saveButton.disabled = false;
      }
    });

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn-secondary';
    cancelButton.textContent = t('admin.cancel');
    cancelButton.addEventListener('click', () => loadCategories());

    actionCell.append(saveButton, cancelButton);
  }

  async function deleteCategory(category, button) {
    const confirmed = await showConfirmDialog(t('admin.confirmDeleteCategory').replace('{name}', category.name), { danger: true });
    if (!confirmed) {
      return;
    }
    button.disabled = true;
    try {
      await apiRequest(`/project/${currentProjectId}/categories/${category.id}`, { method: 'DELETE' });
      showToast('admin.categoryDeleted', false);
      loadCategories();
    } catch (error) {
      showToast('admin.categoryInUseError', true);
      button.disabled = false;
    }
  }

  function renderCategoryRows() {
    categoryTableBody.innerHTML = '';

    if (currentCategories.length === 0) {
      categoryTableBody.innerHTML = `
        <tr><td colspan="3" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M8 12h8"/>
            </svg>
            <span>${t('admin.categoriesEmpty')}</span>
          </div>
        </td></tr>`;
      return;
    }

    currentCategories.forEach((category) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = category.name;

      const descriptionCell = document.createElement('td');
      descriptionCell.textContent = category.description || '-';

      const actionCell = document.createElement('td');
      actionCell.className = 'col-center';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn-secondary btn-icon-only';
      editButton.style.marginRight = '6px';
      editButton.title = t('admin.edit');
      editButton.innerHTML = EDIT_ICON;
      editButton.addEventListener('click', () => enterCategoryEditMode(row, category));
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn-secondary btn-icon-only btn-danger';
      deleteButton.title = t('admin.delete');
      deleteButton.innerHTML = DELETE_ICON;
      deleteButton.addEventListener('click', () => deleteCategory(category, deleteButton));
      actionCell.append(editButton, deleteButton);

      row.append(nameCell, descriptionCell, actionCell);
      categoryTableBody.appendChild(row);
    });
  }

  function populateRuleCategorySelect() {
    ruleCategorySelect.innerHTML = `<option value="" data-i18n="admin.allCategories">${t('admin.allCategories')}</option>`;
    currentCategories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      ruleCategorySelect.appendChild(option);
    });
    enhanceSelect(ruleCategorySelect);
  }

  async function loadCategories() {
    categoryTableBody.innerHTML = `<tr><td colspan="3" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.categoriesLoading'))}</td></tr>`;
    try {
      currentCategories = await apiRequest(`/project/${currentProjectId}/categories`);
      renderCategoryRows();
      populateRuleCategorySelect();
    } catch (error) {
      currentCategories = [];
      categoryTableBody.innerHTML = `
        <tr><td colspan="3" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>${t('admin.categoriesError')}</span>
          </div>
        </td></tr>`;
    }
  }

  addCategoryButton.addEventListener('click', async () => {
    const name = categoryNameInput.value.trim();
    if (!name) return;
    addCategoryButton.disabled = true;
    try {
      await apiRequest(`/project/${currentProjectId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name, description: categoryDescriptionInput.value.trim() || null })
      });
      categoryNameInput.value = '';
      categoryDescriptionInput.value = '';
      showToast('admin.categoryCreated', false);
      loadCategories();
    } catch (error) {
      showToast('admin.categoryCreateError', true);
    } finally {
      addCategoryButton.disabled = false;
    }
  });

  // --- Otomatik Atama Kuralları ---

  function selectRuleUser(user) {
    selectedRuleUserId = user.id;
    ruleUserSearch.value = `${user.fullName} (${user.email})`;
    ruleUserResults.style.display = 'none';
    ruleUserResults.innerHTML = '';
    ruleGroupSelect.value = '';
    enhanceSelect(ruleGroupSelect);
  }

  function renderRuleUserResults(users) {
    ruleUserResults.innerHTML = '';
    if (users.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'custom-select-option';
      empty.style.cursor = 'default';
      empty.style.color = 'var(--color-text-muted)';
      empty.textContent = t('admin.noUsersFound');
      ruleUserResults.appendChild(empty);
    } else {
      users.forEach((user) => {
        const item = document.createElement('div');
        item.className = 'custom-select-option';
        item.textContent = `${user.fullName} (${user.email})`;
        item.addEventListener('click', () => selectRuleUser(user));
        ruleUserResults.appendChild(item);
      });
    }
    ruleUserResults.style.display = 'block';
  }

  const debouncedRuleUserSearch = debounce(async () => {
    const query = ruleUserSearch.value.trim();
    if (query.length < 2) {
      ruleUserResults.style.display = 'none';
      ruleUserResults.innerHTML = '';
      return;
    }
    try {
      const users = await apiRequest(`/user?search=${encodeURIComponent(query)}`);
      renderRuleUserResults(users);
    } catch (error) {
      ruleUserResults.style.display = 'none';
      ruleUserResults.innerHTML = '';
    }
  }, 300);

  ruleUserSearch.addEventListener('input', () => {
    selectedRuleUserId = null;
    debouncedRuleUserSearch();
  });

  ruleUserSearch.addEventListener('focus', () => {
    if (ruleUserResults.innerHTML) {
      ruleUserResults.style.display = 'block';
    }
  });

  document.addEventListener('click', (event) => {
    if (!section.contains(event.target)) return;
    if (event.target !== ruleUserSearch && !ruleUserResults.contains(event.target)) {
      ruleUserResults.style.display = 'none';
    }
  });

  ruleGroupSelect.addEventListener('change', () => {
    if (ruleGroupSelect.value) {
      selectedRuleUserId = null;
      ruleUserSearch.value = '';
    }
  });

  async function deleteRule(rule, button) {
    const confirmed = await showConfirmDialog(t('admin.confirmDeleteRule'), { danger: true });
    if (!confirmed) {
      return;
    }
    button.disabled = true;
    try {
      await apiRequest(`/project/${currentProjectId}/auto-assignment-rules/${rule.id}`, { method: 'DELETE' });
      showToast('admin.ruleDeleted', false);
      loadRules();
    } catch (error) {
      showToast('admin.ruleDeleteError', true);
      button.disabled = false;
    }
  }

  async function renderRuleRows(rules) {
    ruleTableBody.innerHTML = '';

    if (rules.length === 0) {
      ruleTableBody.innerHTML = `
        <tr><td colspan="4" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M8 12h8"/>
            </svg>
            <span>${t('admin.rulesEmpty')}</span>
          </div>
        </td></tr>`;
      return;
    }

    const userIdsNeeded = [...new Set(rules.filter((r) => r.assignToUserId).map((r) => r.assignToUserId))];
    await Promise.all(userIdsNeeded.map((id) => resolveUserName(id)));

    rules.forEach((rule) => {
      const row = document.createElement('tr');

      const categoryCell = document.createElement('td');
      const category = rule.categoryId ? currentCategories.find((c) => c.id === rule.categoryId) : null;
      categoryCell.textContent = rule.categoryId ? (category ? category.name : `#${rule.categoryId}`) : t('admin.allCategories');

      const assignedCell = document.createElement('td');
      if (rule.assignToUserId) {
        assignedCell.textContent = userCache[rule.assignToUserId] || `#${rule.assignToUserId}`;
      } else if (rule.assignToGroupId) {
        const group = allGroups.find((g) => g.id === rule.assignToGroupId);
        assignedCell.textContent = group ? `${group.name} (${t('admin.groupBadge')})` : `#${rule.assignToGroupId}`;
      } else {
        assignedCell.textContent = '-';
      }

      const priorityOrderCell = document.createElement('td');
      priorityOrderCell.className = 'col-center';
      priorityOrderCell.textContent = rule.priorityOrder;

      const actionCell = document.createElement('td');
      actionCell.className = 'col-center';
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn-secondary btn-icon-only btn-danger';
      deleteButton.title = t('admin.delete');
      deleteButton.innerHTML = DELETE_ICON;
      deleteButton.addEventListener('click', () => deleteRule(rule, deleteButton));
      actionCell.appendChild(deleteButton);

      row.append(categoryCell, assignedCell, priorityOrderCell, actionCell);
      ruleTableBody.appendChild(row);
    });
  }

  async function loadRules() {
    ruleTableBody.innerHTML = `<tr><td colspan="4" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.rulesLoading'))}</td></tr>`;
    try {
      const rules = await apiRequest(`/project/${currentProjectId}/auto-assignment-rules`);
      await renderRuleRows(rules);
    } catch (error) {
      ruleTableBody.innerHTML = `
        <tr><td colspan="4" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>${t('admin.rulesError')}</span>
          </div>
        </td></tr>`;
    }
  }

  addRuleButton.addEventListener('click', async () => {
    const hasUser = !!selectedRuleUserId;
    const hasGroup = !!ruleGroupSelect.value;
    if (hasUser === hasGroup) {
      showToast('admin.ruleAssignValidationError', true);
      return;
    }

    addRuleButton.disabled = true;
    try {
      await apiRequest(`/project/${currentProjectId}/auto-assignment-rules`, {
        method: 'POST',
        body: JSON.stringify({
          categoryId: ruleCategorySelect.value ? Number(ruleCategorySelect.value) : null,
          assignToUserId: hasUser ? selectedRuleUserId : null,
          assignToGroupId: hasGroup ? Number(ruleGroupSelect.value) : null,
          priorityOrder: Number(rulePriorityOrderInput.value) || 0
        })
      });
      ruleUserSearch.value = '';
      selectedRuleUserId = null;
      ruleGroupSelect.value = '';
      enhanceSelect(ruleGroupSelect);
      rulePriorityOrderInput.value = '0';
      showToast('admin.ruleCreated', false);
      loadRules();
    } catch (error) {
      showToast('admin.ruleCreateError', true);
    } finally {
      addRuleButton.disabled = false;
    }
  });

  // --- Proje seçimi ---

  function onProjectChange() {
    currentProjectId = psProjectSelect.value ? Number(psProjectSelect.value) : null;
    if (!currentProjectId) {
      psEmptyState.style.display = '';
      psPanels.style.display = 'none';
      return;
    }
    psEmptyState.style.display = 'none';
    psPanels.style.display = '';

    const project = allProjects.find((p) => p.id === currentProjectId);
    if (project) {
      psInfoNameInput.value = project.name;
      psInfoCodeInput.value = project.code;
      psInfoDescriptionInput.value = project.description || '';
      psInfoStatusSelect.value = String(project.isActive);
      enhanceSelect(psInfoStatusSelect);
    }

    categoryNameInput.value = '';
    categoryDescriptionInput.value = '';
    ruleUserSearch.value = '';
    selectedRuleUserId = null;
    ruleGroupSelect.value = '';
    enhanceSelect(ruleGroupSelect);
    rulePriorityOrderInput.value = '0';
    loadCategories();
    loadRules();
  }

  psProjectSelect.addEventListener('change', onProjectChange);

  async function loadInitialData() {
    try {
      const [projects, groups] = await Promise.all([
        apiRequest('/project'),
        apiRequest('/group')
      ]);

      allProjects = projects;
      projects.forEach((project) => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        psProjectSelect.appendChild(option);
      });
      enhanceSelect(psProjectSelect);

      allGroups = groups;
      groups.forEach((group) => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        ruleGroupSelect.appendChild(option);
      });
      enhanceSelect(ruleGroupSelect);
    } catch (error) {
      // Proje/grup listesi yüklenemese de seçim kutuları boş kalır, kritik değil.
    }
  }

  const initialDataPromise = loadInitialData();

  // Projeler tab'ındaki Düzenle butonu bu sekmeye geçip ilgili projeyi
  // seçtirmek için bunu çağırıyor. Proje Ayarları ilk kez bu şekilde
  // render ediliyor olabilir - proje/grup listesi henüz gelmemiş olabileceği
  // için önce loadInitialData'nın bitmesini bekliyoruz.
  adminCrossTab.projectSettingsTab = {
    async selectProject(id) {
      await initialDataPromise;
      psProjectSelect.value = String(id);
      psProjectSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };
}

const SLA_SORTABLE_COLUMNS = [
  { key: 'project', i18nKey: 'admin.colProject' },
  { key: 'category', i18nKey: 'admin.colCategory' },
  { key: 'priority', i18nKey: 'admin.colPriority' },
  { key: 'responseTime', i18nKey: 'admin.colResponseTime', className: 'col-center' },
  { key: 'resolutionTime', i18nKey: 'admin.colResolutionTime', className: 'col-center' }
];

function renderSlaSection(section) {
  const columnsHtml = SLA_SORTABLE_COLUMNS.map(sortableColumnHtml).join('');
  section.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group">
        <label for="slaProjectSelect" data-i18n="admin.slaProjectLabel"></label>
        <select id="slaProjectSelect">
          <option value="" data-i18n="admin.allProjects"></option>
        </select>
      </div>
      <div class="filter-group">
        <label for="slaCategorySelect" data-i18n="admin.slaCategoryLabel"></label>
        <select id="slaCategorySelect" disabled>
          <option value="" data-i18n="admin.allCategories"></option>
        </select>
      </div>
      <div class="filter-group">
        <label for="slaPrioritySelect" data-i18n="admin.slaPriorityLabel"></label>
        <select id="slaPrioritySelect"></select>
      </div>
      <div class="filter-group">
        <label for="slaResponseInput" data-i18n="admin.slaResponseLabel"></label>
        <input type="number" min="1" id="slaResponseInput" class="table-edit-input" style="width: 100px;" placeholder="0">
      </div>
      <div class="filter-group">
        <label for="slaResolutionInput" data-i18n="admin.slaResolutionLabel"></label>
        <input type="number" min="1" id="slaResolutionInput" class="table-edit-input" style="width: 100px;" placeholder="0">
      </div>
      <button type="button" class="btn-primary" id="addSlaButton">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span data-i18n="admin.addSla"></span>
      </button>
    </div>
    <div class="filter-bar">
      <div class="filter-group filter-group-search">
        <label for="slaSearchInput" data-i18n="admin.searchLabel"></label>
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
          <input type="text" id="slaSearchInput" data-i18n-placeholder="admin.slaSearchPlaceholder">
        </div>
      </div>
    </div>
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>
            ${columnsHtml}
            <th class="col-center"><span data-i18n="admin.colAction"></span></th>
          </tr>
        </thead>
        <tbody id="slaTableBody">
          <tr><td colspan="6" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.slaLoading'))}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="toast" id="slaToast" style="display: none;"></div>
  `;
  applyTranslations();

  const slaTableBody = section.querySelector('#slaTableBody');
  const slaProjectSelect = section.querySelector('#slaProjectSelect');
  const slaCategorySelect = section.querySelector('#slaCategorySelect');
  const slaPrioritySelect = section.querySelector('#slaPrioritySelect');
  const slaResponseInput = section.querySelector('#slaResponseInput');
  const slaResolutionInput = section.querySelector('#slaResolutionInput');
  const addSlaButton = section.querySelector('#addSlaButton');
  const slaSearchInput = section.querySelector('#slaSearchInput');
  const slaToast = section.querySelector('#slaToast');

  let allProjects = [];
  let currentSlas = [];
  const sortState = { sortField: 'project', sortDescending: false };
  // Kategoriler proje bazlı (nested route) olduğu için tek bir "tüm
  // kategoriler" endpoint'i yok - listede kategori adı göstermek için
  // ihtiyaç oldukça projeye göre önbelleğe alıyoruz.
  const categoriesByProject = {};

  // SLA listesi backend'de sayfalanmadığı (tam liste tek seferde) için
  // sıralama istemci tarafında yapılıyor - proje/kategori adları da tabloda
  // gösterildikleri gibi (id değil, çözümlenmiş isim) sıralansın diye
  // accessor'lar aynı lookup'ları kullanıyor.
  const SLA_SORT_ACCESSORS = {
    project: (sla) => (sla.projectId ? (allProjects.find((p) => p.id === sla.projectId)?.name || '') : ''),
    category: (sla) => {
      if (!sla.categoryId) return '';
      const categoryList = sla.projectId ? (categoriesByProject[sla.projectId] || []) : [];
      return categoryList.find((c) => c.id === sla.categoryId)?.name || '';
    },
    priority: (sla) => sla.priorityName || '',
    responseTime: (sla) => sla.responseTimeMinutes,
    resolutionTime: (sla) => sla.resolutionTimeMinutes
  };

  function showToast(key, isError) {
    slaToast.textContent = t(key);
    slaToast.className = `toast ${isError ? 'error' : 'success'}`;
    slaToast.style.display = 'block';
    setTimeout(() => { slaToast.style.display = 'none'; }, 3000);
  }

  async function getCategoriesForProject(projectId) {
    if (!projectId) return [];
    if (!categoriesByProject[projectId]) {
      try {
        categoriesByProject[projectId] = await apiRequest(`/project/${projectId}/categories`);
      } catch (error) {
        categoriesByProject[projectId] = [];
      }
    }
    return categoriesByProject[projectId];
  }

  async function populateFormCategorySelect(projectId) {
    slaCategorySelect.innerHTML = `<option value="" data-i18n="admin.allCategories">${t('admin.allCategories')}</option>`;
    if (!projectId) {
      slaCategorySelect.disabled = true;
      enhanceSelect(slaCategorySelect);
      return;
    }
    slaCategorySelect.disabled = false;
    const categories = await getCategoriesForProject(projectId);
    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      slaCategorySelect.appendChild(option);
    });
    enhanceSelect(slaCategorySelect);
  }

  slaProjectSelect.addEventListener('change', () => {
    populateFormCategorySelect(slaProjectSelect.value || null);
  });

  function enterEditMode(row, sla) {
    const [, , , responseCell, resolutionCell, actionCell] = row.children;

    const responseInput = document.createElement('input');
    responseInput.type = 'number';
    responseInput.min = '1';
    responseInput.className = 'table-edit-input';
    responseInput.value = sla.responseTimeMinutes;
    responseCell.innerHTML = '';
    responseCell.appendChild(responseInput);

    const resolutionInput = document.createElement('input');
    resolutionInput.type = 'number';
    resolutionInput.min = '1';
    resolutionInput.className = 'table-edit-input';
    resolutionInput.value = sla.resolutionTimeMinutes;
    resolutionCell.innerHTML = '';
    resolutionCell.appendChild(resolutionInput);

    actionCell.innerHTML = '';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'btn-secondary';
    saveButton.style.marginRight = '6px';
    saveButton.textContent = t('admin.save');
    saveButton.addEventListener('click', async () => {
      const responseMinutes = Number(responseInput.value);
      const resolutionMinutes = Number(resolutionInput.value);
      if (!responseMinutes || !resolutionMinutes) return;
      saveButton.disabled = true;
      try {
        await apiRequest(`/sla/${sla.id}`, {
          method: 'PUT',
          body: JSON.stringify({ responseTimeMinutes: responseMinutes, resolutionTimeMinutes: resolutionMinutes })
        });
        showToast('admin.slaUpdated', false);
        loadSlas();
      } catch (error) {
        showToast('admin.slaUpdateError', true);
        saveButton.disabled = false;
      }
    });

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn-secondary';
    cancelButton.textContent = t('admin.cancel');
    cancelButton.addEventListener('click', () => loadSlas());

    actionCell.append(saveButton, cancelButton);
  }

  async function deleteSla(sla, button) {
    const confirmed = await showConfirmDialog(t('admin.confirmDeleteSla'), { danger: true });
    if (!confirmed) {
      return;
    }
    button.disabled = true;
    try {
      await apiRequest(`/sla/${sla.id}`, { method: 'DELETE' });
      showToast('admin.slaDeleted', false);
      loadSlas();
    } catch (error) {
      showToast('admin.slaDeleteError', true);
      button.disabled = false;
    }
  }

  async function renderRows() {
    slaTableBody.innerHTML = '';

    if (currentSlas.length === 0) {
      slaTableBody.innerHTML = `
        <tr><td colspan="6" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M8 12h8"/>
            </svg>
            <span>${t('admin.slaEmpty')}</span>
          </div>
        </td></tr>`;
      return;
    }

    // Kategori adlarını göstermeden (ve onlara/aramaya göre sıralamadan) önce,
    // listede geçen projelerin kategorilerini (henüz önbelleğe alınmamışsa)
    // paralel çekiyoruz.
    const projectIdsNeedingCategories = [...new Set(
      currentSlas.filter((sla) => sla.categoryId && sla.projectId).map((sla) => sla.projectId)
    )];
    await Promise.all(projectIdsNeedingCategories.map((projectId) => getCategoriesForProject(projectId)));

    // SLA listesi backend'de sayfalanmadığı için arama da istemci tarafında -
    // proje/kategori/öncelik adı (tabloda göründüğü gibi) eşleşirse gösteriliyor.
    const query = slaSearchInput.value.trim().toLowerCase();
    const filtered = query
      ? currentSlas.filter((sla) => {
          const projectName = SLA_SORT_ACCESSORS.project(sla).toLowerCase();
          const categoryName = SLA_SORT_ACCESSORS.category(sla).toLowerCase();
          const priorityName = (sla.priorityName || '').toLowerCase();
          return projectName.includes(query) || categoryName.includes(query) || priorityName.includes(query);
        })
      : currentSlas;

    if (filtered.length === 0) {
      slaTableBody.innerHTML = `
        <tr><td colspan="6" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M8 12h8"/>
            </svg>
            <span>${t('admin.slaEmpty')}</span>
          </div>
        </td></tr>`;
      return;
    }

    const accessor = SLA_SORT_ACCESSORS[sortState.sortField] || SLA_SORT_ACCESSORS.project;
    const slas = sortItemsBy(filtered, accessor, sortState.sortDescending);

    slas.forEach((sla) => {
      const row = document.createElement('tr');

      const projectCell = document.createElement('td');
      const project = sla.projectId ? allProjects.find((p) => p.id === sla.projectId) : null;
      projectCell.textContent = project ? project.name : t('admin.allProjects');

      const categoryCell = document.createElement('td');
      const categoryList = sla.projectId ? (categoriesByProject[sla.projectId] || []) : [];
      const category = sla.categoryId ? categoryList.find((c) => c.id === sla.categoryId) : null;
      categoryCell.textContent = sla.categoryId ? (category ? category.name : `#${sla.categoryId}`) : t('admin.allCategories');

      const priorityCell = document.createElement('td');
      priorityCell.appendChild(priorityBadge(sla.priorityName));

      const responseCell = document.createElement('td');
      responseCell.className = 'col-center';
      responseCell.textContent = `${sla.responseTimeMinutes} ${t('admin.minutesUnit')}`;

      const resolutionCell = document.createElement('td');
      resolutionCell.className = 'col-center';
      resolutionCell.textContent = `${sla.resolutionTimeMinutes} ${t('admin.minutesUnit')}`;

      const actionCell = document.createElement('td');
      actionCell.className = 'col-center';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn-secondary btn-icon-only';
      editButton.style.marginRight = '6px';
      editButton.title = t('admin.edit');
      editButton.innerHTML = EDIT_ICON;
      editButton.addEventListener('click', () => enterEditMode(row, sla));
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn-secondary btn-icon-only btn-danger';
      deleteButton.title = t('admin.delete');
      deleteButton.innerHTML = DELETE_ICON;
      deleteButton.addEventListener('click', () => deleteSla(sla, deleteButton));
      actionCell.append(editButton, deleteButton);

      row.append(projectCell, categoryCell, priorityCell, responseCell, resolutionCell, actionCell);
      slaTableBody.appendChild(row);
    });
  }

  async function loadSlas() {
    slaTableBody.innerHTML = `<tr><td colspan="6" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.slaLoading'))}</td></tr>`;
    try {
      currentSlas = await apiRequest('/sla');
      await renderRows();
    } catch (error) {
      slaTableBody.innerHTML = `
        <tr><td colspan="6" style="padding: 0; border-bottom: none;">
          <div class="state-box" style="border: none;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>${t('admin.slaError')}</span>
          </div>
        </td></tr>`;
    }
  }

  addSlaButton.addEventListener('click', async () => {
    const priorityId = slaPrioritySelect.value;
    const responseMinutes = Number(slaResponseInput.value);
    const resolutionMinutes = Number(slaResolutionInput.value);
    if (!priorityId || !responseMinutes || !resolutionMinutes) return;

    addSlaButton.disabled = true;
    try {
      await apiRequest('/sla', {
        method: 'POST',
        body: JSON.stringify({
          projectId: slaProjectSelect.value ? Number(slaProjectSelect.value) : null,
          categoryId: slaCategorySelect.value ? Number(slaCategorySelect.value) : null,
          priorityId: Number(priorityId),
          responseTimeMinutes: responseMinutes,
          resolutionTimeMinutes: resolutionMinutes
        })
      });
      slaResponseInput.value = '';
      slaResolutionInput.value = '';
      showToast('admin.slaCreated', false);
      loadSlas();
    } catch (error) {
      showToast('admin.slaCreateError', true);
    } finally {
      addSlaButton.disabled = false;
    }
  });

  async function loadInitialData() {
    try {
      const [projects, priorities] = await Promise.all([
        apiRequest('/project'),
        apiRequest('/priority')
      ]);

      allProjects = projects;

      projects.forEach((project) => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        slaProjectSelect.appendChild(option);
      });
      enhanceSelect(slaProjectSelect);
      enhanceSelect(slaCategorySelect);

      priorities.forEach((priority) => {
        const option = document.createElement('option');
        option.value = priority.id;
        option.textContent = priority.name;
        slaPrioritySelect.appendChild(option);
      });
      enhanceSelect(slaPrioritySelect);
    } catch (error) {
      // Seçenekler yüklenemese de liste görüntülenmeye devam eder.
    }
  }

  wireSortableHeaders(section, sortState, () => renderRows());
  slaSearchInput.addEventListener('input', debounce(() => renderRows(), 300));

  loadInitialData();
  loadSlas();
}

const PERMISSION_SORTABLE_COLUMNS = [
  { key: 'permission', i18nKey: 'admin.colPermission' },
  { key: 'project', i18nKey: 'admin.colProject' },
  { key: 'grantedAt', i18nKey: 'admin.colGrantedAt', className: 'col-center' }
];

function renderPermissionsSection(section) {
  const columnsHtml = PERMISSION_SORTABLE_COLUMNS.map(sortableColumnHtml).join('');
  section.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group filter-group-search">
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
    <div class="state-box" id="permissionEmptyState">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="7" r="4"/>
        <path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>
      </svg>
      <span data-i18n="admin.selectUserHint"></span>
    </div>
    <div id="permissionUserPanel" style="display: none;">
      <div class="ticket-table-wrap table-static">
        <table>
          <thead>
            <tr>
              ${columnsHtml}
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
  const permissionEmptyState = section.querySelector('#permissionEmptyState');
  const permissionTableBody = section.querySelector('#permissionTableBody');
  const grantPermissionSelect = section.querySelector('#grantPermissionSelect');
  const grantProjectSelect = section.querySelector('#grantProjectSelect');
  const grantPermissionButton = section.querySelector('#grantPermissionButton');
  const permissionToast = section.querySelector('#permissionToast');

  let allProjects = [];
  let currentUserId = null;
  let currentPermissions = [];
  const sortState = { sortField: 'permission', sortDescending: false };

  // Bu tablo backend'de sayfalanmıyor (seçilen kullanıcının tüm yetkileri tek
  // seferde geliyor) - sıralama istemci tarafında, proje adı da (id değil)
  // tabloda göründüğü gibi sıralansın diye aynı lookup'ı kullanıyor.
  const PERMISSION_SORT_ACCESSORS = {
    permission: (p) => p.permissionName || '',
    project: (p) => (p.projectId ? (allProjects.find((proj) => proj.id === p.projectId)?.name || '') : ''),
    grantedAt: (p) => new Date(p.grantedAt).getTime()
  };

  wireSortableHeaders(section, sortState, () => renderPermissionRows());

  function showToast(key, isError) {
    permissionToast.textContent = t(key);
    permissionToast.className = `toast ${isError ? 'error' : 'success'}`;
    permissionToast.style.display = 'block';
    setTimeout(() => { permissionToast.style.display = 'none'; }, 3000);
  }

  async function revokePermission(permission, button) {
    const confirmed = await showConfirmDialog(t('admin.confirmRevoke').replace('{name}', permission.permissionName), { danger: true });
    if (!confirmed) {
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

  function renderPermissionRows() {
    permissionTableBody.innerHTML = '';

    if (currentPermissions.length === 0) {
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

    const accessor = PERMISSION_SORT_ACCESSORS[sortState.sortField] || PERMISSION_SORT_ACCESSORS.permission;
    const permissions = sortItemsBy(currentPermissions, accessor, sortState.sortDescending);

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
      revokeButton.className = 'btn-secondary btn-icon-only btn-danger';
      revokeButton.title = t('admin.revoke');
      revokeButton.innerHTML = DELETE_ICON;
      revokeButton.addEventListener('click', () => revokePermission(permission, revokeButton));
      actionCell.appendChild(revokeButton);

      row.append(nameCell, projectCell, grantedCell, actionCell);
      permissionTableBody.appendChild(row);
    });
  }

  async function loadUserPermissions() {
    permissionTableBody.innerHTML = `<tr><td colspan="4" style="padding: 0; border-bottom: none;">${pulseLoader(t('admin.permissionsLoading'))}</td></tr>`;
    try {
      currentPermissions = await apiRequest(`/users/${currentUserId}/permissions`);
      renderPermissionRows();
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
    permissionEmptyState.style.display = 'none';
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
    permissionEmptyState.style.display = '';
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

const AUDIT_SORTABLE_COLUMNS = [
  { key: 'createdAt', i18nKey: 'admin.auditColDate' },
  { key: 'user', i18nKey: 'admin.auditColUser' },
  { key: 'entity', i18nKey: 'admin.auditColEntity' },
  { key: 'action', i18nKey: 'admin.auditColAction' }
];

function renderAuditLogSection(section) {
  const columnsHtml = AUDIT_SORTABLE_COLUMNS.map(sortableColumnHtml).join('');
  section.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group filter-group-search">
        <label for="auditFilterEntity" data-i18n="admin.auditSearchLabel"></label>
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
          <input type="text" id="auditFilterEntity" data-i18n-placeholder="admin.auditSearchPlaceholder">
        </div>
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
            ${columnsHtml}
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
  const sortState = { sortField: 'createdAt', sortDescending: true };

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
    if (filterEntity.value.trim()) params.set('search', filterEntity.value.trim());
    if (filterAction.value) params.set('action', filterAction.value);
    if (filterFromDate.value) params.set('fromDate', filterFromDate.value);
    if (filterToDate.value) params.set('toDate', `${filterToDate.value}T23:59:59`);
    params.set('sortBy', sortState.sortField);
    params.set('sortDescending', String(sortState.sortDescending));
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

  wireSortableHeaders(section, sortState, resetPageAndLoad);

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
