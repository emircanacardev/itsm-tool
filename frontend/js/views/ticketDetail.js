import { enhanceSelect, searchableSelectOptions } from '../customSelect.js';
import { pulseLoader } from '../loading.js';
import {
  STATUS_BADGE_MAP,
  PRIORITY_BADGE_MAP,
  NEUTRAL_BADGE,
  isClosedStatus
} from '../constants.js';

const TYPE_LABEL_KEYS = { Incident: 'detail.typeIncident', ServiceRequest: 'detail.typeServiceRequest' };

// Renk Id ile seçiliyor, gösterilen metin çevrilmiş ad.
function applyBadge(el, id, name, colorMap) {
  const colors = colorMap[id] || NEUTRAL_BADGE;
  el.style.background = colors.bg;
  el.style.color = colors.fg;
  el.textContent = name;
}

function formatDateTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString(getLanguage() === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function renderDue(ticket) {
  if (isClosedStatus(ticket.statusId)) {
    return { text: formatDateTime(ticket.dueAt), className: 'due-done' };
  }
  if (!ticket.dueAt) {
    return { text: '-', className: '' };
  }
  const diffMs = new Date(ticket.dueAt).getTime() - Date.now();
  if (diffMs < 0) return { text: formatDateTime(ticket.dueAt), className: 'due-overdue' };
  if (diffMs < 2 * 60 * 60 * 1000) return { text: formatDateTime(ticket.dueAt), className: 'due-soon' };
  return { text: formatDateTime(ticket.dueAt), className: 'due-ok' };
}

// from parametresini geri dönüş hedefine çevirir. Şimdilik tek biçim
// destekleniyor: "project:<id>". Tanınmayan/eksik değerde talep listesine
// dönülüyor - yani parametre bozuksa sayfa yine de çalışıyor.
function parseBackTarget(query) {
  const from = query?.get('from') ?? '';
  const [kind, id] = from.split(':');

  if (kind === 'project' && /^\d+$/.test(id ?? '')) {
    return { href: `#/projects/${id}`, i18nKey: 'detail.backToProject' };
  }

  return { href: '#/tickets', i18nKey: 'detail.back' };
}

export function render(container, ticketId, currentUser, query) {
  // Nereden gelindiyse oraya dönüyoruz: proje detayından açılan bir talep
  // "Taleplere dön" deyip tüm talep listesine düşerse kullanıcı bağlamı
  // kaybediyor. from=project:2 gibi bir parametreyle geldiğinde geri linki
  // o projeye işaret ediyor (bkz. projectDetail.js'teki satır bağlantıları).
  const backTarget = parseBackTarget(query);

  container.innerHTML = `
    <a class="back-link" href="${backTarget.href}">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
      <span data-i18n="${backTarget.i18nKey}"></span>
    </a>
    <div id="stateMessage">${pulseLoader(t('tickets.loading'))}</div>
    <div id="ticketDetail" style="display: none;">
      <div class="detail-grid">
        <div>
          <div class="card">
            <div class="ticket-header">
              <div>
                <span class="ticket-id-large" id="ticketIdLabel"></span>
                <h2 class="ticket-title-large" id="ticketTitle"></h2>
              </div>
              <div class="badge-row">
                <span class="badge" id="statusBadge"></span>
                <span class="badge" id="priorityBadge"></span>
              </div>
            </div>
            <p class="section-label" data-i18n="detail.description"></p>
            <p class="description-text" id="ticketDescription"></p>
          </div>

          <div class="card" id="statusCard" style="display: none;">
            <p class="section-label" data-i18n="detail.statusSectionTitle"></p>
            <div class="action-form">
              <select id="statusSelect"></select>
              <button id="statusSaveButton" data-i18n="detail.save"></button>
            </div>
            <div class="toast" id="statusToast"></div>
          </div>

          <div class="card" id="assignCard" style="display: none;">
            <p class="section-label" data-i18n="detail.assignSectionTitle"></p>
            <div class="action-form">
              <select id="assignSelect">
                <option value="" data-i18n="detail.selectUser"></option>
              </select>
              <button id="assignSaveButton" data-i18n="detail.assign"></button>
            </div>
            <div class="toast" id="assignToast"></div>
          </div>

          <div class="card">
            <p class="section-label" data-i18n="comments.title"></p>
            <div class="comment-list" id="commentList"></div>
            <div class="comment-form">
              <textarea id="commentInput" data-i18n-placeholder="comments.placeholder"></textarea>
              <div class="comment-form-footer">
                <label class="checkbox-label">
                  <input type="checkbox" id="commentInternalCheckbox">
                  <span data-i18n="comments.internal"></span>
                </label>
                <button id="commentSendButton" data-i18n="comments.send"></button>
              </div>
            </div>
            <div class="toast" id="commentToast"></div>
          </div>

          <div class="card">
            <p class="section-label" data-i18n="attachments.title"></p>
            <div class="attachment-list" id="attachmentList"></div>
            <div class="upload-row">
              <input type="file" id="attachmentInput">
              <button id="attachmentUploadButton" data-i18n="attachments.upload"></button>
            </div>
            <div class="toast" id="attachmentToast"></div>
          </div>
        </div>

        <div class="card">
          <p class="section-label" data-i18n="detail.detailsSectionTitle"></p>
          <div class="meta-list">
            <div class="meta-row">
              <span class="meta-label" data-i18n="detail.project"></span>
              <span class="meta-value" id="metaProject"></span>
            </div>
            <div class="meta-row">
              <span class="meta-label" data-i18n="detail.category"></span>
              <span class="meta-value" id="metaCategory"></span>
            </div>
            <div class="meta-row">
              <span class="meta-label" data-i18n="detail.type"></span>
              <span class="meta-value" id="metaType"></span>
            </div>
            <div class="meta-row">
              <span class="meta-label" data-i18n="detail.createdBy"></span>
              <span class="meta-value" id="metaCreatedBy"></span>
            </div>
            <div class="meta-row">
              <span class="meta-label" data-i18n="detail.assignedTo"></span>
              <span class="meta-value" id="metaAssignedTo"></span>
            </div>
            <div class="meta-row">
              <span class="meta-label" data-i18n="detail.dueAt"></span>
              <span class="meta-value" id="metaDueAt"></span>
            </div>
            <div class="meta-row">
              <span class="meta-label" data-i18n="detail.createdAt"></span>
              <span class="meta-value" id="metaCreatedAt"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const stateMessage = container.querySelector('#stateMessage');
  const ticketDetail = container.querySelector('#ticketDetail');

  function renderTicket(ticket) {
    // Topbar sabit kalıyor: "Talep Detayı" başlığı sayfanın ne sayfası
    // olduğunu anlatır, talebin kendi adı zaten kartın içinde (ticketTitle)
    // duruyor - ikisini birden yazmak aynı bilgiyi tekrarlıyordu.
    // Sekme başlığında ise talebin adı kalıyor: tarayıcı sekmeleri arasında
    // hangi talebin açık olduğunu ayırt etmenin tek yolu o.
    document.title = `#${ticket.id} ${ticket.title} — Pulse ITSM`;

    container.querySelector('#ticketIdLabel').textContent = `#${ticket.id}`;
    container.querySelector('#ticketTitle').textContent = ticket.title;
    container.querySelector('#ticketDescription').textContent = ticket.description || t('detail.noDescription');
    applyBadge(container.querySelector('#statusBadge'), ticket.statusId, ticket.statusName, STATUS_BADGE_MAP);
    applyBadge(container.querySelector('#priorityBadge'), ticket.priorityId, ticket.priorityName, PRIORITY_BADGE_MAP);

    container.querySelector('#metaProject').textContent = ticket.projectName;
    container.querySelector('#metaCategory').textContent = ticket.categoryName;
    container.querySelector('#metaType').textContent = t(TYPE_LABEL_KEYS[ticket.ticketType] || ticket.ticketType);
    container.querySelector('#metaCreatedBy').textContent = ticket.createdByName;
    container.querySelector('#metaAssignedTo').textContent = ticket.assignedToName || t('tickets.unassigned');

    const due = renderDue(ticket);
    const dueEl = container.querySelector('#metaDueAt');
    dueEl.textContent = due.text;
    dueEl.className = `meta-value ${due.className}`;

    container.querySelector('#metaCreatedAt').textContent = formatDateTime(ticket.createdAt);

    container.querySelector('#assignSelect').value = ticket.assignedTo || '';
  }

  function showToast(el, key, isError) {
    el.textContent = t(key);
    el.className = `toast ${isError ? 'error' : 'success'}`;
    el.style.display = 'block';
  }

  async function loadStatusOptions(currentTicket) {
    try {
      const statuses = await apiRequest('/status');
      const select = container.querySelector('#statusSelect');
      select.innerHTML = '';
      statuses.forEach((status) => {
        const option = document.createElement('option');
        option.value = status.id;
        option.textContent = status.name;
        select.appendChild(option);
      });
      select.value = currentTicket.statusId;
      enhanceSelect(select);
      container.querySelector('#statusCard').style.display = '';
    } catch (error) {
      // TICKET_STATUS_UPDATE yetkisi yoksa 403 döner, kart gizli kalır.
    }
  }

  async function loadAssignOptions(currentTicket) {
    try {
      const users = await apiRequest('/ticket/assignable-users');
      const select = container.querySelector('#assignSelect');
      // Durum/atama kaydedildikten sonra talep yeniden yüklenip bu fonksiyon
      // tekrar çalışıyor - placeholder dışındaki eski seçenekleri temizleyip
      // kullanıcı listesinin birden fazla kez eklenmesini önlüyoruz.
      while (select.options.length > 1) {
        select.remove(1);
      }
      users.forEach((user) => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.fullName;
        select.appendChild(option);
      });
      select.value = currentTicket.assignedTo || '';
      // Aranabilir: atanabilir kullanıcı sayısı kurulumla birlikte binlere
      // çıkabiliyor, düz bir listede aradığını bulmak mümkün olmuyor
      // (aynı desen: admin SLA/proje seçicileri, bilgi bankası).
      enhanceSelect(select, searchableSelectOptions());
      container.querySelector('#assignCard').style.display = '';
    } catch (error) {
      // TICKET_ASSIGN yetkisi yoksa 403 döner, kart gizli kalır.
    }
  }

  async function loadTicket() {
    try {
      const ticket = await apiRequest(`/ticket/${ticketId}`);
      stateMessage.style.display = 'none';
      ticketDetail.style.display = 'block';
      renderTicket(ticket);
      await Promise.all([loadStatusOptions(ticket), loadAssignOptions(ticket)]);
      return ticket;
    } catch (error) {
      const message = error.message.includes('404') ? t('detail.notFound') : t('detail.error');
      stateMessage.innerHTML = `
        <div class="state-box">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <span>${message}</span>
        </div>`;
      stateMessage.style.display = 'block';
      ticketDetail.style.display = 'none';
      return null;
    }
  }

  function renderComments(comments) {
    const list = container.querySelector('#commentList');
    list.innerHTML = '';

    if (comments.length === 0) {
      list.innerHTML = `<div class="state-box" style="padding: var(--space-4);">${t('comments.empty')}</div>`;
      return;
    }

    comments.forEach((comment) => {
      const item = document.createElement('div');
      item.className = 'comment-item';

      const header = document.createElement('div');
      header.className = 'comment-header';

      const author = document.createElement('span');
      author.className = 'comment-author';
      author.textContent = comment.userFullName;
      header.appendChild(author);

      if (comment.isInternal) {
        const commentBadge = document.createElement('span');
        commentBadge.className = 'internal-badge';
        commentBadge.textContent = t('comments.internalBadge');
        header.appendChild(commentBadge);
      }

      const date = document.createElement('span');
      date.className = 'comment-date';
      date.textContent = formatDateTime(comment.createdAt);
      header.appendChild(date);

      const message = document.createElement('p');
      message.className = 'comment-message';
      message.textContent = comment.message;

      item.append(header, message);
      list.appendChild(item);
    });
  }

  async function loadComments() {
    try {
      const comments = await apiRequest(`/ticket/${ticketId}/comments`);
      renderComments(comments);
    } catch (error) {
      container.querySelector('#commentList').innerHTML =
        `<div class="state-box" style="padding: var(--space-4);">${t('comments.error')}</div>`;
    }
  }

  async function downloadAttachment(attachmentId, fileName) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}/attachments/${attachmentId}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return;

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderAttachments(attachments) {
    const list = container.querySelector('#attachmentList');
    list.innerHTML = '';

    if (attachments.length === 0) {
      list.innerHTML = `<div class="state-box" style="padding: var(--space-4);">${t('attachments.empty')}</div>`;
      return;
    }

    attachments.forEach((attachment) => {
      const item = document.createElement('div');
      item.className = 'attachment-item';

      const info = document.createElement('div');
      const nameEl = document.createElement('div');
      nameEl.textContent = attachment.fileName;
      nameEl.style.fontSize = 'var(--text-base)';
      nameEl.style.fontWeight = 'var(--weight-semibold)';
      const metaEl = document.createElement('div');
      metaEl.className = 'attachment-meta';
      metaEl.textContent = `${attachment.uploadedByFullName} ${t('attachments.uploadedBy')} · ${formatDateTime(attachment.uploadedAt)}`;
      info.append(nameEl, metaEl);

      const downloadButton = document.createElement('button');
      downloadButton.className = 'attachment-link';
      downloadButton.textContent = t('attachments.download');
      downloadButton.addEventListener('click', () => downloadAttachment(attachment.id, attachment.fileName));

      item.append(info, downloadButton);
      list.appendChild(item);
    });
  }

  async function loadAttachments() {
    try {
      const attachments = await apiRequest(`/ticket/${ticketId}/attachments`);
      renderAttachments(attachments);
    } catch (error) {
      container.querySelector('#attachmentList').innerHTML =
        `<div class="state-box" style="padding: var(--space-4);">${t('attachments.error')}</div>`;
    }
  }

  container.querySelector('#statusSaveButton').addEventListener('click', async () => {
    const button = container.querySelector('#statusSaveButton');
    const toast = container.querySelector('#statusToast');
    const newStatusId = Number(container.querySelector('#statusSelect').value);

    button.disabled = true;
    try {
      await apiRequest(`/ticket/${ticketId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ newStatusId })
      });
      showToast(toast, 'detail.statusUpdated', false);
      await loadTicket();
    } catch (error) {
      showToast(toast, 'detail.updateError', true);
    } finally {
      button.disabled = false;
    }
  });

  container.querySelector('#assignSaveButton').addEventListener('click', async () => {
    const button = container.querySelector('#assignSaveButton');
    const toast = container.querySelector('#assignToast');
    const assignedTo = Number(container.querySelector('#assignSelect').value);

    if (!assignedTo) return;

    button.disabled = true;
    try {
      await apiRequest(`/ticket/${ticketId}/assign`, {
        method: 'PUT',
        body: JSON.stringify({ assignedTo })
      });
      showToast(toast, 'detail.assignUpdated', false);
      await loadTicket();
    } catch (error) {
      showToast(toast, 'detail.updateError', true);
    } finally {
      button.disabled = false;
    }
  });

  container.querySelector('#commentSendButton').addEventListener('click', async () => {
    const button = container.querySelector('#commentSendButton');
    const toast = container.querySelector('#commentToast');
    const input = container.querySelector('#commentInput');
    const message = input.value.trim();
    if (!message) return;

    button.disabled = true;
    try {
      await apiRequest(`/ticket/${ticketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          message,
          isInternal: container.querySelector('#commentInternalCheckbox').checked
        })
      });
      input.value = '';
      container.querySelector('#commentInternalCheckbox').checked = false;
      toast.style.display = 'none';
      await loadComments();
    } catch (error) {
      showToast(toast, 'detail.updateError', true);
    } finally {
      button.disabled = false;
    }
  });

  container.querySelector('#attachmentUploadButton').addEventListener('click', async () => {
    const button = container.querySelector('#attachmentUploadButton');
    const toast = container.querySelector('#attachmentToast');
    const fileInput = container.querySelector('#attachmentInput');
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    button.disabled = true;
    button.textContent = t('attachments.uploading');
    try {
      await apiRequest(`/ticket/${ticketId}/attachments`, {
        method: 'POST',
        body: formData
      });
      fileInput.value = '';
      toast.style.display = 'none';
      await loadAttachments();
    } catch (error) {
      showToast(toast, 'attachments.error', true);
    } finally {
      button.disabled = false;
      button.textContent = t('attachments.upload');
    }
  });

  loadTicket();
  loadComments();
  loadAttachments();
}
