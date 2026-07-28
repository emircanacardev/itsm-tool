using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class CommentService
{
    private readonly ICommentRepository _commentRepository;
    private readonly TicketService _ticketService;
    private readonly IUserRepository _userRepository;

    public CommentService(
        ICommentRepository commentRepository,
        TicketService ticketService,
        IUserRepository userRepository)
    {
        _commentRepository = commentRepository;
        _ticketService = ticketService;
        _userRepository = userRepository;
    }

    public async Task<CommentResponse?> AddCommentAsync(long ticketId, long userId, CreateCommentRequest request)
    {
        var ticket = await _ticketService.GetTicketByIdAsync(ticketId, userId);
        if (ticket is null)
        {
            return null;
        }

        var user = await _userRepository.GetByIdAsync(userId);

        var comment = new Comment
        {
            TicketId = ticketId,
            UserId = userId,
            Message = request.Message,
            IsInternal = request.IsInternal
        };

        await _commentRepository.AddAsync(comment);

        return MapToResponse(comment, user!);
    }

    public async Task<List<CommentResponse>?> GetCommentsAsync(long ticketId, long userId)
    {
        var ticket = await _ticketService.GetTicketByIdAsync(ticketId, userId);
        if (ticket is null)
        {
            return null;
        }

        var comments = await _commentRepository.GetAllByTicketIdAsync(ticketId);
        return comments.Select(c => MapToResponse(c, c.User)).ToList();
    }

    private static CommentResponse MapToResponse(Comment comment, User user)
    {
        return new CommentResponse
        {
            Id = comment.Id,
            TicketId = comment.TicketId,
            UserId = comment.UserId,
            UserFullName = user.FullName,
            Message = comment.Message,
            IsInternal = comment.IsInternal,
            CreatedAt = comment.CreatedAt
        };
    }
}