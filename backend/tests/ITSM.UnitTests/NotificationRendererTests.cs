using ITSM.Application;
using ITSM.Application.Notifications;
using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using ITSM.Domain.Enums;
using ITSM.Infrastructure.Localization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Localization;

namespace ITSM.UnitTests;

/// <summary>
/// Bildirim metni artık veritabanında saklanmıyor; tür + payload'dan okuma
/// anında üretiliyor. Bu testler o üretimi gerçek resource dosyalarıyla
/// doğruluyor: aynı kaydın iki dilde iki farklı cümle vermesi, i18n'in
/// çalıştığının asıl kanıtı.
/// </summary>
public class NotificationRendererTests
{
    private static NotificationRenderer CreateRenderer()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddLocalization(options => options.ResourcesPath = "Localization");

        var provider = services.BuildServiceProvider();
        var localizer = provider.GetRequiredService<IStringLocalizer<Messages>>();

        return new NotificationRenderer(new LocalizedMessageProvider(localizer));
    }

    private static Notification CreateNotification(string type, NotificationPayload payload) => new()
    {
        Id = 1,
        UserId = 1,
        TicketId = 1,
        Type = type,
        PayloadJson = NotificationRenderer.SerializePayload(payload)
    };

    [Fact]
    public void Render_TicketAssigned_ProducesDifferentTextPerLanguage()
    {
        var renderer = CreateRenderer();
        var notification = CreateNotification(
            NotificationTypes.TicketAssigned,
            new NotificationPayload { TicketTitle = "Yazıcı arızası" });

        var turkish = renderer.Render(notification, SupportedLanguages.Turkish);
        var english = renderer.Render(notification, SupportedLanguages.English);

        Assert.Equal("\"Yazıcı arızası\" başlıklı talep size atandı.", turkish);
        Assert.Equal("The ticket \"Yazıcı arızası\" has been assigned to you.", english);
    }

    [Fact]
    public void Render_TicketAutoAssigned_UsesAutoAssignmentWording()
    {
        var renderer = CreateRenderer();
        var notification = CreateNotification(
            NotificationTypes.TicketAutoAssigned,
            new NotificationPayload { TicketTitle = "VPN sorunu" });

        // Elle atama ile otomatik atama farklı cümleler kullanmalı.
        var turkish = renderer.Render(notification, SupportedLanguages.Turkish);
        var manual = renderer.Render(
            CreateNotification(NotificationTypes.TicketAssigned, new NotificationPayload { TicketTitle = "VPN sorunu" }),
            SupportedLanguages.Turkish);

        Assert.Contains("otomatik", turkish);
        Assert.NotEqual(manual, turkish);
    }

    [Fact]
    public void Render_TicketCommented_NamesTheCommenterInBothLanguages()
    {
        var renderer = CreateRenderer();
        var notification = CreateNotification(
            NotificationTypes.TicketCommented,
            new NotificationPayload { TicketTitle = "Disk doldu", ActorName = "Ayşe Demir" });

        var turkish = renderer.Render(notification, SupportedLanguages.Turkish);
        var english = renderer.Render(notification, SupportedLanguages.English);

        // Alıcının kime cevap vereceğini bildirimden görmesi gerekiyor:
        // hem yorumu yazan hem talep başlığı cümlede yer almalı.
        Assert.Equal("Ayşe Demir, \"Disk doldu\" başlıklı talebe yorum yaptı.", turkish);
        Assert.Equal("Ayşe Demir commented on the ticket \"Disk doldu\".", english);
    }

    [Fact]
    public void Render_TicketCommented_WithoutActorName_StillRenders()
    {
        var renderer = CreateRenderer();
        // ActorName'i olmayan eski/bozuk bir kayıt bildirim listesinin
        // tamamını düşürmemeli.
        var notification = CreateNotification(
            NotificationTypes.TicketCommented,
            new NotificationPayload { TicketTitle = "Disk doldu" });

        var turkish = renderer.Render(notification, SupportedLanguages.Turkish);

        Assert.Contains("Disk doldu", turkish);
    }

    [Fact]
    public void Render_TicketStatusChanged_IncludesTicketTitle()
    {
        var renderer = CreateRenderer();
        var notification = CreateNotification(
            NotificationTypes.TicketStatusChanged,
            new NotificationPayload { TicketTitle = "Disk dolu" });

        Assert.Contains("Disk dolu", renderer.Render(notification, SupportedLanguages.Turkish));
        Assert.Contains("Disk dolu", renderer.Render(notification, SupportedLanguages.English));
    }

    [Theory]
    [InlineData(nameof(BreachType.Response), "yanıt", "response")]
    [InlineData(nameof(BreachType.Resolution), "çözüm", "resolution")]
    public void Render_SlaBreachForReporter_UsesBreachTypeLabel(
        string breachType,
        string expectedTurkishLabel,
        string expectedEnglishLabel)
    {
        var renderer = CreateRenderer();
        var notification = CreateNotification(
            NotificationTypes.SlaBreach,
            new NotificationPayload { TicketTitle = "Sunucu yanıt vermiyor", BreachType = breachType });

        Assert.Contains(expectedTurkishLabel, renderer.Render(notification, SupportedLanguages.Turkish));
        Assert.Contains(expectedEnglishLabel, renderer.Render(notification, SupportedLanguages.English));
    }

    [Fact]
    public void Render_SlaBreachForAssignee_UsesAssigneeWording()
    {
        var renderer = CreateRenderer();

        var assigneeNotification = CreateNotification(
            NotificationTypes.SlaBreach,
            new NotificationPayload
            {
                TicketTitle = "Sunucu yanıt vermiyor",
                BreachType = nameof(BreachType.Resolution),
                IsAssigneeNotification = true
            });

        var reporterNotification = CreateNotification(
            NotificationTypes.SlaBreach,
            new NotificationPayload
            {
                TicketTitle = "Sunucu yanıt vermiyor",
                BreachType = nameof(BreachType.Resolution)
            });

        var assigneeText = renderer.Render(assigneeNotification, SupportedLanguages.Turkish);
        var reporterText = renderer.Render(reporterNotification, SupportedLanguages.Turkish);

        // Aynı ihlal için iki tarafa farklı cümle gitmeli.
        Assert.NotEqual(reporterText, assigneeText);
        Assert.Contains("size atanmış", assigneeText);
    }

    [Fact]
    public void Render_MalformedPayload_DoesNotThrow()
    {
        var renderer = CreateRenderer();
        var notification = new Notification
        {
            Id = 1,
            UserId = 1,
            Type = NotificationTypes.TicketAssigned,
            PayloadJson = "{ bu gecerli json degil"
        };

        // Bozuk tek bir kayıt bildirim listesinin tamamını düşürmemeli.
        var message = renderer.Render(notification, SupportedLanguages.Turkish);

        Assert.NotNull(message);
    }

    [Fact]
    public void Render_NullPayload_DoesNotThrow()
    {
        var renderer = CreateRenderer();
        var notification = new Notification
        {
            Id = 1,
            UserId = 1,
            Type = NotificationTypes.TicketStatusChanged,
            PayloadJson = null
        };

        var message = renderer.Render(notification, SupportedLanguages.Turkish);

        Assert.NotNull(message);
    }

    [Fact]
    public void Render_UnknownType_FallsBackToTicketTitle()
    {
        var renderer = CreateRenderer();
        var notification = CreateNotification(
            "SomeFutureTypeNotHandledYet",
            new NotificationPayload { TicketTitle = "Bilinmeyen tür" });

        // İleride eklenip burada ele alınmamış bir tür patlamamalı.
        Assert.Equal("Bilinmeyen tür", renderer.Render(notification, SupportedLanguages.Turkish));
    }

    [Fact]
    public void SerializePayload_UsesCamelCaseForJsonInterop()
    {
        var json = NotificationRenderer.SerializePayload(
            new NotificationPayload { TicketTitle = "Test" });

        // Payload'ın JSON'da camelCase durması, ileride frontend'in ya da
        // bir raporun aynı veriyi okuyabilmesi için önemli.
        Assert.Contains("ticketTitle", json);
    }
}
