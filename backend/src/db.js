const fs = require('fs');
const path = require('path');
const { calculateGradeFromPercentage } = require('../../academic/pedagogical_rubrics');

const DB_PATH = path.join(__dirname, '..', 'data', 'edusphere_db.json');

function seedDatabase() {
  const institution = {
    id: 'INST-001',
    name: 'Greenwood Global Academy',
    code: 'GGA-BLR',
    affiliation: 'National CBSE / Cambridge International',
    address: '88 Academic Boulevard, Bangalore, Karnataka',
    phone: '+91-80-2890-4400',
    email: 'contact@greenwood-academy.org',
    status: 'active',
    subscriptionPlan: 'Enterprise Academic Pro',
    createdAt: '2026-01-10T00:00:00.000Z'
  };

  const users = [
    {
      id: 'USR-SUP-01',
      name: 'Dr. Alistair Vance',
      email: 'superadmin@edusphere.local',
      password: 'DemoOnly-SuperAdmin-2026!',
      role: 'super_admin',
      institutionId: null,
      status: 'active'
    },
    {
      id: 'USR-ADM-01',
      name: 'Principal Sunita Deshmukh',
      email: 'admin@edusphere.local',
      password: 'DemoOnly-Admin-2026!',
      role: 'admin',
      institutionId: 'INST-001',
      status: 'active'
    },
    {
      id: 'USR-MGR-01',
      name: 'Academic Dean Rajesh Varma',
      email: 'manager@edusphere.local',
      password: 'DemoOnly-Admin-2026!',
      role: 'admin',
      institutionId: 'INST-001',
      status: 'active'
    },
    {
      id: 'USR-TCH-01',
      name: 'Prof. Vikram Sen (Mathematics)',
      email: 'teacher@edusphere.local',
      password: 'DemoOnly-Teacher-2026!',
      role: 'teacher',
      institutionId: 'INST-001',
      status: 'active',
      department: 'Mathematics'
    },
    {
      id: 'USR-STD-01',
      name: 'Rahul Sharma',
      email: 'student@edusphere.local',
      password: 'DemoOnly-Student-2026!',
      role: 'student',
      institutionId: 'INST-001',
      status: 'active'
    },
    {
      id: 'USR-PAR-01',
      name: 'Ravi Sharma (Parent)',
      email: 'parent@edusphere.local',
      password: 'DemoOnly-Parent-2026!',
      role: 'parent',
      institutionId: 'INST-001',
      status: 'active'
    }
  ];

  const classes = [
    { id: 'CLS-10', name: 'Grade 10', code: 'G10', academicYear: '2025-2026' },
    { id: 'CLS-09', name: 'Grade 9', code: 'G09', academicYear: '2025-2026' },
    { id: 'CLS-08', name: 'Grade 8', code: 'G08', academicYear: '2025-2026' },
    { id: 'CLS-07', name: 'Grade 7', code: 'G07', academicYear: '2025-2026' },
    { id: 'CLS-06', name: 'Grade 6', code: 'G06', academicYear: '2025-2026' }
  ];

  const sections = [
    { id: 'SEC-10A', classId: 'CLS-10', name: 'Section A', roomNumber: 'Room 301', classTeacherId: 'TCH-01' },
    { id: 'SEC-10B', classId: 'CLS-10', name: 'Section B', roomNumber: 'Room 302', classTeacherId: 'TCH-02' },
    { id: 'SEC-09A', classId: 'CLS-09', name: 'Section A', roomNumber: 'Room 201', classTeacherId: 'TCH-03' },
    { id: 'SEC-08A', classId: 'CLS-08', name: 'Section A', roomNumber: 'Room 101', classTeacherId: 'TCH-04' }
  ];

  const subjects = [
    { id: 'SUB-MTH', code: 'MTH-101', name: 'Mathematics', credits: 4, department: 'Mathematics' },
    { id: 'SUB-PHY', code: 'PHY-101', name: 'Physics', credits: 4, department: 'Science' },
    { id: 'SUB-CHM', code: 'CHM-101', name: 'Chemistry', credits: 4, department: 'Science' },
    { id: 'SUB-BIO', code: 'BIO-101', name: 'Biology', credits: 3, department: 'Science' },
    { id: 'SUB-ENG', code: 'ENG-101', name: 'English Literature', credits: 3, department: 'Languages' },
    { id: 'SUB-CSC', code: 'CSC-101', name: 'Computer Science', credits: 4, department: 'Technology' },
    { id: 'SUB-SST', code: 'SST-101', name: 'Social Studies & History', credits: 3, department: 'Humanities' }
  ];

  // Teachers (12 teachers)
  const teacherNames = [
    'Prof. Vikram Sen', 'Dr. Meera Nambiar', 'Mr. Robert Fernandes', 'Ms. Ananya Roy',
    'Dr. Sanjay Gupta', 'Mrs. Kavita Iyer', 'Mr. David Chen', 'Ms. Ritu Mukherjee',
    'Dr. Harish Patel', 'Mrs. Swati Joshi', 'Mr. Amitav Ghosh', 'Ms. Neha Kapoor'
  ];
  const departments = ['Mathematics', 'Science', 'Science', 'Languages', 'Science', 'Humanities', 'Technology', 'Languages', 'Science', 'Mathematics', 'Humanities', 'Science'];

  const teachers = [];
  teacherNames.forEach((tName, idx) => {
    const tId = `TCH-${String(idx + 1).padStart(2, '0')}`;
    const email = idx === 0 ? 'teacher@edusphere.local' : `teacher${idx + 1}@edusphere.local`;
    teachers.push({
      id: tId,
      userId: idx === 0 ? 'USR-TCH-01' : `USR-TCH-${String(idx + 1).padStart(2, '0')}`,
      name: tName,
      email,
      phone: `+91-98440-${10000 + idx}`,
      employeeId: `EMP-GGA-${200 + idx}`,
      department: departments[idx],
      qualification: idx % 2 === 0 ? 'Ph.D. in ' + departments[idx] : 'M.Sc. / M.Ed.',
      joiningDate: '2023-06-01',
      assignedSubjects: [subjects[idx % subjects.length].id, subjects[(idx + 1) % subjects.length].id],
      assignedSections: ['SEC-10A', 'SEC-10B', 'SEC-09A'],
      status: 'active'
    });

    if (idx > 0) {
      users.push({
        id: `USR-TCH-${String(idx + 1).padStart(2, '0')}`,
        name: tName,
        email,
        password: 'DemoOnly-Teacher-2026!',
        role: 'teacher',
        institutionId: 'INST-001',
        status: 'active'
      });
    }
  });

  // Students (52 students) & Parents (30 parents)
  const firstNames = ['Rahul', 'Arjun', 'Priya', 'Anjali', 'Rohan', 'Sneha', 'Aditya', 'Pooja', 'Karthik', 'Divya', 'Manish', 'Neha', 'Varun', 'Shreya', 'Gaurav', 'Tanvi', 'Abhishek', 'Kavya', 'Siddharth', 'Nisha', 'Aakash', 'Rhea', 'Naveen', 'Simran', 'Kiran', 'Deepika', 'Akshay', 'Megha', 'Vivek', 'Shruti', 'Harsh', 'Isha', 'Tushar', 'Rupal', 'Mohit', 'Pallavi', 'Saurabh', 'Vidya', 'Prateek', 'Shweta', 'Nikhil', 'Monika', 'Dev', 'Radhika', 'Aryan', 'Payal', 'Yash', 'Sonal', 'Kunal', 'Rashmi', 'Mayank', 'Bhavna'];
  const lastNames = ['Sharma', 'Kumar', 'Reddy', 'Rao', 'Verma', 'Patel', 'Nair', 'Iyer', 'Menon', 'Gupta', 'Singh', 'Deshmukh', 'Chopra', 'Joshi', 'Bhat', 'Kulkarni', 'Mehta', 'Shetty', 'Pillai', 'Saxena', 'Kapoor', 'Das', 'Sen', 'Dutta'];

  const students = [];
  const parents = [];
  const parentStudents = [];

  // Seed Primary Demo Parent
  parents.push({
    id: 'PAR-01',
    userId: 'USR-PAR-01',
    name: 'Ravi Sharma',
    relationship: 'Father',
    phone: '+91-98800-44110',
    email: 'parent@edusphere.local',
    address: '88 Heritage Enclave, Bangalore',
    occupation: 'Senior Software Architect',
    emergencyContact: '+91-98800-44111'
  });

  for (let s = 1; s <= 52; s++) {
    const sId = `STD-${String(s).padStart(3, '0')}`;
    const fName = firstNames[(s - 1) % firstNames.length];
    const lName = s === 1 ? 'Sharma' : lastNames[(s - 1) % lastNames.length];
    const fullName = `${fName} ${lName}`;
    const email = s === 1 ? 'student@edusphere.local' : `student${s}@edusphere.local`;
    const secId = s <= 20 ? 'SEC-10A' : s <= 35 ? 'SEC-10B' : 'SEC-09A';
    const classId = s <= 35 ? 'CLS-10' : 'CLS-09';
    const rollNo = String(s <= 20 ? s : s <= 35 ? s - 20 : s - 35).padStart(2, '0');

    students.push({
      id: sId,
      userId: s === 1 ? 'USR-STD-01' : `USR-STD-${String(s).padStart(3, '0')}`,
      admissionNumber: `ADM-2025-${1000 + s}`,
      rollNumber: rollNo,
      name: fullName,
      email,
      phone: `+91-97400-${20000 + s}`,
      gender: s % 2 === 0 ? 'Female' : 'Male',
      dateOfBirth: '2010-04-15',
      classId,
      sectionId: secId,
      bloodGroup: ['O+', 'A+', 'B+', 'AB+'][s % 4],
      admissionDate: '2025-06-05',
      address: `Apt ${10 + (s % 40)}, Green Glen Layout, Bangalore`,
      status: 'active'
    });

    if (s > 1) {
      users.push({
        id: `USR-STD-${String(s).padStart(3, '0')}`,
        name: fullName,
        email,
        password: 'DemoOnly-Student-2026!',
        role: 'student',
        institutionId: 'INST-001',
        status: 'active'
      });
    }

    // Parent association
    let parId;
    if (s === 1) {
      parId = 'PAR-01';
    } else {
      parId = `PAR-${String(Math.ceil(s / 2)).padStart(2, '0')}`;
      if (!parents.some(p => p.id === parId)) {
        const pName = `Mr. ${lName}`;
        const pEmail = `parent${Math.ceil(s / 2)}@edusphere.local`;
        parents.push({
          id: parId,
          userId: `USR-PAR-${String(Math.ceil(s / 2)).padStart(2, '0')}`,
          name: pName,
          relationship: 'Parent / Guardian',
          phone: `+91-98800-${50000 + s}`,
          email: pEmail,
          address: `House ${s * 3}, Pine Valley, Bangalore`,
          occupation: 'Professional / Business',
          emergencyContact: `+91-98800-${60000 + s}`
        });

        users.push({
          id: `USR-PAR-${String(Math.ceil(s / 2)).padStart(2, '0')}`,
          name: pName,
          email: pEmail,
          password: 'DemoOnly-Parent-2026!',
          role: 'parent',
          institutionId: 'INST-001',
          status: 'active'
        });
      }
    }

    parentStudents.push({
      id: `PS-${s}`,
      parentId: parId,
      studentId: sId,
      relationship: 'Child'
    });
  }

  // Attendance Sessions & Records
  const attendanceSessions = [];
  const attendanceRecords = [];
  const dates = ['2026-09-01', '2026-09-02', '2026-09-03'];

  dates.forEach((dStr, dIdx) => {
    const sessId = `ATT-SESS-10A-${dIdx + 1}`;
    attendanceSessions.push({
      id: sessId,
      date: dStr,
      classId: 'CLS-10',
      sectionId: 'SEC-10A',
      subjectId: 'SUB-MTH',
      period: 'Period 1 (09:00 - 09:50)',
      teacherId: 'TCH-01',
      recordedAt: `${dStr}T09:55:00.000Z`,
      totalStudents: 20,
      presentCount: 18,
      absentCount: 1,
      lateCount: 1
    });

    const grade10AStudents = students.filter(st => st.sectionId === 'SEC-10A');
    grade10AStudents.forEach((st, idx) => {
      let status = 'present';
      if (idx === 1 && dIdx === 2) status = 'absent'; // Arjun Kumar absent today
      else if (idx === 3 && dIdx === 2) status = 'late'; // Anjali late
      else if (idx === 7 && dIdx === 0) status = 'absent';

      attendanceRecords.push({
        id: `ATT-REC-${dIdx + 1}-${st.id}`,
        sessionId: sessId,
        date: dStr,
        studentId: st.id,
        studentName: st.name,
        rollNumber: st.rollNumber,
        status,
        remarks: status === 'late' ? 'Arrived 15 mins late with transit pass' : status === 'absent' ? 'Unexcused medical leave' : 'On-time'
      });
    });
  });

  // Homework & Assignments
  const assignments = [
    {
      id: 'HW-MTH-01',
      title: 'Quadratic Equations & Parabolic Modeling Set 4',
      subjectId: 'SUB-MTH',
      subjectName: 'Mathematics',
      classId: 'CLS-10',
      sectionId: 'SEC-10A',
      teacherId: 'TCH-01',
      teacherName: 'Prof. Vikram Sen',
      deadline: '2026-09-08T23:59:00.000Z',
      maxScore: 50,
      description: 'Solve exercises 4.1 to 4.5 from the textbook. Show analytical factorization and graphic vertex coordinates.',
      status: 'published',
      createdAt: '2026-09-01T10:00:00.000Z'
    },
    {
      id: 'HW-PHY-01',
      title: 'Electromagnetic Induction & Faraday Laws Problem Bank',
      subjectId: 'SUB-PHY',
      subjectName: 'Physics',
      classId: 'CLS-10',
      sectionId: 'SEC-10A',
      teacherId: 'TCH-02',
      teacherName: 'Dr. Meera Nambiar',
      deadline: '2026-09-10T23:59:00.000Z',
      maxScore: 50,
      description: 'Complete numerical derivation of induced EMF and magnetic flux rate of change.',
      status: 'published',
      createdAt: '2026-09-02T11:00:00.000Z'
    }
  ];

  const assignmentSubmissions = [
    {
      id: 'SUBM-01',
      assignmentId: 'HW-MTH-01',
      studentId: 'STD-001',
      studentName: 'Rahul Sharma',
      submittedAt: '2026-09-02T14:30:00.000Z',
      content: 'Attached solution document with complete step-by-step parabola vertex derivations and graphs.',
      score: 48,
      feedback: 'Excellent work Rahul! Clear proof steps and neat graphs.',
      status: 'reviewed'
    }
  ];

  // Exams & Marks
  const exams = [
    {
      id: 'EXAM-MID-2026',
      title: 'Mid-Term Academic Examination 2026',
      term: 'First Semester',
      academicYear: '2025-2026',
      startDate: '2026-09-20',
      endDate: '2026-09-28',
      status: 'active',
      classes: ['CLS-10', 'CLS-09', 'CLS-08']
    },
    {
      id: 'EXAM-UNIT-01',
      title: 'Continuous Assessment Unit Test 1',
      term: 'Formative Assessment',
      academicYear: '2025-2026',
      startDate: '2026-08-10',
      endDate: '2026-08-14',
      status: 'completed',
      classes: ['CLS-10']
    }
  ];

  const marks = [];
  const g10Students = students.filter(st => st.classId === 'CLS-10');
  
  // Seed Unit Test 1 Marks for all Grade 10 students
  g10Students.forEach((st, idx) => {
    const mathScore = Math.min(100, Math.max(55, 88 - (idx % 15) + (idx % 3) * 4));
    const phyScore = Math.min(100, Math.max(52, 84 - (idx % 12) + (idx % 4) * 3));
    const chmScore = Math.min(100, Math.max(58, 86 - (idx % 14) + (idx % 2) * 5));
    const engScore = Math.min(100, Math.max(65, 90 - (idx % 10)));

    const scores = [
      { subjectId: 'SUB-MTH', subjectName: 'Mathematics', score: mathScore, max: 100 },
      { subjectId: 'SUB-PHY', subjectName: 'Physics', score: phyScore, max: 100 },
      { subjectId: 'SUB-CHM', subjectName: 'Chemistry', score: chmScore, max: 100 },
      { subjectId: 'SUB-ENG', subjectName: 'English Literature', score: engScore, max: 100 }
    ];

    scores.forEach((sc, scIdx) => {
      const gradeInfo = calculateGradeFromPercentage(sc.score);
      marks.push({
        id: `MRK-${st.id}-${sc.subjectId}-UNIT1`,
        examId: 'EXAM-UNIT-01',
        studentId: st.id,
        studentName: st.name,
        classId: st.classId,
        sectionId: st.sectionId,
        subjectId: sc.subjectId,
        subjectName: sc.subjectName,
        obtainedScore: sc.score,
        maxScore: sc.max,
        percentage: sc.score,
        grade: gradeInfo.grade,
        status: gradeInfo.status,
        enteredBy: 'TCH-01',
        enteredAt: '2026-08-16T10:00:00.000Z'
      });
    });
  });

  // Fees & Payments
  const feeStructures = [
    {
      id: 'FEE-G10-ANNUAL',
      name: 'Grade 10 Annual Academic & Laboratory Tuition',
      classId: 'CLS-10',
      academicYear: '2025-2026',
      totalAmount: 65000,
      breakdown: {
        tuitionFee: 45000,
        labComputersFee: 12000,
        librarySportsFee: 5000,
        examinationFee: 3000
      }
    }
  ];

  const studentFees = [];
  const payments = [];

  g10Students.forEach((st, idx) => {
    const paidAmount = idx === 0 ? 57000 : idx % 3 === 0 ? 65000 : 35000;
    const pendingAmount = 65000 - paidAmount;
    const feeRecordId = `SFEE-${st.id}`;

    studentFees.push({
      id: feeRecordId,
      studentId: st.id,
      studentName: st.name,
      classId: st.classId,
      feeStructureId: 'FEE-G10-ANNUAL',
      totalAmount: 65000,
      paidAmount,
      pendingAmount,
      status: pendingAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
      dueDate: '2026-09-30'
    });

    if (paidAmount > 0) {
      payments.push({
        id: `PAY-REC-${st.id}-01`,
        studentFeeId: feeRecordId,
        studentId: st.id,
        studentName: st.name,
        amount: paidAmount,
        paymentMethod: 'Simulated Online Banking / UPI Transfer',
        transactionRef: `TXN-EDU-${Date.now() - (idx * 86400000)}`,
        paidAt: '2026-08-05T11:20:00.000Z',
        receiptNumber: `RCP-2026-${1000 + idx}`,
        status: 'completed'
      });
    }
  });

  // Notifications
  const notifications = [
    {
      id: 'NOTIF-01',
      recipientRole: 'parent',
      recipientUserId: 'USR-PAR-01',
      title: 'Daily Attendance Report — Rahul Sharma',
      message: 'Rahul Sharma was marked Present for all scheduled morning sessions on Sep 03, 2026.',
      module: 'attendance',
      read: false,
      createdAt: '2026-09-03T10:00:00.000Z'
    },
    {
      id: 'NOTIF-02',
      recipientRole: 'student',
      recipientUserId: 'USR-STD-01',
      title: 'New Mathematics Homework Published',
      message: 'Prof. Vikram Sen published "Quadratic Equations & Parabolic Modeling Set 4". Deadline: Sep 08.',
      module: 'homework',
      read: false,
      createdAt: '2026-09-01T10:05:00.000Z'
    },
    {
      id: 'NOTIF-03',
      recipientRole: 'all',
      recipientUserId: null,
      title: 'Mid-Term Examination Schedule Released',
      message: 'Mid-Term Academic Examinations commence on Sep 20, 2026. Hall tickets will be issued next week.',
      module: 'exams',
      read: true,
      createdAt: '2026-08-28T09:00:00.000Z'
    }
  ];

  // Audit Logs
  const auditLogs = [
    {
      id: 'AUDIT-001',
      user: 'Principal Sunita Deshmukh',
      action: 'ACADEMIC_YEAR_INITIALIZED',
      module: 'Academics',
      recordId: 'AY-2025-2026',
      details: 'Initialized academic curriculum standard for 2025-2026 session',
      timestamp: '2026-06-01T08:00:00.000Z'
    },
    {
      id: 'AUDIT-002',
      user: 'Prof. Vikram Sen',
      action: 'ATTENDANCE_SUBMITTED',
      module: 'Attendance',
      recordId: 'ATT-SESS-10A-3',
      details: 'Submitted attendance for Grade 10-A (20 students recorded: 18 Present, 1 Absent, 1 Late)',
      timestamp: '2026-09-03T09:55:00.000Z'
    },
    {
      id: 'AUDIT-003',
      user: 'Academic Dean Rajesh Varma',
      action: 'STUDENT_ADMISSION_REGISTERED',
      module: 'Students',
      recordId: 'STD-001',
      details: 'Registered student Rahul Sharma to Grade 10-A with parent Ravi Sharma',
      timestamp: '2026-06-05T11:30:00.000Z'
    }
  ];

  return {
    institution,
    users,
    classes,
    sections,
    subjects,
    teachers,
    students,
    parents,
    parentStudents,
    attendanceSessions,
    attendanceRecords,
    assignments,
    assignmentSubmissions,
    exams,
    marks,
    feeStructures,
    studentFees,
    payments,
    notifications,
    auditLogs
  };
}

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    const seeded = seedDatabase();
    saveDb(seeded);
    return seeded;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    const seeded = seedDatabase();
    saveDb(seeded);
    return seeded;
  }
}

function saveDb(data) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { loadDb, saveDb, seedDatabase };
