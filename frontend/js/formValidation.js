/* Form alanı doğrulaması: hatayı alanın kendi altında gösterir.
 *
 * Neden gerekti: zorunlu alanlar boş bırakıldığında formlar tek bir genel
 * mesaj gösteriyordu ("Proje adı ve kodu zorunlu"). Hangi alanın eksik
 * olduğu alanın kendisinden anlaşılmıyordu; birden fazla alanı olan
 * formlarda kullanıcı tek tek deneyerek buluyordu.
 *
 * Kullanım:
 *   const invalid = validateFields([
 *     { el: nameInput, valid: name.length > 0, messageKey: 'projects.nameRequired' },
 *     { el: codeInput, valid: code.length > 0, messageKey: 'projects.codeRequired' }
 *   ]);
 *   if (invalid) return;
 */

const ERROR_CLASS = 'has-error';
const MESSAGE_CLASS = 'field-error';

/** Bir alandaki hata işaretini ve mesajını kaldırır. */
export function clearFieldError(el) {
  if (!el) return;

  el.classList.remove(ERROR_CLASS);
  el.removeAttribute('aria-invalid');

  // Mesaj, alanın hemen ardındaki kardeş düğümde duruyor.
  const next = el.nextElementSibling;
  if (next && next.classList.contains(MESSAGE_CLASS)) {
    next.remove();
  }
}

/** Alanı hatalı işaretler ve altına mesajı yazar. */
export function setFieldError(el, message) {
  if (!el) return;

  clearFieldError(el);
  el.classList.add(ERROR_CLASS);
  el.setAttribute('aria-invalid', 'true');

  const messageEl = document.createElement('p');
  messageEl.className = MESSAGE_CLASS;
  // Mesaj çeviri sözlüğünden geliyor ama yine de textContent: sözlüğe
  // ileride kullanıcı verisi (ör. alan adı) karışırsa HTML yorumlanmasın.
  messageEl.textContent = message;
  el.insertAdjacentElement('afterend', messageEl);

  // Hata temizlenmesi için kullanıcının tekrar göndermesini beklemiyoruz:
  // alana dokunduğu anda işaret kalkıyor. once:true - her düzeltmede yeni
  // dinleyici eklenmesin.
  const events = el.tagName === 'SELECT' ? ['change'] : ['input', 'change'];
  events.forEach((name) => {
    el.addEventListener(name, () => clearFieldError(el), { once: true });
  });
}

/**
 * Bir grup alanı doğrular.
 *
 * @param {Array<{el: HTMLElement, valid: boolean, messageKey: string}>} fields
 * @returns {boolean} En az bir alan hatalıysa true.
 */
export function validateFields(fields) {
  let firstInvalid = null;

  fields.forEach((field) => {
    if (field.valid) {
      clearFieldError(field.el);
      return;
    }

    setFieldError(field.el, t(field.messageKey));
    if (!firstInvalid) firstInvalid = field.el;
  });

  if (!firstInvalid) return false;

  // İlk hatalı alana odaklan: kullanıcı nereden devam edeceğini arayıp
  // bulmasın. enhanceSelect uygulanmış bir select gizli olduğu için
  // odaklanamıyor; onun yerine görünür tetikleyicisine odaklanıyoruz.
  const focusTarget = firstInvalid.closest('.custom-select')?.querySelector('.custom-select-trigger')
    ?? firstInvalid;
  focusTarget.focus?.();

  return true;
}

/** Formu kapatırken/sıfırlarken tüm hata izlerini siler. */
export function clearFieldErrors(fields) {
  fields.forEach((el) => clearFieldError(el));
}
