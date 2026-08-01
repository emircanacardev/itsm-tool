using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class StatusService
{
    private readonly IStatusRepository _statusRepository;

    public StatusService(IStatusRepository statusRepository)
    {
        _statusRepository = statusRepository;
    }

    public async Task<List<StatusResponse>> GetAllStatusesAsync()
    {
        var statuses = await _statusRepository.GetAllAsync();
        return statuses.Select(MapToResponse).ToList();
    }

    private static StatusResponse MapToResponse(Status status)
    {
        return new StatusResponse
        {
            Id = status.Id,
            Name = status.Name,
            SortOrder = status.SortOrder
        };
    }
}
