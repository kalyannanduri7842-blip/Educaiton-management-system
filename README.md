# 🎓 EduSphere — Enterprise Education CRM & Academic Management Platform

**EduSphere** is a production-grade Education Management Platform built for schools, colleges, and educational institutions to manage the complete student and institutional lifecycle.

---

## 🌟 Key Functional Pillars

1. **Super Admin Platform Governance**
   - Multi-institution provisioning, active subscription plans, platform user directories, and real-time security audit trails.
2. **Institution Administration & Operations Center**
   - 5-step multi-stage student admission wizard with parent link creation and automated roll number generation.
   - Faculty management, department organization, and classroom sectioning.
   - Live fee reconciliation, payment receipt tracking, and institutional KPI reporting.
3. **Teacher & Faculty Hub**
   - Daily period-wise roll call attendance marker with real-time parent alert propagation.
   - Homework builder, publication scheduler, and submission review portal.
   - Examination marksheet entry with automated [0, 100] validation and division grade math.
4. **Student Academic Portal**
   - Personalized dashboard with cumulative attendance radar, academic average GPA, assigned homework submissions, and exam report cards.
5. **Parent Portal & Fee Clearance**
   - Ward tracking, multi-child switcher, daily morning attendance alert monitoring, and instant simulated tuition payment with printable receipts.

---

## 👥 Demo Login Credentials (Local Development)

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| 🌐 **Super Admin** | `superadmin@edusphere.local` | `DemoOnly-SuperAdmin-2026!` | Multi-institution governance & global audit trail |
| 🏫 **Institution Admin** | `admin@edusphere.local` | `DemoOnly-Admin-2026!` | Complete school operations, admissions & fee records |
| 👨‍🏫 **Teacher (Faculty)** | `teacher@edusphere.local` | `DemoOnly-Teacher-2026!` | Attendance roll call, homework, and exam marksheet |
| 🎓 **Student (Rahul)** | `student@edusphere.local` | `DemoOnly-Student-2026!` | Homework submissions, timetable, and GPA progress |
| 👨‍👩‍👧 **Parent (Ravi)** | `parent@edusphere.local` | `DemoOnly-Parent-2026!` | Child tracking, attendance alerts, and fee clearance |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18.0.0 or higher)

### 2. Start Backend API Server
```bash
node backend/src/server.js
# API Server runs on http://127.0.0.1:4001
```

### 3. Start Frontend Web Client
```bash
node frontend/serve.js
# Web Platform runs on http://localhost:3001
```

### 4. Execute Automated Test Suite
```bash
npm test
# Runs node --test tests/unit/*.test.js tests/integration/*.test.js
```
