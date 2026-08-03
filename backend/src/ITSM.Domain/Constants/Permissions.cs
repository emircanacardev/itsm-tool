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
    /// Policy kaydı için kullanılan tam liste.
    /// </summary>
    public static readonly string[] All =
    [
        TicketCreate,
        TicketAssign,
        TicketStatusUpdate,
        AdminManage
    ];
}
