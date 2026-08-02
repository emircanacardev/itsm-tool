using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface ISlaRepository
{
    Task<Sla?> GetByIdAsync(long id);
    Task<List<Sla>> GetAllAsync();
    Task<Sla?> GetByProjectCategoryPriorityAsync(long? projectId, long? categoryId, long priorityId);
    Task<Sla?> GetApplicableSlaAsync(long projectId, long categoryId, long priorityId);
    Task AddAsync(Sla sla);
    Task UpdateAsync(Sla sla);
    Task DeleteAsync(Sla sla);
}