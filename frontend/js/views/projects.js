import { enhanceSelect } from '../customSelect.js';
import { pulseLoader } from '../loading.js';
import { enhanceSearchBox } from '../searchBox.js';
import { validateFields, clearFieldErrors } from '../formValidation.js';

const PAGE_SIZE = 12;

function debounce(fn, delayMs) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(getLanguage() === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

// Proje kodundan iki harflik bir rozet üretiyoruz (kart avatarı).
function codeInitials(code) {
  return code.trim().slice(0, 2).toUpperCase();
}

// Sayaç kutucuğu. Gecikmiş talep varsa dikkat çekmesi için kırmızıya
// dönüyor; renk Id'den değil sayının kendisinden geliyor, dil bağımsız.
function statCell(value, labelKey, accentColor) {
  return `
    <div class="project-stat">
      <span class="project-stat-value" style="${accentColor ? `color: ${accentColor};` : ''}">${value}</span>
      <span class="project-stat-label">${t(labelKey)}</span>
    </div>
  `;
}

export function render(container, currentUser) {
  // Yeni proje açmak ADMIN_MANAGE gerektiriyor (bkz. ProjectController):
  // PROJECT_MANAGE proje kapsamlı bir yetki, henüz var olmayan bir projeye
  // kapsanamaz. Bu yüzden burada bilinçli olarak isAdmin kontrolü var.
  const canCreateProject = !!currentUser?.isAdmin;

  const topbarPageActions = document.getElementById('topbarPageActions');
  topbarPageActions.innerHTML = canCreateProject
    ? `
    <button type="button" class="btn-primary" id="openCreateProjectButton">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      <span data-i18n="projects.newProject"></span>
    </button>
  `
    : '';

  container.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group filter-group-search">
        <label for="projectSearchInput" data-i18n="projects.searchLabel"></label>
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
          <input type="text" id="projectSearchInput" data-i18n-placeholder="projects.searchPlaceholder">
        </div>
      </div>
      <div class="filter-group">
        <label for="projectStatusSelect" data-i18n="projects.statusLabel"></label>
        <select id="projectStatusSelect">
          <option value="" data-i18n="projects.statusAll"></option>
          <option value="active" data-i18n="projects.statusActive"></option>
          <option value="inactive" data-i18n="projects.statusInactive"></option>
        </select>
      </div>
      <div class="filter-group">
        <label for="projectSortSelect" data-i18n="projects.sortLabel"></label>
        <select id="projectSortSelect">
          <option value="name" data-i18n="projects.sortName"></option>
          <option value="code" data-i18n="projects.sortCode"></option>
          <option value="createdAt" data-i18n="projects.sortCreatedAt"></option>
        </select>
      </div>
    </div>

    <div id="projectGrid" class="project-grid"></div>

    <div class="pagination-bar" id="projectPagination" style="display: none;">
      <span class="pagination-info" id="projectPaginationInfo"></span>
      <div class="pagination-controls">
        <button type="button" class="btn-secondary pagination-btn" id="projectPrevPageButton" data-i18n-title="projects.prevPage" title="">‹</button>
        <span class="page-indicator" id="projectPageIndicator"></span>
        <button type="button" class="btn-secondary pagination-btn" id="projectNextPageButton" data-i18n-title="projects.nextPage" title="">›</button>
      </div>
    </div>

    ${canCreateProject ? createModalHtml() : ""}
    <div class="toast" id="projectToast" style="display: none;"></div>
  `;

  const grid = container.querySelector('#projectGrid');
  const searchInput = container.querySelector('#projectSearchInput');
  const statusSelect = container.querySelector('#projectStatusSelect');
  const sortSelect = container.querySelector('#projectSortSelect');
  const pagination = container.querySelector('#projectPagination');
  const paginationInfo = container.querySelector('#projectPaginationInfo');
  const pageIndicator = container.querySelector('#projectPageIndicator');
  const prevPageButton = container.querySelector('#projectPrevPageButton');
  const nextPageButton = container.querySelector('#projectNextPageButton');
  const toast = container.querySelector('#projectToast');

  // Seçenek metinleri data-i18n ile boş geliyor; enhanceSelect etiketleri
  // native <option>'lardan kopyaladığı için önce çeviriler uygulanmalı,
  // yoksa özel açılır liste boş etiketlerle kurulur.
  applyTranslations();
  enhanceSelect(statusSelect);
  enhanceSelect(sortSelect);

  let currentPage = 1;
  let totalPages = 1;

  function showToast(key, isError) {
    toast.textContent = t(key);
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }

  function renderCards(projects) {
    grid.innerHTML = '';

    if (projects.length === 0) {
      grid.innerHTML = `
        <div class="state-box project-grid-state">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7h5l2 2h11v10a2 2 0 0 1-2 2H3z"/>
          </svg>
          <span>${t('projects.empty')}</span>
        </div>
      `;
      return;
    }

    projects.forEach((project) => {
      const card = document.createElement('a');
      card.className = 'project-card';
      card.href = `#/projects/${project.id}`;
      if (!project.isActive) {
        card.classList.add('is-inactive');
      }

      // Metinler textContent ile basılıyor (innerHTML değil) - proje adı ve
      // açıklaması kullanıcı girdisi olduğu için XSS'e kapı açmasın.
      const head = document.createElement('div');
      head.className = 'project-card-head';

      const mark = document.createElement('div');
      mark.className = 'project-card-mark';
      mark.textContent = codeInitials(project.code);

      const titleWrap = document.createElement('div');
      titleWrap.className = 'project-card-title-wrap';

      const name = document.createElement('strong');
      name.className = 'project-card-name';
      name.textContent = project.name;
      name.title = project.name;

      const code = document.createElement('span');
      code.className = 'project-card-code';
      code.textContent = project.code;

      titleWrap.append(name, code);

      const statusBadge = document.createElement('span');
      statusBadge.className = `badge project-card-status ${project.isActive ? 'is-active' : 'is-passive'}`;
      statusBadge.textContent = t(project.isActive ? 'projects.statusActive' : 'projects.statusInactive');

      head.append(mark, titleWrap, statusBadge);

      const description = document.createElement('p');
      description.className = 'project-card-description';
      description.textContent = project.description || t('projects.noDescription');

      const stats = document.createElement('div');
      stats.className = 'project-card-stats';
      stats.innerHTML = [
        statCell(project.ticketCount, 'projects.statTickets'),
        statCell(project.openTicketCount, 'projects.statOpen', 'var(--status-open-fg)'),
        statCell(
          project.overdueTicketCount,
          'projects.statOverdue',
          project.overdueTicketCount > 0 ? 'var(--priority-critical-fg)' : ''
        ),
        statCell(project.memberCount, 'projects.statMembers')
      ].join('');

      // Tarih tek başına ve etiketsiz duruyordu; neyin tarihi olduğu hiçbir
      // yerde yazmıyordu. Etiket solda, tarih sağda: aradaki boşluk ikisini
      // ayırıyor ve band dengeli duruyor.
      const footer = document.createElement('div');
      footer.className = 'project-card-footer';

      const footerLabel = document.createElement('span');
      footerLabel.textContent = t('projects.createdLabel');

      const footerDate = document.createElement('span');
      footerDate.className = 'project-card-footer-date';
      footerDate.textContent = formatDate(project.createdAt);

      footer.append(footerLabel, footerDate);

      card.append(head, description, stats, footer);
      grid.appendChild(card);
    });
  }

  function updatePagination(totalCount) {
    totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    if (totalCount === 0) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = '';
    const firstItem = (currentPage - 1) * PAGE_SIZE + 1;
    const lastItem = Math.min(currentPage * PAGE_SIZE, totalCount);
    paginationInfo.textContent = `${firstItem}-${lastItem} / ${totalCount}`;
    pageIndicator.textContent = `${currentPage} / ${totalPages}`;
    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;
  }

  async function loadProjects() {
    grid.innerHTML = `<div class="project-grid-state">${pulseLoader(t('projects.loading'))}</div>`;
    pagination.style.display = 'none';

    try {
      // page parametresi verildiği için backend sayfalanmış PagedResult dönüyor
      // (bkz. ProjectController.GetAllProjects'teki opsiyonel page/pageSize).
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(PAGE_SIZE),
        sortBy: sortSelect.value
      });

      const search = searchInput.value.trim();
      if (search) {
        params.set('search', search);
      }

      const result = await apiRequest(`/project?${params.toString()}`);

      // Aktif/pasif filtresi backend'de yok; sayfalanmış sonucun üzerinde
      // istemci tarafında uygulanıyor. Bu yüzden toplam sayaç filtresizken
      // doğru, filtre seçiliyken görünen kart sayısına göre güncelleniyor.
      const statusFilter = statusSelect.value;
      const visible = statusFilter
        ? result.items.filter((p) => (statusFilter === 'active' ? p.isActive : !p.isActive))
        : result.items;

      renderCards(visible);
      updatePagination(statusFilter ? visible.length : result.totalCount);
    } catch (error) {
      grid.innerHTML = `
        <div class="state-box project-grid-state">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <span>${t('projects.error')}</span>
        </div>
      `;
    }
  }

  function resetPageAndLoad() {
    currentPage = 1;
    loadProjects();
  }

  searchInput.addEventListener('input', debounce(resetPageAndLoad, 300));
  enhanceSearchBox(searchInput, resetPageAndLoad);
  statusSelect.addEventListener('change', resetPageAndLoad);
  sortSelect.addEventListener('change', resetPageAndLoad);

  prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadProjects();
    }
  });

  nextPageButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage += 1;
      loadProjects();
    }
  });

  if (canCreateProject) {
    wireCreateModal(container, showToast, resetPageAndLoad);
  }

  loadProjects();
}

// --- Yeni proje modalı (sadece admin) ---

function createModalHtml() {
  return `
    <div class="modal-overlay" id="createProjectOverlay" style="display: none;">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="createProjectTitle">
        <h2 class="modal-title" id="createProjectTitle" data-i18n="projects.createTitle"></h2>
        <div class="modal-body">
          <div class="filter-group">
            <label for="createProjectName" data-i18n="projects.createName"></label>
            <input type="text" id="createProjectName" data-i18n-placeholder="projects.createNamePlaceholder">
          </div>
          <div class="filter-group">
            <label for="createProjectCode" data-i18n="projects.createCode"></label>
            <input type="text" id="createProjectCode" data-i18n-placeholder="projects.createCodePlaceholder">
          </div>
          <div class="filter-group">
            <label for="createProjectDescription" data-i18n="projects.createDescription"></label>
            <input type="text" id="createProjectDescription" data-i18n-placeholder="projects.createDescriptionPlaceholder">
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="createProjectCancel" data-i18n="projects.createCancel"></button>
          <button type="button" class="btn-primary" id="createProjectSubmit" data-i18n="projects.createSubmit"></button>
        </div>
      </div>
    </div>
  `;
}

function wireCreateModal(container, showToast, onCreated) {
  const openButton = document.getElementById('openCreateProjectButton');
  const overlay = container.querySelector('#createProjectOverlay');
  const nameInput = container.querySelector('#createProjectName');
  const codeInput = container.querySelector('#createProjectCode');
  const descriptionInput = container.querySelector('#createProjectDescription');
  const cancelButton = container.querySelector('#createProjectCancel');
  const submitButton = container.querySelector('#createProjectSubmit');

  function openModal() {
    nameInput.value = '';
    codeInput.value = '';
    descriptionInput.value = '';
    overlay.style.display = '';
    nameInput.focus();
  }

  function closeModal() {
    overlay.style.display = 'none';
    // Hata izleri kalmasın: modal tekrar açıldığında bir önceki denemenin
    // kırmızı çerçeveleri ve mesajları duruyordu.
    clearFieldErrors([nameInput, codeInput]);
  }

  openButton?.addEventListener('click', openModal);
  cancelButton.addEventListener('click', closeModal);

  // Karta değil, karartılmış zemine tıklanınca kapansın.
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.style.display !== 'none') {
      closeModal();
    }
  });

  submitButton.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();

    // Hata alanın kendi altında görünüyor: tek bir genel mesaj, iki
    // alandan hangisinin eksik olduğunu söylemiyordu.
    const hasError = validateFields([
      { el: nameInput, valid: name.length > 0, messageKey: 'projects.nameRequired' },
      { el: codeInput, valid: code.length > 0, messageKey: 'projects.codeRequired' }
    ]);
    if (hasError) return;

    submitButton.disabled = true;
    try {
      await apiRequest('/project', {
        method: 'POST',
        body: JSON.stringify({
          name,
          code,
          description: descriptionInput.value.trim() || null
        })
      });
      closeModal();
      showToast('projects.created', false);
      onCreated();
    } catch (error) {
      // Backend aynı koda sahip proje varsa 409 Conflict dönüyor.
      const isDuplicate = String(error.message).includes('409');
      showToast(isDuplicate ? 'projects.createDuplicateError' : 'projects.createError', true);
    } finally {
      submitButton.disabled = false;
    }
  });
}
