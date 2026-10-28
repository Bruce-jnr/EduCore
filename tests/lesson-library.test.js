import test from 'node:test';
import assert from 'node:assert/strict';
import { GHANA_LEVELS, CURRICULUM_SOURCES, STARTER_LESSONS, parseLibraryRoute, getStarter, librarySelection, validateLibrarySelection, readLibrarySelection, prefillLibraryBooklet } from '../src/features/lesson-plans/ghana-curriculum.js';
import { lessonWeekSchema } from '../server/modules/lesson-plans/lesson-plan.validation.js';

test('catalog covers KG, primary, JHS and secondary references without duplicate routes', () => {
  assert.equal(GHANA_LEVELS.length, 11);
  assert.equal(new Set(GHANA_LEVELS.map(item => item.slug)).size, 11);
  for (const level of GHANA_LEVELS) {
    assert.ok(CURRICULUM_SOURCES[level.source]);
    for (const subject of level.subjects) {
      for (const period of ['term-1', 'term-2', 'term-3']) {
        const path = `/lesson-library/${level.slug}/${period}/${subject.slug}`;
        assert.equal(parseLibraryRoute(path).subject.name, subject.name);
        for (let week = 1; week <= 12; week++) assert.equal(parseLibraryRoute(`${path}/week-${week}`).week, week);
      }
      assert.equal(parseLibraryRoute(`/lesson-library/${level.slug}/scheme-of-learning/${subject.slug}`).period, 'scheme-of-learning');
    }
  }
});
test('rejects unknown levels, mismatched subjects, invalid weeks and extra path segments', () => {
  for (const path of ['/lesson-library/not-a-class', '/lesson-library/basic-1/term-4', '/lesson-library/basic-1/term-1/physics', '/lesson-library/basic-1/term-1/mathematics/week-0', '/lesson-library/basic-1/term-1/mathematics/week-13', '/lesson-library/basic-1/term-1/mathematics/week-01', '/lesson-library/basic-1/term-1/mathematics/1', '/lesson-library/basic-1/term-1/mathematics/week-1/extra', '/lesson-library/basic-1/scheme-of-learning/mathematics/week-1']) assert.equal(parseLibraryRoute(path), null, path);
});
test('starters have valid editor fields and leave unverified standard codes blank', () => {
  for (const starter of STARTER_LESSONS) {
    assert.equal(lessonWeekSchema.safeParse({ ...starter.fields, week: 1, durationMinutes: 60 }).success, true);
    assert.equal(starter.fields.indicator, '');
    assert.equal(starter.fields.contentStandard, '');
    assert.ok(starter.fields.mainActivity);
  }
});
test('suggestions do not pretend to populate other weeks or classes', () => {
  assert.ok(getStarter(parseLibraryRoute('/lesson-library/basic-1/term-2/mathematics/week-1')));
  assert.equal(getStarter(parseLibraryRoute('/lesson-library/basic-1/term-1/mathematics/week-2')), null);
  assert.equal(getStarter(parseLibraryRoute('/lesson-library/basic-2/term-1/mathematics/week-1')), undefined);
});
test('selection roundtrip excludes database IDs and ignores forged content fields', () => {
  const selection = parseLibraryRoute('/lesson-library/basic-1/term-1/mathematics/week-1');
  const serialized = librarySelection(selection);
  const hydrated = validateLibrarySelection({ ...serialized, tenantId: 'foreign-school', starter: { fields: { mainActivity: 'forged' } } });
  assert.equal(hydrated.starter.id, 'b1-maths-counting');
  assert.notEqual(hydrated.starter.fields.mainActivity, 'forged');
  assert.equal(hydrated.tenantId, undefined);
  assert.equal(hydrated.level.slug, 'basic-1');
});
test('rejects stale versions, tampered starter identities and corrupt browser storage', () => {
  const valid = librarySelection(parseLibraryRoute('/lesson-library/basic-1/term-1/mathematics/week-1'));
  assert.equal(validateLibrarySelection({ ...valid, version: 2 }), null);
  assert.equal(validateLibrarySelection({ ...valid, starterId: 'b1-science-observing' }), null);
  assert.equal(validateLibrarySelection({ ...valid, week: 13 }), null);
  assert.equal(readLibrarySelection({ getItem: () => '{broken' }), null);
  assert.equal(readLibrarySelection({ getItem: () => { throw new Error('blocked storage'); } }), null);
});
test('all reference links use HTTPS on the curriculum publishers domain', () => {
  for (const source of Object.values(CURRICULUM_SOURCES)) {
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'nacca.gov.gh');
  }
});

test('library handoff resolves school IDs only from allowed options and selected term', () => {
  const choice = validateLibrarySelection(librarySelection(parseLibraryRoute('/lesson-library/basic-1/term-2/mathematics/week-1')));
  const options = {
    academicPeriods: [{ id: 'term1', name: 'Term 1', academicYearId: 'year1', isCurrent: true }, { id: 'term2', name: 'Second Term', academicYearId: 'year1' }],
    classes: [{ id: 'class1', name: 'Primary 1', academicYearId: 'year1', subjectIds: ['maths'] }],
    subjects: [{ id: 'maths', name: 'Mathematics' }],
    assignments: [{ classId: 'class1', academicPeriodId: 'term2', subjectId: 'maths' }],
  };
  const result = prefillLibraryBooklet(options, choice, false);
  assert.equal(result.academicPeriodId, 'term2');
  assert.equal(result.classId, 'class1');
  assert.equal(result.subjectId, 'maths');
  assert.equal(result.topicText, 'Counting objects in our classroom');
  assert.equal(prefillLibraryBooklet({ ...options, assignments: [] }, choice, false).classId, '');
  assert.equal(prefillLibraryBooklet({ ...options, assignments: [] }, choice, true).classId, 'class1');
  assert.equal(prefillLibraryBooklet({ ...options, assignments: [{ classId: 'class1', academicPeriodId: 'term1', subjectId: 'maths' }] }, choice, false).subjectId, '');
});

test('later-week prefill uses real newline separators without literal backslash characters',()=>{
 const choice=validateLibrarySelection(librarySelection(parseLibraryRoute('/lesson-library/basic-1/term-1/mathematics/week-3')));
 const options={academicPeriods:[{id:'term1',name:'Term 1',academicYearId:'year1',isCurrent:true}],classes:[{id:'class1',name:'Primary 1',academicYearId:'year1',subjectIds:['maths']}],subjects:[{id:'maths',name:'Mathematics'}],assignments:[{classId:'class1',academicPeriodId:'term1',subjectId:'maths'}]};
 assert.equal(prefillLibraryBooklet(options,choice,false).topicText,String.fromCharCode(10).repeat(2));
});
