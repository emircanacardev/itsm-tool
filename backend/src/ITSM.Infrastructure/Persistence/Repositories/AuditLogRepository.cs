using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _context;

    public AuditLogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<(List<AuditLog> Items, int TotalCount)> GetAllAsync(
        string? search,
        long? userId,
        string? action,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate,
        string? sortBy,
        bool sortDescending,
        int page,
        int pageSize)
    {
        // Npgsql, 'timestamp with time zone' kolonuna sadece Offset=0 (UTC) olan
        // DateTimeOffset değerleri yazılmasına izin veriyor. Query string'den
        // gelen tarih değerleri (ör. "2026-08-02") .NET tarafından sunucunun
        // yerel saat dilimiyle (ör. +03:00) parse ediliyor - ToUniversalTime()
        // aynı ânı UTC karşılığına çevirip Npgsql'in kabul ettiği forma sokuyor.
        fromDate = fromDate?.ToUniversalTime();
        toDate = toDate?.ToUniversalTime();

        var query = _context.AuditLogs
            .Include(a => a.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            // Hem varlık adına (ör. "Ticket" yazınca "Ticket" ve
            // "TicketAssignment"/"TicketStatusHistory" gibi ilişkili kayıtları
            // da bulur) hem de işlemi yapan kullanıcının adına bakıyoruz (OR) -
            // arama kutusunun placeholder'ı bir kişi adı örneği de içeriyor,
            // önceden sadece varlık adına bakıp kullanıcı adını hiç aramıyordu.
            query = query.Where(a =>
                EF.Functions.ILike(a.EntityName, $"%{search}%") ||
                (a.User != null && EF.Functions.ILike(a.User.FullName, $"%{search}%")));
        }

        if (userId is not null)
        {
            query = query.Where(a => a.UserId == userId);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(a => a.Action == action);
        }

        if (fromDate is not null)
        {
            query = query.Where(a => a.CreatedAt >= fromDate);
        }

        if (toDate is not null)
        {
            query = query.Where(a => a.CreatedAt <= toDate);
        }

        var totalCount = await query.CountAsync();

        // Audit Log tablosundaki sütun başlıklarına tıklayarak sıralama -
        // bkz. TicketRepository.GetAllAsync'teki assignedToName ile aynı null-safe pattern.
        query = sortBy?.ToLowerInvariant() switch
        {
            "user" => sortDescending
                ? query.OrderByDescending(a => a.User != null ? a.User.FullName : null)
                : query.OrderBy(a => a.User != null ? a.User.FullName : null),
            "entity" => sortDescending ? query.OrderByDescending(a => a.EntityName) : query.OrderBy(a => a.EntityName),
            "action" => sortDescending ? query.OrderByDescending(a => a.Action) : query.OrderBy(a => a.Action),
            _ => sortDescending ? query.OrderByDescending(a => a.CreatedAt) : query.OrderBy(a => a.CreatedAt)
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}
