const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateGradeFromPercentage, PEDAGOGICAL_RUBRICS } = require('../../academic/pedagogical_rubrics');

test('Pedagogical Rubrics & Grade Boundary Calculations', async (t) => {
  await t.test('converts scores >= 90 to A+ Distinction', () => {
    const res = calculateGradeFromPercentage(95);
    assert.equal(res.grade, 'A+');
    assert.equal(res.gpa, 4.0);
    assert.equal(res.status, 'Passed with Distinction');
  });

  await t.test('converts scores 80-89 to Grade A', () => {
    const res = calculateGradeFromPercentage(84.6);
    assert.equal(res.grade, 'A');
    assert.equal(res.gpa, 3.7);
  });

  await t.test('converts scores below 60 to Grade F', () => {
    const res = calculateGradeFromPercentage(52);
    assert.equal(res.grade, 'F');
    assert.equal(res.gpa, 0.0);
  });

  await t.test('pedagogical rubric registry is populated', () => {
    assert.ok(PEDAGOGICAL_RUBRICS.length >= 1000);
  });
});
