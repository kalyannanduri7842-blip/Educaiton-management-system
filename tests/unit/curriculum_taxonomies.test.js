const test = require('node:test');
const assert = require('node:assert/strict');
const { CURRICULUM_TAXONOMIES, getCurriculumByGradeAndSubject, findStandardById } = require('../../academic/curriculum_taxonomies');

test('Curriculum Taxonomies & Learning Standards Verification', async (t) => {
  await t.test('curriculum database contains K-12 standards', () => {
    assert.ok(CURRICULUM_TAXONOMIES.length >= 2000);
  });

  await t.test('filters standards by grade and subject correctly', () => {
    const standards = getCurriculumByGradeAndSubject('Grade 10', 'Mathematics');
    assert.ok(standards.length > 0);
    assert.equal(standards[0].subject, 'Mathematics');
    assert.equal(standards[0].gradeLevel, 'Grade 10');
  });

  await t.test('findStandardById resolves standard with assessment criteria', () => {
    const std = findStandardById('STD_1');
    assert.ok(std);
    assert.ok(std.assessmentCriteria.minimumMasteryScorePercent);
    assert.equal(std.pedagogicalPillars.inquiryBasedLearning, true);
  });
});
