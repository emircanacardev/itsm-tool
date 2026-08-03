using ITSM.Domain.Constants;
using ITSM.Domain.Entities;

namespace ITSM.UnitTests;

/// <summary>
/// Referans verilerin görünen adı çözülürken izlenen sıra:
/// istenen dil -> varsayılan dil -> entity'nin kendi Name alanı.
///
/// Bu zincir önemli çünkü eksik bir çeviri arayüzde boş bir hücre ya da
/// ham bir değer olarak görünmemeli; her durumda okunabilir bir ad dönmeli.
/// </summary>
public class TranslationExtensionsTests
{
    private static Status CreateStatus(params (string Language, string Name)[] translations) => new()
    {
        Id = TicketStatuses.Acik,
        Name = "Fallback Adı",
        SortOrder = 10,
        Translations = translations
            .Select(t => new StatusTranslation
            {
                StatusId = TicketStatuses.Acik,
                LanguageCode = t.Language,
                Name = t.Name
            })
            .ToList()
    };

    [Fact]
    public void GetLocalizedName_ReturnsRequestedLanguage()
    {
        var status = CreateStatus(
            (SupportedLanguages.Turkish, "Açık"),
            (SupportedLanguages.English, "Open"));

        Assert.Equal("Açık", status.GetLocalizedName(SupportedLanguages.Turkish));
        Assert.Equal("Open", status.GetLocalizedName(SupportedLanguages.English));
    }

    [Fact]
    public void GetLocalizedName_MissingRequestedLanguage_FallsBackToDefaultLanguage()
    {
        // İngilizce çevirisi olmayan bir kayıt Türkçesine düşmeli.
        var status = CreateStatus((SupportedLanguages.Turkish, "Açık"));

        Assert.Equal("Açık", status.GetLocalizedName(SupportedLanguages.English));
    }

    [Fact]
    public void GetLocalizedName_NoTranslationsAtAll_FallsBackToEntityName()
    {
        var status = CreateStatus();

        Assert.Equal("Fallback Adı", status.GetLocalizedName(SupportedLanguages.English));
    }

    [Fact]
    public void GetLocalizedName_RegionalCode_IsNormalized()
    {
        var status = CreateStatus(
            (SupportedLanguages.Turkish, "Açık"),
            (SupportedLanguages.English, "Open"));

        Assert.Equal("Open", status.GetLocalizedName("en-GB"));
    }

    [Fact]
    public void GetLocalizedName_UnsupportedLanguage_UsesDefaultLanguage()
    {
        var status = CreateStatus(
            (SupportedLanguages.Turkish, "Açık"),
            (SupportedLanguages.English, "Open"));

        Assert.Equal("Açık", status.GetLocalizedName("de"));
    }

    [Fact]
    public void Priority_GetLocalizedName_ResolvesTranslation()
    {
        var priority = new Priority
        {
            Id = TicketPriorities.Kritik,
            Name = "Kritik",
            SortOrder = 10,
            Translations =
            [
                new PriorityTranslation
                {
                    PriorityId = TicketPriorities.Kritik,
                    LanguageCode = SupportedLanguages.English,
                    Name = "Critical"
                }
            ]
        };

        Assert.Equal("Critical", priority.GetLocalizedName(SupportedLanguages.English));
    }
}
