namespace ITSM.Application.Interfaces;

/// <summary>
/// Resource dosyalarından (Messages.resx) çevrilmiş metin üretir.
///
/// İki ayrı imza var çünkü iki farklı bağlam var:
/// - <see cref="Get"/>: geçerli isteğin dilini kullanır (Accept-Language).
/// - <see cref="GetFor"/>: dili açıkça alır. Arka plan servisleri ve
///   e-postalar bunu kullanır; oralarda "geçerli istek" diye bir şey yok,
///   metin alıcının PreferredLanguage'ine göre üretilmeli.
/// </summary>
public interface ILocalizedMessageProvider
{
    /// <summary>
    /// Geçerli bağlamın dilinde çeviri döndürür.
    /// </summary>
    string Get(string key, params object[] arguments);

    /// <summary>
    /// Belirtilen dilde çeviri döndürür.
    /// </summary>
    string GetFor(string languageCode, string key, params object[] arguments);
}
