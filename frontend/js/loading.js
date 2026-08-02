// Pulse'ın marka kimliğindeki EKG çizgisi (logodaki nabız path'inin aynısı;
// logonun halkası ve canlı noktası burada yok, çünkü nabız animasyonu sadece
// çizginin kendisine uygulanıyor) - uygulama genelinde tek bir "nabız" yükleme
// animasyonu olsun diye tüm yükleniyor durumları bu bileşeni kullanıyor.
export function pulseLoader(label) {
  return `
    <div class="pulse-loader">
      <svg class="pulse-loader-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12.2h3.4l2.2-5 3.2 9.6 2.2-4.6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
      ${label ? `<span class="pulse-loader-label">${label}</span>` : ''}
    </div>
  `;
}
