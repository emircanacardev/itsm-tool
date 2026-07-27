using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(User user)
    {
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
    }
}