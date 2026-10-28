export const LESSON_TEMPLATE_VERSION = 'teacher-template-v1';
export const WEEK_FIELDS = [
  'topic', 'strand', 'subStrand', 'contentStandard', 'indicator',
  'performanceIndicator', 'coreCompetencies', 'resources', 'keywords',
  'starter', 'mainActivity', 'assessment', 'plenary', 'reflection',
];

/** Builds editable structure only. Curriculum content must be supplied by a teacher. */
export function buildLessonWeeks(topics, weekCount, durationMinutes = 60) {
  return Array.from({ length: weekCount }, (_, index) => ({
    week: index + 1,
    durationMinutes,
    ...Object.fromEntries(WEEK_FIELDS.map(field => [field, field === 'topic' ? (topics[index] || '').trim() : ''])),
  }));
}

export function incompleteWeeks(weeks) {
  const required = ['topic', 'performanceIndicator', 'resources', 'starter', 'mainActivity', 'assessment', 'plenary'];
  return weeks.filter(week => required.some(field => !week[field]?.trim())).map(week => week.week);
}

export function lessonBooklet(plan) {
  return {
    templateVersion: plan.templateVersion,
    title: plan.title,
    status: plan.status,
    school: plan.tenant,
    teacher: `${plan.author.firstName} ${plan.author.lastName}`,
    class: plan.class,
    subject: plan.subject,
    period: plan.academicPeriod,
    weekCount: plan.weekCount,
    weeks: plan.weeks,
    scheme: plan.weeks.map(({ week, topic, strand, subStrand, contentStandard, indicator }) => ({ week, topic, strand, subStrand, contentStandard, indicator })),
    notice: 'Teacher-authored content. Verify curriculum codes and learning activities before classroom use.',
  };
}
