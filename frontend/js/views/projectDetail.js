import { pulseLoader } from '../loading.js';
import { showConfirmDialog } from '../confirmDialog.js';
import { enhanceSelect } from '../customSelect.js';
import { enhanceDateInput } from '../customDatePicker.js';
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

// Satır içi düzenle/sil ikonları - admin panelindeki tablolarla aynı görünüm
// (bkz. admin.js'teki aynı sabitler): metin yerine ikon + title tooltip'i.
const EDIT_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 15px; height: 15px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const DELETE_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 15px; height: 15px;"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

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

// Sayfalanmayan sekmeler (kategori, ekip, SLA) için istemci tarafı sıralama.
// Talepler sekmesi bunu kullanmıyor: orada sayfalama var, sadece görünen
// sayfayı sıralamak yanlış sonuç verirdi - o yüzden sunucuya sortBy gidiyor.
// getValue: satırdan karşılaştırılacak değeri üretir (metin ya da sayı).
function createClientSorter(columns, onSorted) {
  let sortKey = columns[0].key;
  let sortDescending = false;

  function sortRows(rows) {
    const column = columns.find((c) => c.key === sortKey) ?? columns[0];
    const direction = sortDescending ? -1 : 1;

    return [...rows].sort((a, b) => {
      const left = column.getValue(a);
      const right = column.getValue(b);

      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction;
      }
      // Türkçe karakterler doğru sıralansın diye localeCompare (İ, Ş, Ğ...).
      return String(left).localeCompare(String(right), getLanguage(), { sensitivity: 'base' }) * direction;
    });
  }

  function updateHeaderUI(panel) {
    panel.querySelectorAll('.col-sortable').forEach((th) => {
      const isActive = th.dataset.sortKey === sortKey;
      th.classList.toggle('is-active', isActive);
      th.classList.toggle('is-asc', isActive && !sortDescending);
    });
  }

  function wire(panel) {
    panel.querySelectorAll('.col-sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.sortKey;
        if (sortKey === key) {
          sortDescending = !sortDescending;
        } else {
          sortKey = key;
          sortDescending = false;
        }
        updateHeaderUI(panel);
        onSorted();
      });
    });
    updateHeaderUI(panel);
  }

  return { sortRows, wire };
}

// Sayfalanmayan sekmelerin arama kutusu. Filtre istemcide çalışıyor çünkü
// tüm kayıtlar zaten tek istekte gelmiş durumda; kolonların getValue'ları
// üzerinde arandığı için sıralamayla aynı veriyi kullanıyor.
function searchBarHtml(inputId, placeholderKey) {
  return `
    <div class="filter-group filter-group-search">
      <label for="${inputId}" data-i18n="projectDetail.searchLabel"></label>
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7"/>
          <path d="M21 21l-4.3-4.3"/>
        </svg>
        <input type="text" id="${inputId}" data-i18n-placeholder="${placeholderKey}">
      </div>
    </div>
  `;
}

// Girilen metni kolon değerlerinde arar. Büyük/küçük harf ve Türkçe
// karakterler için locale'e duyarlı karşılaştırma yapılıyor.
function filterRows(rows, columns, query) {
  const term = query.trim().toLocaleLowerCase(getLanguage());
  if (!term) {
    return rows;
  }

  return rows.filter((row) =>
    columns.some((col) => String(col.getValue(row)).toLocaleLowerCase(getLanguage()).includes(term)));
}

// Sıralanabilir başlık hücrelerini üretir (tickets.js'teki th yapısının aynısı).
function sortableHeaders(columns) {
  return columns.map((col) => `
    <th class="col-sortable ${col.className || ''}" data-sort-key="${col.key}">
      <div class="th-inner">
        <span data-i18n="${col.i18nKey}"></span>
        <svg class="sort-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
    </th>
  `).join('');
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
    // Yeni talep bu projeye açılıyor: projectId parametresiyle gidildiği için
    // form proje alanını kilitli açıyor (bkz. newTicket.js).
    const canCreateTicket = hasPermission(currentUser, PERMISSIONS.TICKET_CREATE, projectId);

    document.getElementById('topbarPageActions').innerHTML = `
      ${isAdmin ? `<a class="btn-secondary" href="#/admin" data-i18n="projectDetail.projectSettings"></a>` : ''}
      ${canCreateTicket ? `
      <a class="btn-primary" href="#/new-ticket?projectId=${projectId}">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span data-i18n="tickets.newTicket"></span>
      </a>
      ` : ''}
    `;

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
      categories: () => renderCategoriesTab(panelEl, projectId, canManageProject),
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
    <div class="filter-bar">
      ${searchBarHtml('projectTicketSearch', 'projectDetail.ticketSearchPlaceholder')}
      <div class="filter-group">
        <label for="ticketFilterStatus" data-i18n="tickets.filterStatus"></label>
        <select id="ticketFilterStatus">
          <option value="" data-i18n="tickets.filterAll"></option>
        </select>
      </div>
      <div class="filter-group">
        <label for="ticketFilterPriority" data-i18n="tickets.filterPriority"></label>
        <select id="ticketFilterPriority">
          <option value="" data-i18n="tickets.filterAll"></option>
        </select>
      </div>
      <div class="filter-group">
        <label for="ticketFilterFromDate" data-i18n="tickets.filterFrom"></label>
        <input type="date" id="ticketFilterFromDate">
      </div>
      <div class="filter-group">
        <label for="ticketFilterToDate" data-i18n="tickets.filterTo"></label>
        <input type="date" id="ticketFilterToDate">
      </div>
      <button type="button" class="btn-secondary btn-icon-only" id="ticketClearFilters" data-i18n-title="tickets.clearFilters" title="">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
          <path d="M3 12a9 9 0 1 0 2.64-6.36"/>
          <path d="M3 4v5h5"/>
        </svg>
      </button>
    </div>
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
  const searchInput = panel.querySelector('#projectTicketSearch');
  const filterStatus = panel.querySelector('#ticketFilterStatus');
  const filterPriority = panel.querySelector('#ticketFilterPriority');
  const filterFromDate = panel.querySelector('#ticketFilterFromDate');
  const filterToDate = panel.querySelector('#ticketFilterToDate');
  const clearFiltersButton = panel.querySelector('#ticketClearFilters');
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

      // Arama ve filtreler sunucuda: bu sekme sayfalanıyor, istemcide
      // filtrelemek yalnızca görünen sayfayı süzerdi.
      const search = searchInput.value.trim();
      if (search) {
        params.set('search', search);
      }
      if (filterStatus.value) params.set('statusId', filterStatus.value);
      if (filterPriority.value) params.set('priorityId', filterPriority.value);
      if (filterFromDate.value) params.set('fromDate', filterFromDate.value);
      // Bitiş tarihi günün sonuna çekiliyor, yoksa seçilen gün filtre dışı kalır.
      if (filterToDate.value) params.set('toDate', `${filterToDate.value}T23:59:59`);

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

  function resetPageAndLoad() {
    // Filtre değişince ilk sayfaya dönülüyor: 3. sayfadayken filtreleyince
    // sonuç 1 sayfaya düşerse boş ekran kalırdı.
    currentPage = 1;
    loadTickets();
  }

  searchInput.addEventListener('input', debounce(resetPageAndLoad, 300));
  filterStatus.addEventListener('change', resetPageAndLoad);
  filterPriority.addEventListener('change', resetPageAndLoad);
  filterFromDate.addEventListener('change', resetPageAndLoad);
  filterToDate.addEventListener('change', resetPageAndLoad);

  clearFiltersButton.addEventListener('click', () => {
    searchInput.value = '';
    filterStatus.value = '';
    filterPriority.value = '';
    filterFromDate.value = '';
    filterToDate.value = '';
    enhanceSelect(filterStatus);
    enhanceSelect(filterPriority);
    enhanceDateInput(filterFromDate);
    enhanceDateInput(filterToDate);
    resetPageAndLoad();
  });

  // Durum/öncelik adları dile göre backend'den geliyor; seçenekler
  // doldurulduktan sonra enhanceSelect çağrılıyor (boş etiket olmasın diye).
  (async () => {
    try {
      const [statuses, priorities] = await Promise.all([
        apiRequest('/status'),
        apiRequest('/priority')
      ]);
      statuses.forEach((s) => filterStatus.add(new Option(s.name, s.id)));
      priorities.forEach((p) => filterPriority.add(new Option(p.name, p.id)));
    } catch (error) {
      // Seçenekler gelmese de liste filtresiz çalışmaya devam eder.
    }
    enhanceSelect(filterStatus);
    enhanceSelect(filterPriority);
  })();

  enhanceDateInput(filterFromDate);
  enhanceDateInput(filterToDate);
  updateSortHeaderUI();
  loadTickets();
}

// --- Kategoriler sekmesi ---

const CATEGORY_COLUMNS = [
  { key: 'name', i18nKey: 'projectDetail.colCategoryName', getValue: (c) => c.name },
  { key: 'description', i18nKey: 'projectDetail.colDescription', getValue: (c) => c.description || '' }
];

function renderCategoriesTab(panel, projectId, canManage) {
  const columnCount = canManage ? 3 : 2;
  let categories = [];
  const sorter = createClientSorter(CATEGORY_COLUMNS, () => renderRows());

  panel.innerHTML = `
    ${canManage ? `
    <div class="filter-bar">
      <div class="filter-group">
        <label for="categoryNameInput" data-i18n="projectDetail.categoryName"></label>
        <input type="text" id="categoryNameInput" data-i18n-placeholder="projectDetail.categoryNamePlaceholder">
      </div>
      <div class="filter-group" style="flex: 1;">
        <label for="categoryDescriptionInput" data-i18n="projectDetail.colDescription"></label>
        <input type="text" id="categoryDescriptionInput" data-i18n-placeholder="projectDetail.categoryDescriptionPlaceholder">
      </div>
      <button type="button" class="btn-primary" id="addCategoryButton">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span data-i18n="projectDetail.addCategory"></span>
      </button>
    </div>
    ` : ''}
    <div class="filter-bar">
      ${searchBarHtml('categorySearchInput', 'projectDetail.categorySearchPlaceholder')}
    </div>
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>
            ${sortableHeaders(CATEGORY_COLUMNS)}
            ${canManage ? '<th class="col-center"><span data-i18n="projectDetail.colAction"></span></th>' : ''}
          </tr>
        </thead>
        <tbody id="projectCategoriesBody">${loadingRow(columnCount, 'projectDetail.categoriesLoading')}</tbody>
      </table>
    </div>
    <div class="toast" id="categoryToast" style="display: none;"></div>
  `;
  applyTranslations();

  const body = panel.querySelector('#projectCategoriesBody');
  const searchInput = panel.querySelector('#categorySearchInput');
  const toast = panel.querySelector('#categoryToast');

  searchInput.addEventListener('input', debounce(() => renderRows(), 200));

  function showToast(key, isError) {
    toast.textContent = t(key);
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }

  // Satır içi düzenleme: hücreler input'a dönüşüyor, İşlem kolonu
  // Kaydet/Vazgeç'e geçiyor (admin panelindeki kategori tablosuyla aynı akış).
  function enterEditMode(row, category) {
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
    saveButton.textContent = t('projectDetail.save');
    saveButton.addEventListener('click', async () => {
      const newName = nameInput.value.trim();
      if (!newName) return;
      saveButton.disabled = true;
      try {
        await apiRequest(`/project/${projectId}/categories/${category.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: newName, description: descriptionInput.value.trim() || null })
        });
        showToast('projectDetail.categoryUpdated', false);
        loadCategories();
      } catch (error) {
        showToast('projectDetail.categoryUpdateError', true);
        saveButton.disabled = false;
      }
    });

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn-secondary';
    cancelButton.textContent = t('projectDetail.cancel');
    cancelButton.addEventListener('click', () => loadCategories());

    actionCell.append(saveButton, cancelButton);
  }

  async function deleteCategory(category, button) {
    const confirmed = await showConfirmDialog(
      t('projectDetail.confirmDeleteCategory').replace('{name}', category.name),
      { danger: true }
    );
    if (!confirmed) {
      return;
    }

    button.disabled = true;
    try {
      await apiRequest(`/project/${projectId}/categories/${category.id}`, { method: 'DELETE' });
      showToast('projectDetail.categoryDeleted', false);
      loadCategories();
    } catch (error) {
      // Kategoriye bağlı talep varsa backend 409 dönüyor (silme engelleniyor).
      const inUse = String(error.message).includes('409');
      showToast(inUse ? 'projectDetail.categoryInUseError' : 'projectDetail.categoryDeleteError', true);
      button.disabled = false;
    }
  }

  function renderRows() {
      body.innerHTML = '';

      const visible = filterRows(categories, CATEGORY_COLUMNS, searchInput.value);
      if (visible.length === 0) {
        // Kayıt hiç yok mu, yoksa arama mı boş döndü - ayrı mesajlar.
        const emptyKey = categories.length === 0
          ? 'projectDetail.categoriesEmpty'
          : 'projectDetail.noSearchResult';
        body.innerHTML = messageRow(columnCount, emptyKey, false);
        return;
      }

      sorter.sortRows(visible).forEach((category) => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        nameCell.textContent = category.name;

        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = category.description || '-';

        row.append(nameCell, descriptionCell);

        if (canManage) {
          const actionCell = document.createElement('td');
          actionCell.className = 'col-center';

          const editButton = document.createElement('button');
          editButton.type = 'button';
          editButton.className = 'btn-secondary btn-icon-only';
          editButton.style.marginRight = '6px';
          editButton.title = t('projectDetail.edit');
          editButton.innerHTML = EDIT_ICON;
          editButton.addEventListener('click', () => enterEditMode(row, category));

          const deleteButton = document.createElement('button');
          deleteButton.type = 'button';
          deleteButton.className = 'btn-secondary btn-icon-only btn-danger';
          deleteButton.title = t('projectDetail.delete');
          deleteButton.innerHTML = DELETE_ICON;
          deleteButton.addEventListener('click', () => deleteCategory(category, deleteButton));

          actionCell.append(editButton, deleteButton);
          row.appendChild(actionCell);
        }

        body.appendChild(row);
      });
  }

  async function loadCategories() {
    body.innerHTML = loadingRow(columnCount, 'projectDetail.categoriesLoading');
    try {
      categories = await apiRequest(`/project/${projectId}/categories`);
      renderRows();
    } catch (error) {
      body.innerHTML = messageRow(columnCount, 'projectDetail.categoriesError', true);
    }
  }

  sorter.wire(panel);

  if (canManage) {
    const nameInput = panel.querySelector('#categoryNameInput');
    const descriptionInput = panel.querySelector('#categoryDescriptionInput');
    const addButton = panel.querySelector('#addCategoryButton');

    addButton.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) {
        showToast('projectDetail.categoryNameRequired', true);
        return;
      }

      addButton.disabled = true;
      try {
        await apiRequest(`/project/${projectId}/categories`, {
          method: 'POST',
          body: JSON.stringify({ name, description: descriptionInput.value.trim() || null })
        });
        nameInput.value = '';
        descriptionInput.value = '';
        showToast('projectDetail.categoryCreated', false);
        loadCategories();
      } catch (error) {
        showToast('projectDetail.categoryCreateError', true);
      } finally {
        addButton.disabled = false;
      }
    });
  }

  loadCategories();
}

// --- Ekip sekmesi ---

const TEAM_COLUMNS = [
  { key: 'name', i18nKey: 'projectDetail.colMember', getValue: (m) => m.userFullName },
  { key: 'email', i18nKey: 'projectDetail.colEmail', getValue: (m) => m.userEmail }
];

function renderTeamTab(panel, projectId, canManage) {
  // Üye ekleme/çıkarma backend'de ADMIN_MANAGE; admin olmayan için
  // arama kutusu ve İşlem kolonu hiç basılmıyor (disabled değil, yok).
  const columnCount = canManage ? 3 : 2;
  let members = [];
  const sorter = createClientSorter(TEAM_COLUMNS, () => renderRows());

  panel.innerHTML = `
    <div class="filter-bar">
      ${searchBarHtml('teamSearchInput', 'projectDetail.teamSearchPlaceholder')}
      ${canManage ? `
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
      ` : ''}
    </div>
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>
            ${sortableHeaders(TEAM_COLUMNS)}
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
  // İki ayrı kutu: userSearch yeni üye aramak için (tüm kullanıcılar),
  // memberSearchInput mevcut ekip listesini süzmek için.
  const userSearch = panel.querySelector('#teamUserSearch');
  const userResults = panel.querySelector('#teamUserResults');
  const memberSearchInput = panel.querySelector('#teamSearchInput');

  memberSearchInput.addEventListener('input', debounce(() => renderRows(), 200));

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

  function renderRows() {
      body.innerHTML = '';

      const visible = filterRows(members, TEAM_COLUMNS, memberSearchInput.value);
      if (visible.length === 0) {
        const emptyKey = members.length === 0
          ? 'projectDetail.teamEmpty'
          : 'projectDetail.noSearchResult';
        body.innerHTML = messageRow(columnCount, emptyKey, false);
        return;
      }

      sorter.sortRows(visible).forEach((member) => {
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
          removeButton.className = 'btn-secondary btn-icon-only btn-danger';
          removeButton.title = t('projectDetail.removeMember');
          removeButton.innerHTML = DELETE_ICON;
          removeButton.addEventListener('click', () => removeMember(member, removeButton));
          actionCell.appendChild(removeButton);
          row.appendChild(actionCell);
        }

        body.appendChild(row);
      });
  }

  async function loadMembers() {
    body.innerHTML = loadingRow(columnCount, 'projectDetail.teamLoading');
    try {
      members = await apiRequest(`/project/${projectId}/members`);
      memberUserIds = new Set(members.map((m) => m.userId));
      renderRows();
    } catch (error) {
      body.innerHTML = messageRow(columnCount, 'projectDetail.teamError', true);
    }
  }

  sorter.wire(panel);

  if (canManage) {
    wireUserSearch();
  }

  loadMembers();
}

// --- SLA sekmesi ---

// categoryName satırlara yüklenirken ekleniyor (SLA yanıtı sadece CategoryId
// taşıyor), böylece sıralama da gösterimle aynı metni kullanıyor.
// Süreler sayısal sıralanmalı: "90 dk" ile "2 sa" metin olarak yanlış sıralanır.
const SLA_COLUMNS = [
  { key: 'category', i18nKey: 'projectDetail.colSlaCategory', getValue: (s) => s.categoryName },
  { key: 'priority', i18nKey: 'projectDetail.colSlaPriority', getValue: (s) => s.priorityId },
  { key: 'response', i18nKey: 'projectDetail.colSlaResponse', getValue: (s) => s.responseTimeMinutes },
  { key: 'resolution', i18nKey: 'projectDetail.colSlaResolution', getValue: (s) => s.resolutionTimeMinutes }
];

function renderSlaTab(panel, projectId) {
  let slaRows = [];
  const sorter = createClientSorter(SLA_COLUMNS, () => renderRows());

  panel.innerHTML = `
    <div class="filter-bar">
      ${searchBarHtml('slaSearchInput', 'projectDetail.slaSearchPlaceholder')}
      <div class="filter-group">
        <label for="slaFilterPriority" data-i18n="tickets.filterPriority"></label>
        <select id="slaFilterPriority">
          <option value="" data-i18n="tickets.filterAll"></option>
        </select>
      </div>
    </div>
    <div class="ticket-table-wrap table-static">
      <table>
        <thead>
          <tr>${sortableHeaders(SLA_COLUMNS)}</tr>
        </thead>
        <tbody id="projectSlaBody">${loadingRow(4, 'projectDetail.slaLoading')}</tbody>
      </table>
    </div>
  `;
  applyTranslations();

  const body = panel.querySelector('#projectSlaBody');
  const searchInput = panel.querySelector('#slaSearchInput');
  const priorityFilter = panel.querySelector('#slaFilterPriority');

  searchInput.addEventListener('input', debounce(() => renderRows(), 200));
  priorityFilter.addEventListener('change', () => renderRows());

  function renderRows() {
    body.innerHTML = '';

    // Öncelik kolonu id döndürüyor (sıralama için); aramada kullanıcının
    // gördüğü ada bakılmalı, o yüzden arama kolonları ayrı tanımlanıyor.
    const searchColumns = [
      { getValue: (s) => s.categoryName },
      { getValue: (s) => s.priorityName }
    ];

    const byPriority = priorityFilter.value
      ? slaRows.filter((s) => String(s.priorityId) === priorityFilter.value)
      : slaRows;

    const visible = filterRows(byPriority, searchColumns, searchInput.value);
    if (visible.length === 0) {
      const emptyKey = slaRows.length === 0
        ? 'projectDetail.slaEmpty'
        : 'projectDetail.noSearchResult';
      body.innerHTML = messageRow(4, emptyKey, false);
      return;
    }

    sorter.sortRows(visible).forEach((sla) => {
      const row = document.createElement('tr');

      const categoryCell = document.createElement('td');
      categoryCell.textContent = sla.categoryName;

      const priorityCell = document.createElement('td');
      priorityCell.appendChild(priorityBadge(sla.priorityId, sla.priorityName));

      const responseCell = document.createElement('td');
      responseCell.textContent = formatDuration(sla.responseTimeMinutes);

      const resolutionCell = document.createElement('td');
      resolutionCell.textContent = formatDuration(sla.resolutionTimeMinutes);

      row.append(categoryCell, priorityCell, responseCell, resolutionCell);
      body.appendChild(row);
    });
  }

  (async () => {
    try {
      // SLA yanıtı kategori adı taşımıyor, sadece CategoryId - adı çözmek
      // için projenin kategori listesini de çekip eşleştiriyoruz.
      const [slas, categories] = await Promise.all([
        apiRequest('/sla'),
        apiRequest(`/project/${projectId}/categories`)
      ]);

      const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

      slaRows = slas
        .filter((s) => s.projectId === Number(projectId))
        .map((s) => ({
          ...s,
          // CategoryId null ise kural projedeki tüm kategoriler için geçerli.
          categoryName: s.categoryId
            ? (categoryNameById.get(s.categoryId) || `#${s.categoryId}`)
            : t('projectDetail.slaAllCategories')
        }));

      // Öncelik seçenekleri gelen satırlardan türetiliyor: ayrı bir /priority
      // isteği atmaya gerek yok, hem de listede karşılığı olmayan öncelik
      // seçilip boş sonuç dönmesi engelleniyor.
      const seen = new Map();
      slaRows.forEach((s) => seen.set(s.priorityId, s.priorityName));
      [...seen.entries()]
        .sort((a, b) => a[0] - b[0])
        .forEach(([id, name]) => priorityFilter.add(new Option(name, id)));
      enhanceSelect(priorityFilter);

      renderRows();
    } catch (error) {
      body.innerHTML = messageRow(4, 'projectDetail.slaError', true);
    }
  })();

  sorter.wire(panel);
}
