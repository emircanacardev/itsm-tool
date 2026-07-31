const translations = {
  tr: {
    'login.sloganTitle': 'Her talebin nabzı, tek ekranda.',
    'login.sloganBody': 'Pulse, ekibinizin taleplerini, önceliklerini ve SLA’larını gerçek zamanlı bir ritimle senkronize eder — hiçbir şey gözden kaçmaz.',
    'login.title': 'Giriş yap',
    'login.subtitle': 'Devam etmek için hesap bilgilerini gir',
    'login.email': 'E-posta',
    'login.password': 'Şifre',
    'login.submit': 'Giriş yap',
    'login.submitting': 'Giriş yapılıyor...',
    'login.error': 'E-posta veya şifre hatalı.'
  },
  en: {
    'login.sloganTitle': 'The pulse of every request, on one screen.',
    'login.sloganBody': 'Pulse syncs your team’s requests, priorities, and SLAs to one real-time rhythm — nothing slips through.',
    'login.title': 'Sign in',
    'login.subtitle': 'Enter your details to continue',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.submit': 'Sign in',
    'login.submitting': 'Signing in...',
    'login.error': 'Invalid email or password.'
  }
};

function getLanguage() {
  return localStorage.getItem('lang') || 'tr';
}

function setLanguage(lang) {
  localStorage.setItem('lang', lang);
  applyTranslations();
}

function t(key) {
  const lang = getLanguage();
  return translations[lang]?.[key] || translations.tr[key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.getAttribute('data-i18n'));
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.setAttribute('placeholder', t(element.getAttribute('data-i18n-placeholder')));
  });

  document.documentElement.lang = getLanguage();
}

document.addEventListener('DOMContentLoaded', applyTranslations);
