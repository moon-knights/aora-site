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
    [Authorize]  // ← همه endpointها نیاز به لاگین دارند
    public class SurveyController : ControllerBase
    {
        private readonly AoraDbContext _db;

        public SurveyController(AoraDbContext db) => _db = db;

        // ═══ دریافت لیست: فقط ادمین ═══
        [HttpGet]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAll()
        {
            var surveys = await _db.Surveys
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();
            return Ok(new { success = true, data = surveys });
        }

        // ═══ دریافت یک نظرسنجی: فقط ادمین ═══
        [HttpGet("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetById(int id)
        {
            var survey = await _db.Surveys.FindAsync(id);
            if (survey == null) return NotFound();
            return Ok(new { success = true, data = survey });
        }

        // ═══ ایجاد: فقط ادمین ═══
        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Create([FromBody] SurveyDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var survey = new Survey
            {
                Title = dto.Title,
                Description = dto.Description ?? "",
                Questions = dto.Questions ?? "[]",
                CreatorId = userId
            };
            _db.Surveys.Add(survey);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, data = survey });
        }

        // ═══ پاسخ‌دهی: همه (پاسخ به لینک نظرسنجی) ═══
        [AllowAnonymous]
        [HttpPost("{id}/respond")]
        public async Task<IActionResult> Respond(int id, [FromBody] ResponseDto dto)
        {
            var survey = await _db.Surveys.FindAsync(id);
            if (survey == null || survey.Status != "active")
                return BadRequest(new { success = false, message = "نظرسنجی فعال نیست." });

            var response = new SurveyResponse
            {
                SurveyId = id,
                Answers = dto.Answers ?? "{}",
                RespondentEmail = dto.Email
            };
            _db.SurveyResponses.Add(response);
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // ═══ نتایج: فقط ادمین ═══
        [HttpGet("{id}/results")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetResults(int id)
        {
            var responses = await _db.SurveyResponses
                .Where(r => r.SurveyId == id)
                .OrderByDescending(r => r.SubmittedAt)
                .ToListAsync();
            return Ok(new { success = true, data = responses, total = responses.Count });
        }

        // ═══ حذف: فقط ادمین ═══
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var survey = await _db.Surveys.FindAsync(id);
            if (survey == null) return NotFound();
            _db.Surveys.Remove(survey);
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }
    }

    public record SurveyDto(string Title, string? Description, string? Questions);
    public record ResponseDto(string Answers, string? Email);
}