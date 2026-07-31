const API_BASE_URL = 'https://localhost:7047/api';

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    }
    throw new Error(`API isteği başarısız: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
