using ITSM.Application.Configuration;
using ITSM.Application.Interfaces;
using ITSM.Application.Notifications;
using ITSM.Application.Services;
using ITSM.Domain.Constants;
using ITSM.Infrastructure.Authorization;
using ITSM.Infrastructure.BackgroundServices;
using ITSM.Infrastructure.Email;
using ITSM.Infrastructure.Persistence;
using ITSM.Infrastructure.Persistence.Repositories;
using ITSM.Infrastructure.Security;
using ITSM.Infrastructure.Storage;
using ITSM.Infrastructure.Localization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Globalization;
using System.Security.Claims;
using System.Text;

System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.DefaultMapInboundClaims = false;

const string CorsPolicyName = "AllowFrontend";

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter());
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddOpenApi();

// Çok dilli destek: çeviriler ITSM.Application/Localization altındaki
// .resx dosyalarından okunuyor.
builder.Services.AddLocalization(options => options.ResourcesPath = "Localization");

builder.Services.Configure<RequestLocalizationOptions>(options =>
{
    var supportedCultures = SupportedLanguages.All
        .Select(code => new CultureInfo(code))
        .ToList();

    options.DefaultRequestCulture = new RequestCulture(SupportedLanguages.Default);
    options.SupportedCultures = supportedCultures;
    options.SupportedUICultures = supportedCultures;

    // Dil yalnızca Accept-Language başlığından belirlensin. Varsayılan
    // sağlayıcılar arasında bulunan query string ve cookie sağlayıcıları
    // kaldırıldı: frontend dili bu başlıkla gönderiyor, tek bir kaynak
    // olması davranışı öngörülebilir kılıyor.
    options.RequestCultureProviders =
    [
        new AcceptLanguageHeaderRequestCultureProvider()
    ];
});

// Ayarları tek yerden okunabilir kılmak için Options pattern ile bind ediyoruz.
builder.Services.Configure<PaginationOptions>(
    builder.Configuration.GetSection(PaginationOptions.SectionName));
builder.Services.Configure<StorageOptions>(
    builder.Configuration.GetSection(StorageOptions.SectionName));
builder.Services.Configure<SlaMonitoringOptions>(
    builder.Configuration.GetSection(SlaMonitoringOptions.SectionName));

// CORS: izin verilen origin'ler config'den geliyor. AllowAnyOrigin() yerine
// açık liste kullanıyoruz ki kimlik bilgisi taşıyan istekler de güvenli olsun.
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
        else
        {
            // Origin tanımlanmamışsa (ör. ilk kurulum) geliştirme kolaylığı için
            // eski davranışa düşüyoruz; production'da Cors:AllowedOrigins dolu olmalı.
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
    });
});
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<ICurrentLanguageProvider, CurrentLanguageProvider>();
builder.Services.AddScoped<ILocalizedMessageProvider, LocalizedMessageProvider>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ITicketRepository, TicketRepository>();
builder.Services.AddScoped<TicketService>();
builder.Services.AddScoped<IUserPermissionRepository, UserPermissionRepository>();
builder.Services.AddScoped<IPermissionRepository, PermissionRepository>();
builder.Services.AddScoped<PermissionService>();
builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
builder.Services.AddScoped<ProjectService>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<CategoryService>();
builder.Services.AddScoped<IGroupRepository, GroupRepository>();
builder.Services.AddScoped<GroupService>();
builder.Services.AddScoped<IProjectMemberRepository, ProjectMemberRepository>();
builder.Services.AddScoped<ProjectMemberService>();
builder.Services.AddScoped<ICommentRepository, CommentRepository>();
builder.Services.AddScoped<CommentService>();
builder.Services.AddScoped<IAttachmentRepository, AttachmentRepository>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<AttachmentService>();
builder.Services.AddScoped<IKnowledgeBaseArticleRepository, KnowledgeBaseArticleRepository>();
builder.Services.AddScoped<KnowledgeBaseArticleService>();
builder.Services.AddScoped<ISlaRepository, SlaRepository>();
builder.Services.AddScoped<SlaService>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<NotificationRenderer>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<ISlaBreachRepository, SlaBreachRepository>();
builder.Services.AddHostedService<SlaBreachDetectionService>();
builder.Services.AddScoped<IEmailService, MailKitEmailService>();
builder.Services.AddScoped<IDashboardRepository, DashboardRepository>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<IAutoAssignmentRuleRepository, AutoAssignmentRuleRepository>();
builder.Services.AddScoped<AutoAssignmentService>();
builder.Services.AddScoped<IStatusRepository, StatusRepository>();
builder.Services.AddScoped<StatusService>();
builder.Services.AddScoped<IPriorityRepository, PriorityRepository>();
builder.Services.AddScoped<PriorityService>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
builder.Services.AddScoped<AuditLogService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// Her yetki kodu için bir policy kaydediliyor. Permissions.All üzerinden
// döndüğümüz için yeni bir yetki eklendiğinde burayı güncellemek gerekmiyor.
builder.Services.AddAuthorization(options =>
{
    foreach (var permissionCode in Permissions.All)
    {
        options.AddPolicy(permissionCode, policy =>
            policy.Requirements.Add(new PermissionRequirement(permissionCode)));
    }
});

var app = builder.Build();

// Bekleyen migration'ları açılışta uyguluyoruz. Deploy ortamında elle
// "dotnet ef database update" çalıştıracak bir kabuk olmadığı için şema
// güncellemesi uygulamanın kendi sorumluluğunda.
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    // Production'da TLS'i platform (Render/reverse proxy) sonlandırıyor ve
    // container'a düz HTTP geliyor; burada redirect açık kalırsa sonsuz
    // yönlendirme döngüsü oluşur.
    app.UseHttpsRedirection();
}

// Kültürü isteğin en başında çözüyoruz: bundan sonraki her şey
// (controller'lar, servisler, resource okumaları) CurrentUICulture'a bakıyor.
app.UseRequestLocalization();

app.UseCors(CorsPolicyName);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

await app.RunAsync();