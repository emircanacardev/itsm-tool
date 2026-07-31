using ITSM.Infrastructure.Security;

namespace ITSM.UnitTests;

public class PasswordHasherTests
{
    private readonly PasswordHasher _hasher = new();

    [Fact]
    public void Hash_ThenVerify_WithCorrectPassword_ReturnsTrue()
    {
        var hash = _hasher.Hash("Test1234!");

        var result = _hasher.Verify("Test1234!", hash);

        Assert.True(result);
    }

    [Fact]
    public void Verify_WithWrongPassword_ReturnsFalse()
    {
        var hash = _hasher.Hash("Test1234!");

        var result = _hasher.Verify("YanlisSifre!", hash);

        Assert.False(result);
    }

    [Fact]
    public void Hash_CalledTwiceWithSamePassword_ProducesDifferentHashes()
    {
        var hash1 = _hasher.Hash("Test1234!");
        var hash2 = _hasher.Hash("Test1234!");

        Assert.NotEqual(hash1, hash2);
    }
}
