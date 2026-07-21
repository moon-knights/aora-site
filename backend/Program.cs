using System.Text;
using System.Text.Json.Serialization;
using Aora.Data;
using Aora.Helpers;
using Aora.Middleware;
using Aora.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ═══ کنترلرها + JSON (camelCase استاندارد، مطابق انتظار فرانت‌اند) ═══
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// ═══ EF Core ═══
builder.Services.AddDbContext<AoraDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AoraConnection")));

// ═══ Services ═══
builder.Services.AddScoped<AuthService>();

// ═══ Authentication (JWT) ═══
var jwtKey = builder.Configuration["Jwt:Key"] ?? "AoraSuperSecretKey_1405_MustBe32Chars!";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "Aora",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "AoraApp",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});
builder.Services.AddAuthorization();

// ═══ CORS ═══
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

// ═══ فایل‌های استاتیک فرانت‌اند ═══
// پوشه فرانت‌اند (index.html، css/، js/ و...) یک سطح بالاتر از پوشه backend
// قرار دارد؛ به‌جای کپی کردن آن داخل wwwroot در زمان build (که مسیرهای نسبی
// را می‌شکند)، مستقیماً همان پوشه را به‌عنوان ریشه فایل‌های استاتیک معرفی می‌کنیم.
var frontendRoot = Path.Combine(builder.Environment.ContentRootPath, "..");
var frontendFileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendRoot);

// ═══ Middleware Pipeline ═══
app.UseCors("AllowAll");
app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = frontendFileProvider });
app.UseStaticFiles(new StaticFileOptions { FileProvider = frontendFileProvider });
app.UseMiddleware<MaintenanceMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

// ═══ API Routes ═══
app.MapControllers();

// ═══ Dynamic Page Routing (fallback) ═══
// وقتی مسیر درخواستی نه به یک فایل استاتیک نگاشت می‌شود و نه به یک اکشن API،
// سعی می‌کنیم آن را به یک صفحه‌ی داینامیک ساخته‌شده در پنل ادمین (Page) با
// همان Slug متصل کنیم. اگر پیدا نشد و درخواست برای /api است، 404 برمی‌گردانیم؛
// در غیر این صورت به صفحه اصلی سایت هدایت می‌شود.
app.MapFallback(async (HttpContext context, AoraDbContext db) =>
{
    var path = context.Request.Path.Value ?? "/";

    if (path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        await context.Response.WriteAsJsonAsync(new { success = false, message = "مسیر یافت نشد." });
        return;
    }

    var slug = path.Trim('/');
    if (string.IsNullOrEmpty(slug)) slug = "home";

    var page = await db.Pages.FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished);
    if (page != null)
    {
        var settings = await db.SiteSettings.FindAsync(1);
        var html = PageRenderer.BuildFullPageHtml(page, settings);
        context.Response.ContentType = "text/html; charset=utf-8";
        await context.Response.WriteAsync(html);
        return;
    }

    // هیچ صفحه داینامیکی با این مسیر پیدا نشد → بازگشت به صفحه اصلی استاتیک
    context.Response.Redirect("/index.html");
});

app.Run();
