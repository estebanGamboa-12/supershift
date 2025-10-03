-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 02-10-2025 a las 21:22:30
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `supershift`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `calendars`
--

CREATE TABLE `calendars` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(190) NOT NULL,
  `team_id` bigint(20) UNSIGNED DEFAULT NULL,
  `owner_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `timezone` varchar(64) NOT NULL DEFAULT 'Europe/Madrid',
  `color` varchar(16) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `calendars`
--

INSERT INTO `calendars` (`id`, `name`, `team_id`, `owner_user_id`, `timezone`, `color`, `created_at`, `updated_at`) VALUES
(1, 'Calendario Equipo', 1, NULL, 'Europe/Madrid', '#1e40af', '2025-10-02 19:09:13', '2025-10-02 19:09:13'),
(2, 'Calendario Esteban', NULL, 2, 'Europe/Madrid', '#0ea5e9', '2025-10-02 19:09:13', '2025-10-02 19:09:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rotation_runs`
--

CREATE TABLE `rotation_runs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `template_id` bigint(20) UNSIGNED NOT NULL,
  `run_at` datetime NOT NULL DEFAULT current_timestamp(),
  `generated_from` date NOT NULL,
  `generated_to` date NOT NULL,
  `total_shifts` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rotation_steps`
--

CREATE TABLE `rotation_steps` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `template_id` bigint(20) UNSIGNED NOT NULL,
  `day_offset` int(11) NOT NULL,
  `shift_type_code` varchar(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rotation_templates`
--

CREATE TABLE `rotation_templates` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `calendar_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(190) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `start_date` date NOT NULL,
  `days_horizon` int(11) NOT NULL DEFAULT 60,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `rotation_templates`
--

INSERT INTO `rotation_templates` (`id`, `calendar_id`, `name`, `description`, `start_date`, `days_horizon`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'Ciclo 4x2', '4 días trabajo, 2 descanso', '2025-10-01', 60, 1, '2025-10-02 19:09:13', '2025-10-02 19:09:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `shifts`
--

CREATE TABLE `shifts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `calendar_id` bigint(20) UNSIGNED NOT NULL,
  `assignee_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `shift_type_code` varchar(32) NOT NULL,
  `start_at` datetime NOT NULL,
  `end_at` datetime NOT NULL,
  `all_day` tinyint(1) NOT NULL DEFAULT 1,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `shifts`
--

INSERT INTO `shifts` (`id`, `calendar_id`, `assignee_user_id`, `shift_type_code`, `start_at`, `end_at`, `all_day`, `note`, `created_at`, `updated_at`) VALUES
(1, 2, 2, 'WORK', '2025-10-01 00:00:00', '2025-10-01 23:59:59', 1, 'Entrega de reporte mensual', '2025-10-02 19:09:13', '2025-10-02 19:09:13'),
(2, 2, 2, 'REST', '2025-10-02 00:00:00', '2025-10-02 23:59:59', 1, 'Recuperar horas de sueño', '2025-10-02 19:09:13', '2025-10-02 19:09:13'),
(3, 2, 2, 'NIGHT', '2025-10-03 00:00:00', '2025-10-03 23:59:59', 1, 'Cobertura guardia', '2025-10-02 19:09:13', '2025-10-02 19:09:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `shift_notes`
--

CREATE TABLE `shift_notes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `shift_id` bigint(20) UNSIGNED NOT NULL,
  `author_id` bigint(20) UNSIGNED DEFAULT NULL,
  `body` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `shift_types`
--

CREATE TABLE `shift_types` (
  `code` varchar(32) NOT NULL,
  `label` varchar(100) NOT NULL,
  `color` varchar(16) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `shift_types`
--

INSERT INTO `shift_types` (`code`, `label`, `color`) VALUES
('CUSTOM', 'Personalizado', '#0ea5e9'),
('NIGHT', 'Nocturno', '#7c3aed'),
('REST', 'Descanso', '#64748b'),
('VACATION', 'Vacaciones', '#f97316'),
('WORK', 'Trabajo', '#2563eb');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `teams`
--

CREATE TABLE `teams` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(190) NOT NULL,
  `owner_user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `teams`
--

INSERT INTO `teams` (`id`, `name`, `owner_user_id`, `created_at`, `updated_at`) VALUES
(1, 'Equipo Demo', 1, '2025-10-02 19:09:13', '2025-10-02 19:09:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `team_members`
--

CREATE TABLE `team_members` (
  `team_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
  `joined_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `team_members`
--

INSERT INTO `team_members` (`team_id`, `user_id`, `role`, `joined_at`) VALUES
(1, 1, 'owner', '2025-10-02 19:09:13'),
(1, 2, 'member', '2025-10-02 19:09:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `email` varchar(190) NOT NULL,
  `name` varchar(190) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `timezone` varchar(64) NOT NULL DEFAULT 'Europe/Madrid',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `email`, `name`, `password_hash`, `timezone`, `created_at`, `updated_at`) VALUES
(1, 'admin@supershift.local', 'Admin Supershift', NULL, 'Europe/Madrid', '2025-10-02 19:09:12', '2025-10-02 19:09:12'),
(2, 'esteban@example.com', 'Esteban', NULL, 'Europe/Madrid', '2025-10-02 19:09:12', '2025-10-02 19:09:12');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `calendars`
--
ALTER TABLE `calendars`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cal_team` (`team_id`),
  ADD KEY `idx_cal_owner` (`owner_user_id`);

--
-- Indices de la tabla `rotation_runs`
--
ALTER TABLE `rotation_runs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rr_template` (`template_id`);

--
-- Indices de la tabla `rotation_steps`
--
ALTER TABLE `rotation_steps`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rt_step` (`template_id`,`day_offset`),
  ADD KEY `idx_rs_type` (`shift_type_code`);

--
-- Indices de la tabla `rotation_templates`
--
ALTER TABLE `rotation_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rt_calendar` (`calendar_id`),
  ADD KEY `idx_rt_creator` (`created_by`);

--
-- Indices de la tabla `shifts`
--
ALTER TABLE `shifts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_shifts_cal_start` (`calendar_id`,`start_at`),
  ADD KEY `idx_shifts_assignee` (`assignee_user_id`),
  ADD KEY `idx_shifts_type` (`shift_type_code`);

--
-- Indices de la tabla `shift_notes`
--
ALTER TABLE `shift_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sn_shift` (`shift_id`),
  ADD KEY `idx_sn_author` (`author_id`);

--
-- Indices de la tabla `shift_types`
--
ALTER TABLE `shift_types`
  ADD PRIMARY KEY (`code`);

--
-- Indices de la tabla `teams`
--
ALTER TABLE `teams`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_teams_owner` (`owner_user_id`);

--
-- Indices de la tabla `team_members`
--
ALTER TABLE `team_members`
  ADD PRIMARY KEY (`team_id`,`user_id`),
  ADD KEY `idx_tm_user` (`user_id`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `calendars`
--
ALTER TABLE `calendars`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `rotation_runs`
--
ALTER TABLE `rotation_runs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rotation_steps`
--
ALTER TABLE `rotation_steps`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rotation_templates`
--
ALTER TABLE `rotation_templates`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `shifts`
--
ALTER TABLE `shifts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `shift_notes`
--
ALTER TABLE `shift_notes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `teams`
--
ALTER TABLE `teams`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `calendars`
--
ALTER TABLE `calendars`
  ADD CONSTRAINT `fk_cal_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_cal_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `rotation_runs`
--
ALTER TABLE `rotation_runs`
  ADD CONSTRAINT `fk_rr_template` FOREIGN KEY (`template_id`) REFERENCES `rotation_templates` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `rotation_steps`
--
ALTER TABLE `rotation_steps`
  ADD CONSTRAINT `fk_rs_template` FOREIGN KEY (`template_id`) REFERENCES `rotation_templates` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rs_type` FOREIGN KEY (`shift_type_code`) REFERENCES `shift_types` (`code`);

--
-- Filtros para la tabla `rotation_templates`
--
ALTER TABLE `rotation_templates`
  ADD CONSTRAINT `fk_rt_calendar` FOREIGN KEY (`calendar_id`) REFERENCES `calendars` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rt_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `shifts`
--
ALTER TABLE `shifts`
  ADD CONSTRAINT `fk_shift_assignee` FOREIGN KEY (`assignee_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_shift_calendar` FOREIGN KEY (`calendar_id`) REFERENCES `calendars` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_shift_type` FOREIGN KEY (`shift_type_code`) REFERENCES `shift_types` (`code`);

--
-- Filtros para la tabla `shift_notes`
--
ALTER TABLE `shift_notes`
  ADD CONSTRAINT `fk_sn_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sn_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `teams`
--
ALTER TABLE `teams`
  ADD CONSTRAINT `fk_teams_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `team_members`
--
ALTER TABLE `team_members`
  ADD CONSTRAINT `fk_tm_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
