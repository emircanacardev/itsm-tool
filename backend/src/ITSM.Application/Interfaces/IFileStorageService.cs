namespace ITSM.Application.Interfaces;

public interface IFileStorageService
{
    Task<string> SaveAsync(Stream fileStream, string storedFileName);
    Stream OpenRead(string filePath);
}