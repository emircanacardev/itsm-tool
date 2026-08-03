// Hata ayrımı, çevrilebilir metin yerine sabit bir kodla yapılıyor:
// mesajın kendisi dile göre değişebilir, kod değişmez.
const AUTH_ERROR_EMAIL_TAKEN = 'EMAIL_TAKEN';

async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': getLanguage()
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  localStorage.setItem('token', data.token);
}

async function register(fullName, email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': getLanguage()
    },
    body: JSON.stringify({ fullName, email, password })
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error(AUTH_ERROR_EMAIL_TAKEN);
    }
    throw new Error(`Registration failed: ${response.status}`);
  }

  const data = await response.json();
  localStorage.setItem('token', data.token);
}

function logout() {
  localStorage.removeItem('token');
  window.location.hash = '#/login';
}

function isAuthenticated() {
  return localStorage.getItem('token') !== null;
}
