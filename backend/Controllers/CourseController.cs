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
    public class CourseController : ControllerBase
    {
        private readonly AoraDbContext _db;

        public CourseController(AoraDbContext db) => _db = db;

        // ═══ GET: api/course — لیست بازارچه (عمومی) ═══
        // پشتیبانی از فیلتر اختیاری: ?q=&category=&level=
        [HttpGet]
        public async Task<IActionResult> GetAll(string? q, string? category, string? level)
        {
            var courses = _db.Courses.Include(c => c.Instructor)
                .Where(c => c.IsPublished);

            if (!string.IsNullOrWhiteSpace(category) && category != "all")
                courses = courses.Where(c => c.Category == category);

            if (!string.IsNullOrWhiteSpace(level) && level != "all")
                courses = courses.Where(c => c.Level == level);

            if (!string.IsNullOrWhiteSpace(q))
                courses = courses.Where(c =>
                    c.Title.Contains(q) ||
                    c.Description.Contains(q) ||
                    (c.Instructor != null && c.Instructor.FullName.Contains(q)));

            var raw = await courses
                .OrderByDescending(c => c.StudentsCount)
                .Select(c => new
                {
                    c.Id,
                    c.Title,
                    c.Description,
                    c.Price,
                    c.OriginalPrice,
                    c.Level,
                    c.Duration,
                    c.Category,
                    c.Icon,
                    c.Image,
                    c.Rating,
                    c.StudentsCount,
                    c.IsFeatured,
                    c.Tags,
                    instructor = c.Instructor != null ? c.Instructor.FullName : "",
                    instructorId = c.InstructorId
                })
                .ToListAsync();

            // خروجی با نام فیلدهایی که فرانت‌اند (courses.html) انتظار دارد
            var list = raw.Select(c => new
            {
                id = c.Id,
                title = c.Title,
                description = c.Description,
                price = c.Price,
                originalPrice = c.OriginalPrice,
                level = c.Level,
                duration = c.Duration,
                category = c.Category,
                icon = c.Icon,
                image = c.Image,
                rating = c.Rating,
                students = c.StudentsCount,
                featured = c.IsFeatured,
                tags = ParseJsonArray(c.Tags),
                instructor = c.instructor,
                instructorId = c.instructorId
            });

            return Ok(new { success = true, data = list });
        }

        // ═══ GET: api/course/{id} — جزئیات یک دوره (عمومی) ═══
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var course = await _db.Courses.Include(c => c.Instructor)
                .FirstOrDefaultAsync(c => c.Id == id);
            if (course == null) return NotFound(new { success = false, message = "دوره یافت نشد." });

            return Ok(new
            {
                success = true,
                data = new
                {
                    id = course.Id,
                    title = course.Title,
                    description = course.Description,
                    price = course.Price,
                    originalPrice = course.OriginalPrice,
                    level = course.Level,
                    duration = course.Duration,
                    category = course.Category,
                    icon = course.Icon,
                    image = course.Image,
                    rating = course.Rating,
                    students = course.StudentsCount,
                    featured = course.IsFeatured,
                    tags = ParseJsonArray(course.Tags),
                    chapters = ParseChapters(course.Chapters),
                    instructor = course.Instructor?.FullName ?? "",
                    instructorId = course.InstructorId
                }
            });
        }

        // ═══ POST: api/course — ایجاد دوره (فقط ادمین/استاد) ═══
        [Authorize(Roles = "admin,professor")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CourseDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { success = false, message = "عنوان دوره الزامی است." });

            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var course = new Course
            {
                Title = dto.Title,
                Description = dto.Description ?? "",
                InstructorId = dto.InstructorId ?? userId,
                Price = dto.Price,
                OriginalPrice = dto.OriginalPrice > 0 ? dto.OriginalPrice : dto.Price,
                Level = dto.Level ?? "مبتدی",
                Duration = dto.Duration ?? "",
                Category = dto.Category ?? "",
                Icon = dto.Icon ?? "📚",
                Image = dto.Image ?? "",
                Tags = JsonSerializer.Serialize(dto.Tags ?? new List<string>()),
                Chapters = JsonSerializer.Serialize(dto.Chapters ?? new List<object>()),
                IsPublished = true
            };

            _db.Courses.Add(course);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, data = new { id = course.Id }, message = "دوره ایجاد شد." });
        }

        // ═══ PUT: api/course/{id} — ویرایش دوره (فقط ادمین/استاد صاحب دوره) ═══
        [Authorize(Roles = "admin,professor")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CourseDto dto)
        {
            var course = await _db.Courses.FindAsync(id);
            if (course == null) return NotFound(new { success = false, message = "دوره یافت نشد." });

            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var isAdmin = User.IsInRole("admin");
            if (!isAdmin && course.InstructorId != userId)
                return Forbid();

            course.Title = dto.Title ?? course.Title;
            course.Description = dto.Description ?? course.Description;
            course.Price = dto.Price;
            course.OriginalPrice = dto.OriginalPrice > 0 ? dto.OriginalPrice : course.OriginalPrice;
            course.Level = dto.Level ?? course.Level;
            course.Duration = dto.Duration ?? course.Duration;
            course.Category = dto.Category ?? course.Category;
            course.Icon = dto.Icon ?? course.Icon;
            course.Image = dto.Image ?? course.Image;
            if (dto.Tags != null) course.Tags = JsonSerializer.Serialize(dto.Tags);
            if (dto.Chapters != null) course.Chapters = JsonSerializer.Serialize(dto.Chapters);
            if (dto.IsPublished.HasValue) course.IsPublished = dto.IsPublished.Value;

            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "دوره بروزرسانی شد." });
        }

        // ═══ DELETE: api/course/{id} — حذف دوره (فقط ادمین/استاد صاحب دوره) ═══
        [Authorize(Roles = "admin,professor")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var course = await _db.Courses.FindAsync(id);
            if (course == null) return NotFound(new { success = false, message = "دوره یافت نشد." });

            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var isAdmin = User.IsInRole("admin");
            if (!isAdmin && course.InstructorId != userId)
                return Forbid();

            _db.Courses.Remove(course);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "دوره حذف شد." });
        }

        // ═══ کمکی: تبدیل رشته JSON به آرایه رشته (برای Tags) ═══
        private static List<string> ParseJsonArray(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try
            {
                return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }

        // ═══ کمکی: تبدیل رشته JSON به آبجکت سرفصل‌ها ═══
        private static object ParseChapters(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<object>();
            try
            {
                return JsonSerializer.Deserialize<object>(json) ?? new List<object>();
            }
            catch
            {
                return new List<object>();
            }
        }
    }

    public class CourseDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? InstructorId { get; set; }
        public int Price { get; set; }
        public int OriginalPrice { get; set; }
        public string? Level { get; set; }
        public string? Duration { get; set; }
        public string? Category { get; set; }
        public string? Icon { get; set; }
        public string? Image { get; set; }
        public List<string>? Tags { get; set; }
        public List<object>? Chapters { get; set; }
        public bool? IsPublished { get; set; }
    }
}
