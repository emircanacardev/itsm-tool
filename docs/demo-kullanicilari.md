# Demo Kullanıcıları ve Yetkileri

Bu doküman `database/scripts/seed/002_demo_data.sql` ile kurulan demo verisini
anlatır. Sunum sırasında hangi hesapla giriş yapılınca neyin görüneceğini
önceden bilmek için hazırlandı.

**Tüm kullanıcıların şifresi: `12345`**
**Yönetici hesabı: `admin@itsm.local`**

---

## Yetki kataloğu

Kodlar `ITSM.Domain/Constants/Permissions.cs` ile birebir eşleşir.

| Kod | Ne sağlar |
|---|---|
| `TICKET_CREATE` | Yeni talep açma |
| `TICKET_ASSIGN` | Talebi bir kullanıcıya atama |
| `TICKET_STATUS_UPDATE` | Talebin durumunu değiştirme |
| `TICKET_CLOSE` | Talebi kapatma (çözmekten ayrı yetki) |
| `REPORT_VIEW` | Panel ve raporları görüntüleme |
| `KB_MANAGE` | Bilgi bankası makalesi ekleme/düzenleme |
| `PROJECT_MANAGE` | Bir projenin kategori, ekip ve SLA ayarları |
| `USER_MANAGE` | Kullanıcı, grup ve yetki yönetimi |
| `AUDIT_VIEW` | Denetim (aktivite) kayıtlarını görüntüleme |
| `ADMIN_MANAGE` | Süper yetki — diğer tüm kontrolleri kapsar |

### Yetki kapsamı

Bir yetki iki şekilde verilebilir:

- **Global** — her projede geçerli. Tabloda kodun yanında proje kodu yoktur.
- **Proje kapsamlı** — yalnızca o projede geçerli. Tabloda `@KOD` ile gösterilir
  (ör. `PROJECT_MANAGE@SHOP` = yalnızca E-Ticaret Sitesi'nde).

`ADMIN_MANAGE` özel bir durumdur: `PermissionAuthorizationHandler` bu yetkiye
sahip kullanıcıyı diğer tüm kontrollerden muaf tutar. Bu yüzden yönetici
hesabına ayrıca başka yetki verilmemiştir.

### Proje kodları

| Kod | Proje |
|---|---|
| `PORTAL` | Kurumsal Portal |
| `MOBILE` | Mobil Uygulama |
| `INFRA` | BT Altyapı |
| `DWH` | Veri Ambarı |
| `IKP` | İK Portali |
| `SHOP` | E-Ticaret Sitesi |
| `CALL` | Çağrı Merkezi |
| `OLDNET` | Eski İntranet *(arşivlenmiş)* |
| `MON` | Monitoring Platformu |
| `SMSGW` | SMS Gateway |

---

## Kullanıcı listesi

`Atanan` / `Açtığı` sütunları, kullanıcının üzerine atanmış ve kendi açtığı
talep sayısıdır.

### Yönetim

| # | Ad | E-posta | Grup | Yetkiler | Üyelikler | Atanan | Açtığı |
|---|---|---|---|---|---|---|---|
| 1 | Emircan Açar | `admin@` | Sistem & Network | `ADMIN_MANAGE` | — | 0 | 0 |
| 31 | Sistem Yöneticisi | `sysadmin@` | Sistem & Network | `USER_MANAGE` `AUDIT_VIEW` | — | 0 | 0 |
| 32 | Denetçi | `denetci@` | Destek Birimi | `REPORT_VIEW` `AUDIT_VIEW` | — | 0 | 0 |

### Proje sorumluları

Her biri yalnızca kendi projesinde tam yetkili; diğer projelerin ayarlarına
erişemez.

| # | Ad | E-posta | Grup | Yetkiler | Üyelikler | Atanan | Açtığı |
|---|---|---|---|---|---|---|---|
| 2 | Deniz Yılmaz | `deniz@` | Yazılım Geliştirme | `TICKET_CREATE` `REPORT_VIEW` `TICKET_ASSIGN@PORTAL` `TICKET_ASSIGN@MOBILE` `TICKET_STATUS_UPDATE@PORTAL` `TICKET_STATUS_UPDATE@MOBILE` `TICKET_CLOSE@PORTAL` `PROJECT_MANAGE@PORTAL` | PORTAL, MOBILE, SHOP | 18 | 2 |
| 3 | Burak Şahin | `burak@` | Sistem & Network | `TICKET_CREATE` `REPORT_VIEW` `TICKET_ASSIGN@INFRA` `TICKET_STATUS_UPDATE@INFRA` `TICKET_CLOSE@INFRA` `PROJECT_MANAGE@INFRA` | INFRA, MON, OLDNET | 3 | 4 |
| 15 | Merve Şen | `merve@` | Yazılım Geliştirme | `TICKET_CREATE` `REPORT_VIEW` `TICKET_ASSIGN@IKP` `TICKET_STATUS_UPDATE@IKP` `TICKET_CLOSE@IKP` `PROJECT_MANAGE@IKP` | IKP | 7 | 1 |
| 17 | Gizem Aksoy | `gizem@` | Sistem & Network | `TICKET_CREATE` `REPORT_VIEW` `TICKET_ASSIGN@SHOP` `TICKET_STATUS_UPDATE@SHOP` `TICKET_CLOSE@SHOP` `PROJECT_MANAGE@SHOP` | SHOP | 3 | 3 |
| 19 | Sibel Yalçın | `sibel@` | Veritabanı Yönetimi | `TICKET_CREATE` `TICKET_ASSIGN@CALL` `TICKET_STATUS_UPDATE@CALL` `TICKET_CLOSE@CALL` `PROJECT_MANAGE@CALL` | CALL | 0 | 3 |
| 23 | Serkan Yıldırım | `serkan@` | Ice Age | `TICKET_CREATE` `TICKET_ASSIGN@MON` `TICKET_STATUS_UPDATE@MON` `TICKET_CLOSE@MON` `PROJECT_MANAGE@MON` | MON, PORTAL | 0 | 1 |
| 25 | Barış Tunç | `baris@` | Jetgiller | `TICKET_CREATE` `TICKET_ASSIGN@SMSGW` `TICKET_STATUS_UPDATE@SMSGW` `TICKET_CLOSE@SMSGW` `PROJECT_MANAGE@SMSGW` | MOBILE, SMSGW | 0 | 3 |
| 29 | Okan Çetin | `okan@` | SMS | `TICKET_CREATE` `REPORT_VIEW` `TICKET_ASSIGN@SMSGW` `TICKET_STATUS_UPDATE@SMSGW` `TICKET_CLOSE@SMSGW` | SMSGW | 6 | 3 |

### Operasyon / destek

| # | Ad | E-posta | Grup | Yetkiler | Üyelikler | Atanan | Açtığı |
|---|---|---|---|---|---|---|---|
| 4 | Elif Kaya | `elif@` | Destek Birimi | `TICKET_CREATE` `TICKET_ASSIGN` `TICKET_STATUS_UPDATE` *(global)* | CALL, PORTAL | 0 | 5 |
| 5 | Mert Demir | `mert@` | Destek Birimi | `TICKET_CREATE` `TICKET_STATUS_UPDATE` *(global)* | INFRA | 0 | 1 |
| 6 | Ayşe Korkmaz | `ayse@` | Sistem & Network | `TICKET_CREATE` `TICKET_STATUS_UPDATE@INFRA` `TICKET_CLOSE@INFRA` | CALL, INFRA | 12 | 0 |
| 7 | Can Öztürk | `can@` | Veritabanı Yönetimi | `TICKET_CREATE` `TICKET_STATUS_UPDATE@DWH` | DWH | 6 | 1 |
| 10 | Selin Doğan | `selin@` | Destek Birimi | `TICKET_CREATE` `REPORT_VIEW` `TICKET_STATUS_UPDATE@PORTAL` | INFRA, PORTAL | 0 | 8 |
| 16 | Emre Kılıç | `emre@` | Destek Birimi | `TICKET_CREATE` `TICKET_STATUS_UPDATE@CALL` `TICKET_STATUS_UPDATE@SHOP` | CALL, SHOP | 3 | 1 |
| 18 | Tolga Erdem | `tolga@` | Yazılım Geliştirme | `TICKET_CREATE` `TICKET_STATUS_UPDATE@IKP` | IKP | 0 | 2 |
| 24 | Pelin Uçar | `pelin@` | Ice Age | `TICKET_CREATE` `TICKET_STATUS_UPDATE@PORTAL` | PORTAL | 0 | 0 |
| 26 | Ceren Aktaş | `ceren@` | Jetgiller | `TICKET_CREATE` `TICKET_STATUS_UPDATE@MOBILE` | MOBILE, SMSGW | 0 | 2 |
| 28 | Nazlı Ergin | `nazli@` | Monitoring | `TICKET_CREATE` `TICKET_STATUS_UPDATE@MON` | MON | 2 | 3 |

### Nöbetçi (global operasyon yetkisi)

| # | Ad | E-posta | Grup | Yetkiler | Üyelikler | Atanan | Açtığı |
|---|---|---|---|---|---|---|---|
| 27 | Hakan Demirel | `hakan@` | Monitoring | `TICKET_CREATE` `TICKET_ASSIGN` `TICKET_STATUS_UPDATE` `TICKET_CLOSE` *(hepsi global)* `REPORT_VIEW` `AUDIT_VIEW` `PROJECT_MANAGE@MON` | MON | 5 | 3 |

7/24 nöbet tuttuğu için atama, durum ve kapatma yetkileri global — her projeye
müdahale edebilmesi gerekiyor. `AUDIT_VIEW`'a da sahip; bu yetkinin yönetici
olmadan da verilebildiğini gösteriyor.

### Bilgi bankası yazarları

| # | Ad | E-posta | Grup | Yetkiler | Üyelikler | Atanan | Açtığı |
|---|---|---|---|---|---|---|---|
| 8 | Zeynep Aydın | `zeynep@` | Yazılım Geliştirme | `TICKET_CREATE` `KB_MANAGE` | DWH, IKP, PORTAL | 0 | 9 |
| 21 | Anna Novak 🇬🇧 | `anna@` | Yazılım Geliştirme | `TICKET_CREATE` `KB_MANAGE` `TICKET_STATUS_UPDATE@SHOP` | IKP, SHOP | 0 | 4 |
| 33 | Teknik Yazar | `yazar@` | Yazılım Geliştirme | `TICKET_CREATE` `KB_MANAGE` | INFRA, PORTAL, SMSGW | 0 | 0 |

### Son kullanıcılar

| # | Ad | E-posta | Grup | Yetkiler | Üyelikler | Atanan | Açtığı |
|---|---|---|---|---|---|---|---|
| 9 | Kaan Arslan | `kaan@` | Yazılım Geliştirme | `TICKET_CREATE` | MOBILE, SHOP | 0 | 8 |
| 11 | Onur Çelik | `onur@` | Veritabanı Yönetimi | `TICKET_CREATE` | DWH | 0 | 5 |
| 14 | John Smith 🇬🇧 | `john@` | Yazılım Geliştirme | `TICKET_CREATE` `TICKET_ASSIGN@MOBILE` | MOBILE, PORTAL | 0 | 4 |
| 20 | Kerem Bulut | `kerem@` | Destek Birimi | `TICKET_CREATE` | SHOP | 0 | 2 |
| 22 | Furkan Aslan | `furkan@` | Destek Birimi | `TICKET_CREATE` | CALL | 1 | 2 |

### Özel durumlar

| # | Ad | E-posta | Grup | Durum | Yetkiler |
|---|---|---|---|---|---|
| 12 | Yeni Kullanıcı | `yeni@` | Atanmamış | Aktif | *(yok)* |
| 13 | Pasif Personel | `pasif@` | Destek Birimi | **Pasif** | *(yok)* |

- **12** — kayıt olmuş ama henüz yetkilendirilmemiş kullanıcıyı temsil eder.
  Varsayılan `Atanmamış` grubundadır.
- **13** — `IsActive = false`. Doğru şifreyle bile giriş yapamaz;
  `AuthService.LoginAsync` şifre doğrulamasından sonra bu kontrolü yapar ve
  hesabın var olduğunu sızdırmamak için yanlış şifreyle aynı 401'i döner.

---

## Gruplar

| Grup | Üye sayısı |
|---|---|
| Yazılım Geliştirme | 8 |
| Sistem & Network | 5 |
| Destek Birimi | 8 |
| Veritabanı Yönetimi | 3 |
| Atanmamış *(sistem grubu)* | 1 |
| Ice Age | 2 |
| Jetgiller | 2 |
| Monitoring | 2 |
| SMS | 2 |

`Atanmamış` grubunun `SystemKey = 'UNASSIGNED'` değeri vardır. Kayıt akışı bu
grubu adına göre değil anahtarına göre bulur; böylece grup adı yönetim
panelinden değiştirilse bile yeni kullanıcı kaydı bozulmaz.

---

## Sunumda gösterilebilecek karşıtlıklar

**Aynı grup, farklı yetki**
Elif (4) ve Mert (5) ikisi de Destek Birimi'nde. Elif talep atayabilir, Mert
atayamaz. Aynı durum İK Portali'nde Merve (15) ve Tolga (18) arasında da var.
Yetkinin gruba değil kişiye bağlı olduğunu gösterir.

**Proje kapsamlı yetki gerçekten kapsanıyor**
Gizem (17) E-Ticaret'te kategori ekleyip projeyi düzenleyebilir; İK Portali'nde
aynı işlemler 403 döner. Merve (15) için tam tersi geçerlidir.

**Çözmek ile kapatmak ayrı**
Elif (4) durum güncelleyebilir ama `TICKET_CLOSE` yetkisi yoktur — talebi
çözebilir, kapatamaz.

**Yönetim sorumlulukları ayrışmış**
Üç hesap da `ADMIN_MANAGE` olmadan farklı alanlara erişir:

| Hesap | Panel | Aktivite kaydı | Kullanıcı yönetimi | Proje ayarları |
|---|---|---|---|---|
| `sysadmin@` | ✗ | ✓ | ✓ | ✗ |
| `denetci@` | ✓ | ✓ | ✗ | ✗ |
| `yazar@` | ✗ | ✗ | ✗ | ✗ |

`denetci@` salt okuma yapar; hiçbir şeyi değiştiremez, talep bile açamaz.
`yazar@` yönetim bağlantısını hiç görmez — yalnızca bilgi bankası yetkisi
vardır.

**Görünürlük filtresi**
Talep listesi kullanıcının görebildikleriyle sınırlıdır: kendi açtığı, üzerine
atanmış veya üyesi olduğu projelerin talepleri. Yönetici 83 talebin tamamını
görürken Hakan (27) 9, Okan (29) 11 talep görür.

**Çok dilli kullanım**
John (14) ve Anna (21) hesaplarının `PreferredLanguage` değeri `en`'dir.
Bildirimleri ve e-postaları İngilizce alırlar; arayüz dili ise `Accept-Language`
başlığından belirlenir ve sağ üstteki EN/TR düğmesiyle değiştirilebilir.
