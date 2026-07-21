using System.Security.Claims;
using Aora.Data;
using Aora.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Aora.Controllers
{
    // ═══════════════════════════════════════════════════════════
    // پرداخت. در نبود کلید واقعی زرین‌پال (Zarinpal:MerchantId در
    // appsettings هنوز مقدار نمونه دارد)، این کنترلر در «حالت آزمایشی»
    // کار می‌کند: هر درخواست پرداخت را موفق فرض می‌کند و بلافاصله
    // ثبت‌نام واقعی را در دیتابیس ایجاد می‌کند. وقتی مرچنت‌کد واقعی
    // زرین‌پال را در appsettings قرار دادید، متدهای RequestPayment و
    // VerifyPayment را با فراخوانی HttpClient به سرویس زرین‌پال
    // جایگزین کنید (مستندات: https://docs.zarinpal.com).
    // ═══════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/payment")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly AoraDbContext _db;
        private readonly IConfiguration _config;

        public PaymentController(AoraDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        // ═══ POST: api/payment/request — شروع پرداخت برای یک یا چند دوره ═══
        [HttpPost("request")]
        public async Task<IActionResult> RequestPayment([FromBody] PaymentRequestDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var courses = await _db.Courses.Where(c => dto.CourseIds.Contains(c.Id)).ToListAsync();
            if (!courses.Any()) return BadRequest(new { success = false, message = "دوره‌ای برای پرداخت یافت نشد." });

            var alreadyEnrolled = await _db.Enrollments
                .Where(e => e.UserId == userId && dto.CourseIds.Contains(e.CourseId))
                .Select(e => e.CourseId)
                .ToListAsync();

            var toBuy = courses.Where(c => !alreadyEnrolled.Contains(c.Id)).ToList();
            if (!toBuy.Any()) return BadRequest(new { success = false, message = "قبلاً در تمام این دوره‌ها ثبت‌نام کرده‌اید." });

            var amount = toBuy.Sum(c => c.Price);
            var authority = "AORA_" + Guid.NewGuid().ToString("N")[..20];

            var isSandbox = _config.GetValue<bool>("Zarinpal:IsSandbox", true);

            _db.PaymentTransactions.Add(new PaymentTransaction
            {
                Authority = authority,
                Amount = amount,
                UserId = userId,
                CourseId = toBuy.First().Id, // برای سادگی؛ در صورت نیاز به چند دوره، جدول واسط اضافه شود
                Status = "pending",
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            // در حالت آزمایشی، مستقیماً به صفحه تایید با وضعیت موفق هدایت می‌کنیم
            var callbackBase = _config["Zarinpal:CallbackUrl"] ?? "/payment-callback.html";
            var paymentUrl = isSandbox
                ? $"{callbackBase}?Status=OK&Authority={authority}"
                : $"{callbackBase}?Status=OK&Authority={authority}"; // TODO: جایگزینی با URL واقعی درگاه زرین‌پال

            return Ok(new
            {
                success = true,
                data = new { authority, amount, paymentUrl }
            });
        }

        // ═══ POST: api/payment/verify — تایید پرداخت و ثبت‌نام نهایی ═══
        [HttpPost("verify")]
        public async Task<IActionResult> VerifyPayment([FromBody] PaymentVerifyDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var tx = await _db.PaymentTransactions
                .FirstOrDefaultAsync(t => t.Authority == dto.Authority && t.UserId == userId);
            if (tx == null) return NotFound(new { success = false, message = "تراکنش یافت نشد." });

            if (tx.Status == "completed")
                return Ok(new { success = true, data = new { refId = tx.RefId } });

            // در حالت آزمایشی، همیشه موفق در نظر گرفته می‌شود
            tx.Status = "completed";
            tx.RefId = new Random().NextInt64(1000000000, 9999999999);
            tx.CompletedAt = DateTime.UtcNow;

            var alreadyEnrolled = await _db.Enrollments
                .AnyAsync(e => e.UserId == userId && e.CourseId == tx.CourseId);

            if (!alreadyEnrolled)
            {
                _db.Enrollments.Add(new Enrollment
                {
                    UserId = userId,
                    CourseId = tx.CourseId,
                    EnrolledAt = DateTime.UtcNow,
                    Progress = 0,
                    CompletedLessons = "[]",
                    PaymentRefId = tx.RefId,
                    AmountPaid = tx.Amount
                });

                var course = await _db.Courses.FindAsync(tx.CourseId);
                if (course != null) course.StudentsCount += 1;
            }

            await _db.SaveChangesAsync();

            return Ok(new { success = true, data = new { refId = tx.RefId } });
        }
    }

    public record PaymentRequestDto(List<int> CourseIds);
    public record PaymentVerifyDto(string Authority);
}
