using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using ITSM.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class AttachmentRepository : IAttachmentRepository
{
    private readonly AppDbContext _context;

    public AttachmentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Attachment?> GetByIdAsync(long id)
    {
        return await _context.Attachments.FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<List<Attachment>> GetAllByTicketIdAsync(long ticketId)
    {
        return await _context.Attachments
            .Include(a => a.UploadedByUser)
            .Where(a => a.TicketId == ticketId)
            .OrderByDescending(a => a.UploadedAt)
            .ToListAsync();
    }

    public async Task AddAsync(Attachment attachment)
    {
        _context.Attachments.Add(attachment);
        await _context.SaveChangesAsync();
    }
}