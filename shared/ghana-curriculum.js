// Resource metadata, not a copy of Sirbus's content database or an official term schedule.
export const CURRICULUM_SOURCES = {
  primary: { title: 'NaCCA standards-based curriculum · KG–Basic 6', url: 'https://nacca.gov.gh/learning-areas-subjects/new-standards-based-curriculum-2019/', edition: '2019', checked: '2026-10-28' },
  jhs: { title: 'NaCCA Common Core Programme · Basic 7–9', url: 'https://nacca.gov.gh/common-core-programme-ccp/', edition: 'Common Core Programme', checked: '2026-10-28' },
  shs: { title: 'NaCCA secondary education curriculum', url: 'https://nacca.gov.gh/secondary-education-curriculum/', edition: 'Secondary curriculum collection', checked: '2026-10-28' },
  resources: { title: 'NaCCA primary teacher resource pack', url: 'https://nacca.gov.gh/wp-content/uploads/2019/06/TEACHER-RESOURCE-PACK-P1-P6.pdf', edition: '2019', checked: '2026-10-28' },
};
const subject = (name, slug = name.toLowerCase().replaceAll(' ', '-')) => ({ name, slug });
const primary = ['Creative Arts', 'English Language', 'Ghanaian Language', 'History', 'Mathematics', 'Our World and Our People', 'Physical Education', 'Religious and Moral Education', 'Science'].map(name => subject(name));
const jhs = ['Arabic', 'Career Technology', 'Computing', 'Creative Arts and Design', 'English Language', 'French Language', 'Ghanaian Language', 'Mathematics', 'Physical Education and Health', 'Religious and Moral Education', 'Science', 'Social Studies'].map(name => subject(name));
export const GHANA_LEVELS = [
  ...[1, 2].map(n => ({ name: `KG ${n}`, slug: `kg-${n}`, group: 'Kindergarten', source: 'primary', subjects: [subject('Integrated kindergarten curriculum')] })),
  ...Array.from({ length: 9 }, (_, i) => { const n = i + 1; return { name: n <= 6 ? `Basic ${n}` : `JHS ${n - 6}`, slug: `basic-${n}`, group: n <= 6 ? 'Primary' : 'Junior high', source: n <= 6 ? 'primary' : 'jhs', subjects: n <= 3 ? primary : n <= 6 ? [...primary, subject('Computing'), subject('French Language')].sort((a,b) => a.name.localeCompare(b.name)) : jhs }; }),
];
export const LESSON_LIBRARY_KEY = 'edupalgh_lesson_library_selection_v1';
export const LESSON_FIELDS = [
  ['topic', 'Topic'], ['strand', 'Strand'], ['subStrand', 'Sub-strand'],
  ['contentStandard', 'Content standard'], ['indicator', 'Indicator'],
  ['performanceIndicator', 'Learning outcome'], ['coreCompetencies', 'Core competencies'],
  ['resources', 'Teaching and learning resources'], ['keywords', 'Keywords'],
  ['starter', 'Phase 1 · Starter'], ['mainActivity', 'Phase 2 · Main learning activity'],
  ['assessment', 'Assessment'], ['plenary', 'Phase 3 · Plenary'], ['reflection', 'Teacher reflection'],
];
// Original EduPalGh teaching suggestions. Not NaCCA-approved, not official pacing, no invented codes.
export const STARTER_LESSONS = [
  { id: 'b1-maths-counting', level: 'basic-1', subject: 'mathematics', title: 'Counting objects in our classroom', fields: {
    topic: 'Counting objects in our classroom', strand: 'Number', subStrand: 'Counting', contentStandard: '', indicator: '',
    performanceIndicator: 'Count a small set of up to ten objects once each and explain how the final count gives the total.',
    coreCompetencies: 'Communication and collaboration; critical thinking and problem solving.',
    resources: 'Ten clean bottle tops per pair, number cards 1–10, and a mat or sheet of paper.', keywords: 'count, number, total, more, fewer',
    starter: 'Show two small groups of classroom objects. Invite learners to estimate which has more and explain their choice.',
    mainActivity: 'Model moving each object into a counted group while saying one number. Pairs make sets for number cards and swap roles. Vary the arrangement and ask whether the total changes. Offer smaller sets or tactile objects when needed; extend confident learners by comparing two sets.',
    assessment: 'Individually ask learners to count an unfamiliar arrangement of objects and make a set for a chosen number card. Record skipped or double-counted objects to guide support.',
    plenary: 'Ask learners to explain one way to avoid counting the same object twice. Recount a rearranged set together.', reflection: '',
  } },
  { id: 'b1-english-listening', level: 'basic-1', subject: 'english-language', title: 'Listening and following classroom directions', fields: {
    topic: 'Listening and following classroom directions', strand: 'Oral language', subStrand: 'Listening and responding', contentStandard: '', indicator: '',
    performanceIndicator: 'Follow a familiar one-step spoken direction and give a clear direction to a partner.',
    coreCompetencies: 'Communication and collaboration; personal development and leadership.',
    resources: 'Familiar classroom objects and picture cards showing simple classroom actions.', keywords: 'listen, please, bring, point, place',
    starter: 'Model a simple direction using a classroom object and ask learners to show what they heard.',
    mainActivity: 'Demonstrate one direction at a time with pictures and gestures. Learners practise with a partner, alternating speaker and listener. Check understanding through action rather than repetition alone. Support language transitions with a familiar Ghanaian language where appropriate, then practise the English expression.',
    assessment: 'Give each learner a different simple direction without a gesture. Invite them to give a polite direction back. Note who needs visual or language support.',
    plenary: 'Pairs share a direction that was easy to understand and explain why listening matters.', reflection: '',
  } },
  { id: 'b1-science-observing', level: 'basic-1', subject: 'science', title: 'Observing things around our school', fields: {
    topic: 'Observing things around our school', strand: 'Diversity of matter', subStrand: 'Living and non-living things', contentStandard: '', indicator: '',
    performanceIndicator: 'Observe familiar objects and living things, group examples, and explain a reason for a grouping.',
    coreCompetencies: 'Critical thinking and problem solving; communication and collaboration.',
    resources: 'Pictures of familiar plants, animals, stones and classroom objects; a safe observation space.', keywords: 'observe, living, non-living, group',
    starter: 'Display a plant picture and a stone. Ask what learners notice and record their ideas without immediately judging them.',
    mainActivity: 'Guide a short supervised observation or use pictures in class. Small groups sort examples and explain their reasoning. Discuss why movement alone is insufficient for classification. Allow drawings and oral answers, and revisit unclear examples together.',
    assessment: 'Give learners a new picture to group and ask for a reason. Note misconceptions and distinguish observation from guessing.',
    plenary: 'Invite two different explanations, then agree on what further observations could help resolve uncertainty.', reflection: '',
  } },
];
export function parseLibraryRoute(route) {
  const parts = route.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts[0] !== 'lesson-library' || parts.length > 5) return null;
  if (parts.length === 1) return { level: null, period: null, subject: null, week: null };
  const level = GHANA_LEVELS.find(item => item.slug === parts[1]);
  if (!level) return null;
  const period = parts[2] || null;
  if (period && !['term-1', 'term-2', 'term-3', 'scheme-of-learning'].includes(period)) return null;
  const selected = parts[3] ? level.subjects.find(item => item.slug === parts[3]) : null;
  if (parts[3] && !selected) return null;
  const week = parts[4] ? Number(parts[4].replace(/^week-/, '')) : null;
  if (parts[4] && (period === 'scheme-of-learning' || !/^week-(?:[1-9]|1[0-2])$/.test(parts[4]))) return null;
  return { level, period, subject: selected, week };
}
export function getStarter(selection) {
  // A starter is suggested in slot 1 only; term assignment remains the teacher's decision.
  return selection?.week === 1 ? STARTER_LESSONS.find(item => item.level === selection.level?.slug && item.subject === selection.subject?.slug) : null;
}
export function librarySelection(selection) {
  const starter = getStarter(selection);
  return { version: 1, level: selection.level?.slug || '', subject: selection.subject?.slug || '', period: selection.period || '', week: selection.week || 1, starterId: starter?.id || null };
}
export function validateLibrarySelection(value) {
  if (!value || value.version !== 1 || !Number.isInteger(value.week) || value.week < 1 || value.week > 12) return null;
  const selection = parseLibraryRoute(`/lesson-library/${value.level}/${value.period}/${value.subject}/week-${value.week}`);
  if (!selection?.subject) return null;
  const expected = getStarter(selection);
  if ((value.starterId || null) !== (expected?.id || null)) return null;
  return { ...selection, starter: expected };
}
export function readLibrarySelection(storage) {
  try { const value = storage.getItem(LESSON_LIBRARY_KEY); return value ? validateLibrarySelection(JSON.parse(value)) : null; } catch { return null; }
}

export function prefillLibraryBooklet(options, choice, canReview) {
  const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = choice.period?.match(/^(term|semester)-([123])$/);
  const term = match?.[2], kind=match?.[1];
  const termNames = term ? [`${kind}${term}`, `${['first','second','third'][Number(term)-1]}${kind}`] : [];
  const period = options.academicPeriods.find(item => item.isCurrent && termNames.includes(normalize(item.name))) || options.academicPeriods.find(item => termNames.includes(normalize(item.name))) || options.academicPeriods.find(item => item.isCurrent) || options.academicPeriods[0];
  const n = Number(choice.level.slug.split('-')[1]);
  const aliases = choice.level.slug.startsWith('basic-') ? [choice.level.name, `Basic ${n}`, `Primary ${n}`, ...(n >= 7 ? [`JHS ${n-6}`] : [])] : [choice.level.name];
  const assigned = (classId, subjectId) => canReview || options.assignments.some(item => item.classId === classId && item.academicPeriodId === period?.id && (!subjectId || !item.subjectId || item.subjectId === subjectId));
  const selectedClass = options.classes.find(item => item.academicYearId === period?.academicYearId && aliases.some(name => normalize(name) === normalize(item.name)) && assigned(item.id));
  const selectedSubject = options.subjects.find(item => selectedClass?.subjectIds.includes(item.id) && normalize(item.name) === normalize(choice.subject.name) && assigned(selectedClass.id, item.id));
  return { title: `${choice.level.name} ${choice.subject.name} lesson notes`.slice(0,150), academicPeriodId: period?.id || '', classId: selectedClass?.id || '', subjectId: selectedSubject?.id || '', topicText: Array.from({length:choice.week},(_,i) => i+1 === choice.week ? (choice.starter?.title || '') : '').join('\n') };
}
