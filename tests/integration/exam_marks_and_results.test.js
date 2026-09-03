const test = require('node:test');
const assert = require('node:assert/strict');
const { loadDb } = require('../../backend/src/db');
const { calculateGradeFromPercentage } = require('../../academic/pedagogical_rubrics');

test('Exam Marks Validation & Grade Results Workflow', async (t) => {
  const db = loadDb();

  await t.test('1. Exam records exist and marks are stored within [0, 100]', () => {
    assert.ok(db.exams.length >= 2);
    assert.ok(db.marks.length > 0);
    db.marks.forEach(m => {
      assert.ok(m.obtainedScore >= 0 && m.obtainedScore <= 100);
      assert.ok(m.grade);
    });
  });

  await t.test('2. Grade calculation adheres to academic division rules', () => {
    const mark90 = calculateGradeFromPercentage(92);
    assert.equal(mark90.grade, 'A+');

    const mark75 = calculateGradeFromPercentage(75);
    assert.equal(mark75.grade, 'B');

    const mark50 = calculateGradeFromPercentage(50);
    assert.equal(mark50.grade, 'F');
  });

  await t.test('3. Student results aggregation computes valid average and GPA', () => {
    const rahulMarks = db.marks.filter(m => m.studentId === 'STD-001');
    assert.ok(rahulMarks.length >= 4);
    const sum = rahulMarks.reduce((s, m) => s + m.obtainedScore, 0);
    const avg = sum / rahulMarks.length;
    assert.ok(avg >= 70 && avg <= 100);
  });
});
