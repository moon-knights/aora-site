using System.ComponentModel.DataAnnotations;

namespace Aora.Models
{
    public class PaymentTransaction
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Authority { get; set; } = string.Empty;

        public long? RefId { get; set; }
        public int Amount { get; set; }
        public int UserId { get; set; }
        public int CourseId { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "pending";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
    }
}