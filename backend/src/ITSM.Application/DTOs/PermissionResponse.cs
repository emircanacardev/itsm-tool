namespace ITSM.Application.DTOs;

// UserPermissionResponse'dan farklı - bu, sistemde tanımlı TÜM yetki
// kataloğunu temsil eder (bir kullanıcıya verilmiş olması şart değil).
// Admin panelde "hangi yetkiyi vereceğim" seçimi için kullanılıyor.
public class PermissionResponse
{
    public long Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
}
