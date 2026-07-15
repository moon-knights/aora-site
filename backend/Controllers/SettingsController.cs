using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Aoura.Data;
using Aoura.Models;

namespace Aoura.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly AoraDbContext _context;
        private readonly IWebHostEnvironment _env;

        public SettingsController(AoraDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // ═══ GET: api/settings ═══
        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            var settings = await _context.SiteSettings.FindAsync(1);
            if (settings == null)
            {
                settings = new SiteSettings { Id = 1 };
                _context.SiteSettings.Add(settings);
                await _context.SaveChangesAsync();
            }
            return Ok(settings);
        }

        // ═══ PUT: api/settings ═══
        [HttpPut]
        public async Task<IActionResult> UpdateSettings(
            [FromBody] SiteSettingsDto dto)
        {
            var settings = await _context.SiteSettings.FindAsync(1);
            if (settings == null) return NotFound();

            settings.SiteName = dto.SiteName;
            settings.SupportEmail = dto.SupportEmail;
            settings.CustomCss = dto.CustomCss;
            settings.CustomHeadScripts = dto.CustomHeadScripts;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "تنظیمات ذخیره شد." });
        }

        // ═══ POST: api/settings/logo — آپلود لوگو ═══
        [HttpPost("logo")]
        public async Task<IActionResult> UploadLogo(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("فایلی انتخاب نشده است.");

            // محدودیت نوع فایل
            var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".svg", ".webp" };
            var ext = Path.GetExtension(file.FileName).ToLower();
            if (!allowedExtensions.Contains(ext))
                return BadRequest("فرمت فایل مجاز نیست. فقط PNG, JPG, SVG, WEBP");

            // محدودیت حجم (حداکثر 2MB)
            if (file.Length > 2 * 1024 * 1024)
                return BadRequest("حجم فایل نباید بیشتر ا 2 مگابایت باشد.");

            // ذخیره فایل
            var uploadsDir = Path.Combine(_env.WebRootPath, "uploads", "logo");
            Directory.CreateDirectory(uploadsDir);

            var fileName = "logo-" + DateTime.UtcNow.Ticks + ext;
            var filePath = Path.Combine(uploadsDir, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = "/uploads/logo/" + fileName;

            // بروزرسانی تنظیمات
            var settings = await _context.SiteSettings.FindAsync(1);
            if (settings == null)
            {
                settings = new SiteSettings { Id = 1 };
                _context.SiteSettings.Add(settings);
            }

            // حذف فایل قبلی (اگر وجود دارد)
            if (!string.IsNullOrEmpty(settings.LogoPath))
            {
                var oldFile = Path.Combine(_env.WebRootPath,
                    settings.LogoPath.TrimStart('/'));
                if (System.IO.File.Exists(oldFile))
                    System.IO.File.Delete(oldFile);
            }

            settings.LogoPath = relativePath;
            settings.LogoUrl = relativePath;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "لوگو با موفقیت آپلود شد.",
                path = relativePath,
                url = relativePath
            });
        }

        // ═══ PUT: api/settings/header — ذخیره هدر گلوبال ═══
        [HttpPut("header")]
        public async Task<IActionResult> SaveGlobalHeader(
            [FromBody] GlobalComponentDto dto)
        {
            var settings = await _context.SiteSettings.FindAsync(1);
            if (settings == null) return NotFound();

            settings.GlobalHeaderHtml = dto.HtmlContent;
            settings.GlobalHeaderCss = dto.CssContent;
            settings.GlobalHeaderState = dto.GrapesJsState;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "هدر گلوبال ذخیره شد." });
        }

        // ═══ PUT: api/settings/footer — ذخیره فوتر گلوبال ═══
        [HttpPut("footer")]
        public async Task<IActionResult> SaveGlobalFooter(
            [FromBody] GlobalComponentDto dto)
        {
            var settings = await _context.SiteSettings.FindAsync(1);
            if (settings == null) return NotFound();

            settings.GlobalFooterHtml = dto.HtmlContent;
            settings.GlobalFooterCss = dto.CssContent;
            settings.GlobalFooterState = dto.GrapesJsState;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "فوتر گلوبال ذخیره شد." });
        }

        // ═══ GET: api/settings/render/{slug} — رندر کامل صفحه ═══
        [HttpGet("render/{slug}")]
        public async Task<IActionResult> RenderPage(string slug)
        {
            var page = await _context.Pages
                .FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished);

            if (page == null) return NotFound();

            var settings = await _context.SiteSettings.FindAsync(1);

            // ساختن HTML کامل با هدر و فوتر گلوبال
            var fullHtml = BuildFullPageHtml(page, settings);

            return Content(fullHtml, "text/html; charset=utf-8");
        }

        // ═══ رندر صفحه اصلی ═══
        [HttpGet("render-home")]
        public async Task<IActionResult> RenderHomePage()
        {
            var page = await _context.Pages
                .FirstOrDefaultAsync(p => p.IsHomePage && p.IsPublished);

            if (page == null)
                page = await _context.Pages
                    .FirstOrDefaultAsync(p => p.IsPublished);

            if (page == null) return NotFound("صفحه‌ای یافت نشد.");

            var settings = await _context.SiteSettings.FindAsync(1);
            var fullHtml = BuildFullPageHtml(page, settings);
            return Content(fullHtml, "text/html; charset=utf-8");
        }

        // ═══ متد ساخت HTML کامل ═══
        private string BuildFullPageHtml(Page page, SiteSettings? settings)
        {
            var logoUrl = settings?.LogoUrl ?? "";
            var siteName = settings?.SiteName ?? "آئورا";
            var favicon = settings?.FaviconUrl ?? "/favicon.ico";
            var globalCss = settings?.CustomCss ?? "";
            var headScripts = settings?.CustomHeadScripts ?? "";
            var headerHtml = settings?.GlobalHeaderHtml ?? "";
            var headerCss = settings?.GlobalHeaderCss ?? "";
            var footerHtml = settings?.GlobalFooterHtml ?? "";
            var footerCss = settings?.GlobalFooterCss ?? "";

            // جایگزینی متغیر لوگو در هدر
            headerHtml = headerHtml
                .Replace("{{LOGO_URL}}", logoUrl)
                .Replace("{{SITE_NAME}}", siteName);

            return $@"<!DOCTYPE html>
<html lang=""fa"" dir=""rtl"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1"">
    <title>{page.Title} — {siteName}</title>
    <meta name=""description"" content=""{page.MetaDescription ?? ""}"">
    <link rel=""icon"" href=""{favicon}"">
    <link rel=""preconnect"" href=""https://fonts.googleapis.com"">
    <link href=""https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap"" rel=""stylesheet"">

    <!-- استایل‌های گلوبال -->
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Vazirmatn', sans-serif; }}
        {globalCss}
        {headerCss}
        {footerCss}
    </style>

    <!-- استایل‌های صفحه -->
    <style>
        {page.CssContent}
    </style>

    {headScripts}
</head>
<body>
    <!-- هدر گلوبال -->
    <header id=""globalHeader"">
        {headerHtml}
    </header>

    <!-- محتوای صفحه -->
    <main id=""pageContent"">
        {page.HtmlContent}
    </main>

    <!-- فوتر گلوبال -->
    <footer id=""globalFooter"">
        {footerHtml}
    </footer>
</body>
</html>";
        }

        // ═══ DTO ها ═══
        public class SiteSettingsDto
        {
            public string? SiteName { get; set; }
            public string? SupportEmail { get; set; }
            public string? CustomCss { get; set; }
            public string? CustomHeadScripts { get; set; }
        }

        public class GlobalComponentDto
        {
            public string? HtmlContent { get; set; }
            public string? CssContent { get; set; }
            public string? GrapesJsState { get; set; }
        }
    }
}