import { enhanceSelect, searchableSelectOptions } from '../customSelect.js';
import { pulseLoader } from '../loading.js';
import { PERMISSIONS, hasPermissionInAnyProject } from '../constants.js';
import { validateFields, clearFieldErrors } from '../formValidation.js';

// Kart ızgarası olduğu için tasarım dilindeki "15 satır" kuralı yerine
// projects.js ile aynı 12'yi kullanıyoruz - o kural tablolar için.
const PAGE_SIZE = 12;

// Kartta gösterilecek önizleme uzunluğu. İçerik düz metin olduğu için
// baştan bir parça alıp kırpıyoruz; kart yüksekliklerini CSS de sınırlıyor.
const PREVIEW_LENGTH = 220;

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

// Başlığın ilk iki harfinden kart avatarı. Proje kartındaki kod rozetinin
// karşılığı: bilgi bankası makalesinin kısa bir kodu olmadığı için başlıktan
// üretiliyor.
function titleInitials(title) {
  const trimmed = title.trim();
  return (trimmed.slice(0, 2) || '??').toUpperCase();
}

// Satır sonları korunuyor: makale içeriği numaralı adımlar ve maddelerden
// oluşuyor, hepsi tek paragrafa indirilince önizleme okunmaz oluyordu.
// Yalnızca boşluk/tab dizileri ve arka arkaya gelen boş satırlar sadeleşiyor.
function truncate(text, maxLength) {
  const collapsed = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return collapsed.length > maxLength ? `${collapsed.slice(0, maxLength)}…` : collapsed;
}

export function render(container, currentUser) {
  // Makale yazma yetkisi KB_MANAGE'e bağlı (bkz. KnowledgeBaseArticleController).
  // Yetki proje kapsamlı verilebildiği için hasPermissionInAnyProject
  // kullanılıyor; tek bir projeye kapsanmış yazar da butonu görmeli.
  const canManage = hasPermissionInAnyProject(currentUser, PERMISSIONS.KB_MANAGE);

  const topbarPageActions = document.getElementById('topbarPageActions');
  topbarPageActions.innerHTML = canManage
    ? `
    <button type="button" class="btn-primary" id="openCreateArticleButton">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      <span data-i18n="knowledgeBase.newArticle"></span>
    </button>
  `
    : '';

  container.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group filter-group-search">
        <label for="articleSearchInput" data-i18n="knowledgeBase.searchLabel"></label>
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
          <input type="text" id="articleSearchInput" data-i18n-placeholder="knowledgeBase.searchPlaceholder">
        </div>
      </div>
      <div class="filter-group">
        <label for="articleProjectSelect" data-i18n="knowledgeBase.projectLabel"></label>
        <select id="articleProjectSelect">
          <option value="" data-i18n="knowledgeBase.projectAll"></option>
        </select>
      </div>
      <div class="filter-group">
        <label for="articleCategorySelect" data-i18n="knowledgeBase.categoryLabel"></label>
        <select id="articleCategorySelect" disabled>
          <option value="" data-i18n="knowledgeBase.categoryAll"></option>
        </select>
      </div>
      <div class="filter-group">
        <label for="articleSortSelect" data-i18n="knowledgeBase.sortLabel"></label>
        <select id="articleSortSelect">
          <option value="updatedAt" data-i18n="knowledgeBase.sortUpdatedAt"></option>
          <option value="title" data-i18n="knowledgeBase.sortTitle"></option>
          <option value="createdAt" data-i18n="knowledgeBase.sortCreatedAt"></option>
          <option value="createdByFullName" data-i18n="knowledgeBase.sortAuthor"></option>
        </select>
      </div>
    </div>

    <div id="articleGrid" class="project-grid"></div>

    <div class="pagination-bar" id="articlePagination" style="display: none;">
      <span class="pagination-info" id="articlePaginationInfo"></span>
      <div class="pagination-controls">
        <button type="button" class="btn-secondary pagination-btn" id="articlePrevPageButton" data-i18n-title="knowledgeBase.prevPage" title="">‹</button>
        <span class="page-indicator" id="articlePageIndicator"></span>
        <button type="button" class="btn-secondary pagination-btn" id="articleNextPageButton" data-i18n-title="knowledgeBase.nextPage" title="">›</button>
      </div>
    </div>

    ${canManage ? createModalHtml() : ''}
    <div class="toast" id="articleToast" style="display: none;"></div>
  `;

  const grid = container.querySelector('#articleGrid');
  const searchInput = container.querySelector('#articleSearchInput');
  const projectSelect = container.querySelector('#articleProjectSelect');
  const categorySelect = container.querySelector('#articleCategorySelect');
  const sortSelect = container.querySelector('#articleSortSelect');
  const pagination = container.querySelector('#articlePagination');
  const paginationInfo = container.querySelector('#articlePaginationInfo');
  const pageIndicator = container.querySelector('#articlePageIndicator');
  const prevPageButton = container.querySelector('#articlePrevPageButton');
  const nextPageButton = container.querySelector('#articleNextPageButton');
  const toast = container.querySelector('#articleToast');

  // Seçenek etiketleri data-i18n ile boş geliyor; enhanceSelect etiketleri
  // native <option>'lardan kopyaladığı için önce çeviriler uygulanmalı.
  applyTranslations();
  // Proje ve kategori listeleri kurum büyüdükçe yüzlerce satıra çıkabiliyor;
  // ikisi de yazarak süzülebilir olmalı. Sıralama listesi sabit dört
  // seçenek olduğu için aramasız kalıyor.
  enhanceSelect(projectSelect, searchableSelectOptions());
  enhanceSelect(categorySelect, searchableSelectOptions());
  enhanceSelect(sortSelect);

  let currentPage = 1;
  let totalPages = 1;

  function showToast(key, isError) {
    toast.textContent = t(key);
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }

  function stateBox(messageKey, iconPaths) {
    return `
      <div class="state-box project-grid-state">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${iconPaths}
        </svg>
        <span>${t(messageKey)}</span>
      </div>
    `;
  }

  function renderCards(articles) {
    grid.innerHTML = '';

    if (articles.length === 0) {
      grid.innerHTML = stateBox(
        'knowledgeBase.empty',
        '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z"/>'
      );
      return;
    }

    articles.forEach((article) => {
      const card = document.createElement('a');
      card.className = 'project-card article-card';
      card.href = `#/knowledge-base/${article.id}`;
      // Taslaklar, pasif projelerde olduğu gibi soluk ama tıklanabilir.
      if (!article.isPublished) {
        card.classList.add('is-inactive');
      }

      const head = document.createElement('div');
      head.className = 'project-card-head';

      const mark = document.createElement('div');
      mark.className = 'project-card-mark';
      mark.textContent = titleInitials(article.title);

      const titleWrap = document.createElement('div');
      titleWrap.className = 'project-card-title-wrap';

      // Kullanıcı girdisi olan her metin textContent ile basılıyor.
      const name = document.createElement('strong');
      name.className = 'project-card-name article-card-title';
      name.textContent = article.title;
      name.title = article.title;

      const author = document.createElement('span');
      author.className = 'article-card-author';
      author.textContent = article.createdByFullName;

      titleWrap.append(name, author);
      head.append(mark, titleWrap);

      // Taslak rozeti isimden değil isPublished boolean'ından geliyor.
      if (!article.isPublished) {
        const draftBadge = document.createElement('span');
        draftBadge.className = 'badge project-card-status is-passive';
        draftBadge.textContent = t('knowledgeBase.badgeDraft');
        head.appendChild(draftBadge);
      }

      const preview = document.createElement('p');
      preview.className = 'project-card-description';
      preview.textContent = truncate(article.content, PREVIEW_LENGTH);

      const footer = document.createElement('div');
      footer.className = 'article-card-footer';

      const tags = document.createElement('div');
      tags.className = 'article-card-tags';

      // Projesi olmayan makaleler "Genel" etiketiyle işaretleniyor; boş
      // bırakılsa kartlar arasında sebepsiz bir hizasızlık oluşuyordu.
      // Etiketler tek satıra sığmazsa CSS "…" ile kırpıyor; tam adı
      // kaybetmemek için title olarak da veriliyor.
      const projectTag = document.createElement('span');
      projectTag.className = 'article-tag';
      projectTag.textContent = article.projectName || t('knowledgeBase.generalArticle');
      projectTag.title = projectTag.textContent;
      tags.appendChild(projectTag);

      if (article.categoryName) {
        const categoryTag = document.createElement('span');
        categoryTag.className = 'article-tag is-muted';
        categoryTag.textContent = article.categoryName;
        categoryTag.title = article.categoryName;
        tags.appendChild(categoryTag);
      }

      const updated = document.createElement('span');
      updated.className = 'article-card-date';
      updated.textContent = formatDate(article.updatedAt);

      footer.append(tags, updated);
      card.append(head, preview, footer);
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

  async function loadArticles() {
    grid.innerHTML = `<div class="project-grid-state">${pulseLoader(t('knowledgeBase.loading'))}</div>`;
    pagination.style.display = 'none';

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(PAGE_SIZE),
        sortBy: sortSelect.value,
        // Başlık ve yazar alfabetik olduğu için artan, tarihler için azalan
        // (en yeni üstte) doğal beklenti.
        sortDescending: String(sortSelect.value !== 'title' && sortSelect.value !== 'createdByFullName')
      });

      const search = searchInput.value.trim();
      if (search) {
        params.set('search', search);
      }
      if (projectSelect.value) {
        params.set('projectId', projectSelect.value);
      }
      if (categorySelect.value) {
        params.set('categoryId', categorySelect.value);
      }

      const result = await apiRequest(`/knowledgebasearticle?${params.toString()}`);

      renderCards(result.items);
      updatePagination(result.totalCount);
    } catch (error) {
      grid.innerHTML = stateBox(
        'knowledgeBase.error',
        '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'
      );
    }
  }

  // Proje seçilince kategori listesi o projeninkilerle doluyor
  // (newTicket.js'teki cascading select deseniyle aynı).
  async function loadCategories() {
    categorySelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t('knowledgeBase.categoryAll');
    categorySelect.appendChild(placeholder);

    if (!projectSelect.value) {
      categorySelect.disabled = true;
      enhanceSelect(categorySelect, searchableSelectOptions());
      return;
    }

    try {
      const categories = await apiRequest(`/project/${projectSelect.value}/categories`);
      categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
      categorySelect.disabled = categories.length === 0;
    } catch (error) {
      categorySelect.disabled = true;
    }

    enhanceSelect(categorySelect, searchableSelectOptions());
  }

  async function loadProjects() {
    try {
      const projects = await apiRequest('/project');
      // /project sayfalanmış da dönebiliyor (page verilirse PagedResult),
      // burada parametresiz çağırdığımız için düz dizi bekleniyor.
      const items = Array.isArray(projects) ? projects : projects.items;
      items.forEach((project) => {
        projectSelect.add(new Option(project.name, project.id));
      });
    } catch (error) {
      // Proje listesi çekilemezse filtre boş kalır, makale listesi yine çalışır.
    }
    enhanceSelect(projectSelect, searchableSelectOptions());
  }

  function resetPageAndLoad() {
    currentPage = 1;
    loadArticles();
  }

  searchInput.addEventListener('input', debounce(resetPageAndLoad, 300));
  sortSelect.addEventListener('change', resetPageAndLoad);
  categorySelect.addEventListener('change', resetPageAndLoad);

  projectSelect.addEventListener('change', async () => {
    await loadCategories();
    resetPageAndLoad();
  });

  prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadArticles();
    }
  });

  nextPageButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage += 1;
      loadArticles();
    }
  });

  if (canManage) {
    wireCreateModal(container, showToast, resetPageAndLoad);
  }

  loadProjects();
  loadArticles();
}

// --- Yeni makale modalı (KB_MANAGE gerektirir) ---

function createModalHtml() {
  return `
    <div class="modal-overlay" id="createArticleOverlay" style="display: none;">
      <div class="modal-card article-modal-card" role="dialog" aria-modal="true" aria-labelledby="createArticleTitle">
        <h2 class="modal-title" id="createArticleTitle" data-i18n="knowledgeBase.createTitle"></h2>
        <div class="modal-body">
          <div class="filter-group">
            <label for="createArticleTitleInput" data-i18n="knowledgeBase.formTitle"></label>
            <input type="text" id="createArticleTitleInput" data-i18n-placeholder="knowledgeBase.formTitlePlaceholder">
          </div>
          <div class="filter-group">
            <label for="createArticleProject" data-i18n="knowledgeBase.formProject"></label>
            <select id="createArticleProject">
              <option value="" data-i18n="knowledgeBase.formNoProject"></option>
            </select>
          </div>
          <div class="filter-group">
            <label for="createArticleCategory" data-i18n="knowledgeBase.formCategory"></label>
            <select id="createArticleCategory" disabled>
              <option value="" data-i18n="knowledgeBase.formNoCategory"></option>
            </select>
          </div>
          <div class="filter-group">
            <label for="createArticleContent" data-i18n="knowledgeBase.formContent"></label>
            <textarea id="createArticleContent" rows="10" class="article-content-input" data-i18n-placeholder="knowledgeBase.formContentPlaceholder"></textarea>
          </div>
          <label class="article-publish-toggle">
            <input type="checkbox" id="createArticlePublished">
            <span data-i18n="knowledgeBase.formPublish"></span>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="createArticleCancel" data-i18n="knowledgeBase.formCancel"></button>
          <button type="button" class="btn-primary" id="createArticleSubmit" data-i18n="knowledgeBase.formSubmit"></button>
        </div>
      </div>
    </div>
  `;
}

function wireCreateModal(container, showToast, onCreated) {
  const openButton = document.getElementById('openCreateArticleButton');
  const overlay = container.querySelector('#createArticleOverlay');
  const titleInput = container.querySelector('#createArticleTitleInput');
  const projectSelect = container.querySelector('#createArticleProject');
  const categorySelect = container.querySelector('#createArticleCategory');
  const contentInput = container.querySelector('#createArticleContent');
  const publishedInput = container.querySelector('#createArticlePublished');
  const cancelButton = container.querySelector('#createArticleCancel');
  const submitButton = container.querySelector('#createArticleSubmit');

  enhanceSelect(projectSelect, searchableSelectOptions());
  enhanceSelect(categorySelect, searchableSelectOptions());

  let projectsLoaded = false;

  async function loadProjectOptions() {
    if (projectsLoaded) return;
    try {
      const projects = await apiRequest('/project');
      const items = Array.isArray(projects) ? projects : projects.items;
      items.forEach((project) => {
        projectSelect.add(new Option(project.name, project.id));
      });
      projectsLoaded = true;
    } catch (error) {
      // Proje çekilemezse makale yine de projesiz oluşturulabilir.
    }
    enhanceSelect(projectSelect, searchableSelectOptions());
  }

  async function loadCategoryOptions() {
    categorySelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t('knowledgeBase.formNoCategory');
    categorySelect.appendChild(placeholder);

    if (!projectSelect.value) {
      categorySelect.disabled = true;
      enhanceSelect(categorySelect, searchableSelectOptions());
      return;
    }

    try {
      const categories = await apiRequest(`/project/${projectSelect.value}/categories`);
      categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
      categorySelect.disabled = categories.length === 0;
    } catch (error) {
      categorySelect.disabled = true;
    }

    enhanceSelect(categorySelect, searchableSelectOptions());
  }

  async function openModal() {
    titleInput.value = '';
    contentInput.value = '';
    publishedInput.checked = false;
    projectSelect.value = '';
    await loadProjectOptions();
    await loadCategoryOptions();
    overlay.style.display = '';
    titleInput.focus();
  }

  function closeModal() {
    overlay.style.display = 'none';
    // Bir sonraki açılışta önceki denemenin hataları durmasın.
    clearFieldErrors([titleInput, contentInput]);
  }

  openButton?.addEventListener('click', openModal);
  cancelButton.addEventListener('click', closeModal);
  projectSelect.addEventListener('change', loadCategoryOptions);

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
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    // Hata alanın kendi altında: tek genel mesaj hangi alanın eksik
    // olduğunu söylemiyordu.
    const hasError = validateFields([
      { el: titleInput, valid: title.length > 0, messageKey: 'knowledgeBase.titleRequired' },
      { el: contentInput, valid: content.length > 0, messageKey: 'knowledgeBase.contentRequired' }
    ]);
    if (hasError) return;

    submitButton.disabled = true;
    try {
      await apiRequest('/knowledgebasearticle', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          projectId: projectSelect.value ? Number(projectSelect.value) : null,
          categoryId: categorySelect.value ? Number(categorySelect.value) : null,
          isPublished: publishedInput.checked
        })
      });
      closeModal();
      showToast('knowledgeBase.created', false);
      onCreated();
    } catch (error) {
      showToast('knowledgeBase.saveError', true);
    } finally {
      submitButton.disabled = false;
    }
  });
}
