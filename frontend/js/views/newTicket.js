import { enhanceSelect } from '../customSelect.js';
import { pulseLoader } from '../loading.js';
import { PERMISSIONS, hasPermission } from '../constants.js';

// query.projectId verilmişse (proje detayındaki "Yeni Talep" butonu) proje
// alanı o projeye kilitleniyor: kullanıcı zaten bir projenin içindeyken
// tekrar proje seçtirmek gereksiz, yanlış projeye kaydetme riski de var.
export function render(container, currentUser, query) {
  const lockedProjectId = query?.get('projectId') ?? null;

  // İptal, gelinen yere dönüyor: projeden gelindiyse o projeye, aksi halde
  // talep listesine (bkz. ticketDetail.js'teki aynı from mantığı).
  const cancelHref = lockedProjectId ? `#/projects/${lockedProjectId}` : '#/tickets';

  container.innerHTML = `
    <div id="loadingState">${pulseLoader(t('tickets.loading'))}</div>

    <div id="stateMessage" class="state-box" style="display: none;">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2"/>
        <path d="M3 9h18M8 4v5"/>
      </svg>
      <span id="stateMessageText"></span>
    </div>

    <form class="form-card form-card-wide" id="ticketForm" style="display: none;">
      <div class="form-section-title" data-i18n="newTicket.sectionScope"></div>
      <div class="form-row">
        <div class="form-group">
          <label for="projectSelect" data-i18n="newTicket.project"></label>
          <select id="projectSelect" required ${lockedProjectId ? 'disabled' : ''}>
            <option value="" data-i18n="newTicket.selectProject"></option>
          </select>
        </div>
        <div class="form-group">
          <label for="categorySelect" data-i18n="newTicket.category"></label>
          <select id="categorySelect" required disabled>
            <option value="" data-i18n="newTicket.selectCategoryFirst"></option>
          </select>
        </div>
      </div>

      <div class="form-section-title" data-i18n="newTicket.sectionClassification"></div>
      <div class="form-row">
        <div class="form-group">
          <label for="typeSelect" data-i18n="newTicket.type"></label>
          <select id="typeSelect" required>
            <option value="Incident" data-i18n="detail.typeIncident"></option>
            <option value="ServiceRequest" data-i18n="detail.typeServiceRequest"></option>
          </select>
        </div>
        <div class="form-group">
          <label for="prioritySelect" data-i18n="newTicket.priority"></label>
          <select id="prioritySelect" required></select>
        </div>
      </div>

      <div class="form-section-title" data-i18n="newTicket.sectionDetails"></div>
      <div class="form-group">
        <label for="titleInput" data-i18n="newTicket.title"></label>
        <input type="text" id="titleInput" required maxlength="200" data-i18n-placeholder="newTicket.titlePlaceholder">
      </div>

      <div class="form-group">
        <label for="descriptionInput" data-i18n="newTicket.description"></label>
        <textarea id="descriptionInput" rows="6" data-i18n-placeholder="newTicket.descriptionPlaceholder"></textarea>
        <span class="form-hint" data-i18n="newTicket.descriptionHint"></span>
      </div>

      <div class="form-actions">
        <a class="btn-secondary" id="cancelButton" href="${cancelHref}" data-i18n="newTicket.cancel"></a>
        <button type="submit" class="btn-primary" id="submitButton">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span id="submitLabel" data-i18n="newTicket.submit"></span>
        </button>
      </div>
    </form>

    <div class="toast" id="ticketToast" style="display: none;"></div>
  `;
  applyTranslations();

  const loadingState = container.querySelector('#loadingState');
  const stateMessage = container.querySelector('#stateMessage');
  const ticketForm = container.querySelector('#ticketForm');
  const projectSelect = container.querySelector('#projectSelect');
  const categorySelect = container.querySelector('#categorySelect');
  const prioritySelect = container.querySelector('#prioritySelect');
  const typeSelect = container.querySelector('#typeSelect');
  const titleInput = container.querySelector('#titleInput');
  const descriptionInput = container.querySelector('#descriptionInput');
  const submitButton = container.querySelector('#submitButton');
  const submitLabel = container.querySelector('#submitLabel');
  const toast = container.querySelector('#ticketToast');

  enhanceSelect(projectSelect);
  enhanceSelect(categorySelect);
  enhanceSelect(typeSelect);

  function showToast(key, isError) {
    toast.textContent = t(key);
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }

  function showState(key) {
    loadingState.style.display = 'none';
    container.querySelector('#stateMessageText').textContent = t(key);
    stateMessage.style.display = 'flex';
    ticketForm.style.display = 'none';
  }

  async function loadPriorities() {
    const priorities = await apiRequest('/priority');
    priorities.forEach((priority) => {
      prioritySelect.add(new Option(priority.name, priority.id));
    });
    enhanceSelect(prioritySelect);
  }

  async function loadProjects() {
    const projects = await apiRequest('/project');
    if (projects.length === 0) {
      showState('newTicket.noProjects');
      return false;
    }

    projects.forEach((project) => {
      projectSelect.add(new Option(project.name, project.id));
    });

    if (lockedProjectId) {
      // Kilitli proje kullanıcının erişebildiği projeler arasında değilse
      // (elle yazılmış bir URL) kilidi açıp normal seçime düşüyoruz.
      if (projectSelect.querySelector(`option[value="${lockedProjectId}"]`)) {
        projectSelect.value = lockedProjectId;
        await loadCategories();
      } else {
        projectSelect.disabled = false;
      }
    }

    enhanceSelect(projectSelect);
    return true;
  }

  async function loadCategories() {
    categorySelect.innerHTML = '';

    if (!projectSelect.value) {
      categorySelect.disabled = true;
      categorySelect.add(new Option(t('newTicket.selectCategoryFirst'), ''));
      enhanceSelect(categorySelect);
      return;
    }

    try {
      const categories = await apiRequest(`/project/${projectSelect.value}/categories`);
      categorySelect.add(new Option(t('newTicket.selectCategory'), ''));
      categories.forEach((category) => {
        categorySelect.add(new Option(category.name, category.id));
      });
      categorySelect.disabled = false;
    } catch (error) {
      categorySelect.disabled = true;
    }

    enhanceSelect(categorySelect);
  }

  projectSelect.addEventListener('change', loadCategories);

  ticketForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Kategori zorunlu ama proje kilitliyken select disabled olduğu için
    // tarayıcının kendi required kontrolü projeyi atlıyor - burada kontrol ediliyor.
    const projectId = lockedProjectId ?? projectSelect.value;
    if (!projectId || !categorySelect.value) {
      showToast('newTicket.validationError', true);
      return;
    }

    submitButton.disabled = true;
    submitLabel.textContent = t('newTicket.submitting');

    try {
      const ticket = await apiRequest('/ticket', {
        method: 'POST',
        body: JSON.stringify({
          projectId: Number(projectId),
          categoryId: Number(categorySelect.value),
          ticketType: typeSelect.value,
          priorityId: Number(prioritySelect.value),
          title: titleInput.value,
          description: descriptionInput.value || null
        })
      });

      // Yeni talebin detayına gidiliyor; projeden gelindiyse geri linki de
      // o projeye dönsün diye from parametresi taşınıyor.
      window.location.hash = lockedProjectId
        ? `#/tickets/${ticket.id}?from=project:${lockedProjectId}`
        : `#/tickets/${ticket.id}`;
    } catch (error) {
      showToast('newTicket.error', true);
      submitButton.disabled = false;
      submitLabel.textContent = t('newTicket.submit');
    }
  });

  (async () => {
    if (!hasPermission(currentUser, PERMISSIONS.TICKET_CREATE, lockedProjectId)) {
      showState('newTicket.noPermission');
      return;
    }

    try {
      const [hasProjects] = await Promise.all([loadProjects(), loadPriorities()]);
      if (hasProjects) {
        loadingState.style.display = 'none';
        ticketForm.style.display = 'block';
        applyTranslations();
      }
    } catch (error) {
      showState('newTicket.error');
    }
  })();
}
