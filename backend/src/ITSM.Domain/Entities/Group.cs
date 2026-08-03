namespace ITSM.Domain.Entities;

public class Group
{
    public long Id { get; set; }

    /// <summary>
    /// Grubun görünen adı. Kullanıcı tarafından yönetilir ve serbestçe
    /// değiştirilebilir; bu yüzden kod içinden gruba ulaşmak için değil,
    /// <see cref="SystemKey"/> kullanılmalı.
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Uygulamanın belirli bir gruba kod içinden ulaşabilmesi için
    /// kullanılan değişmez anahtar (bkz.
    /// <see cref="Constants.SystemGroupKeys"/>). Yalnızca sistemin ihtiyaç
    /// duyduğu gruplarda dolu; kullanıcının oluşturduğu gruplarda null.
    /// </summary>
    public string? SystemKey { get; set; }

    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<User> Users { get; set; } = new List<User>();
}