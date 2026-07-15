using Aora.Data;
using Aora.Models;
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

        [HttpGet]
        public async Task c.Description.Contains(q));

            var list = await courses.Select(c => new
            {
                c.Id, c.Title, c.Description, c.Price, c.OriginalPrice,
                c.Level, c.Duration, c.Category, c.Icon, c.Image,
                c.Rating, c.StudentsCount, c.IsFeatured, c.Tags,
                instructor = c.Instructor!.FullName,
                instructorId = c.InstructorId
            }).ToListAsync();

            return Ok(new { success = true, data = list });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var course = await _db.Courses.Include(c => c.Instructor)
                .FirstOrDefaultAsync(c => c.Id == id);
            if (course == null) return NotFound();

            return Ok(new
            {
                success = true,
                data = new
                {
                    course.Id, course.Title, course.Description,
                    course.Price, course.OriginalPrice, course.Level,
                    course.Duration, course.Category, course.Icon, course.Image,
                    course.Rating, course.StudentsCount, course.Chapters,
                    instructor = course.Instructor!.FullName,
                    instructorId = course.InstructorId
                }
            });
        }
    }
}