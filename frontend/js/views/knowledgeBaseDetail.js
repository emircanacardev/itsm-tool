import { enhanceSelect, searchableSelectOptions } from '../customSelect.js';
import { pulseLoader } from '../loading.js';
import { showConfirmDialog } from '../confirmDialog.js';
import { PERMISSIONS, hasPermissionInAnyProject } from '../constants.js';

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(getLanguage() === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

export function render(container, articleId, currentUser) {
  container.innerHTML = `<div class="project-detail-loading">${pulseLoader(t('knowledgeBase.loading'))}</div>`;

  const topbarPageActions = document.getElementById('topbarPageActions');
  topbarPageActions.innerHTML = '';

  loadArticle(container, articleId, currentUser);
}

async function loadArticle(container, articleId, currentUser) {
  let article;
  try {
    article = await apiRequest(`/knowledgebasearticle/${articleId}`);
  } catch (error) {
    // Backend yetkisiz erişimde de 404 dönüyor, bu yüzden "bulunamadı ya da
    // yetkin yok" diye tek bir mesaj gösteriyoruz.
    container.innerHTML = `
      <a class="project-back-link" href="#/knowledge-base">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        <span>${t('knowledgeBase.backToList')}</span>
      </a>
      <div class="state-box">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <span>${t('knowledgeBase.notFound')}</span>
      </div>
    `;
    return;
  }

  // Düzenleme KB_MANAGE ister; silme ayrıca makalenin yazarına da açık
  // (bkz. KnowledgeBaseArticleService.DeleteArticleAsync).
  const canManage = hasPermissionInAnyProject(currentUser, PERMISSIONS.KB_MANAGE);
  const isOwner = article.createdBy === currentUser?.id;
  const canEdit = canManage;
  const canDelete = canManage || isOwner;

  document.getElementById('pageTitle').textContent = article.title;
  document.getElementById('pageSubtitle').textContent = '';

  container.innerHTML = `
    <a class="project-back-link" href="#/knowledge-base">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
      <span>${t('knowledgeBase.backToList')}</span>
    </a>

    <article class="article-detail" id="articleReadView">
      <header class="article-detail-head">
        <h1 class="article-detail-title" id="articleDetailTitle"></h1>
        <div class="article-detail-meta" id="articleDetailMeta"></div>
      </header>
      <div class="article-detail-content" id="articleDetailContent"></div>
      ${canEdit || canDelete ? `
      <footer class="article-detail-actions">
        ${canEdit ? `
        <button type="button" class="btn-secondary" id="editArticleButton">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>
          </svg>
          <span data-i18n="knowledgeBase.edit"></span>
        </button>` : ''}
        ${canDelete ? `
        <button type="button" class="btn-secondary btn-danger" id="deleteArticleButton">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
          <span data-i18n="knowledgeBase.delete"></span>
        </button>` : ''}
      </footer>` : ''}
    </article>

    ${canEdit ? editFormHtml() : ''}
    <div class="toast" id="articleDetailToast" style="display: none;"></div>
  `;

  const readView = container.querySelector('#articleReadView');
  const titleEl = container.querySelector('#articleDetailTitle');
  const metaEl = container.querySelector('#articleDetailMeta');
  const contentEl = container.querySelector('#articleDetailContent');
  const toast = container.querySelector('#articleDetailToast');

  function showToast(key, isError) {
    toast.textContent = t(key);
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }

  // Okuma görünümünü makale nesnesinden basar. Düzenleme sonrası da
  // çağrılıyor, böylece kaydedilen hâli sayfayı yenilemeden görünüyor.
  function renderReadView() {
    titleEl.textContent = article.title;

    metaEl.innerHTML = '';

    if (!article.isPublished) {
      const draftBadge = document.createElement('span');
      draftBadge.className = 'badge project-card-status is-passive';
      draftBadge.textContent = t('knowledgeBase.badgeDraft');
      metaEl.appendChild(draftBadge);
    }

    const projectTag = document.createElement('span');
    projectTag.className = 'article-tag';
    projectTag.textContent = article.projectName || t('knowledgeBase.generalArticle');
    metaEl.appendChild(projectTag);

    if (article.categoryName) {
      const categoryTag = document.createElement('span');
      categoryTag.className = 'article-tag is-muted';
      categoryTag.textContent = article.categoryName;
      metaEl.appendChild(categoryTag);
    }

    const author = document.createElement('span');
    author.className = 'article-detail-author';
    author.textContent = article.createdByFullName;
    metaEl.appendChild(author);

    const updated = document.createElement('span');
    updated.className = 'article-detail-date';
    updated.textContent = `${t('knowledgeBase.updatedAt')}: ${formatDate(article.updatedAt)}`;
    metaEl.appendChild(updated);

    // Yayındaki makalelerde okunma sayısı: taslakta anlamsız (henüz
    // kimseye görünmüyor), o yüzden yalnızca yayındayken gösteriliyor.
    if (article.isPublished) {
      const views = document.createElement('span');
      views.className = 'article-view-count';
      views.textContent = t('dashboard.viewCount').replace('{count}', article.viewCount);
      metaEl.appendChild(views);
    }

    // İçerik düz metin: satır sonları CSS'teki white-space: pre-wrap ile
    // korunuyor, metin textContent ile basıldığı için HTML yorumlanmıyor.
    contentEl.textContent = article.content;

    document.getElementById('pageTitle').textContent = article.title;
  }

  renderReadView();
  applyTranslations();

  // Düzenle/Sil, makalenin kendi kartının altında duruyor: topbar'da
  // dururken hangi kayda ait oldukları bağlamdan kopuktu ve sayfa
  // başlığıyla aynı hizada rekabet ediyorlardı.
  container.querySelector('#editArticleButton')?.addEventListener('click', openEditMode);
  container.querySelector('#deleteArticleButton')?.addEventListener('click', deleteArticle);

  async function deleteArticle() {
    const confirmed = await showConfirmDialog(t('knowledgeBase.deleteConfirm'), { danger: true });
    if (!confirmed) return;

    try {
      await apiRequest(`/knowledgebasearticle/${article.id}`, { method: 'DELETE' });
      // Silinen makalenin detay sayfasında kalmanın anlamı yok; listeye dön.
      window.location.hash = '#/knowledge-base';
    } catch (error) {
      showToast('knowledgeBase.deleteError', true);
    }
  }

  if (!canEdit) {
    return;
  }

  // --- Düzenleme modu ---

  const editView = container.querySelector('#articleEditView');
  const editTitle = container.querySelector('#editArticleTitle');
  const editProject = container.querySelector('#editArticleProject');
  const editCategory = container.querySelector('#editArticleCategory');
  const editContent = container.querySelector('#editArticleContent');
  const editPublished = container.querySelector('#editArticlePublished');
  const cancelButton = container.querySelector('#editArticleCancel');
  const saveButton = container.querySelector('#editArticleSave');

  applyTranslations();
  enhanceSelect(editProject, searchableSelectOptions());
  enhanceSelect(editCategory, searchableSelectOptions());

  let projectsLoaded = false;

  async function loadProjectOptions() {
    if (projectsLoaded) return;
    try {
      const projects = await apiRequest('/project');
      const items = Array.isArray(projects) ? projects : projects.items;
      items.forEach((project) => {
        editProject.add(new Option(project.name, project.id));
      });
      projectsLoaded = true;
    } catch (error) {
      // Proje listesi gelmezse mevcut seçim korunur, makale yine kaydedilebilir.
    }
    enhanceSelect(editProject, searchableSelectOptions());
  }

  async function loadCategoryOptions(selectedCategoryId) {
    editCategory.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t('knowledgeBase.formNoCategory');
    editCategory.appendChild(placeholder);

    if (!editProject.value) {
      editCategory.disabled = true;
      enhanceSelect(editCategory, searchableSelectOptions());
      return;
    }

    try {
      const categories = await apiRequest(`/project/${editProject.value}/categories`);
      categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        editCategory.appendChild(option);
      });
      editCategory.disabled = categories.length === 0;
      if (selectedCategoryId) {
        editCategory.value = String(selectedCategoryId);
      }
    } catch (error) {
      editCategory.disabled = true;
    }

    enhanceSelect(editCategory, searchableSelectOptions());
  }

  async function openEditMode() {
    editTitle.value = article.title;
    editContent.value = article.content;
    editPublished.checked = article.isPublished;

    await loadProjectOptions();
    editProject.value = article.projectId ? String(article.projectId) : '';
    enhanceSelect(editProject, searchableSelectOptions());
    await loadCategoryOptions(article.categoryId);

    readView.style.display = 'none';
    editView.style.display = '';
    editTitle.focus();
  }

  function closeEditMode() {
    editView.style.display = 'none';
    readView.style.display = '';
  }

  cancelButton.addEventListener('click', closeEditMode);
  editProject.addEventListener('change', () => loadCategoryOptions(null));

  saveButton.addEventListener('click', async () => {
    const title = editTitle.value.trim();
    const content = editContent.value.trim();

    if (!title || !content) {
      showToast('knowledgeBase.validationError', true);
      return;
    }

    saveButton.disabled = true;
    try {
      const payload = {
        title,
        content,
        projectId: editProject.value ? Number(editProject.value) : null,
        categoryId: editCategory.value ? Number(editCategory.value) : null,
        isPublished: editPublished.checked
      };

      await apiRequest(`/knowledgebasearticle/${article.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      // PUT 204 döndüğü için güncel makaleyi elimizdeki nesneye işliyoruz;
      // proje/kategori adları id'den türemediği için select etiketlerinden
      // okunuyor (yeniden fetch etmeye değmez).
      article = {
        ...article,
        ...payload,
        projectName: editProject.value
          ? editProject.options[editProject.selectedIndex].textContent
          : null,
        categoryName: editCategory.value
          ? editCategory.options[editCategory.selectedIndex].textContent
          : null,
        updatedAt: new Date().toISOString()
      };

      renderReadView();
      closeEditMode();
      showToast('knowledgeBase.saved', false);
    } catch (error) {
      showToast('knowledgeBase.saveError', true);
    } finally {
      saveButton.disabled = false;
    }
  });
}

function editFormHtml() {
  return `
    <div class="article-edit-form" id="articleEditView" style="display: none;">
      <div class="filter-group">
        <label for="editArticleTitle" data-i18n="knowledgeBase.formTitle"></label>
        <input type="text" id="editArticleTitle" data-i18n-placeholder="knowledgeBase.formTitlePlaceholder">
      </div>
      <div class="article-edit-row">
        <div class="filter-group">
          <label for="editArticleProject" data-i18n="knowledgeBase.formProject"></label>
          <select id="editArticleProject">
            <option value="" data-i18n="knowledgeBase.formNoProject"></option>
          </select>
        </div>
        <div class="filter-group">
          <label for="editArticleCategory" data-i18n="knowledgeBase.formCategory"></label>
          <select id="editArticleCategory" disabled>
            <option value="" data-i18n="knowledgeBase.formNoCategory"></option>
          </select>
        </div>
      </div>
      <div class="filter-group">
        <label for="editArticleContent" data-i18n="knowledgeBase.formContent"></label>
        <textarea id="editArticleContent" rows="16" class="article-content-input" data-i18n-placeholder="knowledgeBase.formContentPlaceholder"></textarea>
      </div>
      <label class="article-publish-toggle">
        <input type="checkbox" id="editArticlePublished">
        <span data-i18n="knowledgeBase.formPublish"></span>
      </label>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="editArticleCancel" data-i18n="knowledgeBase.formCancel"></button>
        <button type="button" class="btn-primary" id="editArticleSave" data-i18n="knowledgeBase.formSave"></button>
      </div>
    </div>
  `;
}
