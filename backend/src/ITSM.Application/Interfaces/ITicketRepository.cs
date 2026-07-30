using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface ITicketRepository
{
    Task<Ticket?> GetByIdAsync(long id);
    Task<List<Ticket>> GetAllAsync(
        long userId,
        bool includeAll,
        long? statusId,
        long? priorityId,
        long? projectId,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate);
    Task AddAsync(Ticket ticket);
    Task UpdateStatusAsync(Ticket ticket, TicketStatusHistory history);
    Task AssignAsync(Ticket ticket, TicketAssignment assignment);
    Task<List<Ticket>> GetActiveTicketsWithSlaAsync();
    Task<long?> GetLeastLoadedUserInGroupAsync(long groupId);
}