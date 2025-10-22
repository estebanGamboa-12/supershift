-- Supershift database bootstrap
-- Compatible with MySQL 8.x / MariaDB 10.4+

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `supershift`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `supershift`;

DROP TABLE IF EXISTS `shift_notes`;
DROP TABLE IF EXISTS `shifts`;
DROP TABLE IF EXISTS `rotation_runs`;
DROP TABLE IF EXISTS `rotation_steps`;
DROP TABLE IF EXISTS `rotation_templates`;
DROP TABLE IF EXISTS `team_members`;
DROP TABLE IF EXISTS `calendars`;
DROP TABLE IF EXISTS `teams`;
DROP TABLE IF EXISTS `user_profile_history`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `shift_types`;

CREATE TABLE `shift_types` (
  `code` varchar(32) NOT NULL,
  `label` varchar(100) NOT NULL,
  `color` varchar(16) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` varchar(190) NOT NULL,
  `name` varchar(190) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `timezone` varchar(64) NOT NULL DEFAULT 'Europe/Madrid',
  `avatar_url` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_profile_history` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `changed_by_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `previous_name` varchar(190) DEFAULT NULL,
  `previous_timezone` varchar(64) DEFAULT NULL,
  `previous_avatar_url` text DEFAULT NULL,
  `new_name` varchar(190) DEFAULT NULL,
  `new_timezone` varchar(64) DEFAULT NULL,
  `new_avatar_url` text DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_uph_user` (`user_id`),
  KEY `idx_uph_changed_by` (`changed_by_user_id`),
  CONSTRAINT `fk_uph_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uph_changed_by` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `teams` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(190) NOT NULL,
  `owner_user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_teams_owner` (`owner_user_id`),
  CONSTRAINT `fk_teams_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `calendars` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(190) NOT NULL,
  `team_id` bigint(20) UNSIGNED DEFAULT NULL,
  `owner_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `timezone` varchar(64) NOT NULL DEFAULT 'Europe/Madrid',
  `color` varchar(16) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_cal_team` (`team_id`),
  KEY `idx_cal_owner` (`owner_user_id`),
  CONSTRAINT `fk_cal_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cal_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `team_members` (
  `team_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
  `joined_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`team_id`,`user_id`),
  KEY `idx_tm_user` (`user_id`),
  CONSTRAINT `fk_tm_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rotation_templates` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `calendar_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(190) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `start_date` date NOT NULL,
  `days_horizon` int(11) NOT NULL DEFAULT 60,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_rt_calendar` (`calendar_id`),
  KEY `idx_rt_creator` (`created_by`),
  CONSTRAINT `fk_rt_calendar` FOREIGN KEY (`calendar_id`) REFERENCES `calendars` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rt_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rotation_steps` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_id` bigint(20) UNSIGNED NOT NULL,
  `day_offset` int(11) NOT NULL,
  `shift_type_code` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rt_step` (`template_id`,`day_offset`),
  KEY `idx_rs_type` (`shift_type_code`),
  CONSTRAINT `fk_rs_template` FOREIGN KEY (`template_id`) REFERENCES `rotation_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rs_type` FOREIGN KEY (`shift_type_code`) REFERENCES `shift_types` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rotation_runs` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_id` bigint(20) UNSIGNED NOT NULL,
  `run_at` datetime NOT NULL DEFAULT current_timestamp(),
  `generated_from` date NOT NULL,
  `generated_to` date NOT NULL,
  `total_shifts` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rr_template` (`template_id`),
  CONSTRAINT `fk_rr_template` FOREIGN KEY (`template_id`) REFERENCES `rotation_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shifts` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `calendar_id` bigint(20) UNSIGNED NOT NULL,
  `assignee_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `shift_type_code` varchar(32) NOT NULL,
  `start_at` datetime NOT NULL,
  `end_at` datetime NOT NULL,
  `all_day` tinyint(1) NOT NULL DEFAULT 1,
  `note` text DEFAULT NULL,
  `label` varchar(100) DEFAULT NULL,
  `color` varchar(16) DEFAULT NULL,
  `plus_night` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `plus_holiday` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `plus_availability` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `plus_other` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_shifts_cal_start` (`calendar_id`,`start_at`),
  KEY `idx_shifts_assignee` (`assignee_user_id`),
  KEY `idx_shifts_type` (`shift_type_code`),
  CONSTRAINT `fk_shift_calendar` FOREIGN KEY (`calendar_id`) REFERENCES `calendars` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shift_assignee` FOREIGN KEY (`assignee_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_shift_type` FOREIGN KEY (`shift_type_code`) REFERENCES `shift_types` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shift_notes` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `shift_id` bigint(20) UNSIGNED NOT NULL,
  `author_id` bigint(20) UNSIGNED DEFAULT NULL,
  `body` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sn_shift` (`shift_id`),
  KEY `idx_sn_author` (`author_id`),
  CONSTRAINT `fk_sn_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sn_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `shift_types` (`code`, `label`, `color`) VALUES
  ('CUSTOM', 'Personalizado', '#0ea5e9'),
  ('NIGHT', 'Nocturno', '#7c3aed'),
  ('REST', 'Descanso', '#64748b'),
  ('VACATION', 'Vacaciones', '#f97316'),
  ('WORK', 'Trabajo', '#2563eb');

INSERT INTO `users` (`id`, `email`, `name`, `password_hash`, `timezone`, `avatar_url`) VALUES
  (
    1,
    'admin@supershift.local',
    'Admin Supershift',
    '5f9a5c284860337f0b8fc4031b6c9d4a:b358197ed87accd54c26b1d7a63cac198639c6c7a5bb24e7b71b5d9a34ea43ab97c830608c5512413c9fdce0fe61d118c459826dffb63dfe0e5c448bba81f216',
    'Europe/Madrid',
    'https://avatars.githubusercontent.com/u/0000001?v=4'
  ),
  (
    2,
    'esteban@example.com',
    'Esteban',
    '6e1b968c1df42190bef0ad9b35addcab:887582b2888acff2c62ee11857a1ebbbf10b8e04e418f2d2829f9eea8874ea039d5df13492208b0e97a12fd94598ce6814e0a0d48fef211d6084366081eef84f',
    'Europe/Madrid',
    'https://avatars.githubusercontent.com/u/0000002?v=4'
  );

INSERT INTO `teams` (`id`, `name`, `owner_user_id`, `created_at`, `updated_at`) VALUES
  (1, 'Equipo Demo', 1, current_timestamp(), current_timestamp());

INSERT INTO `team_members` (`team_id`, `user_id`, `role`, `joined_at`) VALUES
  (1, 1, 'owner', current_timestamp()),
  (1, 2, 'member', current_timestamp());

INSERT INTO `calendars` (`id`, `name`, `team_id`, `owner_user_id`, `timezone`, `color`, `created_at`, `updated_at`) VALUES
  (1, 'Calendario Equipo', 1, NULL, 'Europe/Madrid', '#1e40af', current_timestamp(), current_timestamp()),
  (2, 'Calendario de Esteban', NULL, 2, 'Europe/Madrid', '#0ea5e9', current_timestamp(), current_timestamp());

INSERT INTO `rotation_templates` (`id`, `calendar_id`, `name`, `description`, `start_date`, `days_horizon`, `created_by`, `created_at`, `updated_at`) VALUES
  (1, 1, 'Ciclo 4x2', '4 días trabajo, 2 descanso', '2025-10-01', 60, 1, current_timestamp(), current_timestamp());

INSERT INTO `rotation_steps` (`id`, `template_id`, `day_offset`, `shift_type_code`) VALUES
  (1, 1, 0, 'WORK'),
  (2, 1, 1, 'WORK'),
  (3, 1, 2, 'WORK'),
  (4, 1, 3, 'WORK'),
  (5, 1, 4, 'REST'),
  (6, 1, 5, 'REST');

INSERT INTO `shifts` (`id`, `calendar_id`, `assignee_user_id`, `shift_type_code`, `start_at`, `end_at`, `all_day`, `note`, `label`, `color`, `plus_night`, `plus_holiday`, `plus_availability`, `plus_other`, `created_at`, `updated_at`) VALUES
  (1, 2, 2, 'WORK', '2025-10-01 00:00:00', '2025-10-01 23:59:59', 1, 'Entrega de reporte mensual', 'Trabajo', '#2563eb', 0, 1, 0, 0, current_timestamp(), current_timestamp()),
  (2, 2, 2, 'REST', '2025-10-02 00:00:00', '2025-10-02 23:59:59', 1, 'Recuperar horas de sueño', 'Descanso', '#64748b', 0, 0, 0, 0, current_timestamp(), current_timestamp()),
  (3, 2, 2, 'NIGHT', '2025-10-03 00:00:00', '2025-10-03 23:59:59', 1, 'Cobertura guardia', 'Nocturno', '#7c3aed', 2, 0, 1, 0, current_timestamp(), current_timestamp());

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
