using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Aora.Data;
using Aora.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Aora.Services
{
    public class AuthResult
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public User? User { get; set; }
        public string? Token { get; set; }
    }

    public class AuthService
    {
        private readonly AoraDbContext _db;
        private readonly IConfiguration _config;

        public AuthService(AoraDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        public async Task<AuthResult> RegisterAsync(string fullName, string email, string password, string role)
        {
            email = email.Trim().ToLower();

            var exists = await _db.Users.AnyAsync(u => u.Email == email);
            if (exists)
                return new AuthResult { Success = false, Message = "این ایمیل قبلاً ثبت شده است." };

            // فقط دانشجو مجاز به ثبت‌نام عمومی است؛ نقش‌های دیگر توسط ادمین ساخته می‌شوند
            var safeRole = role == "professor" || role == "admin" ? "student" : role;

            var user = new User
            {
                FullName = fullName.Trim(),
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Role = string.IsNullOrWhiteSpace(safeRole) ? "student" : safeRole,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            var token = GenerateToken(user);
            return new AuthResult { Success = true, User = user, Token = token };
        }

        public async Task<AuthResult> LoginAsync(string email, string password)
        {
            email = email.Trim().ToLower();
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                return new AuthResult { Success = false, Message = "ایمیل یا رمز عبور اشتباه است." };

            if (!user.IsActive)
                return new AuthResult { Success = false, Message = "حساب کاربری غیرفعال شده است." };

            user.LastLoginAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var token = GenerateToken(user);
            return new AuthResult { Success = true, User = user, Token = token };
        }

        public string GenerateToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _config["Jwt:Key"] ?? "AoraSuperSecretKey_1405_MustBe32Chars!"));

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("FullName", user.FullName)
            };

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"] ?? "Aora",
                audience: _config["Jwt:Audience"] ?? "AoraApp",
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
