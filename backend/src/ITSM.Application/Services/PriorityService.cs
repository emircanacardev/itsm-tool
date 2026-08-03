using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class PriorityService
{
    private readonly IPriorityRepository _priorityRepository;
    private readonly ICurrentLanguageProvider _languageProvider;

    public PriorityService(IPriorityRepository priorityRepository, ICurrentLanguageProvider languageProvider)
    {
        _priorityRepository = priorityRepository;
        _languageProvider = languageProvider;
    }

    public async Task<List<PriorityResponse>> GetAllPrioritiesAsync()
    {
        var priorities = await _priorityRepository.GetAllAsync();
        var language = _languageProvider.GetCurrentLanguage();

        return priorities.Select(p => MapToResponse(p, language)).ToList();
    }

    private static PriorityResponse MapToResponse(Priority priority, string language)
    {
        return new PriorityResponse
        {
            Id = priority.Id,
            Name = priority.GetLocalizedName(language),
            SortOrder = priority.SortOrder
        };
    }
}
