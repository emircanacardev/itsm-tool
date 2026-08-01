function getTheme() {
  return localStorage.getItem('theme') || 'light';
}

function setTheme(theme) {
  localStorage.setItem('theme', theme);
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', getTheme());
  const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
  toggleButtons.forEach((button) => {
    button.setAttribute('aria-pressed', getTheme() === 'dark');
  });
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}
