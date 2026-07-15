using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Aora.Models
{
    public class Enrollment
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public User? User { get; set; }

        public int CourseId { get; set; }
        [ForeignKey("CourseId")]
        public Course? Course { get; set; }

        public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
        public int Progress { get; set; } // 0-100

        [MaxLength(2000)]
        public string CompletedLessons { get; set; } = "[]"; // JSON array

        public long? PaymentRefId { get; set; }
        public int AmountPaid { get; set; }
    }
}