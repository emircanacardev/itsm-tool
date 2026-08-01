using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IPriorityRepository
{
    Task<List<Priority>> GetAllAsync();
}
