namespace ITSM.Application.DTOs;

public class CreateCommentRequest
{
    public required string Message { get; set; }
    public bool IsInternal { get; set; } = false;
}