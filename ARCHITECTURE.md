# EduSphere — Architectural Design & Module Blueprint

## 1. System Architecture
EduSphere is designed as a modular full-stack educational resource platform:
- **Presentation Layer**: SPA with React 18, role-tailored viewports, and floating ambient background action.
- **REST API Layer**: Stateless REST endpoints with token authentication and role-based access control.
- **Academic Domain Layer**: K-12 and Higher Education curriculum taxonomies, Bloom's learning objectives, and pedagogical assessment rubrics.
- **Persistence Engine**: Relational atomic JSON database supporting ACID transactions and instant queries.

## 2. Data Flow
- `Teacher` records attendance $\to$ stored in `attendance_sessions` and `attendance_records` $\to$ instant notification to `Parent` $\to$ updates `Admin` today attendance stats.
- `Admin` admits student via 5-step wizard $\to$ student created $\to$ parent record linked $\to$ fee ledger initialized $\to$ audit log stamped.
- `Teacher` enters marks $\to$ validated $0 \le \text{score} \le 100$ $\to$ grade computed via rubric $\to$ propagates to `Student` and `Parent` dashboards.
