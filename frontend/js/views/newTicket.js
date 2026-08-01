import { enhanceSelect } from '../customSelect.js';

export function render(container, currentUser) {
  container.innerHTML = `
    <div id="stateMessage" class="state-box" style="display: none;">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2"/>
        <path d="M3 9h18M8 4v5"/>
      </svg>
      <span id="stateMessageText"></span>
    </div>

    <form class="form-card" id="ticketForm" style="display: none;">
      <div class="error-message" id="errorMessage"></div>

      <div class="form-row">
        <div class="form-group">
          <label for="projectSelect" data-i18n="newTicket.project"></label>
          <select id="projectSelect" required>
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

      <div class="form-group">
        <label for="titleInput" data-i18n="newTicket.title"></label>
        <input type="text" id="titleInput" required maxlength="200">
      </div>

      <div class="form-group">
        <label for="descriptionInput" data-i18n="newTicket.description"></label>
        <textarea id="descriptionInput"></textarea>
      </div>

      <button type="submit" id="submitButton" data-i18n="newTicket.submit"></button>
    </form>
  `;

  const stateMessage = container.querySelector('#stateMessage');
  const ticketForm = container.querySelector('#ticketForm');
  const errorMessage = container.querySelector('#errorMessage');
  const projectSelect = container.querySelector('#projectSelect');
  const categorySelect = container.querySelector('#categorySelect');
  const prioritySelect = container.querySelector('#prioritySelect');
  const typeSelect = container.querySelector('#typeSelect');
  const submitButton = container.querySelector('#submitButton');

  enhanceSelect(projectSelect);
  enhanceSelect(categorySelect);
  enhanceSelect(typeSelect);

  function showState(key) {
    container.querySelector('#stateMessageText').textContent = t(key);
    stateMessage.style.display = 'flex';
    ticketForm.style.display = 'none';
  }

  async function loadPriorities() {
    const priorities = await apiRequest('/priority');
    priorities.forEach((priority) => {
      const option = document.createElement('option');
      option.value = priority.id;
      option.textContent = priority.name;
      prioritySelect.appendChild(option);
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
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      projectSelect.appendChild(option);
    });
    enhanceSelect(projectSelect);
    return true;
  }

  projectSelect.addEventListener('change', async () => {
    categorySelect.innerHTML = '';
    if (!projectSelect.value) {
      categorySelect.disabled = true;
      const option = document.createElement('option');
      option.value = '';
      option.textContent = t('newTicket.selectCategoryFirst');
      categorySelect.appendChild(option);
      enhanceSelect(categorySelect);
      return;
    }

    try {
      const categories = await apiRequest(`/project/${projectSelect.value}/categories`);
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = t('newTicket.selectCategory');
      categorySelect.appendChild(placeholder);
      categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
      categorySelect.disabled = false;
    } catch (error) {
      categorySelect.disabled = true;
    }
    enhanceSelect(categorySelect);
  });

  ticketForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.style.display = 'none';
    submitButton.disabled = true;
    submitButton.textContent = t('newTicket.submitting');

    try {
      const ticket = await apiRequest('/ticket', {
        method: 'POST',
        body: JSON.stringify({
          projectId: Number(projectSelect.value),
          categoryId: Number(categorySelect.value),
          ticketType: container.querySelector('#typeSelect').value,
          priorityId: Number(prioritySelect.value),
          title: container.querySelector('#titleInput').value,
          description: container.querySelector('#descriptionInput').value || null
        })
      });
      window.location.hash = `#/tickets/${ticket.id}`;
    } catch (error) {
      errorMessage.textContent = t('newTicket.error');
      errorMessage.style.display = 'block';
      submitButton.disabled = false;
      submitButton.textContent = t('newTicket.submit');
    }
  });

  (async () => {
    const hasPermission = currentUser?.permissions?.some((p) => p.permissionCode === 'TICKET_CREATE');
    if (!hasPermission) {
      showState('newTicket.noPermission');
      return;
    }

    try {
      const [hasProjects] = await Promise.all([loadProjects(), loadPriorities()]);
      if (hasProjects) {
        ticketForm.style.display = 'block';
      }
    } catch (error) {
      showState('newTicket.error');
    }
  })();
}
