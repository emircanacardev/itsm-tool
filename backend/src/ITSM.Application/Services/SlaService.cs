using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class SlaService
{
    private readonly ISlaRepository _slaRepository;

    public SlaService(ISlaRepository slaRepository)
    {
        _slaRepository = slaRepository;
    }

    public async Task<SlaResponse?> CreateSlaAsync(CreateSlaRequest request)
    {
        var existing = await _slaRepository.GetByProjectCategoryPriorityAsync(
            request.ProjectId, request.CategoryId, request.PriorityId);

        if (existing is not null)
        {
            return null;
        }

        var sla = new Sla
        {
            ProjectId = request.ProjectId,
            CategoryId = request.CategoryId,
            PriorityId = request.PriorityId,
            ResponseTimeMinutes = request.ResponseTimeMinutes,
            ResolutionTimeMinutes = request.ResolutionTimeMinutes
        };

        await _slaRepository.AddAsync(sla);

        var created = await _slaRepository.GetByIdAsync(sla.Id);
        return MapToResponse(created!);
    }

    public async Task<List<SlaResponse>> GetAllSlasAsync()
    {
        var slas = await _slaRepository.GetAllAsync();
        return slas.Select(MapToResponse).ToList();
    }

    public async Task<SlaResponse?> GetSlaByIdAsync(long id)
    {
        var sla = await _slaRepository.GetByIdAsync(id);
        if (sla is null)
        {
            return null;
        }
        return MapToResponse(sla);
    }

    private static SlaResponse MapToResponse(Sla sla)
    {
        return new SlaResponse
        {
            Id = sla.Id,
            ProjectId = sla.ProjectId,
            CategoryId = sla.CategoryId,
            PriorityId = sla.PriorityId,
            PriorityName = sla.Priority.Name,
            ResponseTimeMinutes = sla.ResponseTimeMinutes,
            ResolutionTimeMinutes = sla.ResolutionTimeMinutes
        };
    }
}