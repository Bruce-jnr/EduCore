INSERT INTO `FormTeacherAssignment` (`id`, `assignmentKey`, `tenantId`, `staffId`, `academicYearId`, `academicPeriodId`, `classId`, `status`, `createdAt`, `updatedAt`)
SELECT
  CONCAT('form-', MIN(`id`)),
  CONCAT(`tenantId`, ':', `academicPeriodId`, ':', `classId`),
  `tenantId`,
  MIN(`staffId`),
  MIN(`academicYearId`),
  `academicPeriodId`,
  `classId`,
  'ACTIVE',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `TeacherAssignment`
WHERE `status` = 'ACTIVE'
GROUP BY `tenantId`, `academicPeriodId`, `classId`
HAVING COUNT(DISTINCT `staffId`) = 1
ON DUPLICATE KEY UPDATE `updatedAt` = `updatedAt`;
