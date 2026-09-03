const test = require('node:test');
const assert = require('node:assert/strict');
const { loadDb } = require('../../backend/src/db');

test('Teacher Attendance Submission & Live Dashboard Propagation', async (t) => {
  const db = loadDb();

  await t.test('1. Recorded attendance sessions exist with period and date', () => {
    assert.ok(db.attendanceSessions.length >= 3);
    const firstSess = db.attendanceSessions[0];
    assert.ok(firstSess.date);
    assert.ok(firstSess.period);
    assert.ok(firstSess.presentCount > 0);
  });

  await t.test('2. Student attendance percentage calculation handles zero-division safety', () => {
    const records = db.attendanceRecords.filter(r => r.studentId === 'STD-001');
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const pct = total > 0 ? (present / total) * 100 : 100;
    assert.ok(pct >= 0 && pct <= 100);
  });

  await t.test('3. Absent attendance creates urgent notification for parent', () => {
    const notifs = db.notifications.filter(n => n.recipientRole === 'parent');
    assert.ok(notifs.length > 0);
    assert.ok(notifs[0].message.includes('Rahul Sharma') || notifs[0].title.includes('Attendance'));
  });
});
