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
    public class ForumController : ControllerBase
    {
        private readonly AoraDbContext _db;

        public ForumController(AoraDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var posts = await _db.ForumPosts
                .Include(p => p.Author)
                .Include(p => p.Replies).ThenInclude(r => r.Author)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id, p.Title, p.Content, p.Category,
                    author = p.Author!.FullName,
                    authorRole = p.Author.Role,
                    p.Likes, p.Views, p.CreatedAt,
                    replies = p.Replies.Select(r => new
                    {
                        r.Id, r.Content,
                        author, data = posts });
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ForumDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var post = new ForumPost
            {
                Title = dto.Title,
                Content = dto.Content,
                Category = dto.Category ?? "عمومی",
                AuthorId = userId
            };
            _db.ForumPosts.Add(post);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, data = post });
        }

        [Authorize]
        [HttpPost("{id}/reply")]
        public async Task<IActionResult> Reply(int id, [FromBody] ReplyDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var reply = new ForumReply
            {
                PostId = id,
                Content = dto.Content,
                AuthorId = userId
            };
            _db.ForumReplies.Add(reply);
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }
    }

    public record ForumDto(string Title, string Content, string? Category);
    public record ReplyDto(string Content);
}