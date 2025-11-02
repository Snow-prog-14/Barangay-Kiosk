-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 01, 2025 at 06:25 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `barangayadmin_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `citizens`
--

CREATE TABLE `citizens` (
  `id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `contact_no` varchar(20) DEFAULT NULL,
  `has_consented` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `registered_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `citizens`
--

INSERT INTO `citizens` (`id`, `full_name`, `address`, `contact_no`, `has_consented`, `is_active`, `registered_at`) VALUES
(1, 'ace cabrera', 'purok 1 barangay ugong pasig', '09913503142', 0, 1, '2025-11-01 12:50:05'),
(2, 'john doe', 'purok 2 barangay ugong ', '09212837558', 0, 0, '2025-11-01 12:51:46'),
(3, 'john smith', 'purok 3 barangay ugong', '091212121', 0, 0, '2025-11-01 13:45:59');

-- --------------------------------------------------------

--
-- Table structure for table `login_logs`
--

CREATE TABLE `login_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `login_time` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `login_logs`
--

INSERT INTO `login_logs` (`id`, `user_id`, `username`, `login_time`) VALUES
(1, 1, 'admin', '2025-11-01 15:35:01'),
(2, 2, 'acab382354', '2025-11-01 16:35:39'),
(3, 1, 'admin', '2025-11-01 16:36:30'),
(4, 1, 'admin', '2025-11-01 16:44:44');

-- --------------------------------------------------------

--
-- Table structure for table `requests`
--

CREATE TABLE `requests` (
  `id` int(11) NOT NULL,
  `ref_number` varchar(20) NOT NULL,
  `citizen_id` int(11) NOT NULL,
  `type_id` int(11) NOT NULL,
  `status` enum('on_queue','processing','payment_pending','ready_for_pick_up','released','cancelled') NOT NULL,
  `is_viewed` tinyint(1) NOT NULL DEFAULT 0,
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `requests`
--

INSERT INTO `requests` (`id`, `ref_number`, `citizen_id`, `type_id`, `status`, `is_viewed`, `requested_at`, `updated_at`) VALUES
(1, '1', 1, 1, 'released', 1, '2025-11-01 17:10:25', '2025-11-01 17:21:27'),
(2, '2', 2, 2, 'released', 1, '2025-11-01 14:01:33', '2025-11-01 17:10:25');

-- --------------------------------------------------------

--
-- Table structure for table `request_types`
--

CREATE TABLE `request_types` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `inactive_since` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_types`
--

INSERT INTO `request_types` (`id`, `name`, `fee`, `is_active`, `is_archived`, `inactive_since`, `created_at`) VALUES
(1, 'Barangay Clearance', 25.00, 0, 1, '2025-11-01 16:34:17', '2025-11-01 12:57:38'),
(2, 'Certificate ', 70.00, 1, 1, NULL, '2025-11-01 12:58:13'),
(3, 'Residency Certificate', 100.00, 1, 0, NULL, '2025-11-01 12:58:39'),
(4, 'Business Permit Endorsement', 250.00, 1, 0, NULL, '2025-11-01 12:59:36'),
(5, 'Solo Parent Certificate', 50.00, 1, 0, NULL, '2025-11-01 13:46:32');

-- --------------------------------------------------------

--
-- Table structure for table `request_type_logs`
--

CREATE TABLE `request_type_logs` (
  `id` int(11) NOT NULL,
  `request_type_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `user_name` varchar(100) NOT NULL,
  `action` varchar(50) NOT NULL,
  `details` text DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_type_logs`
--

INSERT INTO `request_type_logs` (`id`, `request_type_id`, `user_id`, `user_name`, `action`, `details`, `timestamp`) VALUES
(1, 1, 1, 'System Administrator', 'Edit', 'Fee changed from 50.00 to 25', '2025-11-01 16:33:52'),
(2, 1, 1, 'System Administrator', 'Edit', 'Status changed from Active to Inactive', '2025-11-01 16:34:17'),
(3, 1, 1, 'System Administrator', 'Archive', 'Item was archived.', '2025-11-01 17:15:38');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `role` enum('Admin','Staff','Kiosk') NOT NULL DEFAULT 'Staff',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `role`, `is_active`, `must_change_password`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2y$10$jUwzfT5./XASXMYo20MaOOuDUH9YWZBKOUZe/hoyjYdkmTffSV34S', 'System Administrator', 'Admin', 1, 0, '2025-11-01 11:48:29', '2025-11-01 11:48:29'),
(2, 'acab382354', '$2y$10$LNOYRtOyRPUJS1AlMt0SvuO0nicJaVHkXai/BukbwwREHqdpFGC1O', 'ace cabrera', 'Staff', 1, 0, '2025-11-01 13:32:11', '2025-11-01 13:35:15'),
(4, 'jdoe123', '$2y$10$H6jcBpHDvGR/zzmv6KTD6O3/PCJm5Dn54xYLDAn5pQ29IQ95Esoa.', 'john doe', 'Staff', 1, 0, '2025-11-01 13:47:01', '2025-11-01 13:47:28'),
(5, 'msmith', '$2y$10$HQRxYmaFNZ8RcUD5bKq5t.vmJsIdoh1jCDCe5HnYLlgEVGLmKR2aC', 'mark smith', 'Staff', 1, 0, '2025-11-01 14:43:33', '2025-11-01 14:44:19');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `citizens`
--
ALTER TABLE `citizens`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `login_logs`
--
ALTER TABLE `login_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `requests`
--
ALTER TABLE `requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ref_number` (`ref_number`),
  ADD KEY `citizen_id` (`citizen_id`),
  ADD KEY `type_id` (`type_id`);

--
-- Indexes for table `request_types`
--
ALTER TABLE `request_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `request_type_logs`
--
ALTER TABLE `request_type_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `request_type_id` (`request_type_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `citizens`
--
ALTER TABLE `citizens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `login_logs`
--
ALTER TABLE `login_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `requests`
--
ALTER TABLE `requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `request_types`
--
ALTER TABLE `request_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `request_type_logs`
--
ALTER TABLE `request_type_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `login_logs`
--
ALTER TABLE `login_logs`
  ADD CONSTRAINT `login_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `requests`
--
ALTER TABLE `requests`
  ADD CONSTRAINT `requests_ibfk_1` FOREIGN KEY (`citizen_id`) REFERENCES `citizens` (`id`),
  ADD CONSTRAINT `requests_ibfk_2` FOREIGN KEY (`type_id`) REFERENCES `request_types` (`id`);

--
-- Constraints for table `request_type_logs`
--
ALTER TABLE `request_type_logs`
  ADD CONSTRAINT `request_type_logs_ibfk_1` FOREIGN KEY (`request_type_id`) REFERENCES `request_types` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `request_type_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
