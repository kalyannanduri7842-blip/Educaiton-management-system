# EduSphere — REST API Documentation

## Authentication & Authorization
- `POST /api/auth/login`: User login returning role tokens and user profiles.
- `GET /api/auth/me`: Current session inspection.

## Super Admin Endpoints
- `GET /api/super-admin/dashboard`: Platform telemetry, multi-institution counts, audit logs.
- `GET /api/super-admin/institutions`: Institutional directory.
- `GET /api/super-admin/users`: Platform user catalog.
- `GET /api/super-admin/audit-logs`: System-wide security action stream.

## Institution Admin Endpoints
- `GET /api/admin/dashboard`: Operations summary, attendance percentage, fee collections.
- `GET /api/admin/students`: Filterable student roster.
- `POST /api/admin/students`: 5-step admission creation with parent generation & roll numbers.
- `GET /api/admin/students/:id`: Complete 360 student profile.
- `GET /api/admin/teachers`: Faculty roster.
- `POST /api/admin/teachers`: Create teacher record.
- `GET /api/admin/classes`: Class, section, and subject taxonomy.
- `GET /api/admin/fees`: Fee structure and student balance ledger.
- `POST /api/admin/fees/collect`: Record fee payment.
- `GET /api/admin/reports`: Aggregate academic metrics.

## Teacher Endpoints
- `GET /api/teacher/dashboard`: Daily timetable, pending homework reviews.
- `GET /api/teacher/students`: Class-wise student roster.
- `POST /api/teacher/attendance`: Submit period attendance with instant parent alert broadcasting.
- `GET /api/teacher/homework`: Homework master.
- `POST /api/teacher/homework`: Publish new assignment.
- `POST /api/teacher/marks`: Record examination marksheet with automatic grade calculation.

## Student Endpoints
- `GET /api/student/dashboard`: Student summary, GPA, homework, attendance radar.
- `POST /api/student/homework/submit`: Submit assignment solution.

## Parent Endpoints
- `GET /api/parent/dashboard`: Ward switcher, daily attendance alert, grade summary, fee balance.
- `POST /api/parent/fees/pay`: Simulated fee payment with digital receipt generation.
