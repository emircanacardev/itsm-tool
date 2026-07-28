using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface ICommentRepository
{
    Task<List<Comment>> GetAllByTicketIdAsync(long ticketId);
    Task AddAsync(Comment comment);
}