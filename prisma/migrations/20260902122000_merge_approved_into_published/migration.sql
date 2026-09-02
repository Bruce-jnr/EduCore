UPDATE `ResultSheet`
SET
  `status` = 'PUBLISHED',
  `publishedAt` = COALESCE(`publishedAt`, `approvedAt`, CURRENT_TIMESTAMP(3)),
  `publishedById` = COALESCE(`publishedById`, `approvedById`)
WHERE `status` = 'APPROVED';
