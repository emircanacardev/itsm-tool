using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IGroupRepository
{
    Task<Group?> GetByIdAsync(long id);
    /// <summary>
    /// Sistemin ihtiyaç duyduğu bir grubu değişmez anahtarıyla getirir.
    /// Ada göre aramıyoruz: grup adları admin panelinden değiştirilebiliyor.
    /// </summary>
    Task<Group?> GetBySystemKeyAsync(string systemKey);
    Task<List<Group>> GetAllAsync(string? search = null);
    Task<(List<Group> Items, int TotalCount)> GetAllPagedAsync(string? search, string? sortBy, bool sortDescending, int page, int pageSize);
    Task AddAsync(Group group);
    Task UpdateAsync(Group group);
}