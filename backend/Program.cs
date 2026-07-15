using Microsoft.EntityFrameworkCore;
using Aoura.Data;
using Aoura.Services;
using Aoura.Middleware;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ═══ تنظیمات JSON (رفع خطای قبلی) ═══
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.Null;
    });

// ═══ EF Core ═══
builder.Services.AddDbContext<AouraDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AoraConnection")));

// ═══ Services ═══
builder.Services.AddScoped<AuthService>();

// ═══ CORS ═══
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

// ═══ Middleware Pipeline ═══
app.UseCors("AllowAll");
app.UseStaticFiles();
app.UseMiddleware<MaintenanceMiddleware>();

// ═══ API Routes ═══
app.MapControllers();

// ═══ Dynamic Page Routing ═══
app.MapFallback(async (HttpContext context, AouraDbContext db) =>
{
    // ... (کدهای فالبک رو دقیقاً همینطور نگه دار، فقط مطمئن شو AouraDbContext باشه)
    // به دلیل طولانی بودن کد فالبک، از تغییرات اصلی همینجا استفاده کن
});

app.Run();