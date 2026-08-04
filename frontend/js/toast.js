/* Uygulama geneli bildirim şeridi (toast).
 *
 * Neden gerekti: talep detayında durum/atama kaydedildiğinde mesaj,
 * ilgili kartın altındaki bir <div class="toast"> içinde gösteriliyordu.
 * Kart sayfanın aşağısında kaldığı için mesaj çoğu zaman ekranın dışında
 * kalıyor, üstelik hiç kaybolmuyordu; kullanıcı "kaydedildi mi?" diye
 * emin olamıyordu.
 *
 * Buradaki şerit sayfanın sağ üstüne sabitleniyor, kendiliğinden
 * kayboluyor ve ekran okuyuculara da duyuruluyor.
 */

const CONTAINER_ID = 'toastContainer';
const DEFAULT_DURATION = 3200;

function getContainer() {
  let container = document.getElementById(CONTAINER_ID);
  if (container) return container;

  container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.className = 'toast-stack';
  // Ekran okuyucu, mesajı odak çalmadan okusun: polite + status.
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);
  return container;
}

/**
 * Bir bildirim gösterir.
 *
 * @param {string} message Gösterilecek metin (çevrilmiş olarak gelmeli).
 * @param {'success'|'error'|'warning'} [variant='success']
 * @param {number} [duration] Milisaniye; verilmezse varsayılan süre.
 */
export function showToast(message, variant = 'success', duration = DEFAULT_DURATION) {
  if (!message) return;

  const container = getContainer();

  const item = document.createElement('div');
  item.className = `toast-item toast-${variant}`;
  // Kullanıcı verisi içerebilir (ör. dosya adı): textContent ile basılıyor.
  item.textContent = message;

  container.appendChild(item);

  // Bir sonraki karede sınıf eklenince CSS geçişi (giriş animasyonu) çalışıyor;
  // aynı karede eklenirse tarayıcı başlangıç durumunu hiç görmüyor.
  requestAnimationFrame(() => item.classList.add('is-visible'));

  let removed = false;
  function remove() {
    if (removed) return;
    removed = true;
    item.classList.remove('is-visible');
    // Çıkış animasyonu bitince DOM'dan al. transitionend gelmezse diye
    // süreli yedek de var, yoksa öğe sonsuza kadar DOM'da kalabiliyor.
    const drop = () => item.remove();
    item.addEventListener('transitionend', drop, { once: true });
    setTimeout(drop, 400);
  }

  // Tıklayınca hemen kapansın: kullanıcı beklemek zorunda kalmasın.
  item.addEventListener('click', remove);
  setTimeout(remove, duration);
}
