namespace ITSM.Domain.Constants;

/// <summary>
/// Uygulamanın desteklediği diller. Çeviri tabloları (StatusTranslation,
/// PriorityTranslation), User.PreferredLanguage ve Accept-Language
/// middleware'i bu listeye göre çalışır.
///
/// Yeni bir dil eklerken: koda sabiti ekle, <see cref="All"/> dizisine koy,
/// çeviri tablolarına o dilin satırlarını seed et ve .resx dosyasının
/// karşılığını oluştur.
/// </summary>
public static class SupportedLanguages
{
    public const string Turkish = "tr";
    public const string English = "en";

    /// <summary>
    /// Çeviri bulunamadığında düşülecek dil.
    /// </summary>
    public const string Default = Turkish;

    public static readonly string[] All = [Turkish, English];

    /// <summary>
    /// Verilen dil kodunu desteklenen bir dile normalize eder.
    /// "en-US" gibi bölgesel kodlar ana dile indirgenir; tanınmayan
    /// değerler varsayılana düşer.
    /// </summary>
    public static string Normalize(string? languageCode)
    {
        if (string.IsNullOrWhiteSpace(languageCode))
        {
            return Default;
        }

        var primary = languageCode.Split('-')[0].Trim().ToLowerInvariant();

        return All.Contains(primary) ? primary : Default;
    }
}
