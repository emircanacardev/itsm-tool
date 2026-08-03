namespace ITSM.Application.DTOs;

public class CurrentUserResponse
{
    public long Id { get; set; }
    public required string FullName { get; set; }
    public required string Email { get; set; }
    public long GroupId { get; set; }
    public required string GroupName { get; set; }
    public bool IsAdmin { get; set; }

    /// <summary>
    /// Kullanıcının kayıtlı dil tercihi. Frontend, giriş sonrası arayüz
    /// dilini bununla eşitler.
    /// </summary>
    public required string PreferredLanguage { get; set; }

    public List<UserPermissionResponse> Permissions { get; set; } = new();
}
