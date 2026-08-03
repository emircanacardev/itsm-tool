namespace ITSM.Domain.Constants;

/// <summary>
/// JWT içinde taşınan claim adları.
/// Program.cs'te DefaultMapInboundClaims = false olduğu için claim'ler
/// .NET'in uzun URI karşılıklarına dönüştürülmeden, ham hâlleriyle okunur.
/// </summary>
public static class ClaimNames
{
    /// <summary>Kullanıcı Id'si (JwtRegisteredClaimNames.Sub ile aynı değer).</summary>
    public const string UserId = "sub";

    public const string Email = "email";

    public const string FullName = "name";
}
