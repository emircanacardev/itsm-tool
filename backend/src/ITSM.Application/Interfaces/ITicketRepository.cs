using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface ITicketRepository
{
    Task<Ticket?> GetByIdAsync(long id);
    Task<(List<Ticket> Items, int TotalCount)> GetAllAsync(
        long userId,
        bool includeAll,
        long? statusId,
        long? priorityId,
        long? projectId,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate,
        string? search,
        string? sortBy,
        bool sortDescending,
        int page,
        int pageSize);
    Task AddAsync(Ticket ticket);
    Task UpdateStatusAsync(Ticket ticket, TicketStatusHistory history);
    Task AssignAsync(Ticket ticket, TicketAssignment assignment);
    Task<List<Ticket>> GetActiveTicketsWithSlaAsync();
    Task<long?> GetLeastLoadedUserInGroupAsync(long groupId);
    Task<bool> ExistsByCategoryIdAsync(long categoryId);
}