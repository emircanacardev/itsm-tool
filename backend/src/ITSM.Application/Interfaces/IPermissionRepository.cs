using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IPermissionRepository
{
    Task<List<Permission>> GetAllAsync();
}
