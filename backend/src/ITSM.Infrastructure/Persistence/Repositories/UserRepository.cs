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
    public async Task<User?> GetByIdAsync(long id)
    {
        return await _context.Users.Include(u => u.Group).FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<List<User>> GetAllAsync(string? search)
    {
        var query = _context.Users.Include(u => u.Group).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            // Kullanıcı sayısı büyüdükçe (ör. binlerce) tüm listeyi çekip
            // arayüzde filtrelemek ölçeklenmez - arama terimi verilince
            // sunucu tarafında filtreleyip sonucu makul bir sayıyla
            // sınırlıyoruz (typeahead/arama kutusu senaryosu).
            query = query.Where(u =>
                EF.Functions.ILike(u.FullName, $"%{search}%") ||
                EF.Functions.ILike(u.Email, $"%{search}%"));

            return await query.OrderBy(u => u.FullName).Take(20).ToListAsync();
        }

        return await query.OrderBy(u => u.FullName).ToListAsync();
    }

    // Kullanıcılar sekmesindeki tablo için: search'süz tam liste yerine
    // sunucu tarafında sayfalanmış sonuç + toplam sayı. GetAllAsync yukarıda
    // typeahead (Yetkilendirme sekmesindeki arama kutusu) için ayrı kalıyor,
    // burada onu bozmadan aynı ILike filtresini sayfalamayla birleştiriyoruz.
    public async Task<(List<User> Items, int TotalCount)> GetAllPagedAsync(string? search, string? sortBy, bool sortDescending, int page, int pageSize)
    {
        var query = _context.Users.Include(u => u.Group).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(u =>
                EF.Functions.ILike(u.FullName, $"%{search}%") ||
                EF.Functions.ILike(u.Email, $"%{search}%"));
        }

        // Kullanıcılar tablosundaki sütun başlıklarına tıklayarak sıralama -
        // bkz. TicketRepository.GetAllAsync'teki aynı sortBy switch pattern'i.
        query = sortBy?.ToLowerInvariant() switch
        {
            "email" => sortDescending ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
            "group" => sortDescending ? query.OrderByDescending(u => u.Group.Name) : query.OrderBy(u => u.Group.Name),
            "status" => sortDescending ? query.OrderByDescending(u => u.IsActive) : query.OrderBy(u => u.IsActive),
            "createdat" => sortDescending ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt),
            _ => sortDescending ? query.OrderByDescending(u => u.FullName) : query.OrderBy(u => u.FullName)
        };

        var totalCount = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return (items, totalCount);
    }

    public async Task UpdateAsync(User user)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }
}