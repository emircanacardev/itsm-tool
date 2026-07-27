# 10 Günlük Geliştirme Planı

**Kural: hiçbir madde eksiltilmiyor.** Brief'teki (bkz. `proje-gereksinimleri.md`) zorunlu
gereksinimlerin ve bonus özelliklerin **tamamı** bu planda bir güne yerleştirilmiştir — 10 gün az
görünse de kapsam küçültülmez, 10 güne bölünür (günde ~12 saat çalışma temposu ile). Gün 1
(23.07) tamamlandı, **9 gün kaldı**. Hafta sonları da çalışma günü sayılır (ardışık takvim günü).

Her gün sonunda bu dosyadaki durumlar (✅ bitti / 🔄 devam ediyor / ⬜ bekliyor) güncellenir.

## Takvim (23.07.2026 Perşembe → 01.08.2026 Cumartesi, ardışık, hafta sonu dahil)

| Gün | Tarih | Konu |
|---|---|---|
| 1 | 23.07 Per | ✅ Yetkilendirme (Permission) sistemi (tamamlandı) |
| 2 | 24.07 Cum (bugün) | Proje / Kategori / Grup yönetimi + Priority seed |
| 3 | 25.07 Cmt | Ticket görünürlük filtresi + Yorum/Mesajlaşma + Dosya ekleme |
| 4 | 26.07 Paz | Bilgi bankası (Knowledge Base) + Arama & Filtreleme |
| 5 | 27.07 Pzt | SLA takibi + SLA ihlal uyarıları + Bildirim + E-posta entegrasyonu |
| 6 | 28.07 Sal | Admin panel backend + Dashboard/Raporlama + Audit Log + Otomatik atama + SonarQube ilk tarama |
| 7 | 29.07 Çar | Frontend: Auth + Ticket listesi/detay |
| 8 | 30.07 Per | Frontend: Ticket oluşturma/güncelleme/atama + Yorum & dosya UI |
| 9 | 31.07 Cum | Frontend: Admin panel + Grafiksel dashboard + Bilgi bankası + Bildirim UI |
| 10 | 01.08 Cmt | Frontend: Arama/filtre + Responsive + Çoklu dil + Test + SonarQube final + README |

## Gün 1 — Yetkilendirme (Permission) Sistemi ✅

- ✅ `PermissionRequirement` (`IAuthorizationRequirement`)
- ✅ `PermissionAuthorizationHandler` (`AuthorizationHandler<PermissionRequirement>`)
- ✅ `PermissionController`, `PermissionService`, `IUserPermissionRepository` + impl
- ✅ 4 policy: `TICKET_CREATE`, `TICKET_ASSIGN`, `TICKET_STATUS_UPDATE`, `ADMIN_MANAGE`
- ✅ `TICKET_CREATE` policy uçtan uca test edildi (401 → 403 → 200)
- ✅ `TICKET_ASSIGN` / `TICKET_STATUS_UPDATE` policy'leri test edildi (403 → 204 doğrulandı)

## Gün 2 — Proje / Kategori / Grup Yönetimi + Priority Seed ⬜
- ✅ `ProjectController` (CRUD) — test edildi, tek proje var şimdilik, en az 5 proje seed'i kalan işlerden sonra Postman ile yapılacak
- ✅ `CategoryController` (CRUD, projeye bağlı) — nested route + test edildi
- ⬜ `GroupController` (admin CRUD) — brief §3.2 "farklı iş birimlerini temsil eden gruplar"
- ✅ `ProjectMember` yönetimi (ekleme/listeleme/çıkarma) — test edildi, Gün 3'teki görünürlük
  filtresinin ön koşulu artık hazır
- ✅ `Priority` seed verisi eklendi (`HasData` migration, Kritik/Yüksek/Orta/Düşük, id 10/20/30/40).
  Eski elle eklenmiş test verisiyle çakışma çıktı (unique constraint), DBeaver'da elle düzeltilip
  migration manuel "uygulandı" olarak işaretlendi — bkz. commit mesajı.
- ⬜ SonarQube: hesap + local kurulum kickoff (tam entegrasyon Gün 6'da, ama erken başlatmak riski
  azaltır)
- ⬜ En az 5 proje seed'i tamamlanmadı — şu an sadece 1 proje var (`YZL`), `ProjectController`
  üzerinden Postman ile 4 tane daha oluşturulacak

## Gün 3 — Ticket + Proje Görünürlük Filtresi + Yorum/Mesajlaşma + Dosya Ekleme ⬜

- ⬜ Görünürlük kuralı: kullanıcı bir ticket'ı görebilir ⟺ (oluşturan O) OR (atanan O) OR (proje
  üyesi O) OR (`ADMIN_MANAGE` yetkisi var). Bkz. `proje-gereksinimleri.md` §7.
- ⬜ `ITicketRepository.GetAllAsync(long userId)` imzası değişecek, `ProjectMembers` join'i eklenecek
- ⬜ `TicketService.GetAllTicketsAsync` ve `TicketController.GetAllTickets` userId taşıyacak
- ⬜ `GetTicketById` için de aynı koruma
- ⬜ **TODO (Gün 2'de flag'lendi):** `ProjectController.GetAllProjects`/`GetProjectById` de aynı
  şekilde korunmalı — normal kullanıcı sadece üyesi olduğu projeleri görmeli, `ADMIN_MANAGE` bypass.
  Aynı `ProjectMember` join mekanizması hem Project hem Ticket için burada birlikte yazılacak. Gün
  2'de bilinçli olarak açık bırakıldı çünkü `ProjectMember` yönetimi henüz yoktu.
- ⬜ Ticket üzerine yorum/mesajlaşma (bonus, brief §5) — `TicketComment` entity + endpoint
- ⬜ Dosya ekleme (bonus, brief §5) — ticket'a ekran görüntüsü/dosya yükleme, `TicketAttachment`
  entity + dosya depolama (yerel disk ya da basit bir blob çözümü)

## Gün 4 — Bilgi Bankası + Arama & Filtreleme ⬜

- ⬜ Bilgi bankası (Knowledge Base) — makale CRUD (başlık, içerik, kategori)
- ⬜ Bilgi bankası arama
- ⬜ Ticket'lar için gelişmiş arama & filtreleme (bonus, brief §5) — durum/öncelik/proje/tarih
  kombinasyonlu sorgu endpoint'i

## Gün 5 — SLA + Bildirim + E-posta ⬜

- ⬜ `Sla` tanımları (proje/kategori/öncelik bazlı süre hedefleri) — iş kuralı (entity zaten var)
- ⬜ SLA ihlal tespiti (`SlaBreach`, bonus, brief §5) — zamanlanmış kontrol (background job / basit
  sorgu)
- ⬜ Bildirim mekanizması (`Notification` entity zaten var) — ticket durum değişince / atanınca
  bildirim üretimi
- ⬜ E-posta entegrasyonu (bonus, brief §5) — talep oluşturma/güncellemede e-posta bildirimi
  (SMTP ya da basit bir servis)

## Gün 6 — Admin Panel Backend + Dashboard + Audit Log + Otomatik Atama + SonarQube ⬜

- ⬜ Admin: kullanıcı/grup/yetki/proje/kategori yönetimi endpoint'lerinin `ADMIN_MANAGE` policy'siyle
  sarmalanması (brief §3.1 zorunlu — "sistemin tüm yönetimi admin panelinden yapılabilmeli")
- ⬜ Dashboard/raporlama endpoint'leri (ticket sayıları, durum dağılımı, SLA uyum oranı)
- ⬜ Audit log (bonus, brief §5) — kim/ne zaman/ne yaptı, genel `AuditLog` tablosu
- ⬜ Otomatik atama kuralları (bonus, brief §5) — kategoriye göre otomatik `AssignedTo` ataması
- ⬜ SonarQube: ilk tam tarama + kritik/blocker bulguların düzeltilmesi

## Gün 7 — Frontend: Auth + Ticket Listesi/Detay ⬜

- ⬜ Login/Register ekranı, JWT saklama, oturum yönetimi
- ⬜ Ticket listesi (görünürlük filtresine uygun) + detay ekranı

## Gün 8 — Frontend: Ticket İşlemleri + Yorum & Dosya UI ⬜

- ⬜ Ticket oluşturma formu
- ⬜ Durum güncelleme, atama ekranı (yetkiye göre gizlenen/gösterilen butonlar)
- ⬜ Yorum/mesajlaşma UI
- ⬜ Dosya ekleme UI

## Gün 9 — Frontend: Admin Panel + Dashboard + Bilgi Bankası + Bildirim ⬜

- ⬜ Admin panel ekranları (kullanıcı/grup/yetki/proje/kategori yönetimi)
- ⬜ Grafiksel dashboard (bonus — basit bir chart kütüphanesi, örn. Chart.js)
- ⬜ Bilgi bankası ekranı
- ⬜ Bildirim listesi/UI

## Gün 10 — Frontend Son + Test + SonarQube Final + README ⬜

- ⬜ Arama/filtreleme UI (bonus)
- ⬜ Responsive tasarım (bonus, brief §5)
- ⬜ Çoklu dil desteği TR/EN (bonus, brief §5)
- ⬜ Unit test kapsamının genişletilmesi (`tests/ITSM.UnitTests` şu an sadece iskelet)
- ⬜ SonarQube final tarama + kalan bulguların temizlenmesi
- ⬜ `/hash-test` gibi geçici endpoint'lerin kaldırılması/güvenlik gözden geçirmesi
- ⬜ README.md yeniden yazılması (brief §6 zorunlu — kurulum + çalıştırma anlatımı)
- ⬜ Genel commit/branch temizliği, `develop` → `master` merge

## Kapsam Denetimi — Brief'teki Her Madde Nerede?

Bu tablo `proje-gereksinimleri.md`'deki her maddenin plandaki karşılığını gösterir; hiçbir satır
"atlandı" olarak işaretli değildir.

| Brief maddesi | Plandaki yeri |
|---|---|
| Admin paneli (zorunlu) | Gün 6 (backend), Gün 9 (frontend) |
| Grup & esnek yetkilendirme (zorunlu) | Gün 1 ✅ (yetki çekirdeği), Gün 2 (Group CRUD) |
| En az 5 proje, bağımsız yönetim (zorunlu) | Gün 2 (Project CRUD + seed), Gün 3 (görünürlük filtresi) |
| Incident / Service Request Management | Ticket vertical slice'ında `TicketType` alanıyla zaten mevcut (Gün 1 öncesi tamamlandı) |
| Talep durumları | Zaten mevcut (`Status` seed) |
| Talep önceliklendirme | Gün 2 (Priority seed kontrolü) |
| Talep atama ve transfer | Zaten mevcut (Gün 1 öncesi tamamlandı) |
| SLA takibi (zorunlu) | Gün 5 |
| Dashboard / Raporlama (zorunlu) | Gün 6 (backend), Gün 9 (frontend) |
| Bildirim mekanizması (zorunlu) | Gün 5 |
| Bilgi bankası (zorunlu) | Gün 4 (backend), Gün 9 (frontend) |
| Git & Bitbucket disiplini | Sürekli, her gün |
| SonarQube (zorunlu) | Gün 2 (kickoff), Gün 6 (ilk tarama), Gün 10 (final) |
| Veritabanı (DBeaver) tasarımı | Zaten mevcut, sürekli güncelleniyor |
| AI kullanım kuralı (her satırı açıklayabilme) | Süreç kuralı — tüm günlerde uygulanıyor |
| E-posta entegrasyonu (bonus) | Gün 5 |
| Dosya ekleme (bonus) | Gün 3 (backend), Gün 8 (frontend) |
| Grafiksel Dashboard (bonus) | Gün 9 |
| Arama & Filtreleme (bonus) | Gün 4 (backend), Gün 10 (frontend) |
| Audit Log (bonus) | Gün 6 |
| Yorum/mesajlaşma (bonus) | Gün 3 (backend), Gün 8 (frontend) |
| Responsive tasarım (bonus) | Gün 10 |
| Otomatik atama kuralları (bonus) | Gün 6 |
| SLA ihlal uyarıları (bonus) | Gün 5 |
| Çoklu dil desteği (bonus) | Gün 10 |
| README (zorunlu) | Gün 10 |
| Staj defteri / düzenli ilerleme anlatımı | Plan dışı, her gün ayrıca tutuluyor |
