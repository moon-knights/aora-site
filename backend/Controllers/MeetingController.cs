using Aora.Data;
using Aora.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Aora.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]  // ← همه endpointها نیاز به لاگین
    public class MeetingController : ControllerBase
    {
        private readonly AoraDbContext _db;

        public MeetingController(AoraDbContext db) => _db = db;

        // ═══ لیست جلسات: فقط ادمین ═══
        [HttpGet]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAll()
        {
            var meetings = await _db.Meetings
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
            return Ok(new { success = true, data = meetings });
        }

        // ═══ ایجاد جلسه: فقط ادمین ═══
        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Create([FromBody] MeetingDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var code = GenerateCode();
            var meeting = new Meeting
            {
                Title = dto.Title,
                Host = dto.Host ?? "",
                Code = code,
                CreatorId = userId,
                Status = "scheduled"
            };
            _db.Meetings.Add(meeting);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, data = meeting });
        }

        // ═══ دریافت با کد: ادمین (برای ورود به جلسه) ═══
        [HttpGet("bycode/{code}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetByCode(string code)
        {
            var meeting = await _db.Meetings.FirstOrDefaultAsync(m => m.Code == code);
            if (meeting == null) return NotFound();
            return Ok(new { success = true, data = meeting });
        }

        // ═══ حذف: فقط ادمین ═══
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var meeting = await _db.Meetings.FindAsync(id);
            if (meeting == null) return NotFound();
            _db.Meetings.Remove(meeting);
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        private static string GenerateCode()
        {
            var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
            var code = "";
            var rng = new Random();
            for (int i = 0; i < 10; i++)
            {
                if (i == 3 || i == 6) code += "-";
                code += chars[rng.Next(chars.Length)];
            }
            return code;
        }
    }

    public record MeetingDto(string Title, string? Host);
}