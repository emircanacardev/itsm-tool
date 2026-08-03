using ITSM.Domain.Constants;

namespace ITSM.Domain.Entities;

/// <summary>
/// Bir önceliğin belirli bir dildeki adı.
/// Bkz. <see cref="StatusTranslation"/> - aynı yaklaşım.
/// </summary>
public class PriorityTranslation
{
    public required long PriorityId { get; set; }

    /// <summary>ISO 639-1 dil kodu (bkz. <see cref="SupportedLanguages"/>).</summary>
    public required string LanguageCode { get; set; }

    public required string Name { get; set; }

    public Priority Priority { get; set; } = null!;
}
