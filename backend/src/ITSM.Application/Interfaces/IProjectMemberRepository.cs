using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IProjectMemberRepository
{
    Task<ProjectMember?> GetByIdAsync(long id);
    Task<List<ProjectMember>> GetAllByProjectIdAsync(long projectId);
    Task<ProjectMember?> GetByProjectAndUserAsync(long projectId, long userId);
    Task AddAsync(ProjectMember member);
    Task DeleteAsync(ProjectMember member);
}