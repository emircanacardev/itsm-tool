using ITSM.Domain.Constants;

namespace ITSM.Domain.Entities;

/// <summary>
/// Bir durumun belirli bir dildeki adı.
///
/// Status.Name yerine bu tablo kullanılıyor çünkü durum adları arayüzde
/// gösteriliyor ve dile göre değişmeli. Status.Name yine de duruyor:
/// çevirisi bulunmayan bir dil için yedek (fallback) olarak kullanılıyor.
/// </summary>
public class StatusTranslation
{
    public required long StatusId { get; set; }

    /// <summary>ISO 639-1 dil kodu (bkz. <see cref="SupportedLanguages"/>).</summary>
    public required string LanguageCode { get; set; }

    public required string Name { get; set; }

    public Status Status { get; set; } = null!;
}
