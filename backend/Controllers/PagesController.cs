using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Aora.Data;
using Aora.Models;

namespace Aora.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PagesController : ControllerBase
    {
        private readonly AoraDbContext _context;
        private readonly IWebHostEnvironment _env;

        public PagesController(AoraDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // ═══ GET: api/pages ═══
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var pages = await _context.Pages
                .OrderByDescending(p => p.UpdatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Slug,
                    p.IsPublished,
                    p.IsHomePage,
                    p.SortOrder,
                    p.CreatedAt,
                    p.UpdatedAt
                })
                .ToListAsync();

            return Ok(pages);
        }

        // ═══ GET: api/pages/{id} ═══
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var page = await _context.Pages.FindAsync(id);
            if (page == null) return NotFound("صفحه یافت نشد.");
            return Ok(page);
        }

        // ═══ GET: api/pages/slug/{slug} — برای رندر بازدیدکننده ═══
        [HttpGet("slug/{slug}")]
        public async Task<IActionResult> GetBySlug(string slug)
        {
            var page = await _context.Pages
                .FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished);

            if (page == null) return NotFound("صفحه‌ای با این مسیر یافت نشد.");

            var settings = await _context.SiteSettings.FindAsync(1);

            return Ok(new
            {
                page.Title,
                page.Slug,
                page.HtmlContent,
                page.CssContent,
                page.MetaDescription,
                page.OgImage,
                GlobalHeaderHtml = settings?.GlobalHeaderHtml,
                GlobalHeaderCss = settings?.GlobalHeaderCss,
                GlobalFooterHtml = settings?.GlobalFooterHtml,
                GlobalFooterCss = settings?.GlobalFooterCss,
                LogoUrl = settings?.LogoUrl,
                SiteName = settings?.SiteName,
                FaviconUrl = settings?.FaviconUrl,
                CustomCss = settings?.CustomCss,
                CustomHeadScripts = settings?.CustomHeadScripts
            });
        }

        // ═══ POST: api/pages — ایجاد صفحه جدید ═══
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("عنوان صفحه الزامی است.");

            if (string.IsNullOrWhiteSpace(dto.Slug))
                return BadRequest("مسیر صفحه الزامی است.");

            // بررسی تکراری نبودن slug
            var exists = await _context.Pages.AnyAsync(p => p.Slug == dto.Slug);
            if (exists) return Conflict("صفحه‌ای با این مسیر قبلاً وجود دارد.");

            var page = new Page
            {
                Id = Guid.NewGuid(),
                Title = dto.Title,
                Slug = dto.Slug.Slugify(),
                HtmlContent = dto.HtmlContent,
                CssContent = dto.CssContent,
                GrapesJsState = dto.GrapesJsState,
                IsPublished = dto.IsPublished,
                MetaDescription = dto.MetaDescription,
                OgImage = dto.OgImage,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Pages.Add(page);
            await _context.SaveChangesAsync();

            return Ok(new { page.Id, message = "صفحه با موفقیت ذخیره شد." });
        }

        // ═══ PUT: api/pages/{id} — ویرایش صفحه ═══
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] PageDto dto)
        {
            var page = await _context.Pages.FindAsync(id);
            if (page == null) return NotFound("صفحه یافت نشد.");

            // بررسی تکراری نبودن slug (به‌جز خود صفحه)
            var slugTaken = await _context.Pages
                .AnyAsync(p => p.Slug == dto.Slug && p.Id != id);
            if (slugTaken) return Conflict("مسیر صفحه تکراری است.");

            page.Title = dto.Title;
            page.Slug = dto.Slug.Slugify();
            page.HtmlContent = dto.HtmlContent;
            page.CssContent = dto.CssContent;
            page.GrapesJsState = dto.GrapesJsState;
            page.IsPublished = dto.IsPublished;
            page.MetaDescription = dto.MetaDescription;
            page.OgImage = dto.OgImage;
            page.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { page.Id, message = "صفخه با موفقیت بروزرسانی شد." });
        }

        // ═══ DELETE: api/pages/{id} ═══
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var page = await _context.Pages.FindAsync(id);
            if (page == null) return NotFound();

            _context.Pages.Remove(page);
            await _context.SaveChangesAsync();

            return Ok(new { message = "صفحه حذف شد." });
        }

        // ═══ PUT: api/pages/{id}/publish ═══
        [HttpPut("{id:guid}/publish")]
        public async Task<IActionResult> TogglePublish(Guid id)
        {
            var page = await _context.Pages.FindAsync(id);
            if (page == null) return NotFound();

            page.IsPublished = !page.IsPublished;
            page.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { page.IsPublished });
        }
    }

    // ═══ DTO ═══
    public class PageDto
    {
        public string Title { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? HtmlContent { get; set; }
        public string? CssContent { get; set; }
        public string? GrapesJsState { get; set; }
        public bool IsPublished { get; set; } = true;
        public string? MetaDescription { get; set; }
        public string? OgImage { get; set; }
    }

    // ═══ Extension Methods ═══
    public static class StringExtensions
    {
        public static string Slugify(this string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;
            return text.Trim()
                .ToLower()
                .Replace(" ", "-")
                .Replace("_", "-")
                .Replace("---", "-")
                .Replace("--", "-");
        }
    }
}