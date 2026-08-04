namespace ITSM.Domain.Constants;

/// <summary>
/// Bildirim türleri. Notification.Type bu değerlerden birini alır ve
/// bildirimin hangi cümleyle gösterileceğini belirler.
///
/// Bildirimler artık hazır cümle olarak saklanmıyor; tür + PayloadJson
/// saklanıyor ve metin okuma anında, okuyanın diline göre üretiliyor.
/// </summary>
public static class NotificationTypes
{
    /// <summary>Talep bir kullanıcıya elle atandı.</summary>
    public const string TicketAssigned = "TicketAssigned";

    /// <summary>Talep, otomatik atama kuralıyla atandı.</summary>
    public const string TicketAutoAssigned = "TicketAutoAssigned";

    /// <summary>Talebin durumu değişti.</summary>
    public const string TicketStatusChanged = "TicketStatusChanged";

    /// <summary>Talebe yeni bir yorum eklendi.</summary>
    public const string TicketCommented = "TicketCommented";

    /// <summary>Talepte SLA süresi aşıldı.</summary>
    public const string SlaBreach = "SlaBreach";
}
