using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IAttachmentRepository
{
    Task<Attachment?> GetByIdAsync(long id);
    Task<List<Attachment>> GetAllByTicketIdAsync(long ticketId);
    Task AddAsync(Attachment attachment);
}