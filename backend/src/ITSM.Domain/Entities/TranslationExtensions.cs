using ITSM.Domain.Constants;

namespace ITSM.Domain.Entities;

/// <summary>
/// Referans verilerin (durum, öncelik) görünen adını çözer.
///
/// Çözüm sırası her yerde aynı: istenen dil → varsayılan dil → entity'nin
/// kendi Name alanı. Böylece bir çeviri eksik olsa bile arayüzde boş ya da
/// ham bir değer görünmez.
/// </summary>
public static class TranslationExtensions
{
    public static string GetLocalizedName(this Status status, string languageCode)
    {
        return ResolveName(
            status.Translations,
            t => t.LanguageCode,
            t => t.Name,
            languageCode,
            status.Name);
    }

    public static string GetLocalizedName(this Priority priority, string languageCode)
    {
        return ResolveName(
            priority.Translations,
            t => t.LanguageCode,
            t => t.Name,
            languageCode,
            priority.Name);
    }

    private static string ResolveName<T>(
        IEnumerable<T> translations,
        Func<T, string> languageSelector,
        Func<T, string> nameSelector,
        string languageCode,
        string fallbackName)
    {
        var normalized = SupportedLanguages.Normalize(languageCode);

        var match = translations.FirstOrDefault(t => languageSelector(t) == normalized)
            ?? translations.FirstOrDefault(t => languageSelector(t) == SupportedLanguages.Default);

        return match is not null ? nameSelector(match) : fallbackName;
    }
}
