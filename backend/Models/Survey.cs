using System.ComponentModel.DataAnnotations;

namespace Aora.Models
{
    public class Survey
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        public int CreatorId { get; set; }

        [MaxLength(10000)]
        public string Questions { get; set; } = "[]"; // JSON

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class SurveyResponse
    {
        public int Id { get; set; }
        public int SurveyId { get; set; }

        [MaxLength(10000)]
        public string Answers { get; set; } = "{}"; // JSON

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(100)]
        public string? RespondentEmail { get; set; }
    }
}