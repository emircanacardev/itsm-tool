using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IAuditLogRepository
{
    Task<(List<AuditLog> Items, int TotalCount)> GetAllAsync(
        string? entityName,
        long? userId,
        string? action,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate,
        int page,
        int pageSize);
}
