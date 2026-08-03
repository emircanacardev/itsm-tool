namespace ITSM.Application.DTOs;

/// <summary>
/// Kullanıcının kendi dil tercihini güncellemesi için istek gövdesi.
/// </summary>
public class UpdateLanguageRequest
{
    /// <summary>
    /// ISO 639-1 dil kodu ("tr", "en"). Desteklenmeyen değerler reddedilir.
    /// </summary>
    public required string Language { get; set; }
}
