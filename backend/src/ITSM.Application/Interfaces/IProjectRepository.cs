using ITSM.Application.DTOs;
using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IProjectRepository
{
    Task<Project?> GetByIdAsync(long id);
    Task<List<Project>> GetAllAsync();
    Task<List<Project>> GetAllForUserAsync(long userId);
    Task<(List<Project> Items, int TotalCount)> GetAllPagedAsync(string? search, string? sortBy, bool sortDescending, int page, int pageSize);
    Task<Project?> GetByCodeAsync(string code);
    Task AddAsync(Project project);
    Task UpdateAsync(Project project);

    /// <summary>
    /// Verilen projeler için talep/üye sayaçlarını tek sorguda döner.
    /// Kart başına ayrı istek atmamak için toplu (batch) çalışır.
    /// </summary>
    Task<List<ProjectStats>> GetStatsAsync(IEnumerable<long> projectIds);
}