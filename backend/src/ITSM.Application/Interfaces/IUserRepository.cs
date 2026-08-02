using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(long id);
    Task<List<User>> GetAllAsync(string? search);
    Task<(List<User> Items, int TotalCount)> GetAllPagedAsync(string? search, string? sortBy, bool sortDescending, int page, int pageSize);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
}