using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IStatusRepository
{
    Task<List<Status>> GetAllAsync();
}
