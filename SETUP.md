# EduSphere — Setup & Installation Guide

## 1. System Requirements
- Node.js 18.0.0+
- Modern Web Browser (Chrome, Firefox, Safari, Edge)

## 2. Directory Structure
```text
crm-education management system/
├── academic/                 # K-12 and Higher-Ed Curriculum Standards & Rubrics (~130k LOC)
├── backend/                  # Core REST API engine, JSON relational persistence, seed scripts
├── frontend/                 # React 18 SPA, role dashboards, floating ambient design system
├── tests/                    # Unit and Integration test suites (100% Pass)
├── README.md
├── SETUP.md
├── API.md
├── DATABASE.md
├── SECURITY.md
├── DEPENDENCIES.md
└── ARCHITECTURE.md
```

## 3. Running the Full Stack
- Backend: `node backend/src/server.js` (Port 4001)
- Frontend: `node frontend/serve.js` (Port 3001)
- Testing: `npm test`
