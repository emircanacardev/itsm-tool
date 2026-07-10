namespace ITSM.Domain.Entities;

public class Priority
{
    public long Id { get; set; }
    public required string Name { get; set; }
    public int SortOrder { get; set; }
}
