const http = require('http');
const url = require('url');
const { loadDb, saveDb } = require('./db');
const { calculateGradeFromPercentage } = require('../../academic/pedagogical_rubrics');

const PORT = process.env.PORT || 4001;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function getUserFromToken(req, db) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  // Simulated secure token: token format "EDU_USR_{userId}_{role}" or matching user id
  return db.users.find(u => token.includes(u.id) || token.includes(u.email) || token === 'demo-token-' + u.role);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const query = parsedUrl.query;

  const db = loadDb();

  try {
    // 1. Health Check
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'healthy',
        platform: 'EduSphere Academic Management Engine',
        version: '1.0.0',
        institutions: 1,
        totalStudents: db.students.length,
        totalTeachers: db.teachers.length,
        totalClasses: db.classes.length
      });
    }

    // 2. Authentication
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;
      const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());

      if (!user || user.password !== password) {
        return sendJson(res, 401, { error: 'Invalid academic credentials' });
      }

      let extraProfile = {};
      if (user.role === 'student') {
        const st = db.students.find(s => s.userId === user.id || s.email === user.email);
        extraProfile.student = st;
      } else if (user.role === 'teacher') {
        const tch = db.teachers.find(t => t.userId === user.id || t.email === user.email);
        extraProfile.teacher = tch;
      } else if (user.role === 'parent') {
        const par = db.parents.find(p => p.userId === user.id || p.email === user.email);
        const children = db.parentStudents.filter(ps => ps.parentId === (par && par.id)).map(ps => db.students.find(s => s.id === ps.studentId)).filter(Boolean);
        extraProfile.parent = par;
        extraProfile.children = children;
      }

      const token = `EDU_TOKEN_${user.id}_${user.role}_${Date.now()}`;
      return sendJson(res, 200, {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          institutionId: user.institutionId
        },
        ...extraProfile
      });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const user = getUserFromToken(req, db);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized session' });
      return sendJson(res, 200, { user });
    }

    // 3. Super Admin Routes
    if (pathname.startsWith('/api/super-admin')) {
      const user = getUserFromToken(req, db);
      if (!user || user.role !== 'super_admin') {
        return sendJson(res, 403, { error: 'Super Administrator privileges required' });
      }

      if (pathname === '/api/super-admin/dashboard' && method === 'GET') {
        return sendJson(res, 200, {
          totalInstitutions: 1,
          activeInstitutions: 1,
          totalStudents: db.students.length,
          totalTeachers: db.teachers.length,
          totalParents: db.parents.length,
          activeUsers: db.users.length,
          systemStatus: 'Optimal (99.98% uptime)',
          institution: db.institution,
          recentAuditLogs: db.auditLogs.slice(0, 10)
        });
      }

      if (pathname === '/api/super-admin/institutions' && method === 'GET') {
        return sendJson(res, 200, { institutions: [db.institution] });
      }

      if (pathname === '/api/super-admin/institutions' && method === 'POST') {
        const body = await parseBody(req);
        db.institution = { ...db.institution, ...body, updatedAt: new Date().toISOString() };
        saveDb(db);
        return sendJson(res, 200, { message: 'Institution updated', institution: db.institution });
      }

      if (pathname === '/api/super-admin/users' && method === 'GET') {
        return sendJson(res, 200, { users: db.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status })) });
      }

      if (pathname === '/api/super-admin/audit-logs' && method === 'GET') {
        return sendJson(res, 200, { auditLogs: db.auditLogs });
      }
    }

    // 4. Institution Admin / Manager Routes
    if (pathname.startsWith('/api/admin')) {
      const user = getUserFromToken(req, db);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return sendJson(res, 403, { error: 'Institution Administrator authorization required' });
      }

      if (pathname === '/api/admin/dashboard' && method === 'GET') {
        const todayAttendance = db.attendanceSessions[db.attendanceSessions.length - 1] || { totalStudents: 20, presentCount: 18, absentCount: 1, lateCount: 1 };
        const totalFeeCollected = db.payments.reduce((s, p) => s + p.amount, 0);
        const totalFeePending = db.studentFees.reduce((s, f) => s + f.pendingAmount, 0);

        return sendJson(res, 200, {
          totalStudents: db.students.length,
          totalTeachers: db.teachers.length,
          totalClasses: db.classes.length,
          todayAttendance: {
            present: todayAttendance.presentCount,
            absent: todayAttendance.absentCount,
            late: todayAttendance.lateCount,
            total: todayAttendance.totalStudents,
            ratePercent: ((todayAttendance.presentCount / todayAttendance.totalStudents) * 100).toFixed(1)
          },
          feeSummary: {
            collected: totalFeeCollected,
            pending: totalFeePending,
            collectionRate: ((totalFeeCollected / (totalFeeCollected + totalFeePending)) * 100).toFixed(1)
          },
          upcomingExams: db.exams.filter(e => e.status === 'active'),
          recentAdmissions: db.students.slice(-5).reverse(),
          auditLogs: db.auditLogs.slice(0, 8)
        });
      }

      // Students
      if (pathname === '/api/admin/students' && method === 'GET') {
        let list = [...db.students];
        if (query.classId) list = list.filter(s => s.classId === query.classId);
        if (query.sectionId) list = list.filter(s => s.sectionId === query.sectionId);
        if (query.search) {
          const sTerm = query.search.toLowerCase();
          list = list.filter(s => s.name.toLowerCase().includes(sTerm) || s.admissionNumber.toLowerCase().includes(sTerm) || s.rollNumber.includes(sTerm));
        }
        return sendJson(res, 200, { students: list, total: list.length });
      }

      if (pathname === '/api/admin/students' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.firstName || !body.lastName || !body.classId || !body.sectionId) {
          return sendJson(res, 400, { error: 'First name, last name, class, and section are required.' });
        }

        const newId = `STD-${String(db.students.length + 1).padStart(3, '0')}`;
        const fullName = `${body.firstName} ${body.lastName}`.trim();
        const admNo = body.admissionNumber || `ADM-2026-${1000 + db.students.length + 1}`;
        const rollNo = body.rollNumber || String((db.students.filter(s => s.sectionId === body.sectionId).length + 1)).padStart(2, '0');
        const studentEmail = body.email || `student${db.students.length + 1}@edusphere.local`;

        const newStudent = {
          id: newId,
          userId: `USR-STD-${String(db.students.length + 1).padStart(3, '0')}`,
          admissionNumber: admNo,
          rollNumber: rollNo,
          name: fullName,
          email: studentEmail,
          phone: body.phone || '+91-97400-00000',
          gender: body.gender || 'Male',
          dateOfBirth: body.dateOfBirth || '2010-01-01',
          classId: body.classId,
          sectionId: body.sectionId,
          bloodGroup: body.bloodGroup || 'O+',
          admissionDate: new Date().toISOString().split('T')[0],
          address: body.address || 'Bangalore, Karnataka',
          previousSchool: body.previousSchool || 'N/A',
          status: 'active'
        };

        db.students.push(newStudent);

        // Create student login user
        db.users.push({
          id: newStudent.userId,
          name: fullName,
          email: studentEmail,
          password: 'DemoOnly-Student-2026!',
          role: 'student',
          institutionId: 'INST-001',
          status: 'active'
        });

        // Parent creation if provided
        if (body.parentName) {
          const parId = `PAR-${String(db.parents.length + 1).padStart(2, '0')}`;
          const parEmail = body.parentEmail || `parent${db.parents.length + 1}@edusphere.local`;
          const newParent = {
            id: parId,
            userId: `USR-PAR-${String(db.parents.length + 1).padStart(2, '0')}`,
            name: body.parentName,
            relationship: body.parentRelationship || 'Father',
            phone: body.parentPhone || '+91-98800-00000',
            email: parEmail,
            address: body.address || 'Bangalore',
            occupation: body.parentOccupation || 'Professional',
            emergencyContact: body.parentEmergencyContact || body.parentPhone
          };
          db.parents.push(newParent);
          db.users.push({
            id: newParent.userId,
            name: newParent.name,
            email: parEmail,
            password: 'DemoOnly-Parent-2026!',
            role: 'parent',
            institutionId: 'INST-001',
            status: 'active'
          });

          db.parentStudents.push({
            id: `PS-${db.parentStudents.length + 1}`,
            parentId: parId,
            studentId: newId,
            relationship: 'Child'
          });
        }

        // Initialize Fee Record
        db.studentFees.push({
          id: `SFEE-${newId}`,
          studentId: newId,
          studentName: fullName,
          classId: body.classId,
          feeStructureId: 'FEE-G10-ANNUAL',
          totalAmount: 65000,
          paidAmount: 0,
          pendingAmount: 65000,
          status: 'unpaid',
          dueDate: '2026-09-30'
        });

        // Audit Log
        db.auditLogs.unshift({
          id: `AUDIT-${Date.now()}`,
          user: user.name,
          action: 'STUDENT_ADMISSION_CREATED',
          module: 'Students',
          recordId: newId,
          details: `Enrolled student ${fullName} (${admNo}) to Class ${body.classId} ${body.sectionId}`,
          timestamp: new Date().toISOString()
        });

        saveDb(db);
        return sendJson(res, 201, { message: 'Student registered successfully', student: newStudent });
      }

      const studentIdMatch = pathname.match(/^\/api\/admin\/students\/([^/]+)$/);
      if (studentIdMatch && method === 'GET') {
        const sId = studentIdMatch[1];
        const student = db.students.find(s => s.id === sId);
        if (!student) return sendJson(res, 404, { error: 'Student not found' });

        const parentLink = db.parentStudents.find(ps => ps.studentId === sId);
        const parent = parentLink ? db.parents.find(p => p.id === parentLink.parentId) : null;
        const studentMarks = db.marks.filter(m => m.studentId === sId);
        const studentAtt = db.attendanceRecords.filter(a => a.studentId === sId);
        const studentFee = db.studentFees.find(f => f.studentId === sId);

        const totalAtt = studentAtt.length;
        const presentAtt = studentAtt.filter(a => a.status === 'present').length;
        const attPct = totalAtt > 0 ? ((presentAtt / totalAtt) * 100).toFixed(1) : '100.0';

        return sendJson(res, 200, {
          student,
          parent,
          marks: studentMarks,
          attendanceRecords: studentAtt,
          attendanceSummary: { total: totalAtt, present: presentAtt, percentage: attPct },
          fees: studentFee
        });
      }

      // Teachers
      if (pathname === '/api/admin/teachers' && method === 'GET') {
        return sendJson(res, 200, { teachers: db.teachers });
      }

      if (pathname === '/api/admin/teachers' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.name || !body.department) {
          return sendJson(res, 400, { error: 'Teacher name and department are required' });
        }
        const tId = `TCH-${String(db.teachers.length + 1).padStart(2, '0')}`;
        const newTeacher = {
          id: tId,
          userId: `USR-TCH-${String(db.teachers.length + 1).padStart(2, '0')}`,
          name: body.name,
          email: body.email || `teacher${db.teachers.length + 1}@edusphere.local`,
          phone: body.phone || '+91-98440-00000',
          employeeId: `EMP-GGA-${200 + db.teachers.length + 1}`,
          department: body.department,
          qualification: body.qualification || 'M.Sc. / B.Ed.',
          joiningDate: new Date().toISOString().split('T')[0],
          assignedSubjects: body.assignedSubjects || ['SUB-MTH'],
          assignedSections: body.assignedSections || ['SEC-10A'],
          status: 'active'
        };
        db.teachers.push(newTeacher);
        saveDb(db);
        return sendJson(res, 201, { message: 'Teacher created', teacher: newTeacher });
      }

      // Classes & Sections
      if (pathname === '/api/admin/classes' && method === 'GET') {
        return sendJson(res, 200, { classes: db.classes, sections: db.sections, subjects: db.subjects });
      }

      // Fees Management
      if (pathname === '/api/admin/fees' && method === 'GET') {
        return sendJson(res, 200, {
          feeStructures: db.feeStructures,
          studentFees: db.studentFees,
          payments: db.payments
        });
      }

      if (pathname === '/api/admin/fees/collect' && method === 'POST') {
        const body = await parseBody(req);
        const { studentId, amount, paymentMethod } = body;
        const feeRecord = db.studentFees.find(f => f.studentId === studentId);
        if (!feeRecord) return sendJson(res, 404, { error: 'Fee record not found' });

        const payAmt = Number(amount);
        feeRecord.paidAmount += payAmt;
        feeRecord.pendingAmount = Math.max(0, feeRecord.totalAmount - feeRecord.paidAmount);
        feeRecord.status = feeRecord.pendingAmount === 0 ? 'paid' : 'partial';

        const payment = {
          id: `PAY-REC-${Date.now()}`,
          studentFeeId: feeRecord.id,
          studentId,
          studentName: feeRecord.studentName,
          amount: payAmt,
          paymentMethod: paymentMethod || 'Bank Transfer / Counter Collection',
          transactionRef: `TXN-OFFLINE-${Date.now()}`,
          paidAt: new Date().toISOString(),
          receiptNumber: `RCP-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
          status: 'completed'
        };

        db.payments.unshift(payment);

        db.auditLogs.unshift({
          id: `AUDIT-${Date.now()}`,
          user: user.name,
          action: 'FEE_PAYMENT_RECORDED',
          module: 'Fees',
          recordId: payment.id,
          details: `Recorded fee collection of ₹${payAmt} for ${feeRecord.studentName}`,
          timestamp: new Date().toISOString()
        });

        saveDb(db);
        return sendJson(res, 200, { message: 'Payment recorded', payment, feeRecord });
      }

      // Exams
      if (pathname === '/api/admin/exams' && method === 'GET') {
        return sendJson(res, 200, { exams: db.exams, marks: db.marks });
      }

      if (pathname === '/api/admin/reports' && method === 'GET') {
        return sendJson(res, 200, {
          studentCount: db.students.length,
          teacherCount: db.teachers.length,
          attendanceSessions: db.attendanceSessions.length,
          totalRevenue: db.payments.reduce((s, p) => s + p.amount, 0),
          pendingDues: db.studentFees.reduce((s, f) => s + f.pendingAmount, 0)
        });
      }
    }

    // 5. Teacher Routes
    if (pathname.startsWith('/api/teacher')) {
      const user = getUserFromToken(req, db);
      if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
        return sendJson(res, 403, { error: 'Teacher authorization required' });
      }

      const teacher = db.teachers.find(t => t.userId === user.id || t.email === user.email) || db.teachers[0];

      if (pathname === '/api/teacher/dashboard' && method === 'GET') {
        const todayAttSessions = db.attendanceSessions.filter(a => a.teacherId === teacher.id);
        const myAssignments = db.assignments.filter(a => a.teacherId === teacher.id);
        return sendJson(res, 200, {
          teacher,
          assignedSections: teacher.assignedSections,
          assignedSubjects: teacher.assignedSubjects.map(sid => db.subjects.find(s => s.id === sid)).filter(Boolean),
          attendanceCompletedToday: todayAttSessions.length > 0,
          pendingHomeworkReviews: db.assignmentSubmissions.filter(s => s.status === 'submitted').length,
          upcomingExams: db.exams.filter(e => e.status === 'active')
        });
      }

      if (pathname === '/api/teacher/classes' && method === 'GET') {
        const sections = db.sections.map(sec => {
          const cl = db.classes.find(c => c.id === sec.classId);
          const studentCount = db.students.filter(s => s.sectionId === sec.id).length;
          return { ...sec, className: cl ? cl.name : '', studentCount };
        });
        return sendJson(res, 200, { sections, subjects: db.subjects });
      }

      if (pathname === '/api/teacher/students' && method === 'GET') {
        const secId = query.sectionId || 'SEC-10A';
        const list = db.students.filter(s => s.sectionId === secId);
        return sendJson(res, 200, { students: list });
      }

      // Submit Attendance
      if (pathname === '/api/teacher/attendance' && method === 'POST') {
        const body = await parseBody(req);
        const { date, classId, sectionId, subjectId, period, records } = body;

        if (!date || !sectionId || !records || !Array.isArray(records)) {
          return sendJson(res, 400, { error: 'Date, sectionId, and records are required' });
        }

        const sessId = `ATT-SESS-${Date.now()}`;
        const presentCount = records.filter(r => r.status === 'present').length;
        const absentCount = records.filter(r => r.status === 'absent').length;
        const lateCount = records.filter(r => r.status === 'late').length;

        const newSession = {
          id: sessId,
          date,
          classId: classId || 'CLS-10',
          sectionId,
          subjectId: subjectId || 'SUB-MTH',
          period: period || 'Period 1 (09:00 - 09:50)',
          teacherId: teacher.id,
          recordedAt: new Date().toISOString(),
          totalStudents: records.length,
          presentCount,
          absentCount,
          lateCount
        };

        db.attendanceSessions.push(newSession);

        records.forEach(rec => {
          db.attendanceRecords.push({
            id: `ATT-REC-${Date.now()}-${rec.studentId}`,
            sessionId: sessId,
            date,
            studentId: rec.studentId,
            studentName: rec.studentName,
            rollNumber: rec.rollNumber,
            status: rec.status, // 'present' | 'absent' | 'late' | 'excused'
            remarks: rec.remarks || ''
          });

          // If student is absent, create instant Parent Notification
          if (rec.status === 'absent') {
            const parentLink = db.parentStudents.find(ps => ps.studentId === rec.studentId);
            if (parentLink) {
              const parent = db.parents.find(p => p.id === parentLink.parentId);
              if (parent) {
                db.notifications.unshift({
                  id: `NOTIF-${Date.now()}-${rec.studentId}`,
                  recipientRole: 'parent',
                  recipientUserId: parent.userId,
                  title: `Attendance Alert: ${rec.studentName}`,
                  message: `${rec.studentName} was marked ABSENT for ${newSession.period} on ${date}.`,
                  module: 'attendance',
                  read: false,
                  createdAt: new Date().toISOString()
                });
              }
            }
          }
        });

        db.auditLogs.unshift({
          id: `AUDIT-${Date.now()}`,
          user: teacher.name,
          action: 'ATTENDANCE_SUBMITTED',
          module: 'Attendance',
          recordId: sessId,
          details: `Marked attendance for Section ${sectionId} on ${date} (${presentCount} Present, ${absentCount} Absent, ${lateCount} Late)`,
          timestamp: new Date().toISOString()
        });

        saveDb(db);
        return sendJson(res, 201, { message: 'Attendance submitted successfully', session: newSession });
      }

      // Homework creation & grading
      if (pathname === '/api/teacher/homework' && method === 'GET') {
        return sendJson(res, 200, { assignments: db.assignments, submissions: db.assignmentSubmissions });
      }

      if (pathname === '/api/teacher/homework' && method === 'POST') {
        const body = await parseBody(req);
        const hwId = `HW-${Date.now()}`;
        const newHw = {
          id: hwId,
          title: body.title,
          subjectId: body.subjectId || 'SUB-MTH',
          subjectName: body.subjectName || 'Mathematics',
          classId: body.classId || 'CLS-10',
          sectionId: body.sectionId || 'SEC-10A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          deadline: body.deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
          maxScore: Number(body.maxScore) || 50,
          description: body.description,
          status: 'published',
          createdAt: new Date().toISOString()
        };

        db.assignments.unshift(newHw);

        db.notifications.unshift({
          id: `NOTIF-HW-${Date.now()}`,
          recipientRole: 'student',
          recipientUserId: null,
          title: `New Assignment: ${newHw.title}`,
          message: `${teacher.name} published a new homework assignment for ${newHw.subjectName}. Deadline: ${newHw.deadline.split('T')[0]}`,
          module: 'homework',
          read: false,
          createdAt: new Date().toISOString()
        });

        saveDb(db);
        return sendJson(res, 201, { message: 'Homework published', assignment: newHw });
      }

      // Enter Exam Marks
      if (pathname === '/api/teacher/marks' && method === 'POST') {
        const body = await parseBody(req);
        const { examId, subjectId, marksList } = body;

        if (!examId || !subjectId || !marksList || !Array.isArray(marksList)) {
          return sendJson(res, 400, { error: 'examId, subjectId, and marksList required' });
        }

        const subj = db.subjects.find(s => s.id === subjectId) || { name: 'Mathematics' };

        marksList.forEach(m => {
          const score = Number(m.score);
          if (score < 0 || score > 100) return; // Validation: 0 <= score <= 100

          const gradeInfo = calculateGradeFromPercentage(score);
          const existingIdx = db.marks.findIndex(mk => mk.examId === examId && mk.studentId === m.studentId && mk.subjectId === subjectId);

          const markRecord = {
            id: `MRK-${m.studentId}-${subjectId}-${examId}`,
            examId,
            studentId: m.studentId,
            studentName: m.studentName,
            classId: m.classId || 'CLS-10',
            sectionId: m.sectionId || 'SEC-10A',
            subjectId,
            subjectName: subj.name,
            obtainedScore: score,
            maxScore: 100,
            percentage: score,
            grade: gradeInfo.grade,
            status: gradeInfo.status,
            enteredBy: teacher.id,
            enteredAt: new Date().toISOString()
          };

          if (existingIdx >= 0) {
            db.marks[existingIdx] = markRecord;
          } else {
            db.marks.push(markRecord);
          }
        });

        db.auditLogs.unshift({
          id: `AUDIT-${Date.now()}`,
          user: teacher.name,
          action: 'EXAM_MARKS_SUBMITTED',
          module: 'Exams',
          recordId: examId,
          details: `Entered marks for ${marksList.length} students in ${subj.name} (${examId})`,
          timestamp: new Date().toISOString()
        });

        saveDb(db);
        return sendJson(res, 200, { message: 'Marks recorded and validated successfully' });
      }
    }

    // 6. Student Routes
    if (pathname.startsWith('/api/student')) {
      const user = getUserFromToken(req, db);
      if (!user) return sendJson(res, 401, { error: 'Authentication required' });

      const student = db.students.find(s => s.userId === user.id || s.email === user.email) || db.students[0];

      if (pathname === '/api/student/dashboard' && method === 'GET') {
        const studentAtt = db.attendanceRecords.filter(a => a.studentId === student.id);
        const totalAtt = studentAtt.length;
        const presentAtt = studentAtt.filter(a => a.status === 'present').length;
        const attPct = totalAtt > 0 ? ((presentAtt / totalAtt) * 100).toFixed(1) : '100.0';

        const myMarks = db.marks.filter(m => m.studentId === student.id);
        const avgScore = myMarks.length > 0 ? (myMarks.reduce((s, m) => s + m.obtainedScore, 0) / myMarks.length).toFixed(1) : '85.0';

        const myHomework = db.assignments.filter(a => a.sectionId === student.sectionId);
        const mySubmissions = db.assignmentSubmissions.filter(sub => sub.studentId === student.id);

        return sendJson(res, 200, {
          student,
          attendance: { total: totalAtt, present: presentAtt, percentage: attPct, records: studentAtt },
          academicAverage: avgScore,
          recentMarks: myMarks,
          homework: myHomework.map(h => ({
            ...h,
            isSubmitted: mySubmissions.some(s => s.assignmentId === h.id)
          })),
          upcomingExams: db.exams.filter(e => e.status === 'active'),
          notifications: db.notifications.filter(n => n.recipientRole === 'student' || n.recipientRole === 'all')
        });
      }

      if (pathname === '/api/student/homework/submit' && method === 'POST') {
        const body = await parseBody(req);
        const { assignmentId, content } = body;
        const newSubm = {
          id: `SUBM-${Date.now()}`,
          assignmentId,
          studentId: student.id,
          studentName: student.name,
          submittedAt: new Date().toISOString(),
          content: content || 'Completed assignment submission.',
          score: null,
          feedback: null,
          status: 'submitted'
        };
        db.assignmentSubmissions.push(newSubm);
        saveDb(db);
        return sendJson(res, 201, { message: 'Assignment submitted successfully', submission: newSubm });
      }
    }

    // 7. Parent Routes
    if (pathname.startsWith('/api/parent')) {
      const user = getUserFromToken(req, db);
      if (!user) return sendJson(res, 401, { error: 'Authentication required' });

      const parent = db.parents.find(p => p.userId === user.id || p.email === user.email) || db.parents[0];
      const childrenLinks = db.parentStudents.filter(ps => ps.parentId === parent.id);
      const children = childrenLinks.map(ps => db.students.find(s => s.id === ps.studentId)).filter(Boolean);

      const activeChildId = query.studentId || (children[0] && children[0].id) || 'STD-001';
      const activeChild = db.students.find(s => s.id === activeChildId) || children[0];

      if (pathname === '/api/parent/dashboard' && method === 'GET') {
        const childAtt = db.attendanceRecords.filter(a => a.studentId === activeChildId);
        const totalAtt = childAtt.length;
        const presentAtt = childAtt.filter(a => a.status === 'present').length;
        const attPct = totalAtt > 0 ? ((presentAtt / totalAtt) * 100).toFixed(1) : '94.5';

        const childMarks = db.marks.filter(m => m.studentId === activeChildId);
        const childFee = db.studentFees.find(f => f.studentId === activeChildId) || { totalAmount: 65000, paidAmount: 57000, pendingAmount: 8000, status: 'partial' };
        const childPayments = db.payments.filter(p => p.studentId === activeChildId);

        return sendJson(res, 200, {
          parent,
          children,
          activeChild,
          todayAttendance: childAtt[childAtt.length - 1] || { status: 'present', date: '2026-09-03' },
          attendancePercentage: attPct,
          attendanceRecords: childAtt,
          recentMarks: childMarks,
          fees: childFee,
          paymentHistory: childPayments,
          notifications: db.notifications.filter(n => n.recipientRole === 'parent' || n.recipientRole === 'all')
        });
      }

      if (pathname === '/api/parent/fees/pay' && method === 'POST') {
        const body = await parseBody(req);
        const { studentId, amount } = body;
        const feeRecord = db.studentFees.find(f => f.studentId === (studentId || activeChildId));
        if (!feeRecord) return sendJson(res, 404, { error: 'Fee record not found' });

        const payAmt = Number(amount) || feeRecord.pendingAmount;
        feeRecord.paidAmount += payAmt;
        feeRecord.pendingAmount = Math.max(0, feeRecord.totalAmount - feeRecord.paidAmount);
        feeRecord.status = feeRecord.pendingAmount === 0 ? 'paid' : 'partial';

        const payment = {
          id: `PAY-ONLINE-${Date.now()}`,
          studentFeeId: feeRecord.id,
          studentId: feeRecord.studentId,
          studentName: feeRecord.studentName,
          amount: payAmt,
          paymentMethod: 'EduSphere Instant Simulated UPI / NetBanking',
          transactionRef: `TXN-EDU-ONLINE-${Date.now()}`,
          paidAt: new Date().toISOString(),
          receiptNumber: `RCP-ONLINE-${Math.floor(Math.random() * 9000 + 1000)}`,
          status: 'completed'
        };

        db.payments.unshift(payment);
        saveDb(db);
        return sendJson(res, 200, { message: 'Fee paid successfully', payment, feeRecord });
      }
    }

    // 8. Global Role-Scoped Search
    if (pathname === '/api/search' && method === 'GET') {
      const qStr = (query.q || '').toLowerCase().trim();
      if (!qStr) return sendJson(res, 200, { results: [] });

      const results = [];
      db.students.filter(s => s.name.toLowerCase().includes(qStr) || s.admissionNumber.toLowerCase().includes(qStr)).slice(0, 5).forEach(s => {
        results.push({ type: 'Student', title: `${s.name} (${s.admissionNumber})`, subtitle: `Class: ${s.classId} · Section: ${s.sectionId}`, id: s.id });
      });

      db.teachers.filter(t => t.name.toLowerCase().includes(qStr) || t.department.toLowerCase().includes(qStr)).slice(0, 5).forEach(t => {
        results.push({ type: 'Teacher', title: `${t.name}`, subtitle: `Department: ${t.department} · ${t.employeeId}`, id: t.id });
      });

      db.subjects.filter(sub => sub.name.toLowerCase().includes(qStr)).slice(0, 5).forEach(sub => {
        results.push({ type: 'Subject', title: `${sub.name} (${sub.code})`, subtitle: `Department: ${sub.department}`, id: sub.id });
      });

      return sendJson(res, 200, { results });
    }

    // Fallback 404
    return sendJson(res, 404, { error: `Endpoint not found: ${method} ${pathname}` });
  } catch (err) {
    console.error('Server error:', err);
    return sendJson(res, 500, { error: 'Internal EduSphere server exception', details: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`EduSphere Core Backend API running on port ${PORT} (http://127.0.0.1:${PORT})`);
});
