namespace ITSM.Domain.Constants;

/// <summary>
/// Uygulamanın kod içinden ulaşması gereken grupların anahtarları.
///
/// Grup adları admin panelinden değiştirilebiliyor ve dile göre farklı
/// yazılabiliyor; bu yüzden ada göre arama yapmak kırılgan. Group.SystemKey
/// sabit kalır, görünen ad serbestçe düzenlenebilir.
/// </summary>
public static class SystemGroupKeys
{
    /// <summary>
    /// Kayıt olan kullanıcıların, admin gerçek departmanına taşıyana kadar
    /// düştüğü varsayılan grup.
    /// </summary>
    public const string Unassigned = "UNASSIGNED";
}
