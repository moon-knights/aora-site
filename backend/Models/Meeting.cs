using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Aora.Models
{
    public class Meeting
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(150)]
        public string Host { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string Code { get; set; } = string.Empty;

        public int CreatorId { get; set; }
        [ForeignKey("CreatorId")]
        public User? Creator { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "scheduled"; // scheduled, live, ended

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
