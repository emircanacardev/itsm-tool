using ITSM.API.Extensions;
using ITSM.Application.DTOs;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    
    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);

        if (result is null) 
        {
            return Unauthorized();
        }
        
        return Ok(result);
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);

        if (result is null)
        {
            return Conflict();
        }

        return Ok(result);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.GetUserId();

        var result = await _authService.GetCurrentUserAsync(userId);
        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    /// <summary>
    /// Kullanıcının kendi dil tercihini günceller. Bu tercih, HTTP isteği
    /// bulunmayan bağlamlarda (SLA ihlal taraması gibi arka plan servisleri
    /// ve e-postalar) hangi dilin kullanılacağını belirler.
    /// </summary>
    [HttpPut("me/language")]
    [Authorize]
    public async Task<IActionResult> UpdateLanguage(UpdateLanguageRequest request)
    {
        var userId = User.GetUserId();

        var updated = await _authService.UpdateLanguageAsync(userId, request.Language);
        if (!updated)
        {
            return BadRequest();
        }

        return NoContent();
    }
}
