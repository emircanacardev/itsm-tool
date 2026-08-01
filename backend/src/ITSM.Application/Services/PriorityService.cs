using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class PriorityService
{
    private readonly IPriorityRepository _priorityRepository;

    public PriorityService(IPriorityRepository priorityRepository)
    {
        _priorityRepository = priorityRepository;
    }

    public async Task<List<PriorityResponse>> GetAllPrioritiesAsync()
    {
        var priorities = await _priorityRepository.GetAllAsync();
        return priorities.Select(MapToResponse).ToList();
    }

    private static PriorityResponse MapToResponse(Priority priority)
    {
        return new PriorityResponse
        {
            Id = priority.Id,
            Name = priority.Name,
            SortOrder = priority.SortOrder
        };
    }
}
