async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error('Giriş başarısız');
  }

  const data = await response.json();
  localStorage.setItem('token', data.token);
}

async function register(fullName, email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password })
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('E-posta zaten kayıtlı');
    }
    throw new Error('Kayıt başarısız');
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
