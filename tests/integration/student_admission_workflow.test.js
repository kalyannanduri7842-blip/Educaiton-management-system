const test = require('node:test');
const assert = require('node:assert/strict');
const { loadDb } = require('../../backend/src/db');

test('Student Multi-Step Admission & Lifecycle Workflow', async (t) => {
  const db = loadDb();

  await t.test('1. Database contains initial seeded students and parents', () => {
    assert.ok(db.students.length >= 50, 'Should have at least 50 students');
    assert.ok(db.parents.length >= 25, 'Should have at least 25 parents');
    assert.ok(db.teachers.length >= 10, 'Should have at least 10 teachers');
  });

  await t.test('2. Primary student Rahul Sharma belongs to Grade 10-A and has parent link', () => {
    const rahul = db.students.find(s => s.name === 'Rahul Sharma');
    assert.ok(rahul);
    assert.equal(rahul.classId, 'CLS-10');
    assert.equal(rahul.sectionId, 'SEC-10A');

    const parentLink = db.parentStudents.find(ps => ps.studentId === rahul.id);
    assert.ok(parentLink);
    const parent = db.parents.find(p => p.id === parentLink.parentId);
    assert.ok(parent);
    assert.equal(parent.name, 'Ravi Sharma');
  });

  await t.test('3. Student Fee structure is initialized with balance', () => {
    const rahulFee = db.studentFees.find(f => f.studentId === 'STD-001');
    assert.ok(rahulFee);
    assert.equal(rahulFee.totalAmount, 65000);
    assert.ok(rahulFee.paidAmount > 0);
  });
});
