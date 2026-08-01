namespace ITSM.Application.DTOs;

public class PriorityResponse
{
    public required long Id { get; set; }
    public required string Name { get; set; }
    public required int SortOrder { get; set; }
}
