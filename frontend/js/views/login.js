export function render(container) {
  container.innerHTML = `
    <div class="login-page">
      <div class="brand-panel">
        <div class="brand-lockup">
          <div class="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path class="brand-ekg" d="M3 12.2h3.4l2.2-5 3.2 9.6 2.2-4.6H21" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="brand-name">PULSE</span>
        </div>
        <h2 class="slogan-title" data-i18n="login.sloganTitle"></h2>
        <p class="slogan-body" data-i18n="login.sloganBody"></p>
      </div>

      <div class="form-panel">
        <div class="login-card">
          <h1 class="login-title" data-i18n="login.title"></h1>
          <p class="login-subtitle" data-i18n="login.subtitle"></p>

          <div class="error-message" id="errorMessage"></div>

          <form id="loginForm">
            <div class="form-group">
              <label for="email" data-i18n="login.email"></label>
              <input type="email" id="email" required autocomplete="username">
            </div>
            <div class="form-group">
              <label for="password" data-i18n="login.password"></label>
              <input type="password" id="password" required autocomplete="current-password">
            </div>
            <button type="submit" id="submitButton" data-i18n="login.submit"></button>
          </form>

          <p class="form-footer">
            <span data-i18n="login.registerPrompt"></span>
            <a href="#/register" data-i18n="login.registerLink"></a>
          </p>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#loginForm');
  const errorMessage = container.querySelector('#errorMessage');
  const submitButton = container.querySelector('#submitButton');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    errorMessage.style.display = 'none';
    submitButton.disabled = true;
    submitButton.textContent = t('login.submitting');

    const email = container.querySelector('#email').value;
    const password = container.querySelector('#password').value;

    try {
      await login(email, password);
      window.location.hash = '#/tickets';
    } catch (error) {
      errorMessage.textContent = t('login.error');
      errorMessage.style.display = 'block';
      submitButton.disabled = false;
      submitButton.textContent = t('login.submit');
    }
  });
}
