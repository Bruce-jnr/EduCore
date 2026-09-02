ALTER TABLE `Tenant` MODIFY `schoolType` ENUM('PRIMARY', 'SECONDARY', 'COLLEGE', 'COMBINED', 'BASIC') NOT NULL;
UPDATE `Tenant` SET `schoolType` = 'BASIC';
ALTER TABLE `Tenant` MODIFY `schoolType` ENUM('BASIC') NOT NULL;

UPDATE `AcademicPeriod` SET `type` = 'TERM' WHERE `type` = 'SEMESTER';
ALTER TABLE `AcademicPeriod` MODIFY `type` ENUM('TERM') NOT NULL;

UPDATE `TenantSettings`
SET `academicConfig` = JSON_SET(
  COALESCE(`academicConfig`, JSON_OBJECT()),
  '$.defaultPeriodType', 'TERM',
  '$.terminology', JSON_OBJECT('class', 'Class', 'subject', 'Subject', 'period', 'Term'),
  '$.levelTemplates', JSON_ARRAY(
    JSON_OBJECT('name', 'KG 1', 'order', 1), JSON_OBJECT('name', 'KG 2', 'order', 2),
    JSON_OBJECT('name', 'Primary 1', 'order', 3), JSON_OBJECT('name', 'Primary 2', 'order', 4),
    JSON_OBJECT('name', 'Primary 3', 'order', 5), JSON_OBJECT('name', 'Primary 4', 'order', 6),
    JSON_OBJECT('name', 'Primary 5', 'order', 7), JSON_OBJECT('name', 'Primary 6', 'order', 8),
    JSON_OBJECT('name', 'JHS 1', 'order', 9), JSON_OBJECT('name', 'JHS 2', 'order', 10),
    JSON_OBJECT('name', 'JHS 3', 'order', 11)
  )
);
