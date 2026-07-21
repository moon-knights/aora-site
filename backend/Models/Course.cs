using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Aora.Models
{
    public class Course
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;

        public int InstructorId { get; set; }
        [ForeignKey("InstructorId")]
        public User? Instructor { get; set; }

        public int Price { get; set; }
        public int OriginalPrice { get; set; }

        [MaxLength(30)]
        public string Level { get; set; } = "مبتدی"; // مبتدی، متوسط، پیشرفته

        [MaxLength(50)]
        public string Duration { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Category { get; set; } = string.Empty;

        [MaxLength(10)]
        public string Icon { get; set; } = "📚";

        [MaxLength(300)]
        public string Image { get; set; } = string.Empty;

        public double Rating { get; set; }
        public int StudentsCount { get; set; }
        public bool IsFeatured { get; set; }
        public bool IsPublished { get; set; } = true;

        // JSON array of strings, e.g. ["پایتون","بیوانفورماتیک"]
        [Column(TypeName = "nvarchar(max)")]
        public string Tags { get; set; } = "[]";

        // JSON array of chapters:
        // [{ "title": "...", "lessons": [{ "title": "...", "duration": 12, "isFree": true }] }]
        [Column(TypeName = "nvarchar(max)")]
        public string Chapters { get; set; } = "[]";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    }
}
