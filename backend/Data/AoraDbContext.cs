using Aora.Models;
using Microsoft.EntityFrameworkCore;

namespace Aora.Data
{
    public class AoraDbContext : DbContext
    {
        public AoraDbContext(DbContextOptions<AoraDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Course> Courses => Set<Course>();
        public DbSet<Enrollment> Enrollments => Set<Enrollment>();
        public DbSet<Survey> Surveys => Set<Survey>();
        public DbSet<SurveyResponse> SurveyResponses => Set<SurveyResponse>();
        public DbSet<ForumPost> ForumPosts => Set<ForumPost>();
        public DbSet<ForumReply> ForumReplies => Set<ForumReply>();
        public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();
        public DbSet<Meeting> Meetings => Set<Meeting>();
        public DbSet<Page> Pages => Set<Page>();
        public DbSet<SiteSettings> SiteSettings => Set<SiteSettings>();

        protected override void OnModelCreating(ModelBuilder mb)
        {
            base.OnModelCreating(mb);

            mb.Entity<User>().HasIndex(u => u.Email).IsUnique();
            mb.Entity<Page>().HasIndex(p => p.Slug).IsUnique();

            mb.Entity<Course>().HasOne(c => c.Instructor)
                .WithMany(u => u.CoursesCreated)
                .HasForeignKey(c => c.InstructorId)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Enrollment>().HasIndex(e => new { e.UserId, e.CourseId }).IsUnique();

            // Seed admin user
            mb.Entity<User>().HasData(new User
            {
                Id = 1,
                FullName = "مدیر آئورا",
                Email = "aora@admin.ir",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Role = "admin",
                IsActive = true,
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            // Seed default settings
            mb.Entity<SiteSettings>().HasData(new SiteSettings
            {
                Id = 1,
                SiteName = "آئورا",
                UpdatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            });
        }
    }
}
