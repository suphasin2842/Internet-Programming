-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Sep 03, 2026 at 12:41 PM
-- Server version: 8.0.46-0ubuntu0.24.04.4
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ip_std67XXXXXXXX`
--

--
-- Dumping data for table `Inventory`
--

INSERT INTO `Inventory` (`id`, `product_name`, `description`, `price`, `image_url`, `sku`, `category`) VALUES
(2, 'nindam', 'ตุ๊กตาลิงจมูกยาว สัตว์แปลกหายาก น่าสะสม', 1200.00, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkYe5tIV9v-WecJrXJdFfoC2s5SQeVt5dJdICUj0FczBkXHpNaTo38Fes&s=10', 'MK-002', 'Jungle'),
(19, 'Kutast', 'ลิงแสม', 50.00, 'http://119.59.102.161:3045/uploads/1788402862146-a4c62e8d40f97fb633ab9d38.jpg', 'MK-003', 'Jungle');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
