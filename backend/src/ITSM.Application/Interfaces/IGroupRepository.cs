using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IGroupRepository
{
    Task<Group?> GetByIdAsync(long id);
    Task<Group?> GetByNameAsync(string name);
    Task<List<Group>> GetAllAsync();
    Task AddAsync(Group group);
    Task UpdateAsync(Group group);
}