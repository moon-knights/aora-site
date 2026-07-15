namespace Aora.Middleware
{
    public class MaintenanceMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IConfiguration _config;

        public MaintenanceMiddleware(RequestDelegate next, IConfiguration config)
        {
            _next = next;
            _config = config;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // بررسی حالت تعمیر
            var isMaintenance = _config.GetValue<bool>("MaintenanceMode");

            if (isMaintenance)
            {
                // ادمین‌ها مجازند
                var userRole = context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

                if (userRole != "admin")
                {
                    // API → JSON
                    if (context.Request.Path.StartsWithSegments("/api"))
                    {
                        context.Response.StatusCode = 503;
                        await context.Response.WriteAsJsonAsync(new
                        {
                            success = false,
                            message = "سایت در حال بروزرسانی است."
                        });
                        return;
                    }

                    // صفحات → صفحه تعمیر
                    context.Response.StatusCode = 503;
                    context.Response.ContentType = "text/html; charset=utf-8";
                    await context.Response.WriteAsync(GetMaintenancePage());
                    return;
                }
            }

            await _next(context);
        }

        private string GetMaintenancePage()
        {
            return @"<!DOCTYPE html>
<html lang='fa' dir='rtl'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width,initial-scale=1'>
<title>سایت در حال بروزرسانی — آئورا</title>
<link href='https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap' rel='stylesheet'>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#080808;
  color:#f0ece4;
  font-family:Vazirmatn,sans-serif;
  padding:2rem;
  text-align:center
}
.icon{font-size:5rem;margin-bottom:1.5rem}
h1{font-size:1.8rem;font-weight:700;margin-bottom:1rem}
p{font-size:1rem;color:#7a7570;line-height:2;margin-bottom:2rem;max-width:450px}
.spinner{
  width:40px;height:40px;
  border:3px solid rgba(232,197,71,.2);
  border-top-color:#e8c547;
  border-radius:50%;
  margin:0 auto;
  animation:spin 1s linear infinite
}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div>
  <div class='icon'>🔧</div>
  <h1>سایت در حال بروزرسانی است</h1>
  <p>در حال ارتقا و بهبود سایت هستیم. لطفاً چند دقیقه دیگر دوباره مراجعه کنید.</p>
  <div class='spinner'></div>
</div>
</body>
</html>";
        }
    }

    // Extension method
    public static class MaintenanceMiddlewareExtensions
    {
        public static IApplicationBuilder UseMaintenance(this IApplicationBuilder app)
        {
            return app.UseMiddleware<MaintenanceMiddleware>();
        }
    }
}