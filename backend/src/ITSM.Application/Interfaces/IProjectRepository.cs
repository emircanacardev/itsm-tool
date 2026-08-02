using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IProjectRepository
{
    Task<Project?> GetByIdAsync(long id);
    Task<List<Project>> GetAllAsync();
    Task<List<Project>> GetAllForUserAsync(long userId);
    Task<(List<Project> Items, int TotalCount)> GetAllPagedAsync(int page, int pageSize);
    Task<Project?> GetByCodeAsync(string code);
    Task AddAsync(Project project);
    Task UpdateAsync(Project project);
}