export function render(container) {
  container.innerHTML = `
    <div class="login-page">
      <div class="brand-panel">
        <div class="brand-lockup">
          <div class="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 12H6L9 5L14 19L17 12H22" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="brand-name">PULSE</span>
        </div>
        <h2 class="slogan-title" data-i18n="login.sloganTitle"></h2>
        <p class="slogan-body" data-i18n="login.sloganBody"></p>
      </div>

      <div class="form-panel">
        <div class="login-card">
          <h1 class="login-title" data-i18n="register.title"></h1>
          <p class="login-subtitle" data-i18n="register.subtitle"></p>

          <div class="error-message" id="errorMessage"></div>

          <form id="registerForm">
            <div class="form-group">
              <label for="fullName" data-i18n="register.fullName"></label>
              <input type="text" id="fullName" required autocomplete="name">
            </div>
            <div class="form-group">
              <label for="email" data-i18n="register.email"></label>
              <input type="email" id="email" required autocomplete="username">
            </div>
            <div class="form-group">
              <label for="password" data-i18n="register.password"></label>
              <input type="password" id="password" required autocomplete="new-password" minlength="8">
            </div>
            <button type="submit" id="submitButton" data-i18n="register.submit"></button>
          </form>

          <p class="form-footer">
            <span data-i18n="register.loginPrompt"></span>
            <a href="#/login" data-i18n="register.loginLink"></a>
          </p>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#registerForm');
  const errorMessage = container.querySelector('#errorMessage');
  const submitButton = container.querySelector('#submitButton');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    errorMessage.style.display = 'none';
    submitButton.disabled = true;
    submitButton.textContent = t('register.submitting');

    const fullName = container.querySelector('#fullName').value;
    const email = container.querySelector('#email').value;
    const password = container.querySelector('#password').value;

    try {
      await register(fullName, email, password);
      window.location.hash = '#/tickets';
    } catch (error) {
      errorMessage.textContent = error.message === 'E-posta zaten kayıtlı'
        ? t('register.errorEmailTaken')
        : t('register.error');
      errorMessage.style.display = 'block';
      submitButton.disabled = false;
      submitButton.textContent = t('register.submit');
    }
  });
}
