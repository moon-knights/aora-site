using Aora.Data;
using Aora.Models;
using Aora.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Aora.Controllers
{
    [ApiController]
    [Route SigningCredentials(key, SecurityAlgorithms.HmacSha25("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _auth;
        private readonly AoraDbContext _db;

        public AuthController(AuthService auth, AoraDbContext db)
        {
            _auth = auth;
            _db = db;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var result = await _auth.RegisterAsync(dto.FullName, dto.Email, dto.Password, dto.Role ?? "student");
            if (!result.Success)
                return BadRequest(new { success = false, message = result.Message });

            return Ok(new { success = true, user = new { result.User!.Id, result.User.FullName, result.User.Email, result.User.Role }, token = result.Token });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var result = await _auth.LoginAsync(dto.Email, dto.Password);
            if (!result.Success)
                return Unauthorized(new { success = false, message = result.Message });

            return Ok(new { success = true, user = new { result.User!.Id, result.User.FullName, result.User.Email, result.User.Role }, token = result.Token });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound();

            return Ok(new { user.Id, user.FullName, user.Email, user.Role, user.Bio, user.Phone, user.University });
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound();

            user.FullName = dto.FullName ?? user.FullName;
            user.Bio = dto.Bio ?? user.Bio;
            user.Phone = dto.Phone ?? user.Phone;
            user.University = dto.University ?? user.University;
            await _db.SaveChangesAsync();

            return Ok(new { success = true });
        }
    }

    public record RegisterDto(string FullName, string Email, string Password, string? Role);
    public record LoginDto(string Email, string Password);
    public record UpdateProfileDto(string? FullName, string? Bio, string? Phone, string? University);
}