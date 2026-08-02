// Native <input type="date">'in açılan takvim popup'ı tarayıcı/OS tarafından
// çiziliyor ve customSelect.js'teki native <select> kısıtının aynısıyla CSS
// ile stillenemiyor. Bu modül native input'u DOM'da işlevsel tutup (value
// okuma/yazma, 'change' event hiç değişmeden çalışır) üstüne kendi temamıza
// uyan bir tetikleyici + ay/gün takvimi ekliyor.

const OPEN_CLASS = 'is-open';
const WEEKDAY_LABELS = {
  tr: ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function toValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseValue(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplay(date) {
  return date.toLocaleDateString(getLanguage() === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function closeCalendar(wrapper) {
  wrapper.classList.remove(OPEN_CLASS);
}

function openCalendar(wrapper) {
  document.querySelectorAll(`.custom-date.${OPEN_CLASS}`).forEach((el) => {
    if (el !== wrapper) closeCalendar(el);
  });
  wrapper.classList.add(OPEN_CLASS);
}

function buildCalendarBody(wrapper, nativeInput, viewDate) {
  const grid = wrapper.querySelector('.custom-date-grid');
  const monthLabel = wrapper.querySelector('.custom-date-month-label');
  grid.innerHTML = '';

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  monthLabel.textContent = viewDate.toLocaleDateString(getLanguage() === 'tr' ? 'tr-TR' : 'en-US', {
    month: 'long', year: 'numeric'
  });

  const weekdayLabels = WEEKDAY_LABELS[getLanguage()] || WEEKDAY_LABELS.en;
  weekdayLabels.forEach((label) => {
    const cell = document.createElement('span');
    cell.className = 'custom-date-weekday';
    cell.textContent = label;
    grid.appendChild(cell);
  });

  const firstOfMonth = new Date(year, month, 1);
  // JS'de getDay(): 0=Pazar..6=Cumartesi. Takvimi Pazartesi'den başlatmak için kaydırıyoruz.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedValue = nativeInput.value;
  const todayValue = toValue(new Date());

  for (let i = 0; i < leadingBlanks; i++) {
    grid.appendChild(document.createElement('span'));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cellValue = `${year}-${pad(month + 1)}-${pad(day)}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'custom-date-day';
    button.textContent = String(day);
    if (cellValue === selectedValue) button.classList.add('is-selected');
    if (cellValue === todayValue) button.classList.add('is-today');
    button.addEventListener('click', () => {
      nativeInput.value = cellValue;
      nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
      closeCalendar(wrapper);
    });
    grid.appendChild(button);
  }
}

function syncTrigger(wrapper, nativeInput) {
  const label = wrapper.querySelector('.custom-date-label');
  const date = parseValue(nativeInput.value);
  label.textContent = date ? formatDisplay(date) : t('common.selectDate');
  label.classList.toggle('is-placeholder', !date);
}

// Bir tarih input'unu özel takvim görünümüne kavuşturur. Zaten sarmalanmışsa
// (customSelect.js'teki gibi) sadece etiketi/takvimi tazeler - filtre
// temizleme gibi native value'yu programatik değiştiren akışlardan sonra
// tekrar çağırmak yeterli.
export function enhanceDateInput(nativeInput) {
  let wrapper = nativeInput.nextElementSibling;

  if (!(wrapper && wrapper.classList.contains('custom-date') && wrapper.dataset.for === nativeInput.id)) {
    wrapper = document.createElement('div');
    wrapper.className = 'custom-date';
    wrapper.dataset.for = nativeInput.id || '';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-date-trigger';
    trigger.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
      <span class="custom-date-label"></span>
    `;

    const panel = document.createElement('div');
    panel.className = 'custom-date-panel';
    panel.innerHTML = `
      <div class="custom-date-header">
        <button type="button" class="custom-date-nav" data-dir="-1">‹</button>
        <span class="custom-date-month-label"></span>
        <button type="button" class="custom-date-nav" data-dir="1">›</button>
      </div>
      <div class="custom-date-grid"></div>
    `;

    wrapper.append(trigger, panel);
    nativeInput.classList.add('sr-only-native');
    nativeInput.tabIndex = -1;
    nativeInput.insertAdjacentElement('afterend', wrapper);

    let viewDate = parseValue(nativeInput.value) || new Date();

    trigger.addEventListener('click', () => {
      if (wrapper.classList.contains(OPEN_CLASS)) {
        closeCalendar(wrapper);
        return;
      }
      viewDate = parseValue(nativeInput.value) || new Date();
      buildCalendarBody(wrapper, nativeInput, viewDate);
      openCalendar(wrapper);
    });

    panel.querySelectorAll('.custom-date-nav').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const direction = Number(button.dataset.dir);
        viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + direction, 1);
        buildCalendarBody(wrapper, nativeInput, viewDate);
      });
    });

    panel.addEventListener('click', (event) => event.stopPropagation());

    nativeInput.addEventListener('change', () => syncTrigger(wrapper, nativeInput));
  }

  syncTrigger(wrapper, nativeInput);
}

document.addEventListener('click', (event) => {
  document.querySelectorAll(`.custom-date.${OPEN_CLASS}`).forEach((wrapper) => {
    if (!wrapper.contains(event.target) && wrapper.previousElementSibling !== event.target) {
      closeCalendar(wrapper);
    }
  });
});
