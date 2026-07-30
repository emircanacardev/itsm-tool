using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface INotificationRepository
{
    Task<Notification?> GetByIdAsync(long id);
    Task<List<Notification>> GetAllByUserIdAsync(long userId);
    Task AddAsync(Notification notification);
    Task UpdateAsync(Notification notification);
}