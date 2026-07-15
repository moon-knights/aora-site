using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Aoura.Models
{
    public class SiteSettings
    {
        [Key]
        public int Id { get; set; } = 1;  // همیشه یک ردیف

        // ═══ لوگو ═══
        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        [MaxLength(500)]
        public string? LogoPath { get; set; }  // مسیر فایل آپلود شده

        [MaxLength(200)]
        public string? SiteName { get; set; }

        // ═══ هدر گلوبال (طراحی‌شده با GrapesJS) ═══
        [Column(TypeName = "nvarchar(max)")]
        public string? GlobalHeaderHtml { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? GlobalHeaderCss { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? GlobalHeaderState { get; set; }

        // ═══ فوتر گلوبال (طراحی‌شده با GrapesJS) ═══
        [Column(TypeName = "nvarchar(max)")]
        public string? GlobalFooterHtml { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? GlobalFooterCss { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? GlobalFooterState { get; set; }

        // ═══ تنظیمات عمومی ═══
        [MaxLength(500)]
        public string? FaviconUrl { get; set; }

        [MaxLength(1000)]
        public string? CustomCss { get; set; }  // CSS سراسری اضافی

        [MaxLength(2000)]
        public string? CustomHeadScripts { get; set; }  // اسکریپت‌های head (Analytics, etc.)

        [MaxLength(200)]
        public string? SupportEmail { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}