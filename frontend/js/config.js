// Backend adresi tek yerden yönetiliyor: lokalde çalışırken localhost'a,
// deploy edilmiş ortamda yayındaki API'ye gidiyor. Yeni bir ortam eklerken
// yalnızca bu dosyayı güncellemek yeterli.
const API_BASE_URL = (() => {
  const host = window.location.hostname;

  if (host === 'localhost' || host === '127.0.0.1') {
    return 'https://localhost:7047/api';
  }

  // Deploy sonrası Render'ın verdiği adresle değiştir.
  return 'https://itsm-api.onrender.com/api';
})();
