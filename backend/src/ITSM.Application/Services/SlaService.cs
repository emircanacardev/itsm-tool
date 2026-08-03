using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class SlaService
{
    private readonly ISlaRepository _slaRepository;
    private readonly ICurrentLanguageProvider _languageProvider;

    public SlaService(ISlaRepository slaRepository, ICurrentLanguageProvider languageProvider)
    {
        _slaRepository = slaRepository;
        _languageProvider = languageProvider;
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
        return MapToResponse(created!, _languageProvider.GetCurrentLanguage());
    }

    public async Task<List<SlaResponse>> GetAllSlasAsync()
    {
        var slas = await _slaRepository.GetAllAsync();
        var language = _languageProvider.GetCurrentLanguage();
        return slas.Select(s => MapToResponse(s, language)).ToList();
    }

    public async Task<SlaResponse?> GetSlaByIdAsync(long id)
    {
        var sla = await _slaRepository.GetByIdAsync(id);
        if (sla is null)
        {
            return null;
        }
        return MapToResponse(sla, _languageProvider.GetCurrentLanguage());
    }

    public async Task<bool> UpdateSlaAsync(long id, UpdateSlaRequest request)
    {
        var sla = await _slaRepository.GetByIdAsync(id);
        if (sla is null)
        {
            return false;
        }

        sla.ResponseTimeMinutes = request.ResponseTimeMinutes;
        sla.ResolutionTimeMinutes = request.ResolutionTimeMinutes;

        await _slaRepository.UpdateAsync(sla);
        return true;
    }

    public async Task<bool> DeleteSlaAsync(long id)
    {
        var sla = await _slaRepository.GetByIdAsync(id);
        if (sla is null)
        {
            return false;
        }

        await _slaRepository.DeleteAsync(sla);
        return true;
    }

    private static SlaResponse MapToResponse(Sla sla, string language)
    {
        return new SlaResponse
        {
            Id = sla.Id,
            ProjectId = sla.ProjectId,
            CategoryId = sla.CategoryId,
            PriorityId = sla.PriorityId,
            PriorityName = sla.Priority.GetLocalizedName(language),
            ResponseTimeMinutes = sla.ResponseTimeMinutes,
            ResolutionTimeMinutes = sla.ResolutionTimeMinutes
        };
    }
}