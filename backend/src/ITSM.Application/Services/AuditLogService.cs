using ITSM.Application.Configuration;
using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using Microsoft.Extensions.Options;

namespace ITSM.Application.Services;

public class AuditLogService
{
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly PaginationOptions _paginationOptions;

    public AuditLogService(IAuditLogRepository auditLogRepository, IOptions<PaginationOptions> paginationOptions)
    {
        _auditLogRepository = auditLogRepository;
        _paginationOptions = paginationOptions.Value;
    }

    public async Task<PagedResult<AuditLogResponse>> GetAllAsync(AuditLogFilterRequest filter)
    {
        var page = _paginationOptions.NormalizePage(filter.Page);
        var pageSize = _paginationOptions.NormalizePageSize(filter.PageSize);

        var (items, totalCount) = await _auditLogRepository.GetAllAsync(
            filter.Search,
            filter.UserId,
            filter.Action,
            filter.FromDate,
            filter.ToDate,
            filter.SortBy,
            filter.SortDescending,
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
