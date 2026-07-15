using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Aora.Models
{
    public class ForumPost
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required, MaxLength(5000)]
        public string Content { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Category { get; set; } = "عمومی";

        public int AuthorId { get; set; }
        [ForeignKey("AuthorId")]
        public User? Author { get; set; }

        public int Likes { get; set; }
        public int Views { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ForumReply> Replies { get; set; } = new List<ForumReply>();
    }

    public class ForumReply
    {
        public int Id { get; set; }
        public int PostId { get; set; }

        [Required, MaxLength(2000)]
        public string Content { get; set; } = string.Empty;

        public int AuthorId { get; set; }
        [ForeignKey("AuthorId")]
        public User? Author { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}