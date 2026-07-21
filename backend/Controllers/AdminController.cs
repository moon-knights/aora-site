using Aora.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Aora.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "admin")]
    public class AdminController : ControllerBase
    {
        private readonly AoraDbContext _db;

        public AdminController(AoraDbContext db) => _db = db;

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var totalRevenue = await _db.Enrollments.SumAsync(e => (int?)e.AmountPaid) ?? 0;

            return Ok(new
            {
                success = true,
                data = new
                {
                    totalUsers = await _db.Users.CountAsync(),
                    totalStudents = await _db.Users.CountAsync(u => u.Role == "student"),
                    totalProfessors = await _db.Users.CountAsync(u => u.Role == "professor"),
                    totalCourses = await _db.Courses.CountAsync(),
                    totalSurveys = await _db.Surveys.CountAsync(),
                    totalEnrollments = await _db.Enrollments.CountAsync(),
                    totalRevenue
                }
            });
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _db.Users
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    u.Role,
                    u.IsActive,
                    u.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = users });
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();
            _db.Users.Remove(user);
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }
    }
}
