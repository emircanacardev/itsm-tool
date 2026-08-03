namespace ITSM.Application.Interfaces;

/// <summary>
/// İçinde bulunulan bağlamın dilini verir.
///
/// HTTP isteği varsa Accept-Language başlığından (RequestLocalization
/// middleware'i tarafından çözülmüş kültür) gelir. Arka plan servislerinde
/// HTTP bağlamı olmadığından böyle bir başlık yoktur; oralarda bildirimi
/// alacak kullanıcının PreferredLanguage'i kullanılmalıdır.
/// </summary>
public interface ICurrentLanguageProvider
{
    /// <summary>
    /// Geçerli isteğin dili. HTTP bağlamı yoksa varsayılan dil döner.
    /// </summary>
    string GetCurrentLanguage();
}
