using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using ITSM.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class GroupRepository : IGroupRepository
{
    private readonly AppDbContext _context;

    public GroupRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Group?> GetByIdAsync(long id)
    {
        return await _context.Groups.FirstOrDefaultAsync(g => g.Id == id);
    }

    public async Task<Group?> GetBySystemKeyAsync(string systemKey)
    {
        return await _context.Groups.FirstOrDefaultAsync(g => g.SystemKey == systemKey);
    }

    public async Task<List<Group>> GetAllAsync(string? search = null)
    {
        var query = _context.Groups.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            // Grup sayısı büyüdükçe (ör. binlerce) tüm listeyi çekip
            // arayüzde filtrelemek ölçeklenmez - arama terimi verilince
            // sunucu tarafında filtreleyip sonucu makul bir sayıyla
            // sınırlıyoruz (kullanıcı satırındaki grup seçme kutusu gibi
            // typeahead senaryoları için, bkz. UserRepository.GetAllAsync).
            query = query.Where(g => EF.Functions.ILike(g.Name, $"%{search}%"));
            return await query.OrderBy(g => g.Name).Take(20).ToListAsync();
        }

        return await query.OrderBy(g => g.Name).ToListAsync();
    }

    public async Task<(List<Group> Items, int TotalCount)> GetAllPagedAsync(string? search, string? sortBy, bool sortDescending, int page, int pageSize)
    {
        var query = _context.Groups.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(g =>
                EF.Functions.ILike(g.Name, $"%{search}%") ||
                (g.Description != null && EF.Functions.ILike(g.Description, $"%{search}%")));
        }

        // Gruplar tablosundaki sütun başlıklarına tıklayarak sıralama -
        // bkz. TicketRepository.GetAllAsync'teki aynı sortBy switch pattern'i.
        query = sortBy?.ToLowerInvariant() switch
        {
            "description" => sortDescending ? query.OrderByDescending(g => g.Description) : query.OrderBy(g => g.Description),
            "createdat" => sortDescending ? query.OrderByDescending(g => g.CreatedAt) : query.OrderBy(g => g.CreatedAt),
            _ => sortDescending ? query.OrderByDescending(g => g.Name) : query.OrderBy(g => g.Name)
        };

        var totalCount = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return (items, totalCount);
    }

    public async Task AddAsync(Group group)
    {
        _context.Groups.Add(group);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Group group)
    {
        _context.Groups.Update(group);
        await _context.SaveChangesAsync();
    }
}