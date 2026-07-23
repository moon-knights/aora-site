-- ═══════════════════════════════════════════════════════════
-- آئورا — اسکیمای دیتابیس MySQL
-- ═══════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ── کاربران ──
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('student','professor','admin') NOT NULL DEFAULT 'student',
  `phone` VARCHAR(20) DEFAULT '',
  `gender` VARCHAR(10) DEFAULT '',
  `father_name` VARCHAR(100) DEFAULT '',
  `national_code` VARCHAR(20) DEFAULT '',
  `bio` VARCHAR(500) DEFAULT '',
  `avatar` VARCHAR(300) DEFAULT '',
  `university` VARCHAR(100) DEFAULT '',
  `specialty` VARCHAR(100) DEFAULT '',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login_at` DATETIME DEFAULT NULL,
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── دوره‌ها ──
CREATE TABLE IF NOT EXISTS `courses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `description` VARCHAR(1000) DEFAULT '',
  `instructor_id` INT NOT NULL,
  `price` INT NOT NULL DEFAULT 0,
  `original_price` INT NOT NULL DEFAULT 0,
  `level` VARCHAR(30) DEFAULT 'مبتدی',
  `duration` VARCHAR(50) DEFAULT '',
  `category` VARCHAR(50) DEFAULT '',
  `icon` VARCHAR(10) DEFAULT '📚',
  `image` VARCHAR(300) DEFAULT '',
  `rating` DOUBLE DEFAULT 0,
  `students_count` INT DEFAULT 0,
  `is_featured` TINYINT(1) DEFAULT 0,
  `is_published` TINYINT(1) DEFAULT 1,
  `tags` TEXT DEFAULT NULL,
  `chapters` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`instructor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_published` (`is_published`),
  INDEX `idx_category` (`category`),
  INDEX `idx_instructor` (`instructor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── ثبت‌نام‌ها ──
CREATE TABLE IF NOT EXISTS `enrollments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `enrolled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `progress` INT DEFAULT 0,
  `completed_lessons` TEXT DEFAULT NULL,
  `payment_ref_id` BIGINT DEFAULT NULL,
  `amount_paid` INT DEFAULT 0,
  UNIQUE KEY `uk_user_course` (`user_id`, `course_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── تالار گفتگو ──
CREATE TABLE IF NOT EXISTS `forum_posts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `content` VARCHAR(5000) NOT NULL,
  `category` VARCHAR(50) DEFAULT 'عمومی',
  `author_id` INT NOT NULL,
  `likes` INT DEFAULT 0,
  `views` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `forum_replies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `post_id` INT NOT NULL,
  `content` VARCHAR(2000) NOT NULL,
  `author_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`post_id`) REFERENCES `forum_posts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── جلسات ──
CREATE TABLE IF NOT EXISTS `meetings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `host` VARCHAR(150) DEFAULT '',
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `creator_id` INT NOT NULL,
  `status` VARCHAR(20) DEFAULT 'scheduled',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── نظرسنجی‌ها ──
CREATE TABLE IF NOT EXISTS `surveys` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `description` VARCHAR(500) DEFAULT '',
  `creator_id` INT NOT NULL,
  `questions` TEXT DEFAULT NULL,
  `status` VARCHAR(20) DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `survey_responses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `survey_id` INT NOT NULL,
  `answers` TEXT DEFAULT NULL,
  `respondent_email` VARCHAR(100) DEFAULT NULL,
  `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── تراکنش‌های مالی ──
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `authority` VARCHAR(100) NOT NULL UNIQUE,
  `ref_id` BIGINT DEFAULT NULL,
  `amount` INT NOT NULL DEFAULT 0,
  `user_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `status` VARCHAR(20) DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── صفحات ──
CREATE TABLE IF NOT EXISTS `pages` (
  `id` VARCHAR(36) PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(200) NOT NULL UNIQUE,
  `html_content` LONGTEXT DEFAULT NULL,
  `css_content` LONGTEXT DEFAULT NULL,
  `grapesjs_state` LONGTEXT DEFAULT NULL,
  `is_published` TINYINT(1) DEFAULT 1,
  `is_home_page` TINYINT(1) DEFAULT 0,
  `meta_description` VARCHAR(500) DEFAULT NULL,
  `og_image` VARCHAR(300) DEFAULT NULL,
  `sort_order` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL,
  `created_by` VARCHAR(100) DEFAULT NULL,
  INDEX `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── تنظیمات سایت ──
CREATE TABLE IF NOT EXISTS `site_settings` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `logo_url` VARCHAR(500) DEFAULT NULL,
  `logo_path` VARCHAR(500) DEFAULT NULL,
  `site_name` VARCHAR(200) DEFAULT 'آئورا',
  `global_header_html` LONGTEXT DEFAULT NULL,
  `global_header_css` LONGTEXT DEFAULT NULL,
  `global_header_state` LONGTEXT DEFAULT NULL,
  `global_footer_html` LONGTEXT DEFAULT NULL,
  `global_footer_css` LONGTEXT DEFAULT NULL,
  `global_footer_state` LONGTEXT DEFAULT NULL,
  `favicon_url` VARCHAR(500) DEFAULT NULL,
  `custom_css` VARCHAR(1000) DEFAULT NULL,
  `custom_head_scripts` VARCHAR(2000) DEFAULT NULL,
  `support_email` VARCHAR(200) DEFAULT NULL,
  `maintenance_mode` TINYINT(1) DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══ داده‌های اولیه ═══

-- ادمین پیش‌فرض (رمز: admin123)
INSERT IGNORE INTO `users` (`id`, `full_name`, `email`, `password_hash`, `role`, `is_active`, `created_at`)
VALUES (1, 'مدیر آئورا', 'aora@admin.ir', '$2b$10$W3mH4cu6IOPAQnfwOWjHtOKp85opQ8I4K7pq0IqWMTPV2lzt/M2j2', 'admin', 1, NOW());

-- تنظیمات پیش‌فرض
INSERT IGNORE INTO `site_settings` (`id`, `site_name`, `updated_at`)
VALUES (1, 'آئورا', NOW());
