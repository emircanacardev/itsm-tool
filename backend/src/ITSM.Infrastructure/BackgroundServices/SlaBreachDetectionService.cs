using ITSM.Application.Configuration;
using ITSM.Application.Interfaces;
using ITSM.Application.Notifications;
using ITSM.Application.Services;
using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using ITSM.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;


namespace ITSM.Infrastructure.BackgroundServices;

public class SlaBreachDetectionService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SlaBreachDetectionService> _logger;
    private readonly TimeSpan _checkInterval;

    public SlaBreachDetectionService(
        IServiceScopeFactory scopeFactory,
        ILogger<SlaBreachDetectionService> logger,
        IOptions<SlaMonitoringOptions> options)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _checkInterval = TimeSpan.FromMinutes(options.Value.CheckIntervalMinutes);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckForBreachesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SLA breach kontrolü sırasında hata oluştu.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }

    private async Task CheckForBreachesAsync()
    {
        using var scope = _scopeFactory.CreateScope();

        var ticketRepository = scope.ServiceProvider.GetRequiredService<ITicketRepository>();
        var slaBreachRepository = scope.ServiceProvider.GetRequiredService<ISlaBreachRepository>();
        var notificationService = scope.ServiceProvider.GetRequiredService<NotificationService>();

        var tickets = await ticketRepository.GetActiveTicketsWithSlaAsync();
        var now = DateTimeOffset.UtcNow;

        foreach (var ticket in tickets)
        {
            var isResponseBreached = ticket.AssignedTo is null &&
                now > ticket.CreatedAt.AddMinutes(ticket.Sla!.ResponseTimeMinutes);

            if (isResponseBreached)
            {
                await TryRecordBreachAsync(ticket, BreachType.Response, slaBreachRepository, notificationService);
            }

            var isResolutionBreached = ticket.DueAt.HasValue && now > ticket.DueAt.Value;

            if (isResolutionBreached)
            {
                await TryRecordBreachAsync(ticket, BreachType.Resolution, slaBreachRepository, notificationService);
            }
        }
    }

    private static async Task TryRecordBreachAsync(
        Ticket ticket,
        BreachType breachType,
        ISlaBreachRepository slaBreachRepository,
        NotificationService notificationService)
    {
        var existingBreach = await slaBreachRepository.GetByTicketAndTypeAsync(ticket.Id, breachType);
        if (existingBreach is not null)
        {
            return;
        }

        var breach = new SlaBreach
        {
            TicketId = ticket.Id,
            BreachType = breachType
        };

        await slaBreachRepository.AddAsync(breach);

        // Metin burada kurulmuyor: bildirim tür + payload olarak saklanıyor,
        // cümle okuma anında alıcının diline göre üretiliyor. Bu servis bir
        // HTTP isteği bağlamında çalışmadığı için Accept-Language da yok.
        await notificationService.CreateNotificationAsync(
            ticket.CreatedBy,
            ticket.Id,
            NotificationTypes.SlaBreach,
            new NotificationPayload
            {
                TicketTitle = ticket.Title,
                BreachType = breachType.ToString()
            });

        if (breachType == BreachType.Resolution && ticket.AssignedTo.HasValue)
        {
            await notificationService.CreateNotificationAsync(
                ticket.AssignedTo.Value,
                ticket.Id,
                NotificationTypes.SlaBreach,
                new NotificationPayload
                {
                    TicketTitle = ticket.Title,
                    BreachType = breachType.ToString(),
                    IsAssigneeNotification = true
                });
        }
    }
}