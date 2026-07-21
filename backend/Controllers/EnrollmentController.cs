using System.Security.Claims;
using System.Text.Json;
using Aora.Data;
using Aora.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Aora.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EnrollmentController : ControllerBase
    {
        private readonly AoraDbContext _db;

        public EnrollmentController(AoraDbContext db) => _db = db;

        // ═══ GET: api/enrollment/my — دوره‌های من ═══
        [HttpGet("my")]
        public async Task<IActionResult> MyEnrollments()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var data = await _db.Enrollments
                .Include(e => e.Course)
                .Where(e => e.UserId == userId)
                .OrderByDescending(e => e.EnrolledAt)
                .Select(e => new
                {
                    e.Id,
                    courseId = e.CourseId,
                    courseTitle = e.Course != null ? e.Course.Title : "",
                    courseIcon = e.Course != null ? e.Course.Icon : "📚",
                    e.EnrolledAt,
                    e.Progress,
                    completedLessons = e.CompletedLessons,
                    e.AmountPaid
                })
                .ToListAsync();

            return Ok(new { success = true, data });
        }

        // ═══ GET: api/enrollment/check/{courseId} — آیا ثبت‌نام کرده؟ ═══
        [HttpGet("check/{courseId:int}")]
        public async Task<IActionResult> CheckEnrollment(int courseId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var enrolled = await _db.Enrollments.AnyAsync(e => e.UserId == userId && e.CourseId == courseId);
            return Ok(new { success = true, enrolled });
        }

        // ═══ POST: api/enrollment — ثبت‌نام مستقیم (دوره‌های رایگان) ═══
        [HttpPost]
        public async Task<IActionResult> Enroll([FromBody] EnrollDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var course = await _db.Courses.FindAsync(dto.CourseId);
            if (course == null) return NotFound(new { success = false, message = "دوره یافت نشد." });

            var already = await _db.Enrollments.AnyAsync(e => e.UserId == userId && e.CourseId == dto.CourseId);
            if (already) return Conflict(new { success = false, message = "قبلاً در این دوره ثبت‌نام کرده‌اید." });

            if (course.Price > 0)
                return BadRequest(new { success = false, message = "این دوره رایگان نیست؛ ابتدا باید پرداخت انجام شود." });

            var enrollment = new Enrollment
            {
                UserId = userId,
                CourseId = dto.CourseId,
                EnrolledAt = DateTime.UtcNow,
                Progress = 0,
                CompletedLessons = "[]",
                AmountPaid = 0
            };
            _db.Enrollments.Add(enrollment);
            course.StudentsCount += 1;
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "با موفقیت ثبت‌نام شدید." });
        }

        // ═══ PUT: api/enrollment/{courseId}/progress — تکمیل یک جلسه ═══
        [HttpPut("{courseId:int}/progress")]
        public async Task<IActionResult> UpdateProgress(int courseId, [FromBody] ProgressDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var enrollment = await _db.Enrollments
                .FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == courseId);
            if (enrollment == null) return NotFound(new { success = false, message = "ثبت‌نامی یافت نشد." });

            List<string> completed;
            try { completed = JsonSerializer.Deserialize<List<string>>(enrollment.CompletedLessons) ?? new(); }
            catch { completed = new(); }

            if (!completed.Contains(dto.LessonId))
                completed.Add(dto.LessonId);

            enrollment.CompletedLessons = JsonSerializer.Serialize(completed);

            if (dto.TotalLessons > 0)
                enrollment.Progress = Math.Min(100, (int)Math.Round(100.0 * completed.Count / dto.TotalLessons));

            await _db.SaveChangesAsync();

            return Ok(new { success = true, progress = enrollment.Progress, completedLessons = completed });
        }
    }

    public record EnrollDto(int CourseId);
    public record ProgressDto(string LessonId, int TotalLessons);
}
