using ITSM.Domain.Constants;

namespace ITSM.Domain.Entities;

public class User
{
    public long Id { get; set; }
    public required long GroupId { get; set; }
    public required string FullName { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Kullanıcının tercih ettiği arayüz dili (ISO 639-1: "tr", "en").
    /// HTTP isteği olmayan bağlamlarda (SLA ihlal taraması gibi arka plan
    /// servisleri) bildirim ve e-postaların hangi dilde üretileceğini belirler;
    /// Accept-Language başlığı orada mevcut değildir.
    /// </summary>
    public string PreferredLanguage { get; set; } = SupportedLanguages.Default;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Group Group { get; set; } = null!;

}