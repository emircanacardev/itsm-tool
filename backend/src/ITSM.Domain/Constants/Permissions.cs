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
        AdminManage,
        ProjectManage
    ];
}
