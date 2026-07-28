using ITSM.Application.Interfaces;
using Microsoft.AspNetCore.Hosting;

namespace ITSM.Infrastructure.Storage;

public class FileStorageService : IFileStorageService
{
    private readonly string _basePath;

    public FileStorageService(IWebHostEnvironment environment)
    {
        _basePath = Path.Combine(environment.ContentRootPath, "Uploads");
        Directory.CreateDirectory(_basePath);
    }

    public async Task<string> SaveAsync(Stream fileStream, string storedFileName)
    {
        var fullPath = Path.Combine(_basePath, storedFileName);

        using var output = File.Create(fullPath);
        await fileStream.CopyToAsync(output);

        return fullPath;
    }

    public Stream OpenRead(string filePath)
    {
        return File.OpenRead(filePath);
    }
}