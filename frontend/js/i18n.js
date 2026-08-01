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
    'login.error': 'E-posta veya şifre hatalı.',
    'login.registerPrompt': 'Hesabın yok mu?',
    'login.registerLink': 'Kayıt ol',
    'register.title': 'Hesap oluştur',
    'register.subtitle': 'Pulse\'a katılmak için bilgilerini gir',
    'register.fullName': 'Ad Soyad',
    'register.email': 'E-posta',
    'register.password': 'Şifre',
    'register.submit': 'Kayıt ol',
    'register.submitting': 'Kayıt olunuyor...',
    'register.error': 'Kayıt başarısız. Lütfen bilgilerini kontrol et.',
    'register.errorEmailTaken': 'Bu e-posta adresi zaten kayıtlı.',
    'register.loginPrompt': 'Zaten hesabın var mı?',
    'register.loginLink': 'Giriş yap'
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
    'login.error': 'Invalid email or password.',
    'login.registerPrompt': "Don't have an account?",
    'login.registerLink': 'Sign up',
    'register.title': 'Create account',
    'register.subtitle': 'Enter your details to join Pulse',
    'register.fullName': 'Full name',
    'register.email': 'Email',
    'register.password': 'Password',
    'register.submit': 'Sign up',
    'register.submitting': 'Signing up...',
    'register.error': 'Registration failed. Please check your details.',
    'register.errorEmailTaken': 'This email is already registered.',
    'register.loginPrompt': 'Already have an account?',
    'register.loginLink': 'Sign in'
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
