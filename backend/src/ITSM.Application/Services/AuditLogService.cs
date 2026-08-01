using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class AuditLogService
{
    private readonly IAuditLogRepository _auditLogRepository;

    public AuditLogService(IAuditLogRepository auditLogRepository)
    {
        _auditLogRepository = auditLogRepository;
    }

    public async Task<PagedResult<AuditLogResponse>> GetAllAsync(AuditLogFilterRequest filter)
    {
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize is < 1 or > 100 ? 20 : filter.PageSize;

        var (items, totalCount) = await _auditLogRepository.GetAllAsync(
            filter.EntityName,
            filter.UserId,
            filter.Action,
            filter.FromDate,
            filter.ToDate,
            page,
            pageSize);

        return new PagedResult<AuditLogResponse>
        {
            Items = items.Select(MapToResponse).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    private static AuditLogResponse MapToResponse(AuditLog log)
    {
        return new AuditLogResponse
        {
            Id = log.Id,
            UserId = log.UserId,
            UserFullName = log.User?.FullName,
            EntityName = log.EntityName,
            EntityId = log.EntityId,
            Action = log.Action,
            Details = log.Details,
            CreatedAt = log.CreatedAt
        };
    }
}
