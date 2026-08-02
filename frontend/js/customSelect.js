// Native <select> tarayıcıdan tarayıcıya çok farklı ve çoğu zaman çirkin
// görünüyor, açılan seçenek listesi CSS ile stillendirilemiyor (bu tarayıcı
// kısıtı, CSS ile aşılamaz). Bu modül native select'i DOM'da (ve mantığı
// çalışır durumda) tutup üstüne kendi temamıza uyan bir görsel katman
// (tetikleyici buton + özel liste) ekliyor. Var olan .value okuma/yazma ve
// 'change' event dinleyicileri hiç değişmeden çalışmaya devam eder.

const OPEN_CLASS = 'is-open';

function closeMenu(wrapper) {
  wrapper.classList.remove(OPEN_CLASS);
}

function openMenu(wrapper) {
  document.querySelectorAll(`.custom-select.${OPEN_CLASS}`).forEach((el) => {
    if (el !== wrapper) closeMenu(el);
  });
  wrapper.classList.add(OPEN_CLASS);
}

function buildMenu(wrapper, nativeSelect) {
  const menu = wrapper.querySelector('.custom-select-menu');
  menu.innerHTML = '';

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
export function enhanceSelect(nativeSelect) {
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
