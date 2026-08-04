namespace ITSM.Infrastructure.Persistence;

/// <summary>
/// Denetim kaydının "Detay" metnini kuran yardımcılar.
///
/// AppDbContext'ten ayrı duruyorlar çünkü tek başlarına test edilebilirler:
/// hangi alanın gizleneceği ve değerlerin nasıl yazılacağı, bir
/// DbContext/ChangeTracker kurmadan doğrulanabilmeli.
/// </summary>
public static class AuditDetailFormatter
{
    /// <summary>Değerin kırpılmadan önceki en fazla uzunluğu.</summary>
    public const int MaxValueLength = 60;

    /// <summary>
    /// Hiçbir zaman denetim kaydına yazılmayacak alanlar. Parola özeti ve
    /// yenileme jetonu, kaydı görüntüleyen yöneticide de olmamalı.
    /// </summary>
    private static readonly HashSet<string> RedactedProperties = new(StringComparer.OrdinalIgnoreCase)
    {
        "PasswordHash",
        "RefreshToken",
        "RefreshTokenHash"
    };

    public static bool IsRedacted(string propertyName) => RedactedProperties.Contains(propertyName);

    /// <summary>
    /// Tek bir değeri denetim kaydında görünecek metne çevirir.
    /// Uzun metinler (talep açıklaması, makale içeriği) kaydı okunmaz hâle
    /// getirdiği için kırpılıyor.
    /// </summary>
    public static string FormatValue(object? value)
    {
        if (value is null)
        {
            return "-";
        }

        var text = value switch
        {
            DateTimeOffset dto => dto.ToString("O"),
            DateTime dt => dt.ToString("O"),
            bool flag => flag ? "true" : "false",
            _ => value.ToString() ?? "-"
        };

        return text.Length > MaxValueLength
            ? string.Concat(text.AsSpan(0, MaxValueLength), "…")
            : text;
    }

    /// <summary>
    /// "Alan: eski -> yeni" satırını kurar. Gizli alanlarda değerler
    /// yazılmaz, yalnızca alanın değiştiği bilgisi kalır.
    /// </summary>
    public static string DescribeProperty(string propertyName, object? originalValue, object? currentValue)
    {
        if (IsRedacted(propertyName))
        {
            return $"{propertyName}: ***";
        }

        return $"{propertyName}: {FormatValue(originalValue)} -> {FormatValue(currentValue)}";
    }
}
