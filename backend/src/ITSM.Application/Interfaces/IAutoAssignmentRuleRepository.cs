using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IAutoAssignmentRuleRepository
{
    Task<AutoAssignmentRule?> GetByIdAsync(long id);
    Task<List<AutoAssignmentRule>> GetByProjectAsync(long projectId);
    Task AddAsync(AutoAssignmentRule rule);
    Task DeleteAsync(AutoAssignmentRule rule);
}
