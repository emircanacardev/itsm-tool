using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IAuditLogRepository
{
    Task<(List<AuditLog> Items, int TotalCount)> GetAllAsync(
        string? search,
        long? userId,
        string? action,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate,
        string? sortBy,
        bool sortDescending,
        int page,
        int pageSize);
}
