
using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}


