namespace ITSM.Application.Configuration;

/// <summary>
/// Dosya eki depolama ayarları. appsettings.json'daki "Storage" bölümü.
/// </summary>
public class StorageOptions
{
    public const string SectionName = "Storage";

    /// <summary>
    /// Yüklenen dosyaların saklandığı klasör (ContentRootPath'e göre göreli).
    /// </summary>
    public string UploadsFolder { get; set; } = "Uploads";

    /// <summary>
    /// İzin verilen en büyük dosya boyutu (byte). Varsayılan 10 MB.
    /// </summary>
    public long MaxFileSizeBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>
    /// Yüklenmesine izin verilen uzantılar (noktalı, küçük harf).
    /// Boş bırakılırsa uzantı kontrolü yapılmaz.
    /// </summary>
    public string[] AllowedExtensions { get; set; } =
    [
        ".png", ".jpg", ".jpeg", ".gif", ".webp",
        ".pdf", ".txt", ".csv", ".log",
        ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".zip", ".rar", ".7z"
    ];
}
