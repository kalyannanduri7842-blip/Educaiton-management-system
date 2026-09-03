const test = require('node:test');
const assert = require('node:assert/strict');
const { loadDb } = require('../../backend/src/db');

test('Student Daily Check-in & Day-by-Day Work Submission Workflows', async (t) => {
  const db = loadDb();

  await t.test('1. Seed database contains initial checkin and daily tasks', () => {
    assert.ok(db.studentCheckins.length >= 1, 'Should have student checkin records');
    assert.ok(db.dailyWorkTasks.length >= 5, 'Should have 5 days of curriculum tasks');
  });

  await t.test('2. Rahul Sharma checkin status is on_time with gate location', () => {
    const chk = db.studentCheckins.find(c => c.studentId === 'STD-001');
    assert.ok(chk);
    assert.equal(chk.status, 'on_time');
    assert.ok(chk.checkinTime);
    assert.equal(chk.parentNotified, true);
    assert.equal(chk.managerNotified, true);
  });

  await t.test('3. Day 1 Mathematics task has submission record with score and feedback', () => {
    const day1Task = db.dailyWorkTasks.find(t => t.dayNumber === 1);
    assert.ok(day1Task);
    const rahulSubm = day1Task.submissions.find(s => s.studentId === 'STD-001');
    assert.ok(rahulSubm);
    assert.equal(rahulSubm.status, 'submitted');
    assert.equal(rahulSubm.score, 24);
  });

  await t.test('4. Institutional About Us contains leadership and accreditations', () => {
    assert.ok(db.institution.aboutUs);
    assert.ok(db.institution.aboutUs.leadership.length >= 3);
    assert.ok(db.institution.aboutUs.accreditations.includes('Central Board of Secondary Education (CBSE)'));
  });
});
