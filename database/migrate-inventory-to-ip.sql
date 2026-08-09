-- Review both schema names before running this script in phpMyAdmin.
-- This migration copies data and intentionally does not delete the old table.

CREATE TABLE IF NOT EXISTS `ip_std6730202467`.`Inventory`
LIKE `it_std6730202467`.`Inventory`;

INSERT INTO `ip_std6730202467`.`Inventory`
  (`id`, `product_name`, `description`, `price`, `image_url`, `sku`, `category`)
SELECT
  `id`, `product_name`, `description`, `price`, `image_url`, `sku`, `category`
FROM `it_std6730202467`.`Inventory` AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM `ip_std6730202467`.`Inventory` AS target
  WHERE target.`id` = source.`id`
);

SELECT * FROM `ip_std6730202467`.`Inventory` ORDER BY `id`;
