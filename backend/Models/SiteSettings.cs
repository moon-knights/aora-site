using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Aora.Models
{
    public class SiteSettings
    {
        [Key]
        public int Id { get; set; } = 1;  // همیشه یک ردیف

        // ═══ لوگو ═══
        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        [MaxLength(500)]
        public string? LogoPath { get; set; }

        [MaxLength(200)]
        public string? SiteName { get; set; }

        // ═══ هدر گلوبال ═══
        [Column(TypeName = "nvarchar(max)")]
        public string? GlobalHeaderHtml { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? GlobalHeaderCss { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? GlobalHeaderState { get; set; }

        // ═══ فوتر گلوبال ═══
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
        public string? CustomCss { get; set; }

        [MaxLength(2000)]
        public string? CustomHeadScripts { get; set; }

        [MaxLength(200)]
        public string? SupportEmail { get; set; }

        public bool MaintenanceMode { get; set; } = false;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
