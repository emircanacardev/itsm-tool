using ITSM.Application.Interfaces;
using ITSM.Domain.Constants;
using System.Globalization;

namespace ITSM.Infrastructure.Localization;

/// <summary>
/// Dili CultureInfo.CurrentUICulture üzerinden okur. Bu değer HTTP
/// isteklerinde RequestLocalization middleware'i tarafından Accept-Language
/// başlığına göre set edilir. Arka plan servislerinde middleware çalışmadığı
/// için thread'in varsayılan kültürü döner ve Normalize(...) bunu
/// desteklenen bir dile indirger.
/// </summary>
public class CurrentLanguageProvider : ICurrentLanguageProvider
{
    public string GetCurrentLanguage()
    {
        return SupportedLanguages.Normalize(CultureInfo.CurrentUICulture.TwoLetterISOLanguageName);
    }
}
