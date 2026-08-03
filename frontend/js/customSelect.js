// Native <select> tarayıcıdan tarayıcıya çok farklı ve çoğu zaman çirkin
// görünüyor, açılan seçenek listesi CSS ile stillendirilemiyor (bu tarayıcı
// kısıtı, CSS ile aşılamaz). Bu modül native select'i DOM'da (ve mantığı
// çalışır durumda) tutup üstüne kendi temamıza uyan bir görsel katman
// (tetikleyici buton + özel liste) ekliyor. Var olan .value okuma/yazma ve
// 'change' event dinleyicileri hiç değişmeden çalışmaya devam eder.

const OPEN_CLASS = 'is-open';

// Aramada Türkçe karakter farkı sorun çıkarmasın: "İK" yazarken "ik" de,
// "Cagri" yazarken "Çağrı" da eşleşsin. Aksan ayrıştırıp (NFD) birleşik
// işaretleri atıyoruz; İ/ı ise Unicode'da ayrı harf olduğu için elle
// eşleniyor.
function normalizeForSearch(text) {
  return text
    .replace(/[İI]/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function closeMenu(wrapper) {
  wrapper.classList.remove(OPEN_CLASS);
  const search = wrapper.querySelector('.custom-select-search input');
  if (search) {
    search.value = '';
    filterMenu(wrapper, '');
  }
}

function openMenu(wrapper) {
  document.querySelectorAll(`.custom-select.${OPEN_CLASS}`).forEach((el) => {
    if (el !== wrapper) closeMenu(el);
  });
  wrapper.classList.add(OPEN_CLASS);
  // Açılır açılmaz yazmaya başlanabilsin.
  wrapper.querySelector('.custom-select-search input')?.focus();
}

// Arama kutusuna yazılanı seçeneklere uygular. Hiçbiri eşleşmezse
// listenin sessizce boş kalmaması için bir bilgi satırı gösteriliyor.
function filterMenu(wrapper, term) {
  const needle = normalizeForSearch(term.trim());
  let visible = 0;

  wrapper.querySelectorAll('.custom-select-option').forEach((item) => {
    const match = !needle || normalizeForSearch(item.textContent).includes(needle);
    item.style.display = match ? '' : 'none';
    if (match) visible += 1;
  });

  const empty = wrapper.querySelector('.custom-select-empty');
  if (empty) {
    empty.style.display = visible === 0 ? '' : 'none';
  }
}

function buildMenu(wrapper, nativeSelect) {
  const menu = wrapper.querySelector('.custom-select-menu');
  const search = menu.querySelector('.custom-select-search');
  menu.innerHTML = '';
  // Arama kutusu seçenekler yenilenirken kaybolmasın.
  if (search) {
    menu.appendChild(search);
  }

  Array.from(nativeSelect.options).forEach((option) => {
    const item = document.createElement('div');
    item.className = 'custom-select-option';
    item.textContent = option.textContent;
    item.dataset.value = option.value;
    if (option.value === nativeSelect.value) {
      item.classList.add('is-selected');
    }
    item.addEventListener('click', () => {
      if (nativeSelect.value !== option.value) {
        nativeSelect.value = option.value;
        nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      closeMenu(wrapper);
    });
    menu.appendChild(item);
  });

  if (search) {
    const empty = document.createElement('div');
    empty.className = 'custom-select-empty';
    empty.textContent = search.dataset.emptyText || '';
    empty.style.display = 'none';
    menu.appendChild(empty);
  }
}

function syncTrigger(wrapper, nativeSelect) {
  const label = wrapper.querySelector('.custom-select-label');
  const selectedOption = nativeSelect.options[nativeSelect.selectedIndex];
  label.textContent = selectedOption ? selectedOption.textContent : '';
  wrapper.classList.toggle('is-disabled', nativeSelect.disabled);
  wrapper.querySelectorAll('.custom-select-option').forEach((item) => {
    item.classList.toggle('is-selected', item.dataset.value === nativeSelect.value);
  });
}

// Bir select'i özel görünüme kavuşturur. Seçenekleri sonradan API'den
// dolduran (filtreler, atanabilir kullanıcılar, proje/kategori vb.)
// select'ler için: seçenekleri her güncellediğinde bu fonksiyonu tekrar
// çağırmak yeterli - zaten sarmalanmışsa sadece menüyü/etiketi tazeler.
//
// options.searchable: listenin başına bir arama kutusu koyar. Seçenek sayısı
// kullanıcı sayısı/proje sayısı kadar büyüyebilen listelerde (yüzlerce kayıt)
// tek tek aramak yerine yazarak süzmek gerekiyor. options.searchPlaceholder
// ve options.emptyText çağıran taraftan çevrilmiş metin olarak gelir.
// Aranabilir açılır listelerin ortak ayarı. Metinler her çağrıda t() ile
// okunuyor çünkü dil değişince view yeniden render ediliyor. Üç ekranda
// (bilgi bankası, talep filtresi, SLA tanımları) aynı iki anahtar
// kullanıldığı için tek yerde duruyor - kopyalanınca metinler zamanla
// birbirinden ayrışıyordu.
export function searchableSelectOptions() {
  return {
    searchable: true,
    searchPlaceholder: t('common.selectSearchPlaceholder'),
    emptyText: t('common.selectSearchEmpty')
  };
}

export function enhanceSelect(nativeSelect, options = {}) {
  const { searchable = false, searchPlaceholder = '', emptyText = '' } = options;
  let wrapper = nativeSelect.nextElementSibling;

  if (!(wrapper && wrapper.classList.contains('custom-select') && wrapper.dataset.for === nativeSelect.id)) {
    wrapper = document.createElement('div');
    wrapper.className = 'custom-select';
    wrapper.dataset.for = nativeSelect.id || '';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.innerHTML = `
      <span class="custom-select-label"></span>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
    `;

    const menu = document.createElement('div');
    menu.className = 'custom-select-menu';

    if (searchable) {
      const searchBox = document.createElement('div');
      searchBox.className = 'custom-select-search';
      searchBox.dataset.emptyText = emptyText;

      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = searchPlaceholder;
      // Menü açıkken tıklama dışarı sızıp menüyü kapatmasın.
      searchInput.addEventListener('click', (event) => event.stopPropagation());
      searchInput.addEventListener('input', () => filterMenu(wrapper, searchInput.value));
      searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeMenu(wrapper);
        }
        // Enter: görünen tek seçenek varsa doğrudan onu seç.
        if (event.key === 'Enter') {
          event.preventDefault();
          const shown = [...wrapper.querySelectorAll('.custom-select-option')]
            .filter((el) => el.style.display !== 'none');
          if (shown.length === 1) shown[0].click();
        }
      });

      searchBox.appendChild(searchInput);
      menu.appendChild(searchBox);
    }

    wrapper.append(trigger, menu);
    nativeSelect.classList.add('sr-only-native');
    nativeSelect.tabIndex = -1;
    nativeSelect.insertAdjacentElement('afterend', wrapper);

    trigger.addEventListener('click', () => {
      if (nativeSelect.disabled) return;
      wrapper.classList.contains(OPEN_CLASS) ? closeMenu(wrapper) : openMenu(wrapper);
    });

    nativeSelect.addEventListener('change', () => syncTrigger(wrapper, nativeSelect));
  }

  buildMenu(wrapper, nativeSelect);
  syncTrigger(wrapper, nativeSelect);
}

document.addEventListener('click', (event) => {
  document.querySelectorAll(`.custom-select.${OPEN_CLASS}`).forEach((wrapper) => {
    if (!wrapper.contains(event.target) && wrapper.previousElementSibling !== event.target) {
      closeMenu(wrapper);
    }
  });
});
