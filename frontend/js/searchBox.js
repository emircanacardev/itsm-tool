/* Arama kutusuna temizleme (×) düğmesi ekler.
 *
 * Neden gerekti: arama kutuları canlı filtreliyor ama yazılanı geri almanın
 * tek yolu tuş tuş silmekti. Kullanıcı aramayı iptal edip tam listeye
 * dönmek istediğinde bunu yapacak görünür bir şey yoktu.
 *
 * Düğme yalnızca kutuda metin varken görünüyor; boşken yer kaplamıyor.
 *
 * Kullanım:
 *   enhanceSearchBox(searchInput, () => resetPageAndLoad());
 */

const CLEAR_CLASS = 'search-clear';

/**
 * @param {HTMLInputElement} input Arama kutusu.
 * @param {() => void} onClear Temizlendikten sonra çağrılır (listeyi yenilemek için).
 */
export function enhanceSearchBox(input, onClear) {
  if (!input) return;

  const box = input.closest('.search-box');
  // Kutu beklenen sarmalayıcı içinde değilse hiçbir şey yapmıyoruz:
  // düğmenin konumu .search-box'ın position:relative'ine bağlı.
  if (!box || box.querySelector(`.${CLEAR_CLASS}`)) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = CLEAR_CLASS;
  // Görsel olarak yalnızca bir çarpı; ekran okuyucu için adı olmalı.
  button.setAttribute('aria-label', t('common.searchClear'));
  button.title = t('common.searchClear');
  button.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  `;

  function sync() {
    box.classList.toggle('has-value', input.value.length > 0);
  }

  button.addEventListener('click', () => {
    input.value = '';
    sync();
    // Odak kutuda kalsın: kullanıcı temizleyip hemen yeni bir şey yazabilsin.
    input.focus();
    onClear?.();
  });

  input.addEventListener('input', sync);
  box.appendChild(button);
  sync();
}
