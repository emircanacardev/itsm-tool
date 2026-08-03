using ITSM.Application.Configuration;
using ITSM.Application.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Options;

namespace ITSM.Infrastructure.Storage;

public class FileStorageService : IFileStorageService
{
    private readonly string _basePath;

    public FileStorageService(IWebHostEnvironment environment, IOptions<StorageOptions> options)
    {
        _basePath = Path.Combine(environment.ContentRootPath, options.Value.UploadsFolder);
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