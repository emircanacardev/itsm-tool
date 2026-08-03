import { pulseLoader } from '../loading.js';
import { showConfirmDialog } from '../confirmDialog.js';
import {
  STATUS_DOT_COLORS,
  PRIORITY_BADGE_MAP,
  NEUTRAL_BADGE,
  NEUTRAL_DOT_COLOR,
  PERMISSIONS,
  hasPermission,
  isClosedStatus
} from '../constants.js';

const TICKET_PAGE_SIZE = 15;

// Sıralanabilir kolonlar - backend'in beklediği sortBy anahtarları burada
// tanımlı, başlık satırı bu listeden üretiliyor (tickets.js ile aynı pattern).
//
// width'ler sabit (tablo table-layout: fixed): otomatik yerleşimde "Son Tarih"
// hücresi "Gecikti · 15.07.2026" gibi uzun bir metin taşıdığı için kolon
// gereksiz yere Durum/Atanan'ın iki katı genişliyordu. Toplam %100.
const TICKET_COLUMNS = [
  { key: 'title', i18nKey: 'projectDetail.colTitle', width: '40%' },
  { key: 'status', i18nKey: 'projectDetail.colStatus', width: '14%' },
  { key: 'priority', i18nKey: 'projectDetail.colPriority', width: '12%' },
  { key: 'assignedToName', i18nKey: 'projectDetail.colAssignee', width: '17%' },
  // Son hücre satır sonu ok'unu da taşıdığı için içeriği sağa dayalı;
  // başlık da aynı hizada dursun diye col-right.
  { key: 'dueAt', i18nKey: 'projectDetail.colDue', className: 'col-right', width: '17%' }
];

// Sekme tanımları tek yerde: butonlar da içerik de bu listeden üretiliyor.
const TABS = [
  { key: 'tickets', i18nKey: 'projectDetail.tabTickets' },
  { key: 'categories', i18nKey: 'projectDetail.tabCategories' },
  { key: 'team', i18nKey: 'projectDetail.tabTeam' },
  { key: 'sla', i18nKey: 'projectDetail.tabSla' }
];

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(getLanguage() === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

// Dakikayı okunur süreye çevirir: 60'ın katıysa saat, değilse dakika.
function formatDuration(minutes) {
  if (minutes % 60 === 0) {
    return t('projectDetail.hours').replace('{count}', String(minutes / 60));
  }
  return t('projectDetail.minutes').replace('{count}', String(minutes));
}

function debounce(fn, delayMs) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

function getInitials(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

// Renk Id'den, metin çevrilmiş addan - tickets.js ile aynı kural.
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

function renderDueCell(ticket) {
  if (isClosedStatus(ticket.statusId)) {
    return { text: t('tickets.dueDone'), className: 'due-done' };
  }
  if (!ticket.dueAt) {
    return { text: t('tickets.noDueDate'), className: '' };
  }
  const diffMs = new Date(ticket.dueAt).getTime() - Date.now();
  if (diffMs < 0) {
    return { text: `${t('tickets.dueOverdue')} · ${formatDate(ticket.dueAt)}`, className: 'due-overdue' };
  }
  if (diffMs < 2 * 60 * 60 * 1000) {
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

function stateBox(messageKey, isError) {
  const icon = isError
    ? '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'
    : '<path d="M3 7h5l2 2h11v10a2 2 0 0 1-2 2H3z"/>';
  return `
    <div class="state-box" style="border: none;">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${icon}
      </svg>
      <span>${t(messageKey)}</span>
    </div>
  `;
}

function loadingRow(colspan, labelKey) {
  return `<tr><td colspan="${colspan}" style="padding: 0; border-bottom: none;">${pulseLoader(t(labelKey))}</td></tr>`;
}

function messageRow(colspan, messageKey, isError) {
  return `<tr><td colspan="${colspan}" style="padding: 0; border-bottom: none;">${stateBox(messageKey, isError)}</td></tr>`;
}

export function render(container, projectId, currentUser) {
  const isAdmin = !!currentUser?.isAdmin;
  // Ekip/kategori yönetimi artık admin'e özel değil: bu projeye kapsanmış
  // PROJECT_MANAGE yetkisi olan da yapabiliyor (bkz. constants.js).
  const canManageProject = hasPermission(currentUser, PERMISSIONS.PROJECT_MANAGE, projectId);

  container.innerHTML = `<div class="project-detail-loading">${pulseLoader(t('projectDetail.loading'))}</div>`;
  document.getElementById('topbarPageActions').innerHTML = '';

  loadProject();

  async function loadProject() {
    let project;
    try {
      project = await apiRequest(`/project/${projectId}`);
    } catch (error) {
      // Yetkisiz erişimde backend 404 dönüyor (varlığı sızdırmamak için),
      // bu yüzden 404 ve diğer hatalar için ayrı mesaj gösteriyoruz.
      const notFound = String(error.message).includes('404');
      container.innerHTML = stateBox(notFound ? 'projectDetail.notFound' : 'projectDetail.error', true);
      return;
    }

    renderProject(project);
  }

  function renderProject(project) {
    // Sayfa başlığını projenin kendi adıyla değiştiriyoruz; router
    // yükleme sırasında geçici olarak "Projeler" yazmıştı.
    const pageTitleEl = document.getElementById('pageTitle');
    const pageSubtitleEl = document.getElementById('pageSubtitle');
    pageTitleEl.textContent = project.name;
    pageSubtitleEl.textContent = project.description || '';
    document.title = `${project.name} — Pulse ITSM`;

    // Admin için "Proje ayarları" kısayolu: kategori/kural düzenleme
    // admin panelinde yaşıyor, burada tekrarlanmıyor.
    document.getElementById('topbarPageActions').innerHTML = isAdmin
      ? `<a class="btn-secondary" href="#/admin" data-i18n="projectDetail.projectSettings"></a>`
      : '';

    const tabButtons = TABS.map((tab, index) => `
      <button type="button" class="admin-tab ${index === 0 ? 'is-active' : ''}" data-tab="${tab.key}">
        <span data-i18n="${tab.i18nKey}"></span>
      </button>
    `).join('');

    // .project-detail-view sarmalayıcısı: içerideki tablolar sayfa başına
    // sabit sayıda satır gösterip kendi pagination'ını kullandığı için
    // ayrı bir iç scroll istemiyoruz (bkz. app.css'teki override).
    container.innerHTML = `
      <div class="project-detail-view">
      <a class="project-back-link" href="#/projects">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        <span data-i18n="projectDetail.backToProjects"></span>
      </a>

      <div class="project-detail-head">
        <span class="project-card-code" id="detailProjectCode"></span>
        <span class="badge project-card-status ${project.isActive ? 'is-active' : 'is-passive'}" id="detailProjectStatus"></span>
      </div>

      <div class="dashboard-kpi-grid">
        ${kpiCard(project.ticketCount, 'projectDetail.kpiTotal', 'var(--color-accent)')}
        ${kpiCard(project.openTicketCount, 'projectDetail.kpiOpen', 'var(--status-open-fg)')}
        ${kpiCard(project.overdueTicketCount, 'projectDetail.kpiOverdue', 'var(--priority-critical-fg)')}
        ${kpiCard(project.memberCount, 'projectDetail.kpiMembers', 'var(--status-resolved-fg)')}
      </div>

      <div class="admin-tabs" id="projectDetailTabs">${tabButtons}</div>
      <div id="projectDetailPanel"></div>
      </div>
    `;

    container.querySelector('#detailProjectCode').textContent = project.code;
    container.querySelector('#detailProjectStatus').textContent =
      t(project.isActive ? 'projects.statusActive' : 'projects.statusInactive');

    const tabsEl = container.querySelector('#projectDetailTabs');
    const panelEl = container.querySelector('#projectDetailPanel');

    // Her sekme ilk açıldığında veri çekiyor; sekmeler arası gidip
    // gelmede tekrar çekmemek için sonuçlar burada tutuluyor.
    const renderers = {
      tickets: () => renderTicketsTab(panelEl, projectId),
      categories: () => renderCategoriesTab(panelEl, projectId),
      team: () => renderTeamTab(panelEl, projectId, canManageProject),
      sla: () => renderSlaTab(panelEl, projectId)
    };

    tabsEl.addEventListener('click', (event) => {
      const button = event.target.closest('.admin-tab');
      if (!button) return;

      tabsEl.querySelectorAll('.admin-tab').forEach((b) => b.classList.remove('is-active'));
      button.classList.add('is-active');
      renderers[button.dataset.tab]();
    });

    renderers.tickets();
    applyTranslations();
  }
}

// --- Talepler sekmesi ---

function renderTicketsTab(panel, projectId) {
  const columnsHtml = TICKET_COLUMNS.map((col) => `
    <th class="col-sortable ${col.className || ''}" data-sort-key="${col.key}" style="width: ${col.width};">
      <div class="th-inner">
        <span data-i18n="${col.i18nKey}"></span>
        <svg class="sort-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
    </th>
  `).join('');

  panel.innerHTML = `
    <div class="ticket-table-wrap">
      <table class="table-fixed">
        <thead>
          <tr>${columnsHtml}</tr>
        </thead>
        <tbody id="projectTicketsBody">${loadingRow(5, 'projectDetail.ticketsLoading')}</tbody>
      </table>
    </div>
    <div class="pagination-bar">
      <span class="pagination-info" id="projectTicketsInfo"></span>
      <div class="pagination-controls">
        <button type="button" class="btn-secondary pagination-btn" id="projectTicketsPrev" data-i18n-title="tickets.prevPage" title="">‹</button>
        <span class="page-indicator" id="projectTicketsPage"></span>
        <button type="button" class="btn-secondary pagination-btn" id="projectTicketsNext" data-i18n-title="tickets.nextPage" title="">›</button>
      </div>
    </div>
  `;
  applyTranslations();

  const body = panel.querySelector('#projectTicketsBody');
  const info = panel.querySelector('#projectTicketsInfo');
  const pageIndicator = panel.querySelector('#projectTicketsPage');
  const prevButton = panel.querySelector('#projectTicketsPrev');
  const nextButton = panel.querySelector('#projectTicketsNext');

  let sortField = 'createdAt';
  let sortDescending = true;
  let currentPage = 1;
  let totalPages = 1;

  function updateSortHeaderUI() {
    panel.querySelectorAll('.col-sortable').forEach((th) => {
      const isActive = th.dataset.sortKey === sortField;
      th.classList.toggle('is-active', isActive);
      th.classList.toggle('is-asc', isActive && !sortDescending);
    });
  }

  function updatePagination(result) {
    if (!result || result.totalCount === 0) {
      info.textContent = '';
      pageIndicator.textContent = '';
      prevButton.disabled = true;
      nextButton.disabled = true;
      return;
    }

    totalPages = Math.max(1, Math.ceil(result.totalCount / TICKET_PAGE_SIZE));
    const firstItem = (currentPage - 1) * TICKET_PAGE_SIZE + 1;
    const lastItem = Math.min(currentPage * TICKET_PAGE_SIZE, result.totalCount);
    info.textContent = `${firstItem}-${lastItem} / ${result.totalCount}`;
    pageIndicator.textContent = `${currentPage} / ${totalPages}`;
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
  }

  async function loadTickets() {
    body.innerHTML = loadingRow(5, 'projectDetail.ticketsLoading');
    try {
      const params = new URLSearchParams({
        projectId: String(projectId),
        page: String(currentPage),
        pageSize: String(TICKET_PAGE_SIZE),
        sortBy: sortField,
        sortDescending: String(sortDescending)
      });
      const result = await apiRequest(`/ticket?${params.toString()}`);

      body.innerHTML = '';
      if (result.items.length === 0) {
        body.innerHTML = messageRow(5, 'projectDetail.ticketsEmpty', false);
        updatePagination(result);
        return;
      }

      result.items.forEach((ticket) => {
        const row = document.createElement('tr');
        row.className = 'clickable-row';
        row.addEventListener('click', () => {
          // from: talep detayındaki geri linki bu projeye dönsün diye
          // (bkz. ticketDetail.js parseBackTarget).
          window.location.hash = `#/tickets/${ticket.id}?from=project:${projectId}`;
        });

        const titleCell = document.createElement('td');
        titleCell.textContent = ticket.title;
        titleCell.title = ticket.title;

        const statusCell = document.createElement('td');
        statusCell.appendChild(statusDot(ticket.statusId, ticket.statusName));

        const priorityCell = document.createElement('td');
        priorityCell.appendChild(priorityBadge(ticket.priorityId, ticket.priorityName));

        const assigneeCell = document.createElement('td');
        assigneeCell.textContent = ticket.assignedToName || t('projectDetail.unassigned');

        // Ok son hücrenin içinde duruyor (ayrı kolon değil) - tickets.js'teki
        // .row-end pattern'i; ayrı kolon açmak son veri sütunuyla ok arasında
        // gereksiz bir boşluk bırakıyordu.
        const due = renderDueCell(ticket);
        const dueCell = document.createElement('td');
        dueCell.className = `due-cell ${due.className}`;
        const dueWrap = document.createElement('div');
        dueWrap.className = 'row-end';
        const dueText = document.createElement('span');
        dueText.textContent = due.text;
        dueWrap.innerHTML = `
          <svg class="row-chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;" aria-hidden="true">
            <path d="M9 6l6 6-6 6"/>
          </svg>
        `;
        dueWrap.prepend(dueText);
        dueCell.appendChild(dueWrap);

        row.append(titleCell, statusCell, priorityCell, assigneeCell, dueCell);
        body.appendChild(row);
      });

      updatePagination(result);
    } catch (error) {
      body.innerHTML = messageRow(5, 'projectDetail.ticketsError', true);
      updatePagination(null);
    }
  }

  // Aynı kolona tekrar tıklamak yönü çevirir, farklı kolon azalan başlar.
  panel.querySelectorAll('.col-sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sortKey;
      if (sortField === key) {
        sortDescending = !sortDescending;
      } else {
        sortField = key;
        sortDescending = true;
      }
      currentPage = 1;
      updateSortHeaderUI();
      loadTickets();
    });
  });

  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadTickets();
    }
  });

  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage += 1;
      loadTickets();
    }
  });

  updateSortHeaderUI();
  loadTickets();
}

// --- Kategoriler sekmesi (salt okunur; düzenleme admin panelinde) ---

function renderCategoriesTab(panel, projectId) {
  panel.innerHTML = `
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>
            <th><span data-i18n="projectDetail.colCategoryName"></span></th>
            <th><span data-i18n="projectDetail.colDescription"></span></th>
          </tr>
        </thead>
        <tbody id="projectCategoriesBody">${loadingRow(2, 'projectDetail.categoriesLoading')}</tbody>
      </table>
    </div>
  `;
  applyTranslations();

  const body = panel.querySelector('#projectCategoriesBody');

  (async () => {
    try {
      const categories = await apiRequest(`/project/${projectId}/categories`);

      body.innerHTML = '';
      if (categories.length === 0) {
        body.innerHTML = messageRow(2, 'projectDetail.categoriesEmpty', false);
        return;
      }

      categories.forEach((category) => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        nameCell.textContent = category.name;

        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = category.description || '-';

        row.append(nameCell, descriptionCell);
        body.appendChild(row);
      });
    } catch (error) {
      body.innerHTML = messageRow(2, 'projectDetail.categoriesError', true);
    }
  })();
}

// --- Ekip sekmesi ---

function renderTeamTab(panel, projectId, canManage) {
  // Üye ekleme/çıkarma backend'de ADMIN_MANAGE; admin olmayan için
  // arama kutusu ve İşlem kolonu hiç basılmıyor (disabled değil, yok).
  const columnCount = canManage ? 3 : 2;

  panel.innerHTML = `
    ${canManage ? `
    <div class="filter-bar">
      <div class="filter-group" style="min-width: 260px;">
        <label for="teamUserSearch" data-i18n="projectDetail.addMemberLabel"></label>
        <div style="position: relative;">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/>
              <path d="M21 21l-4.3-4.3"/>
            </svg>
            <input type="text" id="teamUserSearch" autocomplete="off" data-i18n-placeholder="projectDetail.addMemberPlaceholder">
          </div>
          <div class="custom-select-menu" id="teamUserResults"></div>
        </div>
      </div>
    </div>
    ` : ''}
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>
            <th><span data-i18n="projectDetail.colMember"></span></th>
            <th><span data-i18n="projectDetail.colEmail"></span></th>
            ${canManage ? '<th class="col-center"><span data-i18n="projectDetail.colAction"></span></th>' : ''}
          </tr>
        </thead>
        <tbody id="projectTeamBody">${loadingRow(columnCount, 'projectDetail.teamLoading')}</tbody>
      </table>
    </div>
    <div class="toast" id="teamToast" style="display: none;"></div>
  `;
  applyTranslations();

  const body = panel.querySelector('#projectTeamBody');
  const toast = panel.querySelector('#teamToast');
  const userSearch = panel.querySelector('#teamUserSearch');
  const userResults = panel.querySelector('#teamUserResults');

  // Zaten üye olan kullanıcıları arama sonuçlarından elemek için tutuluyor.
  let memberUserIds = new Set();

  function showToast(key, isError) {
    toast.textContent = t(key);
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }

  async function removeMember(member, button) {
    const confirmed = await showConfirmDialog(
      t('projectDetail.confirmRemoveMember').replace('{name}', member.userFullName),
      { danger: true }
    );
    if (!confirmed) {
      return;
    }

    button.disabled = true;
    try {
      await apiRequest(`/project/${projectId}/members/${member.id}`, { method: 'DELETE' });
      showToast('projectDetail.memberRemoved', false);
      loadMembers();
    } catch (error) {
      showToast('projectDetail.memberRemoveError', true);
      button.disabled = false;
    }
  }

  async function addMember(userId) {
    try {
      await apiRequest(`/project/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      showToast('projectDetail.memberAdded', false);
      loadMembers();
    } catch (error) {
      // Backend aynı kullanıcı zaten üyeyse 409 Conflict dönüyor.
      const isDuplicate = String(error.message).includes('409');
      showToast(isDuplicate ? 'projectDetail.memberAlreadyError' : 'projectDetail.memberAddError', true);
    }
  }

  function renderUserResults(users) {
    userResults.innerHTML = '';

    const candidates = users.filter((u) => !memberUserIds.has(u.id));
    if (candidates.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'custom-select-option';
      empty.textContent = t('projectDetail.noUserFound');
      userResults.appendChild(empty);
    } else {
      candidates.forEach((user) => {
        const item = document.createElement('div');
        item.className = 'custom-select-option';
        item.textContent = `${user.fullName} (${user.email})`;
        item.addEventListener('click', () => {
          userSearch.value = '';
          userResults.style.display = 'none';
          userResults.innerHTML = '';
          addMember(user.id);
        });
        userResults.appendChild(item);
      });
    }
    userResults.style.display = 'block';
  }

  function wireUserSearch() {
    const debouncedSearch = debounce(async () => {
      const query = userSearch.value.trim();
      if (query.length < 2) {
        userResults.style.display = 'none';
        userResults.innerHTML = '';
        return;
      }
      try {
        // search verilince /user düz dizi dönüyor; page verilince PagedResult -
        // ikisini de karşılayacak şekilde okunuyor (bkz. UserController).
        const result = await apiRequest(`/user?search=${encodeURIComponent(query)}`);
        renderUserResults(result.items ?? result);
      } catch (error) {
        userResults.style.display = 'none';
        userResults.innerHTML = '';
      }
    }, 300);

    userSearch.addEventListener('input', debouncedSearch);
    userSearch.addEventListener('focus', () => {
      if (userResults.innerHTML) {
        userResults.style.display = 'block';
      }
    });
    document.addEventListener('click', (event) => {
      if (event.target !== userSearch && !userResults.contains(event.target)) {
        userResults.style.display = 'none';
      }
    });
  }

  async function loadMembers() {
    body.innerHTML = loadingRow(columnCount, 'projectDetail.teamLoading');
    try {
      const members = await apiRequest(`/project/${projectId}/members`);
      memberUserIds = new Set(members.map((m) => m.userId));

      body.innerHTML = '';
      if (members.length === 0) {
        body.innerHTML = messageRow(columnCount, 'projectDetail.teamEmpty', false);
        return;
      }

      members.forEach((member) => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        const wrap = document.createElement('div');
        wrap.className = 'member-cell';

        const avatar = document.createElement('span');
        avatar.className = 'member-avatar';
        avatar.textContent = getInitials(member.userFullName);

        const nameText = document.createElement('span');
        nameText.textContent = member.userFullName;

        wrap.append(avatar, nameText);
        nameCell.appendChild(wrap);

        const emailCell = document.createElement('td');
        emailCell.textContent = member.userEmail;

        row.append(nameCell, emailCell);

        if (canManage) {
          const actionCell = document.createElement('td');
          actionCell.className = 'col-center';
          const removeButton = document.createElement('button');
          removeButton.type = 'button';
          removeButton.className = 'btn-secondary btn-danger';
          removeButton.textContent = t('projectDetail.removeMember');
          removeButton.addEventListener('click', () => removeMember(member, removeButton));
          actionCell.appendChild(removeButton);
          row.appendChild(actionCell);
        }

        body.appendChild(row);
      });
    } catch (error) {
      body.innerHTML = messageRow(columnCount, 'projectDetail.teamError', true);
    }
  }

  if (canManage) {
    wireUserSearch();
  }

  loadMembers();
}

// --- SLA sekmesi ---

function renderSlaTab(panel, projectId) {
  panel.innerHTML = `
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>
            <th><span data-i18n="projectDetail.colSlaCategory"></span></th>
            <th><span data-i18n="projectDetail.colSlaPriority"></span></th>
            <th><span data-i18n="projectDetail.colSlaResponse"></span></th>
            <th><span data-i18n="projectDetail.colSlaResolution"></span></th>
          </tr>
        </thead>
        <tbody id="projectSlaBody">${loadingRow(4, 'projectDetail.slaLoading')}</tbody>
      </table>
    </div>
  `;
  applyTranslations();

  const body = panel.querySelector('#projectSlaBody');

  (async () => {
    try {
      // SLA yanıtı kategori adı taşımıyor, sadece CategoryId - adı çözmek
      // için projenin kategori listesini de çekip eşleştiriyoruz.
      const [slas, categories] = await Promise.all([
        apiRequest('/sla'),
        apiRequest(`/project/${projectId}/categories`)
      ]);

      const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
      const projectSlas = slas.filter((s) => s.projectId === Number(projectId));

      body.innerHTML = '';
      if (projectSlas.length === 0) {
        body.innerHTML = messageRow(4, 'projectDetail.slaEmpty', false);
        return;
      }

      projectSlas.forEach((sla) => {
        const row = document.createElement('tr');

        const categoryCell = document.createElement('td');
        // CategoryId null ise kural projedeki tüm kategoriler için geçerli.
        categoryCell.textContent = sla.categoryId
          ? (categoryNameById.get(sla.categoryId) || `#${sla.categoryId}`)
          : t('projectDetail.slaAllCategories');

        const priorityCell = document.createElement('td');
        priorityCell.appendChild(priorityBadge(sla.priorityId, sla.priorityName));

        const responseCell = document.createElement('td');
        responseCell.textContent = formatDuration(sla.responseTimeMinutes);

        const resolutionCell = document.createElement('td');
        resolutionCell.textContent = formatDuration(sla.resolutionTimeMinutes);

        row.append(categoryCell, priorityCell, responseCell, resolutionCell);
        body.appendChild(row);
      });
    } catch (error) {
      body.innerHTML = messageRow(4, 'projectDetail.slaError', true);
    }
  })();
}
