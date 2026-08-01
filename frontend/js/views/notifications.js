function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString(getLanguage() === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export function render(container) {
  container.innerHTML = `
    <div class="notification-list" id="notificationList">
      <div class="state-box"><span>${t('notifications.loading')}</span></div>
    </div>
  `;

  const listEl = container.querySelector('#notificationList');

  function renderNotifications(notifications) {
    if (notifications.length === 0) {
      listEl.innerHTML = `
        <div class="state-box">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>${t('notifications.empty')}</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = '';
    notifications
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach((notification) => {
        const item = document.createElement('div');
        item.className = `notification-item${notification.isRead ? '' : ' notification-unread'}`;

        const body = document.createElement('div');
        body.className = 'notification-body';
        body.innerHTML = `
          <span class="notification-message">${notification.message}</span>
          <span class="notification-meta">${formatDateTime(notification.createdAt)}</span>
        `;
        item.appendChild(body);

        if (notification.ticketId) {
          item.style.cursor = 'pointer';
          item.addEventListener('click', async () => {
            if (!notification.isRead) {
              try {
                await apiRequest(`/notification/${notification.id}/read`, { method: 'PUT' });
              } catch (error) {
                // Okundu işaretlenemese bile yönlendirmeyi engelleme.
              }
            }
            window.location.hash = `#/tickets/${notification.ticketId}`;
          });
        } else if (!notification.isRead) {
          const markReadButton = document.createElement('button');
          markReadButton.className = 'btn-secondary';
          markReadButton.textContent = t('notifications.markRead');
          markReadButton.addEventListener('click', async () => {
            await apiRequest(`/notification/${notification.id}/read`, { method: 'PUT' });
            loadNotifications();
          });
          item.appendChild(markReadButton);
        }

        listEl.appendChild(item);
      });
  }

  async function loadNotifications() {
    try {
      const notifications = await apiRequest('/notification');
      renderNotifications(notifications);
    } catch (error) {
      listEl.innerHTML = `<div class="state-box"><span>${t('notifications.error')}</span></div>`;
    }
  }

  loadNotifications();
}
