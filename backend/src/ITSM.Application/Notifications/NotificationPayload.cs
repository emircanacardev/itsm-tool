namespace ITSM.Application.Notifications;

/// <summary>
/// Bildirim cümlesini kurmak için gereken değişken veriler.
/// Notification.PayloadJson içinde JSON olarak saklanır.
///
/// Tek bir tip kullanılıyor (tür başına ayrı tip yerine) çünkü alanların
/// tamamı opsiyonel ve sayıları az; bu, JSON'u okurken tür ayrıştırması
/// yapma ihtiyacını ortadan kaldırıyor.
/// </summary>
public class NotificationPayload
{
    /// <summary>İlgili talebin başlığı.</summary>
    public string? TicketTitle { get; set; }

    /// <summary>
    /// SLA ihlallerinde ihlalin türü ("Response" / "Resolution").
    /// BreachType enum'ının adı olarak saklanır.
    /// </summary>
    public string? BreachType { get; set; }

    /// <summary>
    /// Bildirimin alıcısı talebi açan kişi değil de atanan kişi olduğunda
    /// true. SLA ihlalinde iki tarafa farklı cümle gidiyor: talebi açana
    /// "talebinizde süre aşıldı", atanana "size atanmış talepte süre aşıldı".
    /// </summary>
    public bool IsAssigneeNotification { get; set; }
}
