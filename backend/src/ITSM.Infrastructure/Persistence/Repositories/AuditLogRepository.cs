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
        string? entityName,
        long? userId,
        string? action,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate,
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

        if (!string.IsNullOrWhiteSpace(entityName))
        {
            // Tam eşleşme yerine ILike kullanıyoruz - "Ticket" yazınca hem
            // "Ticket" hem "TicketAssignment"/"TicketStatusHistory" gibi
            // ilişkili kayıtları da bulsun, büyük/küçük harf de önemli olmasın.
            query = query.Where(a => EF.Functions.ILike(a.EntityName, $"%{entityName}%"));
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

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}
