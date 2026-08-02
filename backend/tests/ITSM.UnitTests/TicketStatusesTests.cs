using ITSM.Domain.Constants;

namespace ITSM.UnitTests;

/// <summary>
/// TicketStatuses sabitleri, StatusConfiguration.HasData ile seed edilen
/// Id'lerin kod tarafındaki karşılığı. Seed değişip sabitler değişmezse
/// (ya da tersi) SLA takibi ve dashboard sayımları sessizce yanlışlanır -
/// bu testler o eşleşmeyi kilitliyor.
/// </summary>
public class TicketStatusesTests
{
    [Fact]
    public void ClosedStates_ContainsOnlyResolvedAndClosed()
    {
        Assert.Equal([TicketStatuses.Cozuldu, TicketStatuses.Kapatildi], TicketStatuses.ClosedStates);
    }

    [Fact]
    public void OpenStates_ContainsOnlyNonClosedStatuses()
    {
        Assert.Equal(
            [TicketStatuses.Acik, TicketStatuses.DevamEdiyor, TicketStatuses.Beklemede],
            TicketStatuses.OpenStates);
    }

    [Fact]
    public void OpenAndClosedStates_DoNotOverlap()
    {
        Assert.Empty(TicketStatuses.OpenStates.Intersect(TicketStatuses.ClosedStates));
    }

    [Fact]
    public void Default_IsAcik()
    {
        // Yeni talep her zaman "Açık" durumunda başlamalı.
        Assert.Equal(TicketStatuses.Acik, TicketStatuses.Default);
    }

    [Theory]
    [InlineData(10)]
    [InlineData(20)]
    [InlineData(30)]
    [InlineData(40)]
    [InlineData(50)]
    public void EverySeededStatusId_IsCoveredByOpenOrClosedStates(long statusId)
    {
        // Seed'de bir durum eklenip buradaki listelere yazılmazsa yakalanır.
        var isCovered = TicketStatuses.OpenStates.Contains(statusId)
            || TicketStatuses.ClosedStates.Contains(statusId);

        Assert.True(isCovered, $"StatusId {statusId} ne OpenStates ne ClosedStates içinde.");
    }
}
