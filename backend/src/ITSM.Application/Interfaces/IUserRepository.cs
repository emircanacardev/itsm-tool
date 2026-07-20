using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
}