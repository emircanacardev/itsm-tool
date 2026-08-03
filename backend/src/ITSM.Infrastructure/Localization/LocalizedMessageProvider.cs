using ITSM.Application.Interfaces;
using ITSM.Application;
using ITSM.Domain.Constants;
using Microsoft.Extensions.Localization;
using System.Globalization;

namespace ITSM.Infrastructure.Localization;

/// <summary>
/// ILocalizedMessageProvider'ın IStringLocalizer tabanlı uygulaması.
///
/// GetFor(...) belirli bir dilde çeviri isterken CurrentUICulture'ı geçici
/// olarak değiştirir: IStringLocalizer dili yalnızca ambient kültürden okur,
/// parametre olarak almaz. Kültür try/finally ile eski hâline döndürülür,
/// böylece çağıran bağlamın (ör. isteği işleyen thread) dili bozulmaz.
/// </summary>
public class LocalizedMessageProvider : ILocalizedMessageProvider
{
    private readonly IStringLocalizer<Messages> _localizer;

    public LocalizedMessageProvider(IStringLocalizer<Messages> localizer)
    {
        _localizer = localizer;
    }

    public string Get(string key, params object[] arguments)
    {
        return Format(key, arguments);
    }

    public string GetFor(string languageCode, string key, params object[] arguments)
    {
        var culture = new CultureInfo(SupportedLanguages.Normalize(languageCode));

        var previousCulture = CultureInfo.CurrentCulture;
        var previousUiCulture = CultureInfo.CurrentUICulture;

        try
        {
            CultureInfo.CurrentCulture = culture;
            CultureInfo.CurrentUICulture = culture;

            return Format(key, arguments);
        }
        finally
        {
            CultureInfo.CurrentCulture = previousCulture;
            CultureInfo.CurrentUICulture = previousUiCulture;
        }
    }

    private string Format(string key, object[] arguments)
    {
        // IStringLocalizer, anahtar bulunamazsa anahtarın kendisini döner
        // (ResourceNotFound = true). Bu davranış bilinçli: eksik çeviri
        // uygulamayı düşürmez, ekranda anahtar görünür ve fark edilir.
        return arguments.Length == 0
            ? _localizer[key].Value
            : _localizer[key, arguments].Value;
    }
}
