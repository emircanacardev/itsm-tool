using ITSM.Infrastructure.Persistence;

namespace ITSM.UnitTests;

/// <summary>
/// Aktivite Kaydı'ndaki "Detay" sütunu bu biçimlendiriciden besleniyor.
/// Sütun daha önce her satırda "-" gösteriyordu çünkü AuditLog.Details
/// hiç doldurulmuyordu.
/// </summary>
public class AuditDetailFormatterTests
{
    [Fact]
    public void DescribeProperty_ShowsOldAndNewValue()
    {
        var result = AuditDetailFormatter.DescribeProperty("Title", "Eski başlık", "Yeni başlık");

        Assert.Equal("Title: Eski başlık -> Yeni başlık", result);
    }

    [Theory]
    [InlineData("PasswordHash")]
    [InlineData("passwordhash")]
    [InlineData("RefreshToken")]
    public void DescribeProperty_NeverWritesSecrets(string propertyName)
    {
        // Parola özeti denetim kaydını görüntüleyen yöneticide de olmamalı.
        var result = AuditDetailFormatter.DescribeProperty(propertyName, "eski-gizli-deger", "yeni-gizli-deger");

        Assert.DoesNotContain("eski-gizli-deger", result);
        Assert.DoesNotContain("yeni-gizli-deger", result);
        Assert.Equal($"{propertyName}: ***", result);
    }

    [Fact]
    public void FormatValue_NullBecomesDash()
    {
        Assert.Equal("-", AuditDetailFormatter.FormatValue(null));
    }

    [Fact]
    public void FormatValue_BooleanIsReadable()
    {
        Assert.Equal("true", AuditDetailFormatter.FormatValue(true));
        Assert.Equal("false", AuditDetailFormatter.FormatValue(false));
    }

    [Fact]
    public void FormatValue_TruncatesLongText()
    {
        // Talep açıklaması / makale içeriği gibi uzun alanlar denetim
        // kaydını okunmaz hâle getiriyordu.
        var longText = new string('a', 200);

        var result = AuditDetailFormatter.FormatValue(longText);

        Assert.EndsWith("…", result);
        Assert.Equal(AuditDetailFormatter.MaxValueLength + 1, result.Length);
    }

    [Fact]
    public void FormatValue_KeepsShortTextIntact()
    {
        Assert.Equal("Açık", AuditDetailFormatter.FormatValue("Açık"));
    }

    [Fact]
    public void FormatValue_DateUsesSortableFormat()
    {
        var moment = new DateTimeOffset(2026, 8, 4, 12, 30, 0, TimeSpan.Zero);

        var result = AuditDetailFormatter.FormatValue(moment);

        // Yerel biçim yerine ISO: kayıt hangi makinede okunursa okunsun aynı.
        Assert.StartsWith("2026-08-04T12:30:00", result);
    }
}
