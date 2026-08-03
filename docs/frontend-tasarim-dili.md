# Frontend Tasarım Dili

Bu dosya, Pulse ITSM arayüzünde **yeni bir sayfa/sekme eklerken uyulması zorunlu**
kuralları toplar. Amaç: her yeni ekranda aynı şeyleri baştan konuşmak zorunda
kalmamak. Yeni bir liste/tablo ekranı yazmadan önce bu dosya okunur.

Referans uygulamalar: `frontend/js/views/tickets.js` (kanonik liste ekranı),
`frontend/js/views/admin.js` (sekmeli yönetim ekranları),
`frontend/js/views/projects.js` + `projectDetail.js`.

---

## 0. Önce mevcut çözümü ara (en önemli kural)

Yeni bir görsel bileşen (satır ok'u, rozet, avatar, boş durum kutusu, modal…)
yazmadan **önce** `tickets.js` / `admin.js` / `app.css` içinde aynı işi yapan bir
şey var mı diye bak:

```bash
grep -rn "aradığın-sınıf-adı" frontend/css/app.css frontend/js/views/
```

Paralel bir çözüm yazmak iki kere zarar veriyor: hem fazladan CSS/JS birikiyor,
hem de iki uygulama zamanla birbirinden ayrışıp aynı şey iki farklı yerde farklı
görünüyor. **Var olanı yeniden kullan; yetmiyorsa ortak kuralı iyileştir**, sadece
kendi sayfan için ezme.

Bu dosyadaki birçok kural, tam da bu hatanın sonradan düzeltilmesinden doğdu.

## 1. Tablolar

**Sayfa başına 15 satır.** Sabit: `const PAGE_SIZE = 15;` (dosyanın en üstünde).
Admin panelindeki bazı eski tablolar 10/20 kullanıyor; **yeni yazılan her tablo 15**.

**Tablo içinde scroll YOK.** Satır sayısı zaten sayfa başına sabit olduğu için
iç scroll'a gerek yok — sayfanın kendi scroll'u yeterli. `.ticket-table-wrap`
varsayılan olarak `overflow: auto` + `max-height` uyguluyor; bunu sayfa
sarmalayıcısıyla kapat:

```css
.admin-view .ticket-table-wrap,
.project-detail-view .ticket-table-wrap {
  overflow: visible;
  max-height: none;
}
```

Yani her yeni sayfa kendi sarmalayıcı sınıfını (`<div class="xxx-view">`) alır ve
bu override listesine eklenir.

**Her tablonun altında pagination olur.** Standart iskelet:

```html
<div class="pagination-bar">
  <span class="pagination-info" id="..."></span>
  <div class="pagination-controls">
    <button class="btn-secondary pagination-btn" data-i18n-title="tickets.prevPage">‹</button>
    <span class="page-indicator" id="..."></span>
    <button class="btn-secondary pagination-btn" data-i18n-title="tickets.nextPage">›</button>
  </div>
</div>
```

- `pagination-info`: `"1-15 / 42"` biçiminde
- `page-indicator`: `"1 / 3"` biçiminde
- İlk sayfada `prev`, son sayfada `next` **disabled** olur
- Sonuç boşsa pagination gizlenir ya da boşaltılır

### Tıklanabilir satırlar ve satır sonu ok'u

Satıra tıklayınca detaya giden tablolarda, tıklanabilirliği belli eden ok
**son veri hücresinin içine** konur — **ok için ayrı bir kolon açılmaz**
(ayrı kolon, son veri sütunuyla ok arasında her satırda ölü bir boşluk bırakır).

`.row-end` sarmalayıcısı ve `.row-chevron` `app.css`'te zaten tanımlı, hover'da
belirme davranışı da (`tbody tr:hover .row-chevron`) hazır — **yeni CSS yazma**:

```js
const dueCell = document.createElement('td');
dueCell.className = `due-cell ${due.className}`;

const wrap = document.createElement('div');
wrap.className = 'row-end';

const text = document.createElement('span');
text.textContent = due.text;

wrap.innerHTML = `
  <svg class="row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
       style="width: 16px; height: 16px;" aria-hidden="true">
    <path d="M9 6l6 6-6 6"/>
  </svg>
`;
wrap.prepend(text);
dueCell.appendChild(wrap);
```

Ok **sağa** bakar (`M9 6l6 6-6 6`) çünkü başka bir sayfaya götürür; aşağı ok
satır içinde açılma (accordion) anlamına gelir, öyle bir davranış yoksa kullanılmaz.

Salt okunur tablolar (satır tıklanamaz) `table-static` sınıfını alır ve ok içermez;
tıklanabilir tablolar `table-static` **almaz**.

Tablonun üstüne "hepsini gör" gibi bir buton konmaz — sidebar zaten o sayfaya
gidiyor, tekrar olur.

## 2. Sıralanabilir başlıklar

**Tablo başlıklarının her biri tıklanabilir ve sıralanabilir olmalı.** İstisna:
salt gösterim amaçlı kolonlar (ör. "İşlem" butonları).

Kolonlar tek bir dizide tanımlanır, `<thead>` bu diziden üretilir — tek kaynak:

```js
const COLUMNS = [
  { key: 'title', i18nKey: 'x.colTitle' },
  { key: 'status', i18nKey: 'x.colStatus' },
  // key = backend'in beklediği sortBy anahtarı
];

const columnsHtml = COLUMNS.map((col) => `
  <th class="col-sortable ${col.className || ''}" data-sort-key="${col.key}">
    <div class="th-inner">
      <span data-i18n="${col.i18nKey}"></span>
      <svg class="sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </div>
  </th>
`).join('');
```

Davranış:
- Aynı kolona tekrar tıkla → yön ters çevrilir (`sortDescending = !sortDescending`)
- Farklı kolona tıkla → o kolona geçilir, **azalan** başlar
- Her sıralama değişiminde `currentPage = 1`
- Aktif kolon `.is-active`, artan yön `.is-asc` sınıfı alır (`updateSortHeaderUI()`)

**Sayfalanmış tablolarda sıralama sunucu tarafında yapılır** — `sortBy`,
`sortDescending`, `page`, `pageSize` query parametreleriyle. Burada istemcide
diziyi `.sort()`'lamak yanlış: yalnızca o anki sayfa sıralanır, kayıtlar
sayfalar arasında yanlış yerde kalır.

**Sayfalanmayan tablolarda** (tüm kayıtlar tek istekte geliyorsa — proje
detayındaki kategori/ekip/SLA sekmeleri gibi) sıralama istemcide yapılır;
başlıklar yine tıklanabilir olmalı. `projectDetail.js`'teki
`createClientSorter(columns, onSorted)` + `sortableHeaders(columns)` ikilisi
bunu sağlıyor: her kolon `getValue(row)` ile karşılaştırma değerini verir.

- Sayısal alanlar **sayı** olarak döndürülür (`responseTimeMinutes`), metin
  olarak değil — "1440" ile "30" metin karşılaştırmasında yanlış sıralanır
- Metinler `localeCompare(..., getLanguage())` ile karşılaştırılır ki Türkçe
  harfler (İ, Ş, Ğ, Ç) doğru sırada gelsin
- Gösterilen değer türetilmişse (ör. SLA'nın kategori adı ayrı bir istekten
  çözülüyorsa) satıra yüklenirken eklenir; sıralama ile ekranda görünen metin
  aynı kaynaktan gelmeli

## 3. Açılır listeler (select)

Native `<select>` yerine `enhanceSelect()` kullanılır (`js/customSelect.js`).

**Çağrı sırası kritik:** `enhanceSelect` seçenek etiketlerini native
`<option>`'lardan kopyalar. `<option>`'lar `data-i18n` ile boş geldiği için
**önce `applyTranslations()`, sonra `enhanceSelect()`** çağrılmalı:

```js
applyTranslations();      // önce çeviriler
enhanceSelect(mySelect);  // sonra görsel katman
```

Ters sırada çağrılırsa açılır liste boş etiketlerle kurulur.

Seçenekleri sonradan API'den doldurduğunda `enhanceSelect`'i **tekrar** çağır.

Tarih girdileri için aynı mantıkla `enhanceDateInput()` (`js/customDatePicker.js`).

## 4. Durum kutuları (yükleniyor / boş / hata)

Üç durumun üçü de her zaman ele alınır — hiçbir liste sessizce boş kalmaz.

- **Yükleniyor:** `pulseLoader(t('x.loading'))` (`js/loading.js`) — marka nabız animasyonu
- **Boş / Hata:** `.state-box` içinde ikon + mesaj

Tablo içindeyse tek hücreye yayılır:

```js
`<tr><td colspan="5" style="padding: 0; border-bottom: none;">${...}</td></tr>`
```

Hata durumunda ham hata mesajı gösterilmez; i18n anahtarından çevrilmiş
kullanıcı dostu metin gösterilir.

## 5. Filtre çubuğu

**Her tablonun üstünde arama kutusu olur** — istisnasız. Bugün 5 satır olan bir
tablo yarın binlerce satıra çıkıyor; aramasız tablo o noktada kullanılamaz hale
geliyor. Kayıt az diye atlanmaz.

Tablonun üstünde `.filter-bar` içinde `.filter-group`'lar:

- Arama kutusu `.filter-group-search` + `.search-box` (büyüteç ikonu içeride)
- Arama **debounce** ile tetiklenir (sunucuya gidiyorsa 300ms, istemcide
  filtreliyorsa 200ms yeterli)
- Herhangi bir filtre değişiminde `currentPage = 1`

**Arama nerede çalışır:**

- **Sayfalanmış tablo** → sunucuda, `search` query parametresiyle. İstemcide
  filtrelemek yalnızca görünen sayfayı süzer, diğer sayfalardaki eşleşmeler
  kaybolur.
- **Sayfalanmayan tablo** (tüm kayıtlar tek istekte) → istemcide,
  `filterRows(rows, columns, query)` ile. Kolonların `getValue`'ları üzerinde
  arar, yani sıralamayla aynı veriyi kullanır.

Gösterilen değer ile sıralama değeri farklıysa (ör. SLA'da öncelik kolonu
sıralama için id döndürüyor), aramaya **kullanıcının gördüğü metin** verilir —
kimse id araştırmaz.

**Boş sonuç iki farklı durumdur:** hiç kayıt yoksa "henüz kayıt yok", arama
eşleşmediyse "aramanla eşleşen kayıt yok". Aynı mesajı kullanmak kullanıcıya
verinin silindiğini düşündürür.

## 6. Bildirimler ve onaylar

- **Toast:** `.toast` + `success`/`error` sınıfı, 3 saniye sonra kaybolur.
  Her kaydet/sil/oluştur işleminden sonra kullanıcıya geri bildirim verilir.
- **Onay:** `window.confirm()` **kullanılmaz** — `showConfirmDialog()`
  (`js/confirmDialog.js`). Geri alınamaz işlemlerde `{ danger: true }`.
- **Modal:** `.modal-overlay` + `.modal-card`. Esc ve zemine tıklama ile kapanır,
  kartın içine tıklama kapatmaz.

### Satır aksiyonları (Düzenle / Sil)

Tablo satırındaki düzenle ve sil **metin buton değil, ikon butondur** — kolonu
dar tutuyor ve tablo dili tüm ekranlarda aynı kalıyor:

```js
const editButton = document.createElement('button');
editButton.type = 'button';
editButton.className = 'btn-secondary btn-icon-only';
editButton.style.marginRight = '6px';
editButton.title = t('x.edit');        // metin tooltip'te
editButton.innerHTML = EDIT_ICON;      // kalem ikonu

const deleteButton = document.createElement('button');
deleteButton.type = 'button';
deleteButton.className = 'btn-secondary btn-icon-only btn-danger';
deleteButton.title = t('x.delete');
deleteButton.innerHTML = DELETE_ICON;  // çöp kutusu ikonu
```

- `EDIT_ICON` / `DELETE_ICON` sabitleri `admin.js` ve `projectDetail.js`'in
  başında duruyor — yeni bir view'da aynılarını kopyala, yeni ikon çizme
- Aksiyon hücresi `col-center`, kolon başlığı `x.colAction` ("İşlem")
- Silme her zaman `showConfirmDialog(..., { danger: true })` ile onaylanır
- **Satır içi düzenleme:** hücreler `.table-edit-input`'a dönüşür, işlem hücresi
  Kaydet/Vazgeç'e geçer. Bu ikisi **metin buton** kalır (ikon değil), çünkü
  geçici bir moddan çıkışı anlatıyorlar

## 7. i18n (mutlak kural)

- Arayüzdeki **hiçbir metin koda gömülmez** — `data-i18n` / `t()` kullanılır
- `js/i18n.js`'e eklenen her anahtar **hem `tr` hem `en`** bloğuna eklenir
- **Çevrilmiş isme göre dallanma YASAK.** Renk, rozet, "kapandı mı" gibi
  mantıklar `js/constants.js`'teki **id**'lerden gelir
  (`STATUS_DOT_COLORS[statusId]`, `isClosedStatus(statusId)`).
  İsimle karşılaştırma dil değişince sessizce bozulur.
- Bilinmeyen id gelirse `NEUTRAL_BADGE` / `NEUTRAL_DOT_COLOR`'a düşülür

### Terminoloji

Aynı kavram her ekranda **aynı kelimeyle** anılır. Yeni bir etiket yazmadan önce
o kavramın başka sayfada nasıl adlandırıldığına bak:

```bash
grep -n "'tickets.colDue'\|'detail.dueAt'" frontend/js/i18n.js
```

Türkçe metinlerde **gündelik dilde oturmamış terimler kullanılmaz**
(ör. "Termin" değil **"Son Tarih"**). Karar verirken ölçüt: kullanıcı bu kelimeyi
günlük hayatta duyar mı?

Yerleşmiş karşılıklar:

| Kavram | Türkçe | İngilizce |
|---|---|---|
| `dueAt` (kolon başlığı) | Son Tarih | Due |
| `dueAt` (alan etiketi) | Son Tarih | Due date |
| `assignedTo` | Atanan | Assignee |
| atanmamış talep | Atanmamış | Unassigned |
| `isActive` | Aktif / Pasif | Active / Inactive |

## 8. Güvenlik

Kullanıcı girdisi olan her metin (`title`, `name`, `description`, kullanıcı adı…)
**`textContent`** ile basılır, `innerHTML` ile değil. `innerHTML` yalnızca
kod içinde sabit olan iskelet HTML için kullanılır.

## 9. Yetkiye göre arayüz

- Yetkisi olmayana buton **hiç gösterilmez** (disabled değil, yok)
- Kontrol `currentUser.isAdmin` ya da
  `currentUser.permissions.some(p => p.permissionCode === 'X')` ile yapılır
- Backend yetkisiz kaynak için 403 değil **404** döner (varlığı sızdırmamak
  için); arayüz bunu "bulunamadı ya da yetkin yok" diye gösterir

## 10. Tema ve responsive

- Renk/ölçü/yazı tipi **doğrudan yazılmaz**, `css/variables.css`'teki
  değişkenler kullanılır (`var(--color-accent)`, `var(--space-4)`,
  `var(--text-sm)`, `var(--font-heading)`…) — koyu tema bunlarla çalışır
- Her yeni ekran koyu temada da kontrol edilir
- `< 640px`: grid'ler tek sütuna düşer, yatay scroll oluşmaz

## 11. Kod düzeni

- Her sayfa `js/views/<ad>.js` içinde `export function render(container, ...params, currentUser)`
- Route `js/router.js`'teki `routes` dizisine eklenir; sidebar linki
  `index.html`'de `data-route` ile eşleşir
  (**link eklendiyse route da eklenmeli** — aksi halde link sessizce ana sayfaya atar)
- Yorumlar Türkçe ve **neden**'i anlatır, ne yaptığını değil
