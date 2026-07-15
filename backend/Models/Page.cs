using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Aoura.Models
{
    public class Page
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string Slug { get; set; } = string.Empty;

        [Column(TypeName = "nvarchar(max)")]
        public string? HtmlContent { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? CssContent { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? GrapesJsState { get; set; }

        public bool IsPublished { get; set; } = true;
        public bool IsHomePage { get; set; } = false;

        [MaxLength(500)]
        public string? MetaDescription { get; set; }

        [MaxLength(300)]
        public string? OgImage { get; set; }

        public int SortOrder { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        [MaxLength(100)]
        public string? CreatedBy { get; set; }
    }
}