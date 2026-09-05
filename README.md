# 🎓 EduSphere — Enterprise Education CRM & Academic Management Platform

**EduSphere** is a production-grade, enterprise-scale Education Management Platform and Academic CRM engineered for K-12 school districts, colleges, and higher education universities to manage the entire student, parent, faculty, and institutional lifecycle.

---

## 📋 Table of Contents
- [Key Functional Pillars](#-key-functional-pillars)
- [Dependencies](#-dependencies)
- [Installation](#-installation)
- [Build](#-build)
- [Run](#-run)
- [Usage & Demo Credentials](#-usage--demo-credentials)
- [Testing](#-testing)
- [Docker Deployment](#-docker-deployment)
- [Makefile Commands](#-makefile-commands)
- [Architecture & Modular Services](#-architecture--modular-services)
- [License](#-license)

---

## 🌟 Key Functional Pillars

1. **Super Admin Platform Governance**
   - Multi-institution tenant provisioning, subscription tier billing, user governance directories, and real-time tamper-evident security audit trails.
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

## 📦 Dependencies

The platform requires the following runtime dependencies:

- **Node.js**: `v18.0.0` or higher (v20+ recommended)
- **npm**: `v9.0.0` or higher
- **Docker** (Optional for containerization): `Docker Engine 20.10+` and `Docker Compose v2+`
- **Optional Python**: `python >= 3.8` (if using virtual environments: `python -m venv venv`)

---

## ⚙️ Installation

To install all platform dependencies, clone the repository and run:

```bash
# Install core dependencies
npm install

# Alternatively using npm clean install for production
npm ci
```

If setting up an optional Python microservice environment:
```bash
# Create python virtual environment (optional)
python -m venv venv
# Activate on Windows: .\venv\Scripts\activate
# Activate on Linux/macOS: source venv/bin/activate
```

---

## 🔨 Build

To compile and verify all platform assets and validate production database schemas:

```bash
# Build and verify application assets
npm run build
```

Using Docker to build the container image:
```bash
# Build container image
docker build -t edusphere-platform:latest .
```

---

## 🚀 Run

You can launch the complete application stack using any of the following methods:

### Method 1: Unified Application Launcher (Recommended)
```bash
npm start
# Launches the unified API service on http://127.0.0.1:4001
```

### Method 2: Development Mode
```bash
npm run dev
# Starts backend server with verbose live logging
```

### Method 3: Separate Frontend & Backend Services
```bash
# Terminal 1: Backend API Server (Port 4001)
node backend/src/server.js

# Terminal 2: Frontend Web Platform (Port 3001)
node frontend/serve.js
```

---

## 👥 Usage & Demo Credentials

Once running, access the web client at **http://localhost:3001** (or API directly at **http://127.0.0.1:4001**).

### Local Development Login Credentials

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| 🌐 **Super Admin** | `superadmin@edusphere.local` | `DemoOnly-SuperAdmin-2026!` | Multi-institution governance & global audit trail |
| 🏫 **Institution Admin** | `admin@edusphere.local` | `DemoOnly-Admin-2026!` | Complete school operations, admissions & fee records |
| 👨‍🏫 **Teacher (Faculty)** | `teacher@edusphere.local` | `DemoOnly-Teacher-2026!` | Attendance roll call, homework, and exam marksheet |
| 🎓 **Student (Rahul)** | `student@edusphere.local` | `DemoOnly-Student-2026!` | Homework submissions, timetable, and GPA progress |
| 👨‍👩‍👧 **Parent (Ravi)** | `parent@edusphere.local` | `DemoOnly-Parent-2026!` | Child tracking, attendance alerts, and fee clearance |

### Key API Endpoints

- `GET  /api/health` — Platform health check and system metrics
- `POST /api/auth/login` — User authentication and role token generation
- `GET  /api/students` — Student Information System roster with parent links
- `POST /api/attendance/submit` — Submit period attendance and trigger alerts
- `GET  /api/exams/results` — Retrieve graded exam marksheets and GPAs
- `POST /api/fees/pay` — Process online tuition payments and generate receipts

---

## 🧪 Testing

Execute the automated test suites covering unit rules, integration flows, and role-based workflows:

```bash
# Run all unit and integration tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

---

## 🐳 Docker Deployment

To run containerized EduSphere in production:

```bash
# Build the Docker image
docker build -t edusphere-platform:latest .

# Run the container
docker run -d -p 4001:4001 -p 3001:3001 --name edusphere-app edusphere-platform:latest

# Or launch with Docker Compose
docker compose up -d
```

---

## 🛠️ Makefile Commands

For standard POSIX/UNIX development workflows, use the provided `Makefile`:

```bash
make install          # Install dependencies
make build            # Build project assets
make run              # Start application server
make test             # Run test suites
make lint             # Verify code quality
make docker-build     # Build Docker container image
```

---

## 🏛️ Architecture & Modular Services

EduSphere is structured into modular enterprise domain services:

- **Student Information Service**: Multi-stage admissions, roll numbers, guardian links, and student portfolios.
- **Biometric Attendance Service**: Roll call marker, RFID synchronizer, absence alarms, and monthly registers.
- **Examination & Assessment Service**: Exam term scheduler, hall ticket generator, grading rubrics, and GPA calculator.
- **Fee Billing & Ledger Service**: Fee structure design, semester billing, scholarship waivers, and receipt generation.
- **Timetable & Scheduling Service**: Constraint satisfaction engine for clash-free faculty and room schedules.
- **Curriculum & Lesson Service**: National standards mapping, lesson plans, and homework evaluation portal.
- **Omnichannel Notification Center**: Push notifications, SMS gateway alerts, email dispatchers, and circulars.
- **Institutional Analytics Cockpit**: Executive KPI dashboards, retention analysis, and board reports.

---

## 📄 License

Proprietary enterprise software. (C) 2026 EduSphere Systems Inc. All rights reserved.
