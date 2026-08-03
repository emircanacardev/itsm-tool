namespace ITSM.Domain.Entities;

public class Notification
{
    public long Id { get; set; }
    public required long UserId { get; set; }
    public long? TicketId { get; set; }
    /// <summary>
    /// Bildirimin türü (bkz. <see cref="Constants.NotificationTypes"/>).
    /// Gösterilecek cümle bu türe göre seçiliyor.
    /// </summary>
    public required string Type { get; set; }

    /// <summary>
    /// Cümleyi kurmak için gereken değişken veriler (ör. talep başlığı),
    /// JSON olarak. Hazır cümle yerine ham veri saklanıyor: metin okuma
    /// anında okuyanın diline göre üretiliyor, böylece geçmiş bildirimler
    /// de dil değiştiğinde doğru dilde görünüyor.
    /// </summary>
    public string? PayloadJson { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User User { get; set; } = null!;
    public Ticket? Ticket { get; set; }
}
