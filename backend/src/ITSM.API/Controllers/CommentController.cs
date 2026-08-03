using ITSM.Application.DTOs;
using ITSM.API.Extensions;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/ticket/{ticketId}/comments")]
[Authorize]
public class CommentController : ControllerBase
{
    private readonly CommentService _commentService;

    public CommentController(CommentService commentService)
    {
        _commentService = commentService;
    }

    [HttpPost]
    public async Task<IActionResult> AddComment(long ticketId, CreateCommentRequest request)
    {
        var userId = User.GetUserId();

        var result = await _commentService.AddCommentAsync(ticketId, userId, request);
        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetComments(long ticketId)
    {
        var userId = User.GetUserId();

        var result = await _commentService.GetCommentsAsync(ticketId, userId);
        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }
}