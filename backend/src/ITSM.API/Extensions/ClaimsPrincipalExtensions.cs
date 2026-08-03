using ITSM.Domain.Constants;
using System.Security.Claims;

namespace ITSM.API.Extensions;

/// <summary>
/// Controller'larda tekrar eden "sub claim'ini oku ve long'a çevir" işini
/// tek yerde toplayan yardımcılar.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// JWT'deki kullanıcı Id'sini döndürür. [Authorize] ile korunan bir action'da
    /// claim'in var olduğu garanti olduğundan burada exception fırlatmak doğru
    /// davranış: claim yoksa token üretimimizde bir hata var demektir.
    /// </summary>
    public static long GetUserId(this ClaimsPrincipal user)
    {
        var userIdClaim = user.FindFirst(ClaimNames.UserId)?.Value;

        if (!long.TryParse(userIdClaim, out var userId))
        {
            throw new InvalidOperationException(
                $"JWT içinde geçerli bir '{ClaimNames.UserId}' claim'i bulunamadı.");
        }

        return userId;
    }

    /// <summary>
    /// Kimliği doğrulanmamış olabilecek bağlamlar için (ör. AppDbContext'teki
    /// audit log yazımı) null dönebilen sürüm.
    /// </summary>
    public static long? GetUserIdOrNull(this ClaimsPrincipal? user)
    {
        var userIdClaim = user?.FindFirst(ClaimNames.UserId)?.Value;
        return long.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}
