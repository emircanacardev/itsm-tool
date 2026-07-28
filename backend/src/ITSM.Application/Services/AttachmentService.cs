using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class AttachmentService
{
    private readonly IAttachmentRepository _attachmentRepository;
    private readonly IFileStorageService _fileStorageService;
    private readonly TicketService _ticketService;
    private readonly IUserRepository _userRepository;

    public AttachmentService(
        IAttachmentRepository attachmentRepository,
        IFileStorageService fileStorageService,
        TicketService ticketService,
        IUserRepository userRepository)
    {
        _attachmentRepository = attachmentRepository;
        _fileStorageService = fileStorageService;
        _ticketService = ticketService;
        _userRepository = userRepository;
    }

    public async Task<AttachmentResponse?> UploadAsync(long ticketId, long userId, Stream fileStream, string originalFileName)
    {
        var ticket = await _ticketService.GetTicketByIdAsync(ticketId, userId);
        if (ticket is null)
        {
            return null;
        }

        var storedFileName = $"{Guid.NewGuid()}{Path.GetExtension(originalFileName)}";
        var filePath = await _fileStorageService.SaveAsync(fileStream, storedFileName);

        var attachment = new Attachment
        {
            TicketId = ticketId,
            FileName = originalFileName,
            FilePath = filePath,
            UploadedBy = userId
        };

        await _attachmentRepository.AddAsync(attachment);

        var user = await _userRepository.GetByIdAsync(userId);

        return MapToResponse(attachment, user!);
    }

    public async Task<List<AttachmentResponse>?> GetAttachmentsAsync(long ticketId, long userId)
    {
        var ticket = await _ticketService.GetTicketByIdAsync(ticketId, userId);
        if (ticket is null)
        {
            return null;
        }

        var attachments = await _attachmentRepository.GetAllByTicketIdAsync(ticketId);
        return attachments.Select(a => MapToResponse(a, a.UploadedByUser)).ToList();
    }

    public async Task<(Stream? Content, string? FileName)> DownloadAsync(long attachmentId, long userId)
    {
        var attachment = await _attachmentRepository.GetByIdAsync(attachmentId);
        if (attachment is null || attachment.TicketId is null)
        {
            return (null, null);
        }

        var ticket = await _ticketService.GetTicketByIdAsync(attachment.TicketId.Value, userId);
        if (ticket is null)
        {
            return (null, null);
        }

        var stream = _fileStorageService.OpenRead(attachment.FilePath);
        return (stream, attachment.FileName);
    }

    private static AttachmentResponse MapToResponse(Attachment attachment, User user)
    {
        return new AttachmentResponse
        {
            Id = attachment.Id,
            TicketId = attachment.TicketId,
            FileName = attachment.FileName,
            UploadedByFullName = user.FullName,
            UploadedAt = attachment.UploadedAt
        };
    }
}