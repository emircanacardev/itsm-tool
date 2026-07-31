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

function logout() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

function isAuthenticated() {
  return localStorage.getItem('token') !== null;
}
