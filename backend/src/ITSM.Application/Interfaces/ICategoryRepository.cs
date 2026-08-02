using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface ICategoryRepository
{
    Task<Category?> GetByIdAsync(long id);
    Task<List<Category>> GetAllByProjectIdAsync(long projectId);
    Task AddAsync(Category category);
    Task UpdateAsync(Category category);
    Task DeleteAsync(Category category);
}