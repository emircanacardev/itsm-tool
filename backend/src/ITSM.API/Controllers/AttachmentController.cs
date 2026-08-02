using ITSM.Application.Services;
using ITSM.API.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/ticket/{ticketId}/attachments")]
[Authorize]
public class AttachmentController : ControllerBase
{
    private readonly AttachmentService _attachmentService;

    public AttachmentController(AttachmentService attachmentService)
    {
        _attachmentService = attachmentService;
    }

    [HttpPost]
    public async Task<IActionResult> Upload(long ticketId, IFormFile file)
    {
        var userId = User.GetUserId();

        using var stream = file.OpenReadStream();
        var result = await _attachmentService.UploadAsync(ticketId, userId, stream, file.FileName);

        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAttachments(long ticketId)
    {
        var userId = User.GetUserId();

        var result = await _attachmentService.GetAttachmentsAsync(ticketId, userId);
        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(long ticketId, long id)
    {
        var userId = User.GetUserId();

        var (content, fileName) = await _attachmentService.DownloadAsync(id, userId);
        if (content is null)
        {
            return NotFound();
        }

        return File(content, "application/octet-stream", fileName);
    }
}