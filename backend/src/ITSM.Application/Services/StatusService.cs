using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class StatusService
{
    private readonly IStatusRepository _statusRepository;
    private readonly ICurrentLanguageProvider _languageProvider;

    public StatusService(IStatusRepository statusRepository, ICurrentLanguageProvider languageProvider)
    {
        _statusRepository = statusRepository;
        _languageProvider = languageProvider;
    }

    public async Task<List<StatusResponse>> GetAllStatusesAsync()
    {
        var statuses = await _statusRepository.GetAllAsync();
        var language = _languageProvider.GetCurrentLanguage();

        return statuses.Select(s => MapToResponse(s, language)).ToList();
    }

    private static StatusResponse MapToResponse(Status status, string language)
    {
        return new StatusResponse
        {
            Id = status.Id,
            Name = status.GetLocalizedName(language),
            SortOrder = status.SortOrder
        };
    }
}
