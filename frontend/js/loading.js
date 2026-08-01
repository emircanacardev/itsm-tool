// Pulse'ın marka kimliğindeki EKG çizgisi (login/register/sidebar logosuyla
// aynı path) - uygulama genelinde tek bir "nabız" yükleme animasyonu olsun
// diye tüm yükleniyor durumları bu bileşeni kullanıyor.
export function pulseLoader(label) {
  return `
    <div class="pulse-loader">
      <svg class="pulse-loader-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 12H6L9 5L14 19L17 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
      ${label ? `<span class="pulse-loader-label">${label}</span>` : ''}
    </div>
  `;
}
