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
    // 1. Public Endpoints: Health, About Us & 50+ Students Roster with Linked Parents
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'healthy',
        platform: 'EduSphere Academic Management Engine',
        version: '1.0.0',
        institutions: 1,
        totalStudents: db.students.length,
        totalTeachers: db.teachers.length,
        totalClasses: db.classes.length,
        dailyTasks: (db.dailyWorkTasks || []).length,
        totalExams: (db.exams || []).length
      });
    }

    if (pathname === '/api/about-us' && method === 'GET') {
      return sendJson(res, 200, {
        institution: db.institution,
        aboutUs: db.institution.aboutUs,
        totalStudents: db.students.length,
        totalTeachers: db.teachers.length,
        accreditations: db.institution.aboutUs ? db.institution.aboutUs.accreditations : []
      });
    }

    if (pathname === '/api/public/students-list' && method === 'GET') {
      return sendJson(res, 200, {
        students: db.students.map(s => {
          const ps = (db.parentStudents || []).find(link => link.studentId === s.id);
          const parent = ps ? db.parents.find(p => p.id === ps.parentId) : (db.parents[0] || null);
          return {
            id: s.id,
            name: s.name,
            rollNumber: s.rollNumber,
            admissionNumber: s.admissionNumber,
            classId: s.classId,
            sectionId: s.sectionId,
            email: s.email,
            parentName: parent ? parent.name : 'Ravi Sharma',
            parentRelationship: parent ? (parent.relationship || 'Father') : 'Father',
            parentEmail: parent ? parent.email : 'parent@edusphere.local'
          };
        })
      });
    }

    // 2. Authentication
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;
      const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());

      if (!user || user.password !== password) {
        return sendJson(res, 401, { error: 'Invalid academic credentials. Please verify email and password.' });
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

    // 3. Central Notifications for Every Role
    if (pathname === '/api/notifications' && method === 'GET') {
      const user = getUserFromToken(req, db);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });

      let list = (db.notifications || []).filter(n => {
        if (n.recipientRole === 'all') return true;
        if (n.recipientRole === user.role) {
          if (n.recipientUserId) return n.recipientUserId === user.id;
          return true;
        }
        return false;
      });

      return sendJson(res, 200, { notifications: list, unreadCount: list.filter(n => !n.read).length });
    }

    if (pathname === '/api/notifications/read-all' && method === 'POST') {
      const user = getUserFromToken(req, db);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });

      (db.notifications || []).forEach(n => {
        if (n.recipientRole === 'all' || n.recipientRole === user.role) n.read = true;
      });
      saveDb(db);
      return sendJson(res, 200, { message: 'All notifications marked as read' });
    }

    // 4. Leave Decision (Approve / Reject) Endpoint (For Teachers & Admins)
    if (pathname === '/api/leave/decide' && method === 'POST') {
      const user = getUserFromToken(req, db);
      if (!user || (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'super_admin')) {
        return sendJson(res, 403, { error: 'Teacher or Administrator privileges required' });
      }

      const body = await parseBody(req);
      const { leaveId, decision, remarks } = body; // decision: 'approved' | 'rejected'

      const leave = (db.leaveApplications || []).find(l => l.id === leaveId);
      if (!leave) return sendJson(res, 404, { error: 'Leave request not found' });

      leave.status = decision === 'approved' ? 'approved' : 'rejected';
      leave.decidedBy = user.name;
      leave.decidedAt = new Date().toISOString();
      leave.remarks = remarks || (decision === 'approved' ? 'Leave sanctioned as requested.' : 'Leave request declined due to scheduled assessments.');

      // Dispatch instant notification to Student
      db.notifications.unshift({
        id: `NOTIF-LV-DEC-STD-${Date.now()}`,
        recipientRole: 'student',
        recipientUserId: null,
        title: `Leave Request ${decision.toUpperCase()}: ${leave.leaveType}`,
        message: `Your leave request for ${leave.startDate} to ${leave.endDate} has been ${decision.toUpperCase()} by ${user.name}. Note: ${leave.remarks}`,
        module: 'attendance',
        read: false,
        createdAt: new Date().toISOString()
      });

      // Dispatch instant notification to Parent
      db.notifications.unshift({
        id: `NOTIF-LV-DEC-PAR-${Date.now()}`,
        recipientRole: 'parent',
        recipientUserId: null,
        title: `Ward Leave Status ${decision.toUpperCase()}: ${leave.studentName}`,
        message: `Leave application for your ward ${leave.studentName} (${leave.startDate} to ${leave.endDate}) was ${decision.toUpperCase()} by ${user.name}.`,
        module: 'attendance',
        read: false,
        createdAt: new Date().toISOString()
      });

      // Audit trail log
      db.auditLogs.unshift({
        id: `AUDIT-LV-${Date.now()}`,
        user: user.name,
        action: `LEAVE_${decision.toUpperCase()}`,
        module: 'Attendance',
        recordId: leave.id,
        details: `${user.name} marked leave for ${leave.studentName} as ${decision.toUpperCase()}. Remarks: ${leave.remarks}`,
        timestamp: new Date().toISOString()
      });

      saveDb(db);
      return sendJson(res, 200, {
        message: `Leave request for ${leave.studentName} has been ${decision.toUpperCase()}. Notifications sent to Student & Parent!`,
        leave
      });
    }

    // 5. Super Admin Routes (Complete School-Wide Telemetry & Control)
    if (pathname.startsWith('/api/super-admin')) {
      const user = getUserFromToken(req, db);
      if (!user || user.role !== 'super_admin') {
        return sendJson(res, 403, { error: 'Super Administrator privileges required' });
      }

      if (pathname === '/api/super-admin/dashboard' && method === 'GET') {
        const dailyTasks = db.dailyWorkTasks || [];
        let totalAssignedWorks = dailyTasks.length * db.students.length;
        let totalSubmittedWorks = 0;
        dailyTasks.forEach(task => {
          totalSubmittedWorks += (task.submissions || []).length;
        });
        const totalPendingWorks = Math.max(0, totalAssignedWorks - totalSubmittedWorks);

        const latestSession = db.attendanceSessions[db.attendanceSessions.length - 1] || { presentCount: 18, absentCount: 1, lateCount: 1, totalStudents: 20 };
        const studentCheckins = db.studentCheckins || [];
        const teacherCheckins = db.teacherCheckins || [];

        const totalStudents = db.students.length;
        const totalPresent = latestSession.presentCount + (totalStudents - 20);
        const totalAbsent = latestSession.absentCount;
        const totalLate = latestSession.lateCount + studentCheckins.filter(c => c.status === 'late').length;

        return sendJson(res, 200, {
          totalInstitutions: 1,
          activeInstitutions: 1,
          totalStudents: db.students.length,
          totalTeachers: db.teachers.length,
          totalParents: db.parents.length,
          activeUsers: db.users.length,
          workMetrics: {
            totalTasks: dailyTasks.length,
            totalAssignedWorks,
            totalSubmittedWorks: totalSubmittedWorks || 12,
            totalPendingWorks: totalPendingWorks || 248,
            completionRatePercent: totalAssignedWorks > 0 ? ((totalSubmittedWorks / totalAssignedWorks) * 100).toFixed(1) : '15.0'
          },
          attendanceMetrics: {
            presentStudents: totalPresent || 50,
            absentStudents: totalAbsent || 1,
            lateStudents: totalLate || 3,
            attendanceRatePercent: '96.2%',
            totalFacultyPresent: teacherCheckins.length || 12,
            totalFacultyLate: teacherCheckins.filter(t => t.status === 'late').length || 0
          },
          teacherCheckins,
          studentCheckins,
          dailyTasks,
          exams: db.exams || [],
          leaveApplications: db.leaveApplications || [],
          allStudents: db.students,
          allTeachers: db.teachers,
          notifications: db.notifications || [],
          systemStatus: 'Optimal (100% Operational)',
          institution: db.institution,
          recentAuditLogs: db.auditLogs.slice(0, 10)
        });
      }

      if (pathname === '/api/super-admin/institutions' && method === 'GET') {
        return sendJson(res, 200, { institutions: [db.institution] });
      }

      if (pathname === '/api/super-admin/users' && method === 'GET') {
        return sendJson(res, 200, { users: db.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status })) });
      }

      if (pathname === '/api/super-admin/audit-logs' && method === 'GET') {
        return sendJson(res, 200, { auditLogs: db.auditLogs });
      }
    }

    // 6. Institution Admin / Manager Routes
    if (pathname.startsWith('/api/admin')) {
      const user = getUserFromToken(req, db);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return sendJson(res, 403, { error: 'Institution Administrator authorization required' });
      }

      if (pathname === '/api/admin/dashboard' && method === 'GET') {
        const todayAttendance = db.attendanceSessions[db.attendanceSessions.length - 1] || { totalStudents: 20, presentCount: 18, absentCount: 1, lateCount: 1 };
        const totalFeeCollected = db.payments.reduce((s, p) => s + p.amount, 0);
        const totalFeePending = db.studentFees.reduce((s, f) => s + f.pendingAmount, 0);
        const todayCheckins = (db.studentCheckins || []).filter(c => c.date === '2026-09-03');
        const todayTeacherCheckins = (db.teacherCheckins || []).filter(c => c.date === '2026-09-03');

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
          todayCheckins: {
            total: todayCheckins.length,
            onTime: todayCheckins.filter(c => c.status === 'on_time').length,
            late: todayCheckins.filter(c => c.status === 'late').length,
            recent: todayCheckins.slice(-5).reverse()
          },
          todayTeacherCheckins: {
            total: todayTeacherCheckins.length,
            recent: todayTeacherCheckins
          },
          feeSummary: {
            collected: totalFeeCollected,
            pending: totalFeePending,
            collectionRate: ((totalFeeCollected / (totalFeeCollected + totalFeePending)) * 100).toFixed(1)
          },
          leaveApplications: db.leaveApplications || [],
          upcomingExams: db.exams.filter(e => e.status === 'active'),
          recentAdmissions: db.students.slice(-5).reverse(),
          auditLogs: db.auditLogs.slice(0, 8)
        });
      }

      if (pathname === '/api/admin/checkins' && method === 'GET') {
        return sendJson(res, 200, {
          studentCheckins: db.studentCheckins || [],
          teacherCheckins: db.teacherCheckins || []
        });
      }

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

        db.users.push({
          id: newStudent.userId,
          name: fullName,
          email: studentEmail,
          password: 'DemoOnly-Student-2026!',
          role: 'student',
          institutionId: 'INST-001',
          status: 'active'
        });

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

      if (pathname === '/api/admin/teachers' && method === 'GET') {
        return sendJson(res, 200, { teachers: db.teachers });
      }

      if (pathname === '/api/admin/classes' && method === 'GET') {
        return sendJson(res, 200, { classes: db.classes, sections: db.sections, subjects: db.subjects });
      }

      if (pathname === '/api/admin/attendance' && method === 'GET') {
        return sendJson(res, 200, {
          sessions: db.attendanceSessions,
          records: db.attendanceRecords,
          studentCheckins: db.studentCheckins,
          teacherCheckins: db.teacherCheckins
        });
      }

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
        saveDb(db);
        return sendJson(res, 200, { message: 'Payment recorded', payment, feeRecord });
      }

      if (pathname === '/api/admin/exams' && method === 'GET') {
        return sendJson(res, 200, { exams: db.exams, marks: db.marks });
      }

      if (pathname === '/api/admin/reports' && method === 'GET') {
        return sendJson(res, 200, {
          studentCount: db.students.length,
          teacherCount: db.teachers.length,
          attendanceSessions: db.attendanceSessions.length,
          totalRevenue: db.payments.reduce((s, p) => s + p.amount, 0),
          pendingDues: db.studentFees.reduce((s, f) => s + f.pendingAmount, 0),
          checkinCount: (db.studentCheckins || []).length,
          teacherCheckinsCount: (db.teacherCheckins || []).length,
          dailyTasksCount: (db.dailyWorkTasks || []).length,
          totalExams: (db.exams || []).length
        });
      }
    }

    // 7. Teacher Routes (Faculty Check-in, Create New Exam & Questions, Leave Approvals, Daily Tasks)
    if (pathname.startsWith('/api/teacher')) {
      const user = getUserFromToken(req, db);
      if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
        return sendJson(res, 403, { error: 'Teacher authorization required' });
      }

      const teacher = db.teachers.find(t => t.userId === user.id || t.email === user.email) || db.teachers[0];

      // Add Question Paper / Questions to an Exam
      if (pathname === '/api/teacher/exams/question' && method === 'POST') {
        const body = await parseBody(req);
        const { examId, questionText, optionA, optionB, optionC, optionD, correctOption, marks } = body;

        const exam = (db.exams || []).find(e => e.id === examId);
        if (!exam) return sendJson(res, 404, { error: 'Exam not found' });

        if (!exam.questions) exam.questions = [];
        const newQ = {
          id: `Q-${Date.now()}`,
          questionText,
          options: { A: optionA, B: optionB, C: optionC, D: optionD },
          correctOption: correctOption || 'A',
          marks: Number(marks) || 5
        };

        exam.questions.push(newQ);
        saveDb(db);
        return sendJson(res, 201, { message: 'Question added to examination paper successfully!', question: newQ, exam });
      }

      // Teacher schedules / adds a new Exam
      if (pathname === '/api/teacher/exams' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.title || !body.startDate || !body.endDate) {
          return sendJson(res, 400, { error: 'Exam title, start date, and end date are required' });
        }

        const newExamId = `EXAM-${Date.now()}`;
        const newExam = {
          id: newExamId,
          title: body.title,
          term: body.term || 'Second Semester Assessment',
          academicYear: '2025-2026',
          startDate: body.startDate,
          endDate: body.endDate,
          classes: body.classes || ['CLS-10', 'CLS-09'],
          status: 'active',
          syllabusNotes: body.syllabusNotes || 'Comprehensive term coverage including Unit 1 to 4 problem sets and theory.',
          questions: [
            { id: 'Q-1', questionText: 'Solve for x: 2x² - 8x + 6 = 0 using the quadratic formula.', options: { A: 'x = 1, 3', B: 'x = 2, 4', C: 'x = -1, -3', D: 'x = 0, 3' }, correctOption: 'A', marks: 5 },
            { id: 'Q-2', questionText: 'What is the SI unit of magnetic flux density?', options: { A: 'Tesla (T)', B: 'Weber (Wb)', C: 'Henry (H)', D: 'Farad (F)' }, correctOption: 'A', marks: 5 }
          ],
          createdBy: teacher.name,
          createdAt: new Date().toISOString()
        };

        if (!db.exams) db.exams = [];
        db.exams.unshift(newExam);

        // Notify Students
        db.notifications.unshift({
          id: `NOTIF-EXM-${Date.now()}`,
          recipientRole: 'student',
          recipientUserId: null,
          title: `New Exam Scheduled: ${newExam.title}`,
          message: `${teacher.name} scheduled "${newExam.title}" (${newExam.startDate} to ${newExam.endDate}). Hall tickets & question papers available.`,
          module: 'exams',
          read: false,
          createdAt: new Date().toISOString()
        });

        // Notify Parents
        db.notifications.unshift({
          id: `NOTIF-EXM-PAR-${Date.now()}`,
          recipientRole: 'parent',
          recipientUserId: null,
          title: `Exam Notification: ${newExam.title}`,
          message: `Academic examination "${newExam.title}" is scheduled from ${newExam.startDate} to ${newExam.endDate}.`,
          module: 'exams',
          read: false,
          createdAt: new Date().toISOString()
        });

        saveDb(db);
        return sendJson(res, 201, { message: 'Exam scheduled successfully and published to Student and Parent portals!', exam: newExam });
      }

      // Teacher Daily Check-in
      if (pathname === '/api/teacher/checkin' && method === 'POST') {
        const todayStr = '2026-09-03';
        const displayTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
        const isLate = nowTime >= '08:30:00';
        const checkinStatus = isLate ? 'late' : 'on_time';

        let existing = (db.teacherCheckins || []).find(c => c.teacherId === teacher.id && c.date === todayStr);
        if (existing) {
          return sendJson(res, 200, { message: 'Faculty check-in already recorded for today.', checkin: existing, alreadyCheckedIn: true });
        }

        const newTeacherCheckin = {
          id: `TCHK-${Date.now()}-${teacher.id}`,
          teacherId: teacher.id,
          teacherName: teacher.name,
          department: teacher.department,
          date: todayStr,
          checkinTime: displayTime,
          status: checkinStatus,
          gateLocation: 'Faculty Administrative Gate 1',
          adminNotified: true,
          superAdminNotified: true,
          notifiedAt: new Date().toISOString()
        };

        if (!db.teacherCheckins) db.teacherCheckins = [];
        db.teacherCheckins.push(newTeacherCheckin);

        // Notify Institution Admin
        db.notifications.unshift({
          id: `NOTIF-TCHK-ADM-${Date.now()}`,
          recipientRole: 'admin',
          recipientUserId: null,
          title: `Faculty Arrival: ${teacher.name}`,
          message: `${teacher.name} (${teacher.department}) checked in ${checkinStatus.toUpperCase()} at ${displayTime} (Faculty Gate 1).`,
          module: 'attendance',
          read: false,
          createdAt: new Date().toISOString()
        });

        // Notify Super Admin
        db.notifications.unshift({
          id: `NOTIF-TCHK-SUP-${Date.now()}`,
          recipientRole: 'super_admin',
          recipientUserId: null,
          title: `Faculty Arrival Telemetry: ${teacher.name}`,
          message: `Greenwood Global Academy faculty member ${teacher.name} (${teacher.department}) logged arrival at ${displayTime}.`,
          module: 'attendance',
          read: false,
          createdAt: new Date().toISOString()
        });

        saveDb(db);
        return sendJson(res, 201, {
          message: `Faculty check-in logged (${checkinStatus.toUpperCase()}) at ${displayTime}. Notifications sent to School Admin and Super Admin!`,
          checkin: newTeacherCheckin
        });
      }

      if (pathname === '/api/teacher/dashboard' && method === 'GET') {
        const todayAttSessions = db.attendanceSessions.filter(a => a.teacherId === teacher.id);
        const myCheckinToday = (db.teacherCheckins || []).find(c => c.teacherId === teacher.id && c.date === '2026-09-03');

        return sendJson(res, 200, {
          teacher,
          checkinToday: myCheckinToday || null,
          assignedSections: teacher.assignedSections,
          assignedSubjects: teacher.assignedSubjects.map(sid => db.subjects.find(s => s.id === sid)).filter(Boolean),
          attendanceCompletedToday: todayAttSessions.length > 0,
          pendingHomeworkReviews: db.assignmentSubmissions.filter(s => s.status === 'submitted').length,
          upcomingExams: db.exams.filter(e => e.status === 'active'),
          allExams: db.exams,
          dailyTasks: db.dailyWorkTasks || [],
          leaveApplications: db.leaveApplications || []
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

      if (pathname === '/api/teacher/daily-work' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.title || !body.instructions) {
          return sendJson(res, 400, { error: 'Title and instructions are required' });
        }

        const nextDayNum = (db.dailyWorkTasks || []).length + 1;
        const newDailyTask = {
          id: `DAY-TASK-${String(nextDayNum).padStart(2, '0')}`,
          dayNumber: nextDayNum,
          dayTitle: `Day ${nextDayNum} — ${body.theme || 'Core Academic Competency'}`,
          dateAssigned: new Date().toISOString().split('T')[0],
          dueDate: body.dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
          subjectId: body.subjectId || 'SUB-MTH',
          subjectName: body.subjectName || 'Mathematics',
          classId: body.classId || 'CLS-10',
          sectionId: body.sectionId || 'SEC-10A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          title: body.title,
          instructions: body.instructions,
          maxScore: Number(body.maxScore) || 25,
          submissions: []
        };

        if (!db.dailyWorkTasks) db.dailyWorkTasks = [];
        db.dailyWorkTasks.push(newDailyTask);

        saveDb(db);
        return sendJson(res, 201, { message: 'Day-by-Day task created and broadcast to Students and Parents!', task: newDailyTask });
      }

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
            status: rec.status,
            remarks: rec.remarks || ''
          });
        });

        saveDb(db);
        return sendJson(res, 201, { message: 'Attendance submitted successfully and reports dispatched!', session: newSession });
      }
    }

    // 8. Student Routes (Student Check-in, Leave Application, Exams Schedules, Submissions)
    if (pathname.startsWith('/api/student')) {
      const user = getUserFromToken(req, db);
      if (!user) return sendJson(res, 401, { error: 'Authentication required' });

      const student = db.students.find(s => s.userId === user.id || s.email === user.email) || db.students[0];

      // Student Leave Application
      if (pathname === '/api/student/leave' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.startDate || !body.endDate || !body.reason) {
          return sendJson(res, 400, { error: 'Start date, end date, and reason are required' });
        }

        const newLeave = {
          id: `LEAVE-${Date.now()}-${student.id}`,
          studentId: student.id,
          studentName: student.name,
          classId: student.classId,
          sectionId: student.sectionId,
          startDate: body.startDate,
          endDate: body.endDate,
          leaveType: body.leaveType || 'Medical Leave',
          reason: body.reason,
          status: 'pending_approval',
          appliedAt: new Date().toISOString()
        };

        if (!db.leaveApplications) db.leaveApplications = [];
        db.leaveApplications.unshift(newLeave);

        // Notify Teacher
        db.notifications.unshift({
          id: `NOTIF-LEAVE-TCH-${Date.now()}`,
          recipientRole: 'teacher',
          recipientUserId: null,
          title: `Student Leave Request: ${student.name}`,
          message: `${student.name} (${student.classId}-${student.sectionId}) requested ${newLeave.leaveType} from ${newLeave.startDate} to ${newLeave.endDate}. Reason: ${newLeave.reason}. Action required: Approve or Reject.`,
          module: 'attendance',
          read: false,
          createdAt: new Date().toISOString()
        });

        // Notify Admin & Super Admin
        db.notifications.unshift({
          id: `NOTIF-LEAVE-ADM-${Date.now()}`,
          recipientRole: 'admin',
          recipientUserId: null,
          title: `Leave Application Submitted: ${student.name}`,
          message: `${student.name} applied for leave (${newLeave.startDate} to ${newLeave.endDate}).`,
          module: 'attendance',
          read: false,
          createdAt: new Date().toISOString()
        });

        // Notify Parent
        db.notifications.unshift({
          id: `NOTIF-LEAVE-PAR-${Date.now()}`,
          recipientRole: 'parent',
          recipientUserId: null,
          title: `Leave Application Recorded for ${student.name}`,
          message: `Leave application submitted for ${newLeave.startDate} to ${newLeave.endDate} (Pending Faculty Approval).`,
          module: 'attendance',
          read: false,
          createdAt: new Date().toISOString()
        });

        saveDb(db);
        return sendJson(res, 201, { message: 'Leave application submitted. Class teacher and administration have received your request for review.', leave: newLeave });
      }

      if (pathname === '/api/student/checkin' && method === 'POST') {
        const todayStr = '2026-09-03';
        const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
        
        let existingCheckin = (db.studentCheckins || []).find(c => c.studentId === student.id && c.date === todayStr);
        if (existingCheckin) {
          return sendJson(res, 200, {
            message: 'You have already checked in today!',
            checkin: existingCheckin,
            alreadyCheckedIn: true
          });
        }

        const isLate = nowTime >= '09:00:00';
        const checkinStatus = isLate ? 'late' : 'on_time';
        const displayTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const newCheckin = {
          id: `CHK-${Date.now()}-${student.id}`,
          studentId: student.id,
          studentName: student.name,
          classId: student.classId,
          sectionId: student.sectionId,
          date: todayStr,
          checkinTime: displayTime,
          status: checkinStatus,
          gateLocation: 'Academic Main Entrance Kiosk 1',
          managerNotified: true,
          parentNotified: true,
          notifiedAt: new Date().toISOString()
        };

        if (!db.studentCheckins) db.studentCheckins = [];
        db.studentCheckins.push(newCheckin);

        // Immediate notification to Parent
        db.notifications.unshift({
          id: `NOTIF-CHK-PAR-${Date.now()}`,
          recipientRole: 'parent',
          recipientUserId: null,
          title: `Campus Arrival: ${student.name}`,
          message: `${student.name} arrived at campus and checked in (${checkinStatus.toUpperCase()}) at ${displayTime} via Gate Kiosk 1.`,
          module: 'attendance',
          read: false,
          createdAt: new Date().toISOString()
        });

        // Notification to Admin
        db.notifications.unshift({
          id: `NOTIF-CHK-ADM-${Date.now()}`,
          recipientRole: 'admin',
          recipientUserId: null,
          title: `Student Arrival: ${student.name}`,
          message: `${student.name} (${student.classId}-${student.sectionId}) checked in (${checkinStatus.toUpperCase()}) at ${displayTime}.`,
          module: 'attendance',
          read: false,
          createdAt: new Date().toISOString()
        });

        saveDb(db);
        return sendJson(res, 201, {
          message: `Check-in recorded successfully as ${checkinStatus === 'on_time' ? 'ON-TIME' : 'LATE'}. Parent & Manager notified in real-time.`,
          checkin: newCheckin
        });
      }

      if (pathname === '/api/student/homework/create' && method === 'POST') {
        const body = await parseBody(req);
        const newProj = {
          id: `ST-PROJ-${Date.now()}`,
          title: body.title || 'Self-Directed STEM Project Assignment',
          subjectId: body.subjectId || 'SUB-CSC',
          subjectName: body.subjectName || 'Computer Science',
          classId: student.classId,
          sectionId: student.sectionId,
          teacherId: 'TCH-01',
          teacherName: 'Prof. Vikram Sen',
          deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
          maxScore: 25,
          description: body.description || 'Student self-study project proposal and progress notes.',
          status: 'submitted',
          createdAt: new Date().toISOString()
        };

        db.assignments.unshift(newProj);
        saveDb(db);
        return sendJson(res, 201, { message: 'Homework project added successfully!', project: newProj });
      }

      if (pathname === '/api/student/daily-work/submit' && method === 'POST') {
        const body = await parseBody(req);
        const { taskId, content } = body;
        const task = (db.dailyWorkTasks || []).find(t => t.id === taskId);
        if (!task) return sendJson(res, 404, { error: 'Daily task not found' });

        if (!task.submissions) task.submissions = [];
        const existingSubmIdx = task.submissions.findIndex(s => s.studentId === student.id);
        const submRecord = {
          studentId: student.id,
          studentName: student.name,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
          content: content || 'Completed day-by-day task solution submitted.',
          score: 24,
          feedback: 'Submitted on time. Excellent analytical work.'
        };

        if (existingSubmIdx >= 0) task.submissions[existingSubmIdx] = submRecord;
        else task.submissions.push(submRecord);

        // Notify Teacher
        db.notifications.unshift({
          id: `NOTIF-SUBM-TCH-${Date.now()}`,
          recipientRole: 'teacher',
          recipientUserId: null,
          title: `Task Submitted: ${student.name}`,
          message: `${student.name} submitted solution for "${task.title}".`,
          module: 'homework',
          read: false,
          createdAt: new Date().toISOString()
        });

        // Notify Parent
        db.notifications.unshift({
          id: `NOTIF-SUBM-PAR-${Date.now()}`,
          recipientRole: 'parent',
          recipientUserId: null,
          title: `Work Completed: ${task.title}`,
          message: `Your ward ${student.name} completed and submitted ${task.dayTitle} (${task.subjectName}).`,
          module: 'homework',
          read: false,
          createdAt: new Date().toISOString()
        });

        saveDb(db);
        return sendJson(res, 200, { message: 'Daily task submitted successfully. Reports sent to Teacher & Parent.', task });
      }

      if (pathname === '/api/student/dashboard' && method === 'GET') {
        const studentAtt = db.attendanceRecords.filter(a => a.studentId === student.id);
        const totalAtt = studentAtt.length;
        const presentAtt = studentAtt.filter(a => a.status === 'present').length;
        const attPct = totalAtt > 0 ? ((presentAtt / totalAtt) * 100).toFixed(1) : '100.0';

        const myMarks = db.marks.filter(m => m.studentId === student.id);
        const avgScore = myMarks.length > 0 ? (myMarks.reduce((s, m) => s + m.obtainedScore, 0) / myMarks.length).toFixed(1) : '85.0';

        const myHomework = db.assignments.filter(a => a.sectionId === student.sectionId || a.studentId === student.id);
        const mySubmissions = db.assignmentSubmissions.filter(sub => sub.studentId === student.id);

        const myCheckinToday = (db.studentCheckins || []).find(c => c.studentId === student.id && c.date === '2026-09-03');
        const applicableExams = (db.exams || []).filter(e => !e.classes || e.classes.includes(student.classId) || e.classes.includes('CLS-10'));
        const myLeaves = (db.leaveApplications || []).filter(l => l.studentId === student.id);

        return sendJson(res, 200, {
          student,
          checkinToday: myCheckinToday || null,
          dailyWorkTasks: db.dailyWorkTasks || [],
          attendance: { total: totalAtt, present: presentAtt, percentage: attPct, records: studentAtt },
          academicAverage: avgScore,
          recentMarks: myMarks,
          exams: applicableExams,
          leaveApplications: myLeaves,
          homework: myHomework.map(h => ({
            ...h,
            isSubmitted: mySubmissions.some(s => s.assignmentId === h.id)
          })),
          notifications: (db.notifications || []).filter(n => n.recipientRole === 'student' || n.recipientRole === 'all')
        });
      }
    }

    // 9. Parent Routes
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

        const childCheckin = (db.studentCheckins || []).find(c => c.studentId === activeChildId && c.date === '2026-09-03');
        const childLeaves = (db.leaveApplications || []).filter(l => l.studentId === activeChildId);

        return sendJson(res, 200, {
          parent,
          children,
          activeChild,
          childCheckin: childCheckin || null,
          dailyWorkTasks: db.dailyWorkTasks || [],
          todayAttendance: childAtt[childAtt.length - 1] || { status: 'present', date: '2026-09-03' },
          attendancePercentage: attPct,
          attendanceRecords: childAtt,
          recentMarks: childMarks,
          exams: db.exams || [],
          leaveApplications: childLeaves,
          fees: childFee,
          paymentHistory: childPayments,
          notifications: (db.notifications || []).filter(n => (n.recipientRole === 'parent' && (n.recipientUserId === parent.userId || !n.recipientUserId)) || n.recipientRole === 'all')
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
          paymentMethod: 'EduSphere Instant Simulated NetBanking / UPI',
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

    // 10. Global Search
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

    return sendJson(res, 404, { error: `Endpoint not found: ${method} ${pathname}` });
  } catch (err) {
    console.error('Server error:', err);
    return sendJson(res, 500, { error: 'Internal EduSphere server exception', details: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`EduSphere Core Backend API running on port ${PORT} (http://127.0.0.1:${PORT})`);
});
