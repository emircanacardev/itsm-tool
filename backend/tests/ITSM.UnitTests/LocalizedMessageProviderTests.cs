using ITSM.Application;
using ITSM.Domain.Constants;
using ITSM.Infrastructure.Localization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Localization;
using System.Globalization;

namespace ITSM.UnitTests;

/// <summary>
/// Çevirilerin gerçekten .resx dosyalarından okunduğunu doğrular.
///
/// Bu testler önemli çünkü IStringLocalizer, resource bulunamadığında
/// exception fırlatmaz - anahtarın kendisini döner. Yanlış bir ResourcesPath
/// ya da yanlış adlandırılmış bir .resx dosyası, hiçbir hata üretmeden
/// ekranda "Notification_TicketAssigned" gibi ham anahtarların görünmesine
/// yol açardı. Buradaki assert'ler o sessiz bozulmayı yakalar.
/// </summary>
public class LocalizedMessageProviderTests
{
    private static LocalizedMessageProvider CreateProvider()
    {
        var services = new ServiceCollection();
        // ResourceManagerStringLocalizerFactory ILoggerFactory'ye bağımlı.
        services.AddLogging();
        services.AddLocalization(options => options.ResourcesPath = "Localization");

        var provider = services.BuildServiceProvider();
        var localizer = provider.GetRequiredService<IStringLocalizer<Messages>>();

        return new LocalizedMessageProvider(localizer);
    }

    [Fact]
    public void GetFor_Turkish_ReturnsTurkishTranslation()
    {
        var provider = CreateProvider();

        var message = provider.GetFor(
            SupportedLanguages.Turkish,
            MessageKeys.NotificationTicketAssigned,
            "Yazıcı çalışmıyor");

        Assert.Equal("\"Yazıcı çalışmıyor\" başlıklı talep size atandı.", message);
    }

    [Fact]
    public void GetFor_English_ReturnsEnglishTranslation()
    {
        var provider = CreateProvider();

        var message = provider.GetFor(
            SupportedLanguages.English,
            MessageKeys.NotificationTicketAssigned,
            "Printer not working");

        Assert.Equal("The ticket \"Printer not working\" has been assigned to you.", message);
    }

    [Fact]
    public void GetFor_UnsupportedLanguage_FallsBackToDefault()
    {
        var provider = CreateProvider();

        // Desteklenmeyen dil varsayılana (Türkçe) düşmeli.
        var message = provider.GetFor("de", MessageKeys.SlaBreachTypeResponse);

        Assert.Equal("yanıt", message);
    }

    [Fact]
    public void GetFor_RegionalLanguageCode_IsNormalizedToPrimaryLanguage()
    {
        var provider = CreateProvider();

        // "en-US" gibi bölgesel kodlar "en" olarak ele alınmalı.
        var message = provider.GetFor("en-US", MessageKeys.SlaBreachTypeResolution);

        Assert.Equal("resolution", message);
    }

    [Fact]
    public void GetFor_DoesNotLeakCultureToCallingContext()
    {
        var provider = CreateProvider();

        var originalCulture = new CultureInfo(SupportedLanguages.Turkish);
        CultureInfo.CurrentUICulture = originalCulture;

        provider.GetFor(SupportedLanguages.English, MessageKeys.SlaBreachTypeResponse);

        // GetFor kültürü geçici olarak değiştiriyor; çağrıdan sonra
        // çağıranın kültürü bozulmamış olmalı.
        Assert.Equal(
            originalCulture.TwoLetterISOLanguageName,
            CultureInfo.CurrentUICulture.TwoLetterISOLanguageName);
    }

    [Fact]
    public void Get_UsesAmbientCulture()
    {
        var provider = CreateProvider();

        CultureInfo.CurrentUICulture = new CultureInfo(SupportedLanguages.English);

        var message = provider.Get(MessageKeys.SlaBreachTypeResponse);

        Assert.Equal("response", message);
    }

    [Theory]
    [InlineData(MessageKeys.NotificationTicketAssigned)]
    [InlineData(MessageKeys.NotificationTicketAutoAssigned)]
    [InlineData(MessageKeys.NotificationTicketStatusChanged)]
    [InlineData(MessageKeys.NotificationSlaBreachReporter)]
    [InlineData(MessageKeys.NotificationSlaBreachAssignee)]
    [InlineData(MessageKeys.SlaBreachTypeResponse)]
    [InlineData(MessageKeys.SlaBreachTypeResolution)]
    [InlineData(MessageKeys.AssignmentNoteAutoAssigned)]
    [InlineData(MessageKeys.EmailNotificationSubject)]
    [InlineData(MessageKeys.ErrorCategoryInUse)]
    [InlineData(MessageKeys.ErrorRuleAssignTargetInvalid)]
    [InlineData(MessageKeys.ErrorProjectNotFound)]
    [InlineData(MessageKeys.ErrorUserNotFound)]
    public void EveryKey_HasTranslationInEveryLanguage(string key)
    {
        var provider = CreateProvider();

        foreach (var language in SupportedLanguages.All)
        {
            var message = provider.GetFor(language, key, "x", "y");

            // Çeviri eksikse IStringLocalizer anahtarın kendisini döner.
            Assert.NotEqual(key, message);
            Assert.False(string.IsNullOrWhiteSpace(message));
        }
    }
}
