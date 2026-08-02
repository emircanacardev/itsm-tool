// window.confirm() tamamen tarayıcıya ait bir popup - adres çubuğunu
// gösteriyor ("127.0.0.1:5500 says..."), markanın rengine/fontuna hiç uymuyor
// ve stillenemiyor (tıpkı native <select>/<input type="date"> gibi, bkz.
// customSelect.js/customDatePicker.js'teki aynı gerekçe). Bunun yerine kendi
// tasarım sistemimize uyan bir overlay + kart kullanıyoruz; tüm onay
// gerektiren admin aksiyonları (aktif/pasif etme, silme, yetki kaldırma) bu
// tek modülü paylaşıyor.

let activeOverlay = null;

const WARNING_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
const QUESTION_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>';

// message: gösterilecek soru metni (çağıran taraf zaten t() ile çeviriyor).
// options.danger: true ise kırmızı/uyarı ikonlu, geri alınamaz aksiyon görünümü
// (silme, yetki kaldırma vb.); false ise nötr mor onay görünümü (aktif etme vb.).
// options.confirmText/cancelText verilmezse admin.confirmOk / admin.cancel kullanılır.
// Dönüş: kullanıcı onayladıysa true, iptal ettiyse veya dışarı tıklayıp/Esc'e
// bastıysa false çözülen bir Promise.
export function showConfirmDialog(message, options = {}) {
  const { danger = false, confirmText, cancelText } = options;

  return new Promise((resolve) => {
    if (activeOverlay) {
      activeOverlay.remove();
      activeOverlay = null;
    }

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    activeOverlay = overlay;

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';

    const icon = document.createElement('div');
    icon.className = `confirm-dialog-icon${danger ? ' is-danger' : ''}`;
    icon.innerHTML = danger ? WARNING_ICON : QUESTION_ICON;

    const messageEl = document.createElement('p');
    messageEl.className = 'confirm-dialog-message';
    messageEl.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'confirm-dialog-actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn-secondary';
    cancelButton.textContent = cancelText || t('admin.cancel');

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = `btn-primary${danger ? ' btn-danger' : ''}`;
    confirmButton.textContent = confirmText || t('admin.confirmOk');

    function finish(result) {
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      if (activeOverlay === overlay) activeOverlay = null;
      resolve(result);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') finish(false);
      if (event.key === 'Enter') finish(true);
    }

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(false);
    });
    cancelButton.addEventListener('click', () => finish(false));
    confirmButton.addEventListener('click', () => finish(true));
    document.addEventListener('keydown', onKeydown);

    actions.append(cancelButton, confirmButton);
    dialog.append(icon, messageEl, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    confirmButton.focus();
  });
}
