const { useState, useEffect, useContext, createContext } = React;

const API_BASE = 'http://127.0.0.1:4001/api';

const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('edusphere_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('edusphere_token') || '');

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication failed');
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('edusphere_user', JSON.stringify(data.user));
    localStorage.setItem('edusphere_token', data.token);
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('edusphere_user');
    localStorage.removeItem('edusphere_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => useContext(AuthContext);

async function api(path, options = {}) {
  const token = localStorage.getItem('edusphere_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Request failed');
  return data;
}

// ----------------------------------------------------
// SHELL / LAYOUT COMPONENT
// ----------------------------------------------------
function AppShell({ children, role, title, navigate, path }) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const navConfigs = {
    super_admin: [
      ['/super-admin', '📈 Platform Telemetry'],
      ['/super-admin/institutions', '🏫 Institutions Master'],
      ['/super-admin/users', '👥 Platform Users'],
      ['/super-admin/audit', '🛡️ Security Audit Log']
    ],
    admin: [
      ['/admin', '📊 Operations Dashboard'],
      ['/admin/students', '🎓 Students & Admissions'],
      ['/admin/checkins', '🕒 Arrival Check-Ins'],
      ['/admin/teachers', '👨‍🏫 Teachers & Faculty'],
      ['/admin/classes', '🏫 Classes & Sections'],
      ['/admin/attendance', '📅 Attendance Center'],
      ['/admin/exams', '📝 Exams & Marksheets'],
      ['/admin/fees', '💳 Fees & Accounting'],
      ['/admin/reports', '📑 Reports & Analytics']
    ],
    teacher: [
      ['/teacher', '📋 Teacher Dashboard'],
      ['/teacher/attendance', '✅ Mark Period Attendance'],
      ['/teacher/daily-work', '📚 Day-by-Day Tasks Manager'],
      ['/teacher/homework', '📝 Homework & Projects'],
      ['/teacher/marks', '🎯 Exam Marksheet Entry'],
      ['/teacher/classes', '🏫 My Classrooms']
    ],
    student: [
      ['/student', '🎓 Student Portal'],
      ['/student/daily-work', '📚 Day-by-Day Tasks'],
      ['/student/homework', '📝 Homework Submissions'],
      ['/student/marks', '📊 Exam Results & GPA'],
      ['/student/attendance', '📅 Attendance Tracker']
    ],
    parent: [
      ['/parent', '👨‍👩‍👧 Child Overview & Alerts'],
      ['/parent/daily-work', '📚 Daily Work & Submission Reports'],
      ['/parent/attendance', '📅 Arrival & Attendance History'],
      ['/parent/results', '📊 Academic Performance'],
      ['/parent/fees', '💳 Fee Dues & Receipts']
    ]
  };

  const currentNav = navConfigs[role] || navConfigs.admin;

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const d = await api(`/search?q=${encodeURIComponent(q)}`);
      setSearchResults(d.results || []);
    } catch (e) {}
  };

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="logo-area">
          <div className="logo"><span>🎓</span> EduSphere</div>
          <div style={{fontSize:11,color:'#059669',marginTop:4,fontWeight:800,letterSpacing:0.5}}>
            {role.toUpperCase().replace('_', ' ')} WORKSPACE
          </div>
        </div>
        <nav style={{display:'flex',flexDirection:'column',gap:4}}>
          {currentNav.map(([to, label]) => (
            <a
              key={to}
              href={to}
              className={path === to ? 'active' : ''}
              onClick={e => { e.preventDefault(); navigate(to); }}
            >
              {label}
            </a>
          ))}
          <a
            href="/"
            onClick={e => { e.preventDefault(); navigate('/'); }}
            style={{marginTop:24,borderTop:'1px solid var(--border)',paddingTop:16,color:'var(--text-muted)'}}
          >
            ← Public Landing & About Us
          </a>
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div style={{display:'flex',alignItems:'center',gap:16,flex:1}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'#0f172a'}}>{title}</h2>
            <div style={{position:'relative',maxWidth:340,width:'100%'}}>
              <input
                className="input"
                style={{padding:'6px 14px',fontSize:13,background:'#f8fafc'}}
                placeholder="🔍 Global academic search..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => setShowSearch(true)}
              />
              {showSearch && searchResults.length > 0 && (
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#ffffff',border:'1px solid var(--border)',borderRadius:8,marginTop:4,zIndex:50,boxShadow:'var(--shadow-lg)',padding:8}}>
                  {searchResults.map((r, i) => (
                    <div key={i} style={{padding:8,borderBottom:'1px solid #f1f5f9',cursor:'pointer'}} onClick={() => setShowSearch(false)}>
                      <div style={{fontWeight:700,fontSize:13,color:'#059669'}}>[{r.type}] {r.title}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.subtitle}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:700,fontSize:13,color:'#0f172a'}}>{user ? user.name : 'Demo User'}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>{user ? user.email : ''}</div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => { logout(); navigate('/login'); }}>
              Logout
            </button>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 1. PUBLIC LANDING PAGE & ABOUT US
// ----------------------------------------------------
function LandingPage({ navigate }) {
  const [about, setAbout] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/about-us`).then(r => r.json()).then(setAbout).catch(console.error);
  }, []);

  return (
    <div style={{minHeight:'100vh',position:'relative',zIndex:1}}>
      <header className="header">
        <div className="container header-inner">
          <div className="logo"><span>🎓</span> EduSphere</div>
          <nav className="nav">
            <a href="#about-us">About Us & Leadership</a>
            <a href="#features">Platform Features</a>
            <a href="#checkin-flow">Arrival Check-in</a>
            <a href="#daily-work">Day-by-Day Tasks</a>
          </nav>
          <div style={{display:'flex',gap:12}}>
            <button className="btn" onClick={() => navigate('/login')}>
              🔐 Access Portal / Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container" style={{padding:'70px 28px 60px',textAlign:'center'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 16px',borderRadius:999,background:'#ecfdf5',border:'1px solid #a7f3d0',color:'#059669',fontSize:13,fontWeight:700,marginBottom:20}}>
          ✨ Production-Grade Enterprise Education CRM & Academic Platform
        </div>
        
        <h1 style={{fontSize:46,fontWeight:800,letterSpacing:'-1px',marginBottom:18,maxWidth:900,margin:'0 auto 18px',lineHeight:1.2,color:'#0f172a'}}>
          Complete Student Lifecycle, Real-Time Arrival Check-In & Day-by-Day Academic Governance
        </h1>

        <p style={{fontSize:16.5,color:'var(--text-muted)',maxWidth:780,margin:'0 auto 32px',lineHeight:1.6}}>
          A unified, interconnected platform linking Super Admins, School Principals, Teachers, Students, and Parents with automated on-time arrival notifications, daily syllabus tasks, examination gradebooks, and instant tuition fee clearance.
        </p>

        <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',marginBottom:56}}>
          <button className="btn" style={{padding:'14px 28px',fontSize:15}} onClick={() => navigate('/login')}>
            🚀 Open Role Portals (5 Dedicated Logins)
          </button>
          <button className="btn btn-outline" style={{padding:'14px 28px',fontSize:15}} onClick={() => navigate('/admin')}>
            📊 View School Operations Center
          </button>
        </div>

        {/* 4 Highlights Bar */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',gap:20,textAlign:'left',marginBottom:60}}>
          <div className="stat-card">
            <div style={{fontSize:24,marginBottom:6}}>🕒</div>
            <div style={{fontWeight:800,fontSize:15,marginBottom:4,color:'#0f172a'}}>Student Arrival Check-In</div>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>On-time and late detection with instant automated notifications dispatched to Parents & School Managers.</p>
          </div>
          <div className="stat-card">
            <div style={{fontSize:24,marginBottom:6}}>📚</div>
            <div style={{fontWeight:800,fontSize:15,marginBottom:4,color:'#0f172a'}}>Day-by-Day Tasks & Submissions</div>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>Structured curriculum schedules from Day 1 to Day 5 with submission tracking, grading, and teacher reports.</p>
          </div>
          <div className="stat-card">
            <div style={{fontSize:24,marginBottom:6}}>📝</div>
            <div style={{fontWeight:800,fontSize:15,marginBottom:4,color:'#0f172a'}}>Automated Grade Calculation</div>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>0-100 score validation, division ranking (Distinction, First Division), and printable report cards.</p>
          </div>
          <div className="stat-card">
            <div style={{fontSize:24,marginBottom:6}}>💳</div>
            <div style={{fontWeight:800,fontSize:15,marginBottom:4,color:'#0f172a'}}>Tuition Fee Clearance</div>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>Transparent tuition breakdown, online fee payments simulation, and instant digital receipt generator.</p>
          </div>
        </div>

        {/* ABOUT US SECTION */}
        <div id="about-us" style={{background:'#ffffff',border:'1px solid var(--border)',borderRadius:16,padding:36,textAlign:'left',boxShadow:'var(--shadow-sm)',marginBottom:60}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
            <div>
              <span className="badge badge-green" style={{marginBottom:8}}>🏛️ Institutional Overview & Governance</span>
              <h2 style={{fontSize:24,fontWeight:800,color:'#0f172a',marginTop:4}}>About Greenwood Global Academy</h2>
            </div>
            <div style={{display:'flex',gap:8}}>
              <span className="badge badge-orange">CBSE Affiliated</span>
              <span className="badge badge-green">Cambridge International</span>
              <span className="badge badge-gray">NABET Accredited</span>
            </div>
          </div>

          <p style={{fontSize:14.5,color:'#334155',lineHeight:1.7,marginBottom:24}}>
            {about && about.aboutUs ? about.aboutUs.overview : 'Greenwood Global Academy is an internationally accredited premier K-12 institution delivering holistic academic excellence, cutting-edge STEM laboratories, interdisciplinary arts, and comprehensive digital student lifecycle governance.'}
          </p>

          <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:16}}>Board of Academic Leadership & Administration</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))',gap:16}}>
            {(about && about.aboutUs && about.aboutUs.leadership ? about.aboutUs.leadership : [
              { name: 'Dr. Sunita Deshmukh', role: 'Principal & Head of School', qualification: 'Ph.D. in Education Leadership (Oxford)' },
              { name: 'Dr. Rajesh Varma', role: 'Academic Dean & Registrar', qualification: 'Ph.D. in Curriculum Architecture (IIT)' },
              { name: 'Prof. Vikram Sen', role: 'Head of Mathematics & STEM', qualification: 'M.Sc., B.Ed., 18 Years Faculty Experience' }
            ]).map((ldr, idx) => (
              <div key={idx} style={{background:'#f8fafc',border:'1px solid var(--border)',borderRadius:12,padding:16}}>
                <div style={{fontWeight:800,fontSize:15,color:'#0f172a'}}>{ldr.name}</div>
                <div style={{fontSize:12.5,color:'#059669',fontWeight:700,marginTop:2}}>{ldr.role}</div>
                <div style={{fontSize:11.5,color:'var(--text-muted)',marginTop:4}}>{ldr.qualification}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 5 User Gateways */}
        <div style={{textAlign:'center'}}>
          <h2 style={{fontSize:24,fontWeight:800,color:'#0f172a',marginBottom:8}}>Dedicated Enterprise Role Portals</h2>
          <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:24}}>Each role has a distinct, tailored workspace with specific privileges and real-time data flows.</p>
          
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:16}}>
            <button className="btn btn-outline" style={{padding:20,flexDirection:'column',gap:8,textAlign:'center'}} onClick={() => navigate('/login')}>
              <span style={{fontSize:28}}>🌐</span>
              <strong style={{color:'#0f172a'}}>Super Admin</strong>
              <span style={{fontSize:12,color:'var(--text-muted)'}}>Platform Governance</span>
            </button>
            <button className="btn btn-outline" style={{padding:20,flexDirection:'column',gap:8,textAlign:'center'}} onClick={() => navigate('/login')}>
              <span style={{fontSize:28}}>🏫</span>
              <strong style={{color:'#0f172a'}}>Institution Admin</strong>
              <span style={{fontSize:12,color:'var(--text-muted)'}}>Admissions & Fees</span>
            </button>
            <button className="btn btn-outline" style={{padding:20,flexDirection:'column',gap:8,textAlign:'center'}} onClick={() => navigate('/login')}>
              <span style={{fontSize:28}}>👨‍🏫</span>
              <strong style={{color:'#0f172a'}}>Teacher / Faculty</strong>
              <span style={{fontSize:12,color:'var(--text-muted)'}}>Attendance & Grading</span>
            </button>
            <button className="btn btn-outline" style={{padding:20,flexDirection:'column',gap:8,textAlign:'center'}} onClick={() => navigate('/login')}>
              <span style={{fontSize:28}}>🎓</span>
              <strong style={{color:'#0f172a'}}>Student Portal</strong>
              <span style={{fontSize:12,color:'var(--text-muted)'}}>Check-in & Tasks</span>
            </button>
            <button className="btn btn-outline" style={{padding:20,flexDirection:'column',gap:8,textAlign:'center'}} onClick={() => navigate('/login')}>
              <span style={{fontSize:28}}>👨‍👩‍👧</span>
              <strong style={{color:'#0f172a'}}>Parent Portal</strong>
              <span style={{fontSize:12,color:'var(--text-muted)'}}>Alerts & Fee Pay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 2. LOGIN PAGE
// ----------------------------------------------------
function LoginPage({ navigate }) {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') navigate('/super-admin');
      else if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'teacher') navigate('/teacher');
      else if (user.role === 'student') navigate('/student');
      else if (user.role === 'parent') navigate('/parent');
    }
  }, [user]);

  const handleFastLogin = async (uEmail, uPass) => {
    setError('');
    setLoading(true);
    try {
      const data = await login(uEmail, uPass);
      if (data.user.role === 'super_admin') navigate('/super-admin');
      else if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'teacher') navigate('/teacher');
      else if (data.user.role === 'student') navigate('/student');
      else if (data.user.role === 'parent') navigate('/parent');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    handleFastLogin(email, password);
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,position:'relative',zIndex:1}}>
      <div style={{maxWidth:520,width:'100%',background:'#ffffff',padding:36,borderRadius:16,border:'1px solid var(--border)',boxShadow:'var(--shadow-lg)'}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div className="logo" style={{justifyContent:'center',fontSize:26,marginBottom:6}}><span>🎓</span> EduSphere</div>
          <h2 style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>Academic Single Sign-On Portal</h2>
          <p style={{fontSize:13,color:'var(--text-muted)'}}>Select your role for 1-click instant login or enter credentials</p>
        </div>

        <div style={{background:'#f8fafc',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:800,color:'#059669',textTransform:'uppercase',letterSpacing:0.5,marginBottom:12,textAlign:'center'}}>
            ⚡ 1-Click Fast Role Demonstrations
          </div>
          <div style={{display:'grid',gap:8}}>
            <button
              type="button"
              className="btn btn-sm"
              style={{justifyContent:'space-between',padding:'10px 14px'}}
              onClick={() => handleFastLogin('admin@edusphere.local', 'DemoOnly-Admin-2026!')}
            >
              <span>🏫 <strong>Institution Admin / Manager</strong> (Full Control)</span>
              <span style={{fontSize:11,opacity:0.9}}>admin@edusphere.local →</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-gold"
              style={{justifyContent:'space-between',padding:'10px 14px'}}
              onClick={() => handleFastLogin('teacher@edusphere.local', 'DemoOnly-Teacher-2026!')}
            >
              <span>👨‍🏫 <strong>Teacher / Faculty</strong> (Tasks & Marks)</span>
              <span style={{fontSize:11,opacity:0.9}}>teacher@edusphere.local →</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{justifyContent:'space-between',padding:'10px 14px',borderColor:'#a7f3d0',color:'#059669'}}
              onClick={() => handleFastLogin('student@edusphere.local', 'DemoOnly-Student-2026!')}
            >
              <span>🎓 <strong>Student (Rahul Sharma)</strong> (Check-in & Work)</span>
              <span style={{fontSize:11,opacity:0.9}}>student@edusphere.local →</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{justifyContent:'space-between',padding:'10px 14px',borderColor:'#fde68a',color:'#d97706'}}
              onClick={() => handleFastLogin('parent@edusphere.local', 'DemoOnly-Parent-2026!')}
            >
              <span>👨‍👩‍👧 <strong>Parent (Ravi Sharma)</strong> (Child Tracking & Fees)</span>
              <span style={{fontSize:11,opacity:0.9}}>parent@edusphere.local →</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{justifyContent:'space-between',padding:'10px 14px'}}
              onClick={() => handleFastLogin('superadmin@edusphere.local', 'DemoOnly-SuperAdmin-2026!')}
            >
              <span>🌐 <strong>Super Admin</strong> (Platform Governance)</span>
              <span style={{fontSize:11,opacity:0.9}}>superadmin@edusphere.local →</span>
            </button>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Academic Email</label>
            <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. admin@edusphere.local" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn" type="submit" style={{width:'100%',padding:12}} disabled={loading}>
            {loading ? 'Authenticating Session...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 3. INSTITUTION ADMIN / MANAGER PORTAL (SUB-VIEWS)
// ----------------------------------------------------
function AdminPortal({ navigate, path }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classesData, setClassesData] = useState({ classes: [], sections: [], subjects: [] });
  const [checkins, setCheckins] = useState([]);
  const [attendanceData, setAttendanceData] = useState({ sessions: [], records: [] });
  const [feeData, setFeeData] = useState({ studentFees: [], payments: [] });
  const [examData, setExamData] = useState({ exams: [], marks: [] });
  const [loading, setLoading] = useState(true);

  // Admission wizard
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [admStep, setAdmStep] = useState(1);
  const [newStudent, setNewStudent] = useState({
    firstName: '', lastName: '', dateOfBirth: '2010-05-12', gender: 'Male', phone: '+91-97400-88110', email: '',
    address: '88 Academic Heights, Bangalore', classId: 'CLS-10', sectionId: 'SEC-10A', admissionNumber: '', rollNumber: '',
    parentName: 'Suresh Kumar', parentRelationship: 'Father', parentPhone: '+91-98800-77221', parentEmail: '', parentOccupation: 'Engineer'
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dDash, dStud, dTch, dCls, dChk, dAtt, dFee, dExm] = await Promise.all([
        api('/admin/dashboard'),
        api('/admin/students'),
        api('/admin/teachers'),
        api('/admin/classes'),
        api('/admin/checkins'),
        api('/admin/attendance'),
        api('/admin/fees'),
        api('/admin/exams')
      ]);
      setDashboardData(dDash);
      setStudents(dStud.students || []);
      setTeachers(dTch.teachers || []);
      setClassesData(dCls);
      setCheckins(dChk.checkins || []);
      setAttendanceData(dAtt);
      setFeeData(dFee);
      setExamData(dExm);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      await api('/admin/students', { method: 'POST', body: JSON.stringify(newStudent) });
      alert(`Student ${newStudent.firstName} ${newStudent.lastName} successfully enrolled! User account & fee structure generated.`);
      setShowAddStudent(false);
      setAdmStep(1);
      loadAll();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <AppShell role="admin" title="Operations Center" navigate={navigate} path={path}><div className="loading">Loading Institution Operations...</div></AppShell>;

  // Sub-view title map
  const titles = {
    '/admin': 'Institution Operations Dashboard',
    '/admin/students': 'Student Admissions & Master Roster',
    '/admin/checkins': 'Arrival Check-In Stream (Gate Kiosk)',
    '/admin/teachers': 'Faculty & Department Allocation',
    '/admin/classes': 'Classes, Sections & Subject Master',
    '/admin/attendance': 'Attendance Records & Rate Analytics',
    '/admin/exams': 'Examinations & Master Marksheets',
    '/admin/fees': 'Tuition Fees & Payments Ledger',
    '/admin/reports': 'Institutional Reports & Diagnostics'
  };

  return (
    <AppShell role="admin" title={titles[path] || 'Operations Center'} navigate={navigate} path={path}>
      {/* 1. OPERATIONS DASHBOARD OVERVIEW */}
      {path === '/admin' && (
        <div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Total Enrolled Students</div>
              <div className="value">{dashboardData ? dashboardData.totalStudents : 52}</div>
            </div>
            <div className="stat-card">
              <div className="label">Today's Check-ins (On-time)</div>
              <div className="value" style={{color:'#059669'}}>
                {dashboardData && dashboardData.todayCheckins ? `${dashboardData.todayCheckins.onTime} / ${dashboardData.todayCheckins.total}` : '1 / 2'}
              </div>
            </div>
            <div className="stat-card">
              <div className="label">Today's Attendance Rate</div>
              <div className="value">{dashboardData ? dashboardData.todayAttendance.ratePercent : 94.5}%</div>
            </div>
            <div className="stat-card">
              <div className="label">Fee Collections (YTD)</div>
              <div className="value" style={{color:'#d97706'}}>₹{(dashboardData ? dashboardData.feeSummary.collected : 2850000).toLocaleString()}</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
            <div style={{background:'#ffffff',padding:20,borderRadius:14,border:'1px solid var(--border)'}}>
              <h4 style={{fontSize:15,fontWeight:800,marginBottom:12,color:'#0f172a'}}>🕒 Today's Arrival Check-Ins (Gate Kiosk)</h4>
              {checkins.slice(0, 5).map(c => (
                <div key={c.id} style={{padding:10,borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,color:'#0f172a'}}>{c.studentName}</div>
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>{c.checkinTime} · {c.gateLocation}</div>
                  </div>
                  <span className={'badge ' + (c.status === 'on_time' ? 'badge-green' : 'badge-orange')}>
                    {c.status === 'on_time' ? 'On-Time' : 'Late Arrival'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{background:'#ffffff',padding:20,borderRadius:14,border:'1px solid var(--border)'}}>
              <h4 style={{fontSize:15,fontWeight:800,marginBottom:12,color:'#0f172a'}}>🛡️ Recent Administrative Activity</h4>
              {(dashboardData ? dashboardData.auditLogs : []).slice(0, 5).map(l => (
                <div key={l.id} style={{padding:10,borderBottom:'1px solid #f1f5f9'}}>
                  <div style={{fontWeight:700,fontSize:13,color:'#0f172a'}}>{l.action}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>{l.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. STUDENTS & ADMISSIONS SUB-VIEW */}
      {path === '/admin/students' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 className="section-title" style={{margin:0}}>Enrolled Student Master Directory</h3>
            <button className="btn" onClick={() => setShowAddStudent(!showAddStudent)}>
              {showAddStudent ? '✕ Close Wizard' : '+ Register New Student Admission'}
            </button>
          </div>

          {showAddStudent && (
            <div style={{background:'#ffffff',padding:28,borderRadius:14,border:'1px solid var(--border)',marginBottom:24,boxShadow:'var(--shadow)'}}>
              <div style={{display:'flex',gap:8,marginBottom:20,borderBottom:'1px solid var(--border)',paddingBottom:14}}>
                {['1. Personal Data', '2. Academic Info', '3. Parent & Guardian', '4. Review & Confirm'].map((stTitle, sIdx) => (
                  <button key={sIdx} type="button" className={'btn btn-sm ' + (admStep === sIdx + 1 ? '' : 'btn-outline')} onClick={() => setAdmStep(sIdx + 1)}>
                    {stTitle}
                  </button>
                ))}
              </div>
              <form onSubmit={handleCreateStudent}>
                {admStep === 1 && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                    <div className="form-group"><label>First Name *</label><input className="input" required value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} placeholder="e.g. Aryan" /></div>
                    <div className="form-group"><label>Last Name *</label><input className="input" required value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} placeholder="e.g. Verma" /></div>
                    <div className="form-group"><label>Date of Birth</label><input className="input" type="date" value={newStudent.dateOfBirth} onChange={e => setNewStudent({...newStudent, dateOfBirth: e.target.value})} /></div>
                    <div className="form-group"><label>Gender</label><select className="input" value={newStudent.gender} onChange={e => setNewStudent({...newStudent, gender: e.target.value})}><option>Male</option><option>Female</option></select></div>
                    <div className="form-group"><label>Primary Phone</label><input className="input" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} /></div>
                    <div className="form-group"><label>Student Address</label><input className="input" value={newStudent.address} onChange={e => setNewStudent({...newStudent, address: e.target.value})} /></div>
                    <div style={{gridColumn:'span 2',textAlign:'right'}}><button type="button" className="btn" onClick={() => setAdmStep(2)}>Next: Academic Info →</button></div>
                  </div>
                )}
                {admStep === 2 && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                    <div className="form-group"><label>Class Level *</label><select className="input" value={newStudent.classId} onChange={e => setNewStudent({...newStudent, classId: e.target.value})}><option value="CLS-10">Grade 10</option><option value="CLS-09">Grade 9</option></select></div>
                    <div className="form-group"><label>Assigned Section *</label><select className="input" value={newStudent.sectionId} onChange={e => setNewStudent({...newStudent, sectionId: e.target.value})}><option value="SEC-10A">Section A</option><option value="SEC-10B">Section B</option></select></div>
                    <div className="form-group"><label>Admission Number</label><input className="input" value={newStudent.admissionNumber} onChange={e => setNewStudent({...newStudent, admissionNumber: e.target.value})} placeholder="Auto-generated" /></div>
                    <div className="form-group"><label>Roll Number</label><input className="input" value={newStudent.rollNumber} onChange={e => setNewStudent({...newStudent, rollNumber: e.target.value})} placeholder="Auto-assigned" /></div>
                    <div style={{gridColumn:'span 2',display:'flex',justifyContent:'space-between'}}>
                      <button type="button" className="btn btn-outline" onClick={() => setAdmStep(1)}>← Back</button>
                      <button type="button" className="btn" onClick={() => setAdmStep(3)}>Next: Parent Details →</button>
                    </div>
                  </div>
                )}
                {admStep === 3 && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                    <div className="form-group"><label>Parent Name *</label><input className="input" required value={newStudent.parentName} onChange={e => setNewStudent({...newStudent, parentName: e.target.value})} /></div>
                    <div className="form-group"><label>Relationship</label><select className="input" value={newStudent.parentRelationship} onChange={e => setNewStudent({...newStudent, parentRelationship: e.target.value})}><option>Father</option><option>Mother</option></select></div>
                    <div className="form-group"><label>Parent Phone</label><input className="input" value={newStudent.parentPhone} onChange={e => setNewStudent({...newStudent, parentPhone: e.target.value})} /></div>
                    <div className="form-group"><label>Occupation</label><input className="input" value={newStudent.parentOccupation} onChange={e => setNewStudent({...newStudent, parentOccupation: e.target.value})} /></div>
                    <div style={{gridColumn:'span 2',display:'flex',justifyContent:'space-between'}}>
                      <button type="button" className="btn btn-outline" onClick={() => setAdmStep(2)}>← Back</button>
                      <button type="button" className="btn" onClick={() => setAdmStep(4)}>Next: Review & Confirm →</button>
                    </div>
                  </div>
                )}
                {admStep === 4 && (
                  <div>
                    <div style={{background:'#f8fafc',padding:16,borderRadius:8,marginBottom:20}}>
                      <p><strong>Candidate:</strong> {newStudent.firstName} {newStudent.lastName} ({newStudent.gender})</p>
                      <p><strong>Class:</strong> {newStudent.classId} — {newStudent.sectionId}</p>
                      <p><strong>Parent:</strong> {newStudent.parentName} ({newStudent.parentRelationship})</p>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <button type="button" className="btn btn-outline" onClick={() => setAdmStep(3)}>← Back</button>
                      <button type="submit" className="btn">✅ Complete Admission & Enroll Student</button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          <table className="data-table">
            <thead>
              <tr><th>Admission No</th><th>Student Name</th><th>Roll No</th><th>Class / Section</th><th>Phone</th><th>Status</th></tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td style={{fontFamily:'JetBrains Mono'}}>{s.admissionNumber}</td>
                  <td style={{fontWeight:700,color:'#0f172a'}}>{s.name}</td>
                  <td>{s.rollNumber}</td>
                  <td>{s.classId} — {s.sectionId}</td>
                  <td>{s.phone}</td>
                  <td><span className="badge badge-green">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. CHECK-INS SUB-VIEW */}
      {path === '/admin/checkins' && (
        <div>
          <h3 className="section-title">🕒 Real-Time Campus Gate Check-In Stream</h3>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Check-in Time</th><th>Student Name</th><th>Class & Section</th><th>Gate Location</th><th>Arrival Status</th><th>Notifications</th></tr>
            </thead>
            <tbody>
              {checkins.map(c => (
                <tr key={c.id}>
                  <td style={{fontFamily:'JetBrains Mono'}}>{c.date}</td>
                  <td style={{fontWeight:800,color:'#059669'}}>{c.checkinTime}</td>
                  <td style={{fontWeight:700,color:'#0f172a'}}>{c.studentName}</td>
                  <td>{c.classId} - {c.sectionId}</td>
                  <td>{c.gateLocation}</td>
                  <td><span className={'badge ' + (c.status === 'on_time' ? 'badge-green' : 'badge-orange')}>{c.status === 'on_time' ? 'On-Time' : 'Late'}</span></td>
                  <td><span className="badge badge-green">Parent & Manager Sent</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. TEACHERS SUB-VIEW */}
      {path === '/admin/teachers' && (
        <div>
          <h3 className="section-title">👨‍🏫 Faculty & Department Roster</h3>
          <table className="data-table">
            <thead>
              <tr><th>Employee ID</th><th>Faculty Name</th><th>Department</th><th>Assigned Sections</th><th>Qualification</th><th>Status</th></tr>
            </thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.id}>
                  <td style={{fontFamily:'JetBrains Mono'}}>{t.employeeId}</td>
                  <td style={{fontWeight:700,color:'#0f172a'}}>{t.name}</td>
                  <td><span className="badge badge-green">{t.department}</span></td>
                  <td>{t.assignedSections.join(', ')}</td>
                  <td>{t.qualification}</td>
                  <td><span className="badge badge-green">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. CLASSES SUB-VIEW */}
      {path === '/admin/classes' && (
        <div>
          <h3 className="section-title">🏫 Classes, Sections & Subjects Master</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
            <div style={{background:'#ffffff',padding:20,borderRadius:14,border:'1px solid var(--border)'}}>
              <h4 style={{fontWeight:800,marginBottom:12}}>Classes & Sections</h4>
              {classesData.sections.map(sec => (
                <div key={sec.id} style={{padding:12,borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between'}}>
                  <div><strong>{sec.classId} — {sec.name}</strong><div style={{fontSize:12,color:'var(--text-muted)'}}>{sec.roomNumber}</div></div>
                  <span className="badge badge-green">Teacher: {sec.classTeacherId}</span>
                </div>
              ))}
            </div>
            <div style={{background:'#ffffff',padding:20,borderRadius:14,border:'1px solid var(--border)'}}>
              <h4 style={{fontWeight:800,marginBottom:12}}>Subject Curriculum</h4>
              {classesData.subjects.map(sub => (
                <div key={sub.id} style={{padding:12,borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between'}}>
                  <div><strong>{sub.name}</strong><div style={{fontSize:12,color:'var(--text-muted)'}}>Code: {sub.code} · Dept: {sub.department}</div></div>
                  <span className="badge badge-orange">{sub.credits} Credits</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. ATTENDANCE SUB-VIEW */}
      {path === '/admin/attendance' && (
        <div>
          <h3 className="section-title">📅 Institutional Attendance Sessions</h3>
          <table className="data-table">
            <thead>
              <tr><th>Session ID</th><th>Date</th><th>Period</th><th>Class</th><th>Present</th><th>Absent</th><th>Late</th><th>Recorded At</th></tr>
            </thead>
            <tbody>
              {attendanceData.sessions.map(s => (
                <tr key={s.id}>
                  <td style={{fontFamily:'JetBrains Mono'}}>{s.id}</td>
                  <td>{s.date}</td>
                  <td>{s.period}</td>
                  <td>{s.classId} - {s.sectionId}</td>
                  <td style={{fontWeight:700,color:'#059669'}}>{s.presentCount}</td>
                  <td style={{fontWeight:700,color:'#dc2626'}}>{s.absentCount}</td>
                  <td style={{fontWeight:700,color:'#d97706'}}>{s.lateCount}</td>
                  <td style={{fontSize:12,color:'var(--text-muted)'}}>{s.recordedAt.split('T')[1].slice(0, 5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. EXAMS SUB-VIEW */}
      {path === '/admin/exams' && (
        <div>
          <h3 className="section-title">📝 Examinations & Grade Ledger</h3>
          <table className="data-table">
            <thead>
              <tr><th>Exam ID</th><th>Exam Title</th><th>Academic Term</th><th>Dates</th><th>Status</th></tr>
            </thead>
            <tbody>
              {examData.exams.map(e => (
                <tr key={e.id}>
                  <td style={{fontFamily:'JetBrains Mono'}}>{e.id}</td>
                  <td style={{fontWeight:700,color:'#0f172a'}}>{e.title}</td>
                  <td>{e.term}</td>
                  <td>{e.startDate} to {e.endDate}</td>
                  <td><span className="badge badge-green">{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 8. FEES SUB-VIEW */}
      {path === '/admin/fees' && (
        <div>
          <h3 className="section-title">💳 Tuition Fee Ledger & Student Dues</h3>
          <table className="data-table">
            <thead>
              <tr><th>Student Name</th><th>Class</th><th>Total Fee</th><th>Paid</th><th>Outstanding</th><th>Status</th></tr>
            </thead>
            <tbody>
              {feeData.studentFees.slice(0, 15).map(f => (
                <tr key={f.id}>
                  <td style={{fontWeight:700,color:'#0f172a'}}>{f.studentName}</td>
                  <td>{f.classId}</td>
                  <td>₹{f.totalAmount.toLocaleString()}</td>
                  <td style={{color:'#059669',fontWeight:700}}>₹{f.paidAmount.toLocaleString()}</td>
                  <td style={{color: f.pendingAmount > 0 ? '#dc2626' : '#059669',fontWeight:700}}>₹{f.pendingAmount.toLocaleString()}</td>
                  <td><span className={'badge ' + (f.status === 'paid' ? 'badge-green' : 'badge-orange')}>{f.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 9. REPORTS SUB-VIEW */}
      {path === '/admin/reports' && (
        <div>
          <h3 className="section-title">📑 Comprehensive Institutional Reports</h3>
          <div style={{background:'#ffffff',padding:24,borderRadius:14,border:'1px solid var(--border)'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div><strong>Institutional Summary Report — Academic Year 2025-2026</strong></div>
              <button className="btn btn-sm" onClick={() => window.print()}>🖨️ Print Report</button>
            </div>
            <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>Total Enrolled Students: 52 · Faculty: 12 · Overall Attendance: 94.5% · Total Fee Collected: ₹2,850,000</p>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ----------------------------------------------------
// 4. TEACHER PORTAL (SUB-VIEWS WITH TASK CREATOR)
// ----------------------------------------------------
function TeacherPortal({ navigate, path }) {
  const [dash, setDash] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedSection, setSelectedSection] = useState('SEC-10A');
  const [attDate, setAttDate] = useState('2026-09-03');
  const [attendanceSheet, setAttendanceSheet] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // New Day-by-Day Task Creator
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('Mathematics');
  const [newTaskInstructions, setNewTaskInstructions] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('2026-09-07');

  // Homework modal
  const [showHwModal, setShowHwModal] = useState(false);
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');

  // Marks modal
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [marksSheet, setMarksSheet] = useState({});

  const load = async () => {
    try {
      const [dDash, dStud] = await Promise.all([
        api('/teacher/dashboard'),
        api(`/teacher/students?sectionId=${selectedSection}`)
      ]);
      setDash(dDash);
      setStudents(dStud.students || []);

      const initAtt = {};
      const initMrk = {};
      (dStud.students || []).forEach(s => {
        initAtt[s.id] = 'present';
        initMrk[s.id] = 85;
      });
      setAttendanceSheet(initAtt);
      setMarksSheet(initMrk);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, [selectedSection]);

  const submitAttendance = async () => {
    setSubmitting(true);
    try {
      const records = students.map(s => ({
        studentId: s.id,
        studentName: s.name,
        rollNumber: s.rollNumber,
        status: attendanceSheet[s.id] || 'present'
      }));

      await api('/teacher/attendance', {
        method: 'POST',
        body: JSON.stringify({
          date: attDate,
          sectionId: selectedSection,
          subjectId: 'SUB-MTH',
          period: 'Period 1 (09:00 - 09:50)',
          records
        })
      });

      alert(`Attendance recorded successfully for ${students.length} students. Parent alerts & Manager report dispatched!`);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDailyTask = async (e) => {
    e.preventDefault();
    try {
      await api('/teacher/daily-work', {
        method: 'POST',
        body: JSON.stringify({
          title: newTaskTitle,
          subjectName: newTaskSubject,
          instructions: newTaskInstructions,
          dueDate: newTaskDueDate,
          maxScore: 25
        })
      });
      alert('Day-by-Day Syllabus Task added and sent to Students and Parents!');
      setShowNewTaskModal(false);
      setNewTaskTitle('');
      setNewTaskInstructions('');
      load();
    } catch (e) { alert(e.message); }
  };

  const publishHomework = async (e) => {
    e.preventDefault();
    try {
      await api('/teacher/homework', {
        method: 'POST',
        body: JSON.stringify({
          title: hwTitle,
          description: hwDesc,
          sectionId: selectedSection,
          subjectId: 'SUB-MTH',
          subjectName: 'Mathematics',
          maxScore: 50
        })
      });
      alert('Homework published to all enrolled students.');
      setShowHwModal(false);
      setHwTitle('');
      setHwDesc('');
    } catch (e) { alert(e.message); }
  };

  const submitMarks = async () => {
    try {
      const marksList = students.map(s => ({
        studentId: s.id,
        studentName: s.name,
        score: Number(marksSheet[s.id] || 0)
      }));

      await api('/teacher/marks', {
        method: 'POST',
        body: JSON.stringify({
          examId: 'EXAM-MID-2026',
          subjectId: 'SUB-MTH',
          marksList
        })
      });

      alert('Exam marks validated and recorded into official grade ledger.');
      setShowMarksModal(false);
    } catch (e) { alert(e.message); }
  };

  return (
    <AppShell role="teacher" title="Teacher Classroom & Academic Hub" navigate={navigate} path={path}>
      {/* 1. TEACHER OVERVIEW */}
      {path === '/teacher' && (
        <div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Assigned Sections</div>
              <div className="value">Grade 10-A, 10-B</div>
            </div>
            <div className="stat-card">
              <div className="label">Primary Subject</div>
              <div className="value" style={{color:'#059669'}}>Mathematics</div>
            </div>
            <div className="stat-card">
              <div className="label">Day-by-Day Tasks Scheduled</div>
              <div className="value" style={{color:'#d97706'}}>{dash && dash.dailyTasks ? dash.dailyTasks.length : 5} Days</div>
            </div>
            <div className="stat-card">
              <div className="label">Pending Homework Reviews</div>
              <div className="value">{dash ? dash.pendingHomeworkReviews : 1}</div>
            </div>
          </div>

          <div style={{background:'#ffffff',padding:20,borderRadius:14,border:'1px solid var(--border)',marginBottom:24}}>
            <h4 style={{fontSize:16,fontWeight:800,marginBottom:12,color:'#0f172a'}}>📅 Today's Teaching Schedule</h4>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>Period 1 (09:00 - 09:50): Grade 10-A Mathematics · Period 3 (11:00 - 11:50): Grade 10-B Mathematics</p>
          </div>
        </div>
      )}

      {/* 2. ATTENDANCE SUB-VIEW */}
      {(path === '/teacher/attendance' || path === '/teacher') && (
        <div style={{marginTop: path === '/teacher' ? 24 : 0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:12}}>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <label style={{margin:0}}>Class Section:</label>
              <select className="input" style={{width:160}} value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
                <option value="SEC-10A">Grade 10 - Section A</option>
                <option value="SEC-10B">Grade 10 - Section B</option>
              </select>
              <input className="input" type="date" style={{width:160}} value={attDate} onChange={e => setAttDate(e.target.value)} />
            </div>

            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-sm" onClick={submitAttendance} disabled={submitting}>
                {submitting ? 'Submitting...' : '✅ Save & Broadcast Attendance to Parents & Manager'}
              </button>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr><th>Roll No</th><th>Student Full Name</th><th>Admission No</th><th>Attendance Status</th></tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td style={{fontWeight:800}}>{s.rollNumber}</td>
                  <td style={{fontWeight:700,color:'#0f172a'}}>{s.name}</td>
                  <td style={{fontFamily:'JetBrains Mono'}}>{s.admissionNumber}</td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      {['present', 'absent', 'late', 'excused'].map(st => (
                        <button
                          key={st}
                          type="button"
                          className={'btn btn-sm ' + (attendanceSheet[s.id] === st ? (st === 'absent' ? 'btn-danger' : st === 'late' ? 'btn-gold' : '') : 'btn-outline')}
                          style={{padding:'4px 10px',fontSize:11.5,textTransform:'capitalize'}}
                          onClick={() => setAttendanceSheet({...attendanceSheet, [s.id]: st})}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. DAY-BY-DAY TASKS MANAGER SUB-VIEW */}
      {path === '/teacher/daily-work' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h3 className="section-title" style={{margin:0}}>Day-by-Day Syllabus Tasks & Submissions</h3>
            <button className="btn" onClick={() => setShowNewTaskModal(true)}>+ Add New Day Task</button>
          </div>

          <div style={{display:'grid',gap:16}}>
            {(dash && dash.dailyTasks ? dash.dailyTasks : []).map(task => (
              <div key={task.id} style={{background:'#ffffff',border:'1px solid var(--border)',borderRadius:12,padding:20}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div>
                    <span className="badge badge-green">{task.dayTitle}</span>
                    <strong style={{marginLeft:8,fontSize:15,color:'#0f172a'}}>{task.title}</strong>
                  </div>
                  <span style={{fontSize:12,color:'var(--text-muted)'}}>Due: {task.dueDate}</span>
                </div>
                <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:14}}>{task.instructions}</p>

                <div style={{borderTop:'1px solid var(--border)',paddingTop:12}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>Student Submissions ({(task.submissions || []).length}):</div>
                  {(task.submissions || []).map((subm, sIdx) => (
                    <div key={sIdx} style={{background:'#f8fafc',padding:10,borderRadius:8,marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div><strong>{subm.studentName}:</strong> {subm.content || 'Submitted on-time'}</div>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <span className="badge badge-green">Score: {subm.score || 24}/{task.maxScore}</span>
                        <span style={{fontSize:11,color:'var(--text-muted)'}}>{subm.feedback || 'Evaluated'}</span>
                      </div>
                    </div>
                  ))}
                  {(task.submissions || []).length === 0 && (
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>No submissions received yet.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. HOMEWORK SUB-VIEW */}
      {path === '/teacher/homework' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h3 className="section-title" style={{margin:0}}>Homework & Project Assigner</h3>
            <button className="btn" onClick={() => setShowHwModal(true)}>+ Publish Homework</button>
          </div>
          <div style={{background:'#ffffff',padding:20,borderRadius:14,border:'1px solid var(--border)'}}>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>Active assignments published for Grade 10 Mathematics and Physics.</p>
          </div>
        </div>
      )}

      {/* 5. MARKS ENTRY SUB-VIEW */}
      {path === '/teacher/marks' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h3 className="section-title" style={{margin:0}}>Mid-Term Examination Marksheet</h3>
            <button className="btn" onClick={() => setShowMarksModal(true)}>📝 Enter / Update Marks</button>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Roll</th><th>Student Name</th><th>Current Score</th><th>Division Grade</th></tr>
            </thead>
            <tbody>
              {students.slice(0, 10).map(s => (
                <tr key={s.id}>
                  <td>{s.rollNumber}</td>
                  <td style={{fontWeight:700,color:'#0f172a'}}>{s.name}</td>
                  <td style={{fontWeight:800,color:'#059669'}}>88/100</td>
                  <td><span className="badge badge-green">A (First Division)</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. CLASSES SUB-VIEW */}
      {path === '/teacher/classes' && (
        <div>
          <h3 className="section-title">🏫 My Assigned Classrooms & Rosters</h3>
          <div style={{background:'#ffffff',padding:20,borderRadius:14,border:'1px solid var(--border)'}}>
            <p><strong>Grade 10 - Section A:</strong> 20 Students · Room 301</p>
            <p style={{marginTop:8}}><strong>Grade 10 - Section B:</strong> 15 Students · Room 302</p>
          </div>
        </div>
      )}

      {/* New Task Creator Modal */}
      {showNewTaskModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(15, 23, 42, 0.45)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'#ffffff',padding:28,borderRadius:14,width:480,border:'1px solid var(--border)',boxShadow:'var(--shadow-lg)'}}>
            <h3 className="section-title">Add New Day-by-Day Task</h3>
            <form onSubmit={handleCreateDailyTask}>
              <div className="form-group"><label>Task Title *</label><input className="input" required value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="e.g. Day 6: Quadratic Roots Problem Set" /></div>
              <div className="form-group"><label>Subject *</label><input className="input" required value={newTaskSubject} onChange={e => setNewTaskSubject(e.target.value)} /></div>
              <div className="form-group"><label>Due Date</label><input className="input" type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} /></div>
              <div className="form-group"><label>Instructions *</label><textarea className="input" rows={3} required value={newTaskInstructions} onChange={e => setNewTaskInstructions(e.target.value)} placeholder="Enter task instructions..." /></div>
              <div style={{display:'flex',gap:10,marginTop:20}}>
                <button type="submit" className="btn" style={{flex:1}}>Create & Broadcast Task</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowNewTaskModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Homework Modal */}
      {showHwModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(15, 23, 42, 0.45)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'#ffffff',padding:28,borderRadius:14,width:440,border:'1px solid var(--border)',boxShadow:'var(--shadow-lg)'}}>
            <h3 className="section-title">Publish New Class Homework</h3>
            <div className="form-group"><label>Task Title</label><input className="input" required value={hwTitle} onChange={e => setHwTitle(e.target.value)} placeholder="e.g. Factorization Set 3" /></div>
            <div className="form-group"><label>Instructions / Problem Details</label><textarea className="input" rows={3} value={hwDesc} onChange={e => setHwDesc(e.target.value)} /></div>
            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button className="btn" style={{flex:1}} onClick={publishHomework}>Publish Assignment</button>
              <button className="btn btn-outline" onClick={() => setShowHwModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Marks Modal */}
      {showMarksModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(15, 23, 42, 0.45)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'#ffffff',padding:28,borderRadius:14,width:520,maxHeight:'80vh',overflowY:'auto',border:'1px solid var(--border)',boxShadow:'var(--shadow-lg)'}}>
            <h3 className="section-title">Enter Mid-Term Marks (Mathematics — Max 100)</h3>
            <div style={{display:'grid',gap:10,marginBottom:20}}>
              {students.slice(0, 8).map(s => (
                <div key={s.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f8fafc',padding:10,borderRadius:8}}>
                  <span><strong>{s.rollNumber}.</strong> {s.name}</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="100"
                    style={{width:80,textAlign:'center',fontWeight:800,color:'#059669'}}
                    value={marksSheet[s.id] || ''}
                    onChange={e => setMarksSheet({...marksSheet, [s.id]: e.target.value})}
                  />
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn" style={{flex:1}} onClick={submitMarks}>Save & Compute Grades</button>
              <button className="btn btn-outline" onClick={() => setShowMarksModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ----------------------------------------------------
// 5. STUDENT PORTAL (SUB-VIEWS)
// ----------------------------------------------------
function StudentPortal({ navigate, path }) {
  const [data, setData] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskAnswer, setTaskAnswer] = useState('');

  const load = async () => {
    try {
      const d = await api('/student/dashboard');
      setData(d);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const handleStudentCheckin = async () => {
    setCheckingIn(true);
    try {
      const res = await api('/student/checkin', { method: 'POST' });
      alert(res.message);
      load();
    } catch (e) { alert(e.message); }
    finally { setCheckingIn(false); }
  };

  const handleSubmitDailyTask = async () => {
    try {
      const res = await api('/student/daily-work/submit', {
        method: 'POST',
        body: JSON.stringify({ taskId: selectedTask.id, content: taskAnswer })
      });
      alert(res.message);
      setSelectedTask(null);
      setTaskAnswer('');
      load();
    } catch (e) { alert(e.message); }
  };

  if (!data) return <AppShell role="student" title="Student Portal" navigate={navigate} path={path}><div className="loading">Loading student profile...</div></AppShell>;

  const checkinInfo = data.checkinToday;

  return (
    <AppShell role="student" title={`Student Portal — ${data.student.name} (${data.student.classId})`} navigate={navigate} path={path}>
      {/* 1. STUDENT DASHBOARD OVERVIEW */}
      {path === '/student' && (
        <div>
          <div style={{background: checkinInfo ? '#ecfdf5' : '#fffbeb',border:`1px solid ${checkinInfo ? '#a7f3d0' : '#fde68a'}`,borderRadius:14,padding:20,marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:14}}>
            <div>
              <div style={{fontWeight:800,fontSize:16,color: checkinInfo ? '#059669' : '#d97706'}}>
                {checkinInfo ? `✅ Checked In for Today (${checkinInfo.status === 'on_time' ? 'ON-TIME' : 'LATE'})` : '🕒 Daily School Arrival Check-in'}
              </div>
              <div style={{fontSize:13,color:'var(--text-muted)',marginTop:2}}>
                {checkinInfo ? `Recorded at ${checkinInfo.checkinTime} via ${checkinInfo.gateLocation}. Parent & Manager notified.` : 'Tap the check-in button upon arriving at the school campus kiosk.'}
              </div>
            </div>

            {!checkinInfo && (
              <button className="btn" onClick={handleStudentCheckin} disabled={checkingIn}>
                {checkingIn ? 'Recording...' : '🎯 Tap Here to Check-In Now'}
              </button>
            )}
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Overall Attendance</div>
              <div className="value">{data.attendance.percentage}%</div>
            </div>
            <div className="stat-card">
              <div className="label">Academic Average</div>
              <div className="value" style={{color:'#059669'}}>{data.academicAverage}%</div>
            </div>
            <div className="stat-card">
              <div className="label">Current Division</div>
              <div className="value" style={{color:'#d97706'}}>First Division (A)</div>
            </div>
            <div className="stat-card">
              <div className="label">Day-by-Day Tasks Active</div>
              <div className="value">{data.dailyWorkTasks ? data.dailyWorkTasks.length : 5}</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DAY-BY-DAY WORK SUB-VIEW */}
      {(path === '/student/daily-work' || path === '/student') && (
        <div style={{background:'#ffffff',padding:24,borderRadius:14,border:'1px solid var(--border)',marginBottom:28,marginTop: path === '/student' ? 24 : 0}}>
          <h3 className="section-title">📚 Day-by-Day Academic Work Schedule & Submissions</h3>
          <div style={{display:'grid',gap:14}}>
            {(data.dailyWorkTasks || []).map(task => {
              const mySubm = (task.submissions || []).find(s => s.studentId === data.student.id);
              return (
                <div key={task.id} style={{background:'#f8fafc',padding:16,borderRadius:10,border:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4}}>
                      <span className="badge badge-green">{task.dayTitle.split('—')[0]}</span>
                      <span style={{fontSize:12,color:'var(--text-muted)'}}>{task.subjectName} · Due: {task.dueDate}</span>
                    </div>
                    <div style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{task.title}</div>
                    <div style={{fontSize:12.5,color:'var(--text-muted)',marginTop:2}}>{task.instructions}</div>
                  </div>

                  <div>
                    {mySubm ? (
                      <div style={{textAlign:'right'}}>
                        <span className="badge badge-green">✓ Submitted ({mySubm.score}/{task.maxScore})</span>
                        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>{mySubm.feedback}</div>
                      </div>
                    ) : (
                      <button className="btn btn-sm" onClick={() => setSelectedTask(task)}>
                        Submit Day Task →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. HOMEWORK SUB-VIEW */}
      {path === '/student/homework' && (
        <div style={{background:'#ffffff',padding:24,borderRadius:14,border:'1px solid var(--border)'}}>
          <h3 className="section-title">📝 Assigned Homework & Projects</h3>
          {data.homework.map(h => (
            <div key={h.id} style={{background:'#f8fafc',padding:14,borderRadius:8,marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700,color:'#0f172a'}}>{h.title}</div>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>{h.subjectName} · Due: {h.deadline.split('T')[0]}</div>
              </div>
              <span className="badge badge-green">Submitted</span>
            </div>
          ))}
        </div>
      )}

      {/* 4. MARKS SUB-VIEW */}
      {path === '/student/marks' && (
        <div style={{background:'#ffffff',padding:24,borderRadius:14,border:'1px solid var(--border)'}}>
          <h3 className="section-title">📊 Official Examination Report Card</h3>
          <table className="data-table">
            <thead>
              <tr><th>Subject</th><th>Score</th><th>Grade</th><th>Division Status</th></tr>
            </thead>
            <tbody>
              {data.recentMarks.map(m => (
                <tr key={m.id}>
                  <td style={{fontWeight:600}}>{m.subjectName}</td>
                  <td style={{fontWeight:800,color:'#059669'}}>{m.obtainedScore}/100</td>
                  <td><span className="badge badge-green">{m.grade}</span></td>
                  <td style={{fontSize:12,color:'var(--text-muted)'}}>{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. ATTENDANCE SUB-VIEW */}
      {path === '/student/attendance' && (
        <div style={{background:'#ffffff',padding:24,borderRadius:14,border:'1px solid var(--border)'}}>
          <h3 className="section-title">📅 My Attendance Record & Calendar</h3>
          <p style={{fontSize:14,marginBottom:16}}>Overall Rate: <strong style={{color:'#059669'}}>{data.attendance.percentage}%</strong> ({data.attendance.present} / {data.attendance.total} Sessions)</p>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Student ID</th><th>Status</th><th>Remarks</th></tr>
            </thead>
            <tbody>
              {data.attendance.records.map((r, i) => (
                <tr key={i}>
                  <td>{r.date}</td>
                  <td>{r.studentId}</td>
                  <td><span className="badge badge-green">{r.status}</span></td>
                  <td>{r.remarks || 'On-time'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Submission Modal */}
      {selectedTask && (
        <div style={{position:'fixed',inset:0,background:'rgba(15, 23, 42, 0.45)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'#ffffff',padding:28,borderRadius:14,width:480,border:'1px solid var(--border)',boxShadow:'var(--shadow-lg)'}}>
            <h3 className="section-title">Submit {selectedTask.dayTitle}</h3>
            <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:14}}>{selectedTask.title}</p>
            <div className="form-group">
              <label>Work Solution & Derivations</label>
              <textarea className="input" rows={4} value={taskAnswer} onChange={e => setTaskAnswer(e.target.value)} placeholder="Type solution derivations or paste link to document..." />
            </div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button className="btn" style={{flex:1}} onClick={handleSubmitDailyTask}>Confirm & Send to Teacher</button>
              <button className="btn btn-outline" onClick={() => setSelectedTask(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ----------------------------------------------------
// 6. PARENT PORTAL (SUB-VIEWS)
// ----------------------------------------------------
function ParentPortal({ navigate, path }) {
  const [data, setData] = useState(null);
  const [paying, setPaying] = useState(false);

  const load = async () => {
    try {
      const d = await api('/parent/dashboard');
      setData(d);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const handlePayFee = async () => {
    setPaying(true);
    try {
      await api('/parent/fees/pay', {
        method: 'POST',
        body: JSON.stringify({ amount: data.fees.pendingAmount })
      });
      alert('Simulated Tuition Fee Payment Succeeded! Receipt generated.');
      load();
    } catch (e) { alert(e.message); }
    finally { setPaying(false); }
  };

  if (!data) return <AppShell role="parent" title="Parent Dashboard" navigate={navigate} path={path}><div className="loading">Loading parent portal...</div></AppShell>;

  const checkin = data.childCheckin;

  return (
    <AppShell role="parent" title={`Parent Portal — Ward: ${data.activeChild.name}`} navigate={navigate} path={path}>
      {/* 1. PARENT DASHBOARD OVERVIEW */}
      {path === '/parent' && (
        <div>
          <div style={{background:'#ecfdf5',border:'1px solid #a7f3d0',borderRadius:14,padding:18,marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:800,fontSize:15,color:'#059669'}}>
                🔔 Real-Time Arrival Notification: {data.activeChild.name}
              </div>
              <div style={{fontSize:13,color:'#334155',marginTop:2}}>
                Checked in <strong>{checkin ? checkin.status.toUpperCase().replace('_', '-') : 'ON-TIME'}</strong> at {checkin ? checkin.checkinTime : '08:42 AM'} (Gate Kiosk 1).
              </div>
            </div>
            <span className="badge badge-green">Verified In-School</span>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Ward Full Name</div>
              <div className="value" style={{fontSize:22}}>{data.activeChild.name}</div>
            </div>
            <div className="stat-card">
              <div className="label">Cumulative Attendance</div>
              <div className="value">{data.attendancePercentage}%</div>
            </div>
            <div className="stat-card">
              <div className="label">Pending Fee Balance</div>
              <div className="value" style={{color: data.fees.pendingAmount > 0 ? '#dc2626' : '#059669'}}>
                ₹{data.fees.pendingAmount.toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="label">Unread School Alerts</div>
              <div className="value" style={{color:'#d97706'}}>{data.notifications.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DAY-BY-DAY WORK SUB-VIEW */}
      {(path === '/parent/daily-work' || path === '/parent') && (
        <div style={{background:'#ffffff',padding:24,borderRadius:14,border:'1px solid var(--border)',marginBottom:24,marginTop: path === '/parent' ? 24 : 0}}>
          <h3 className="section-title">📚 Ward's Day-by-Day Work & Submission Reports</h3>
          <div style={{display:'grid',gap:12}}>
            {(data.dailyWorkTasks || []).map(task => {
              const subm = (task.submissions || []).find(s => s.studentId === data.activeChild.id);
              return (
                <div key={task.id} style={{background:'#f8fafc',padding:14,borderRadius:8,border:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13.5,color:'#0f172a'}}>{task.dayTitle} — {task.title}</div>
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>{task.subjectName} · Due Date: {task.dueDate}</div>
                  </div>
                  <div>
                    {subm ? (
                      <span className="badge badge-green">✓ Submitted On-Time ({subm.score}/{task.maxScore})</span>
                    ) : (
                      <span className="badge badge-orange">⏳ In Progress / Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ATTENDANCE SUB-VIEW */}
      {path === '/parent/attendance' && (
        <div style={{background:'#ffffff',padding:24,borderRadius:14,border:'1px solid var(--border)'}}>
          <h3 className="section-title">📅 Ward's Attendance & Daily Arrival History</h3>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Period / Gate</th><th>Status</th><th>Remarks</th></tr>
            </thead>
            <tbody>
              {data.attendanceRecords.map((r, i) => (
                <tr key={i}>
                  <td>{r.date}</td>
                  <td>Period 1 (09:00 - 09:50)</td>
                  <td><span className="badge badge-green">{r.status}</span></td>
                  <td>{r.remarks || 'On-time'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. RESULTS SUB-VIEW */}
      {path === '/parent/results' && (
        <div style={{background:'#ffffff',padding:24,borderRadius:14,border:'1px solid var(--border)'}}>
          <h3 className="section-title">📊 Ward's Academic Performance & Report Card</h3>
          <table className="data-table">
            <thead>
              <tr><th>Subject</th><th>Marks</th><th>Grade</th></tr>
            </thead>
            <tbody>
              {data.recentMarks.map(m => (
                <tr key={m.id}>
                  <td style={{fontWeight:600}}>{m.subjectName}</td>
                  <td style={{fontWeight:800,color:'#059669'}}>{m.obtainedScore}/100</td>
                  <td><span className="badge badge-green">{m.grade}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. FEES SUB-VIEW */}
      {(path === '/parent/fees' || path === '/parent') && (
        <div style={{background:'#ffffff',padding:24,borderRadius:14,border:'1px solid var(--border)',marginTop: path === '/parent' ? 24 : 0}}>
          <h3 className="section-title">💳 Tuition Fee Clearance & Receipts</h3>
          <div style={{background:'#f8fafc',padding:16,borderRadius:8,marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span>Total Academic Annual Fee:</span>
              <strong>₹{data.fees.totalAmount.toLocaleString()}</strong>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,color:'#059669'}}>
              <span>Paid to Date:</span>
              <strong>₹{data.fees.paidAmount.toLocaleString()}</strong>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--border)',paddingTop:8,fontWeight:800,fontSize:16,color: data.fees.pendingAmount > 0 ? '#dc2626' : '#059669'}}>
              <span>Outstanding Balance:</span>
              <span>₹{data.fees.pendingAmount.toLocaleString()}</span>
            </div>
          </div>

          {data.fees.pendingAmount > 0 ? (
            <button className="btn" style={{width:'100%',padding:12}} onClick={handlePayFee} disabled={paying}>
              {paying ? 'Processing Gateway...' : `💳 Pay Balance of ₹${data.fees.pendingAmount.toLocaleString()} (Instant UPI)`}
            </button>
          ) : (
            <div style={{textAlign:'center',padding:10,background:'#ecfdf5',color:'#059669',borderRadius:8,fontWeight:700}}>
              ✓ All Institutional Fees Fully Paid for 2025-2026
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

// ----------------------------------------------------
// 7. SUPER ADMIN PORTAL (SUB-VIEWS)
// ----------------------------------------------------
function SuperAdminPortal({ navigate, path }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/super-admin/dashboard').then(setData).catch(console.error);
  }, []);

  if (!data) return <AppShell role="super_admin" title="Super Admin Portal" navigate={navigate} path={path}><div className="loading">Loading Platform Diagnostics...</div></AppShell>;

  return (
    <AppShell role="super_admin" title="Global Platform Architecture & Multi-Institution Governance" navigate={navigate} path={path}>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Registered Institutions</div>
          <div className="value">{data.totalInstitutions}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Managed Students</div>
          <div className="value">{data.totalStudents}</div>
        </div>
        <div className="stat-card">
          <div className="label">Active Faculty Members</div>
          <div className="value">{data.totalTeachers}</div>
        </div>
        <div className="stat-card">
          <div className="label">System Telemetry</div>
          <div className="value" style={{color:'#059669',fontSize:18}}>Healthy (100%)</div>
        </div>
      </div>

      <div style={{background:'#ffffff',padding:24,borderRadius:14,border:'1px solid var(--border)',marginBottom:24}}>
        <h3 className="section-title">Active Educational Institutions</h3>
        <div style={{background:'#f8fafc',padding:16,borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:800,fontSize:16,color:'#0f172a'}}>{data.institution.name} ({data.institution.code})</div>
            <div style={{fontSize:12,color:'var(--text-muted)'}}>{data.institution.affiliation} · {data.institution.address}</div>
          </div>
          <span className="badge badge-green">Enterprise Active</span>
        </div>
      </div>

      <h3 className="section-title">Real-Time Security & Action Audit Stream</h3>
      <table className="data-table">
        <thead>
          <tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Module</th><th>Details</th></tr>
        </thead>
        <tbody>
          {data.recentAuditLogs.map(l => (
            <tr key={l.id}>
              <td style={{fontFamily:'JetBrains Mono',fontSize:12}}>{l.timestamp.split('T')[0]}</td>
              <td style={{fontWeight:700}}>{l.user}</td>
              <td><span className="badge badge-orange">{l.action}</span></td>
              <td>{l.module}</td>
              <td style={{fontSize:13,color:'var(--text-muted)'}}>{l.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppShell>
  );
}

// ----------------------------------------------------
// MAIN ROUTER ROOT
// ----------------------------------------------------
function App() {
  const [path, setPath] = useState(window.location.pathname || '/');

  const navigate = (to) => {
    window.history.pushState({}, '', to);
    setPath(to);
  };

  useEffect(() => {
    const handlePop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  if (path === '/login') return <LoginPage navigate={navigate} />;
  if (path.startsWith('/super-admin')) return <SuperAdminPortal navigate={navigate} path={path} />;
  if (path.startsWith('/admin')) return <AdminPortal navigate={navigate} path={path} />;
  if (path.startsWith('/teacher')) return <TeacherPortal navigate={navigate} path={path} />;
  if (path.startsWith('/student')) return <StudentPortal navigate={navigate} path={path} />;
  if (path.startsWith('/parent')) return <ParentPortal navigate={navigate} path={path} />;

  return <LandingPage navigate={navigate} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
