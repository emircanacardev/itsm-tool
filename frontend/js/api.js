const API_BASE_URL = 'https://localhost:7047/api';

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');
  const isFormData = options.body instanceof FormData;

  const headers = {
    // FormData ile dosya yüklerken Content-Type'ı biz set etmemeliyiz;
    // tarayıcı, multipart boundary'sini kendisi ekliyor.
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    // Backend yanıtı bu başlığa göre çeviriyor: durum/öncelik adları,
    // bildirim metinleri ve hata mesajları seçili dilde dönüyor.
    'Accept-Language': getLanguage(),
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
      window.location.hash = '#/login';
    }
    throw new Error(`API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
