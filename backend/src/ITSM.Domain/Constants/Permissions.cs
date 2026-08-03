namespace ITSM.Domain.Constants;

/// <summary>
/// Yetki kodları kataloğu. Bu kodlar hem permissions tablosundaki `code`
/// sütunuyla, hem de Program.cs'te kaydedilen authorization policy adlarıyla
/// birebir eşleşir.
///
/// Yeni bir yetki eklerken: buraya sabiti ekle ve <see cref="All"/> dizisine
/// koy — policy kaydı Program.cs'te bu dizi üzerinden döngüyle yapıldığı için
/// ayrıca policy tanımlamaya gerek kalmaz.
/// </summary>
public static class Permissions
{
    public const string TicketCreate = "TICKET_CREATE";
    public const string TicketAssign = "TICKET_ASSIGN";
    public const string TicketStatusUpdate = "TICKET_STATUS_UPDATE";

    /// <summary>
    /// Talebi kapatma yetkisi. TICKET_STATUS_UPDATE'ten ayrı tutuluyor:
    /// ITSM akışında "çözdüm" (Çözüldü) ile "kapatıyorum" (Kapatıldı) farklı
    /// kararlardır - çözümü uygulayan teknisyen ile kapanışı onaylayan kişi
    /// genelde aynı değildir. Kapatma, üzerinde artık işlem yapılamayacağı
    /// anlamına geldiği için ayrı bir yetki gerektiriyor.
    /// </summary>
    public const string TicketClose = "TICKET_CLOSE";

    /// <summary>
    /// Panel ve raporları görüntüleme yetkisi. Dashboard kurum genelindeki
    /// talep sayılarını ve SLA uyum oranını gösterdiği için her kullanıcıya
    /// açık olmamalı (bkz. brief §3.2 - rapor görüntüleme ayrı bir yetki).
    /// </summary>
    public const string ReportView = "REPORT_VIEW";

    /// <summary>
    /// Bilgi bankası makalelerini oluşturma/düzenleme yetkisi. Doküman
    /// yazarlığı ayrı bir sorumluluk; bunun için sistem yöneticisi olmak
    /// gerekmemeli.
    /// </summary>
    public const string KnowledgeBaseManage = "KB_MANAGE";

    /// <summary>
    /// Kullanıcı, grup ve yetki yönetimi. Proje yönetiminden ayrı bir
    /// sorumluluk: kimin sisteme girebileceğine ve kimin neyi yapabileceğine
    /// karar vermek, bir projenin kategorilerini düzenlemekle aynı iş değildir.
    /// Yetki verme yetkisinin ayrı olması, yetki yükseltmeyi de sınırlar.
    /// </summary>
    public const string UserManage = "USER_MANAGE";

    /// <summary>
    /// Denetim kayıtlarını görüntüleme yetkisi. Denetim izini okuyabilmek ile
    /// sistemi değiştirebilmek bilinçli olarak ayrıldı: bir denetçinin logları
    /// incelemek için yönetici yetkisine ihtiyacı olmamalı.
    /// </summary>
    public const string AuditView = "AUDIT_VIEW";

    /// <summary>
    /// Süper yetki. PermissionAuthorizationHandler bu yetkiye sahip
    /// kullanıcıyı diğer tüm kontrollerden muaf tutar, dolayısıyla aşağıdaki
    /// yetkilerin hepsini kapsar.
    /// </summary>
    public const string AdminManage = "ADMIN_MANAGE";

    /// <summary>
    /// Bir projenin kendi kurulumunu (kategoriler, ekip üyeleri, SLA kuralları)
    /// yönetme yetkisi. ADMIN_MANAGE'den farkı: user_permissions.project_id ile
    /// tek bir projeye kapsanabiliyor, böylece "sadece Kurumsal Portal'ın
    /// yöneticisi" gibi bir kullanıcı tanımlanabiliyor (bkz. brief §3.2 -
    /// yetkilendirme esnek olmalı). ADMIN_MANAGE'i olan zaten her şeyi yapabilir.
    /// </summary>
    public const string ProjectManage = "PROJECT_MANAGE";

    /// <summary>
    /// Policy kaydı için kullanılan tam liste.
    /// </summary>
    public static readonly string[] All =
    [
        TicketCreate,
        TicketAssign,
        TicketStatusUpdate,
        TicketClose,
        ReportView,
        KnowledgeBaseManage,
        ProjectManage,
        UserManage,
        AuditView,
        AdminManage
    ];
}
