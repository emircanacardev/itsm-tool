using ITSM.Application.Interfaces;

namespace ITSM.Infrastructure.Security;

public class PasswordHasher : IPasswordHasher
{
    public string Hash(string plainPassword)
    {
        return BCrypt.Net.BCrypt.EnhancedHashPassword(plainPassword);
    }

    public bool Verify(string plainPassword, string hash)
    {
        return BCrypt.Net.BCrypt.EnhancedVerify(plainPassword, hash);
    }
}

