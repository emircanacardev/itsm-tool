using ITSM.Domain.Entities;
using ITSM.Domain.Enums;

namespace ITSM.Application.Interfaces;

public interface ISlaBreachRepository
{
    Task<SlaBreach?> GetByTicketAndTypeAsync(long ticketId, BreachType breachType);
    Task AddAsync(SlaBreach breach);
}