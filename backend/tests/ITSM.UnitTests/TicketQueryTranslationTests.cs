using ITSM.Domain.Constants;
using ITSM.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace ITSM.UnitTests;

/// <summary>
/// TicketStatuses.ClosedStates gibi dizi sabitleri EF sorgularında
/// Contains(...) ile kullanılıyor. Bu ifadenin sunucu tarafında SQL'e
/// çevrilmesi şart: çevrilemezse EF ya patlar ya da (daha kötüsü) tüm
/// tabloyu belleğe çekip filtreyi client-side uygular.
///
/// Buradaki testler gerçek Npgsql sorgu üreticisiyle çalışıyor ama
/// veritabanına bağlanmıyor - sadece üretilen SQL metnini inceliyorlar.
/// </summary>
public class TicketQueryTranslationTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            // Bağlantı hiç açılmıyor; provider yalnızca SQL üretimi için gerekli.
            .UseNpgsql("Host=localhost;Database=itsm_translation_test;Username=test;Password=test")
            .Options;

        return new AppDbContext(options, Mock.Of<IHttpContextAccessor>());
    }

    [Fact]
    public void ClosedStatesContains_TranslatesToSql()
    {
        using var context = CreateContext();

        var sql = context.Tickets
            .Where(t => TicketStatuses.ClosedStates.Contains(t.StatusId))
            .ToQueryString();

        // Çeviri başarılıysa filtre WHERE'e iner. Client-side'a düşseydi
        // ToQueryString() koşulsuz bir SELECT üretirdi.
        Assert.Contains("WHERE", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("StatusId", sql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void NegatedClosedStatesContains_TranslatesToSql()
    {
        using var context = CreateContext();

        // TicketRepository.GetActiveTicketsWithSlaAsync'teki "kapanmamış" filtresi.
        var sql = context.Tickets
            .Where(t => t.SlaId != null && !TicketStatuses.ClosedStates.Contains(t.StatusId))
            .ToQueryString();

        Assert.Contains("WHERE", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("StatusId", sql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ClosedStatesContains_InsideCorrelatedSubquery_TranslatesToSql()
    {
        using var context = CreateContext();

        // En riskli kullanım: GetLeastLoadedUserInGroupAsync'te Contains,
        // OrderBy içindeki korelasyonlu bir Count alt sorgusunun içinde geçiyor.
        var sql = context.Users
            .Where(u => u.IsActive)
            .OrderBy(u => context.Tickets.Count(t =>
                t.AssignedTo == u.Id && !TicketStatuses.ClosedStates.Contains(t.StatusId)))
            .Select(u => u.Id)
            .ToQueryString();

        Assert.Contains("ORDER BY", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("COUNT", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("StatusId", sql, StringComparison.OrdinalIgnoreCase);
    }
}
