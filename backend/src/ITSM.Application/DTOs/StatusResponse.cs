namespace ITSM.Application.DTOs;

public class StatusResponse
{
    public required long Id { get; set; }
    public required string Name { get; set; }
    public required int SortOrder { get; set; }
}
