using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface ITicketRepository
{
    Task<Ticket?> GetByIdAsync(long id);
    Task<List<Ticket>> GetAllAsync();
    Task AddAsync(Ticket ticket);
}