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
      ['/super-admin', '📈 Platform Overview'],
      ['/super-admin/institutions', '🏫 Institutions Master'],
      ['/super-admin/users', '👥 Platform Users'],
      ['/super-admin/audit', '🛡️ Audit Trail']
    ],
    admin: [
      ['/admin', '📊 Operations Dashboard'],
      ['/admin/students', '🎓 Students & Admissions'],
      ['/admin/teachers', '👨‍🏫 Teachers & Faculty'],
      ['/admin/classes', '🏫 Classes & Sections'],
      ['/admin/attendance', '📅 Attendance Center'],
      ['/admin/exams', '📝 Exams & Marks'],
      ['/admin/fees', '💳 Fees & Accounting'],
      ['/admin/reports', '📑 Reports & Analytics']
    ],
    teacher: [
      ['/teacher', '📋 Teacher Dashboard'],
      ['/teacher/attendance', '✅ Mark Attendance'],
      ['/teacher/homework', '📚 Homework & Tasks'],
      ['/teacher/marks', '🎯 Exam Marks Entry'],
      ['/teacher/classes', '🏫 My Classrooms']
    ],
    student: [
      ['/student', '🎓 Student Portal'],
      ['/student/homework', '📚 My Homework'],
      ['/student/marks', '📊 Exam Results'],
      ['/student/attendance', '📅 My Attendance']
    ],
    parent: [
      ['/parent', '👨‍👩‍👧 Child Overview'],
      ['/parent/attendance', '📅 Attendance Tracker'],
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
          <div style={{fontSize:11,color:'#34d399',marginTop:4,fontWeight:700,letterSpacing:0.5}}>
            {role.toUpperCase().replace('_', ' ')} WORKSPACE
          </div>
        </div>
        <nav style={{display:'flex',flexDirection:'column',gap:4}}>
          {currentNav.map(([to, label]) => (
            <a
              key={to}
              href={to}
              className={path === to || (to !== '/admin' && to !== '/super-admin' && to !== '/teacher' && to !== '/student' && to !== '/parent' && path.startsWith(to)) ? 'active' : ''}
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
            ← Public Landing
          </a>
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div style={{display:'flex',alignItems:'center',gap:16,flex:1}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'#fff'}}>{title}</h2>
            <div style={{position:'relative',maxWidth:340,width:'100%'}}>
              <input
                className="input"
                style={{padding:'6px 14px',fontSize:13,background:'rgba(255,255,255,0.05)'}}
                placeholder="🔍 Global academic search..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => setShowSearch(true)}
              />
              {showSearch && searchResults.length > 0 && (
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#111827',border:'1px solid var(--border)',borderRadius:8,marginTop:4,zIndex:50,boxShadow:'var(--shadow)',padding:8}}>
                  {searchResults.map((r, i) => (
                    <div key={i} style={{padding:8,borderBottom:'1px solid rgba(255,255,255,0.05)',cursor:'pointer'}} onClick={() => setShowSearch(false)}>
                      <div style={{fontWeight:700,fontSize:13,color:'#34d399'}}>[{r.type}] {r.title}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.subtitle}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:700,fontSize:13,color:'#fff'}}>{user ? user.name : 'Demo User'}</div>
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
// 1. PUBLIC LANDING PAGE (WITH FLOATING ACTION)
// ----------------------------------------------------
function LandingPage({ navigate }) {
  return (
    <div style={{minHeight:'100vh',position:'relative',zIndex:1}}>
      <header className="header">
        <div className="container header-inner">
          <div className="logo"><span>🎓</span> EduSphere</div>
          <nav className="nav">
            <a href="#features">Platform Features</a>
            <a href="#lifecycle">Student Lifecycle</a>
            <a href="#roles">Enterprise Roles</a>
          </nav>
          <div style={{display:'flex',gap:12}}>
            <button className="btn" onClick={() => navigate('/login')}>
              🔐 Access Portal / Sign In
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{padding:'80px 28px 100px',textAlign:'center'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 16px',borderRadius:999,background:'rgba(16, 185, 129, 0.15)',border:'1px solid rgba(16, 185, 129, 0.35)',color:'#34d399',fontSize:13,fontWeight:700,marginBottom:24}}>
          ✨ Production-Grade Education CRM & Academic Management Platform
        </div>
        
        <h1 style={{fontSize:48,fontWeight:800,letterSpacing:'-1px',marginBottom:20,maxWidth:900,margin:'0 auto 20px',lineHeight:1.2,background:'linear-gradient(135deg, #ffffff 40%, #6ee7b7 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          Manage the Complete Student & Institutional Lifecycle from Admission to Graduation
        </h1>

        <p style={{fontSize:17,color:'var(--text-muted)',maxWidth:750,margin:'0 auto 36px',lineHeight:1.6}}>
          A unified, interconnected academic platform supporting multi-institution administration, real-time attendance tracking, exam marksheets, fee reconciliation, and transparent parent-teacher communications.
        </p>

        <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap',marginBottom:64}}>
          <button className="btn" style={{padding:'14px 28px',fontSize:16}} onClick={() => navigate('/login')}>
            🚀 Launch EduSphere Demo (All 5 Roles)
          </button>
          <button className="btn btn-outline" style={{padding:'14px 28px',fontSize:16}} onClick={() => navigate('/admin')}>
            📊 View Institution Operations
          </button>
        </div>

        {/* 5 Pillars Grid */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:20,textAlign:'left'}}>
          <div className="stat-card">
            <div style={{fontSize:24,marginBottom:8}}>🎓</div>
            <div style={{fontWeight:800,fontSize:16,marginBottom:6,color:'#fff'}}>Student Lifecycle</div>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>Multi-step admissions, roll numbers, department assignments, and document compliance.</p>
          </div>
          <div className="stat-card">
            <div style={{fontSize:24,marginBottom:8}}>📅</div>
            <div style={{fontWeight:800,fontSize:16,marginBottom:6,color:'#fff'}}>Real-Time Attendance</div>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>1-click period attendance marking with instant parent SMS/app notification broadcast.</p>
          </div>
          <div className="stat-card">
            <div style={{fontSize:24,marginBottom:8}}>📝</div>
            <div style={{fontWeight:800,fontSize:16,marginBottom:6,color:'#fff'}}>Exams & Grading</div>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>0-100 mark validation, automatic GPA/grade computation, and printable report cards.</p>
          </div>
          <div className="stat-card">
            <div style={{fontSize:24,marginBottom:8}}>💳</div>
            <div style={{fontWeight:800,fontSize:16,marginBottom:6,color:'#fff'}}>Fee Accounting</div>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>Tuition breakdown structures, online payment simulation, and receipt generation.</p>
          </div>
          <div className="stat-card">
            <div style={{fontSize:24,marginBottom:8}}>👨‍👩‍👧</div>
            <div style={{fontWeight:800,fontSize:16,marginBottom:6,color:'#fff'}}>Parent Portal</div>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>Multi-child switching, daily attendance status, homework tracker, and performance radar.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 2. LOGIN PAGE (1-CLICK FAST SIGN-IN FOR 5 ROLES)
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
      <div style={{maxWidth:520,width:'100%',background:'var(--bg-card)',padding:36,borderRadius:16,border:'1px solid var(--border)',boxShadow:'var(--shadow)',backdropFilter:'blur(16px)'}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div className="logo" style={{justifyContent:'center',fontSize:26,marginBottom:6}}><span>🎓</span> EduSphere</div>
          <h2 style={{fontSize:20,fontWeight:800,color:'#fff'}}>Academic Single Sign-On Portal</h2>
          <p style={{fontSize:13,color:'var(--text-muted)'}}>Select your role for 1-click instant login or enter credentials</p>
        </div>

        {/* 1-CLICK INSTANT DEMO ROLES */}
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:800,color:'#34d399',textTransform:'uppercase',letterSpacing:0.5,marginBottom:12,textAlign:'center'}}>
            ⚡ 1-Click Fast Role Demonstrations
          </div>
          <div style={{display:'grid',gap:8}}>
            <button
              type="button"
              className="btn btn-sm"
              style={{background:'linear-gradient(135deg, #10b981 0%, #059669 100%)',justifyContent:'space-between',padding:'10px 14px'}}
              onClick={() => handleFastLogin('admin@edusphere.local', 'DemoOnly-Admin-2026!')}
            >
              <span>🏫 <strong>Institution Admin / Manager</strong> (Full Operations)</span>
              <span style={{fontSize:11,opacity:0.8}}>admin@edusphere.local →</span>
            </button>

            <button
              type="button"
              className="btn btn-sm"
              style={{background:'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',justifyContent:'space-between',padding:'10px 14px'}}
              onClick={() => handleFastLogin('teacher@edusphere.local', 'DemoOnly-Teacher-2026!')}
            >
              <span>👨‍🏫 <strong>Teacher / Faculty</strong> (Attendance & Marks)</span>
              <span style={{fontSize:11,opacity:0.8}}>teacher@edusphere.local →</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{justifyContent:'space-between',padding:'10px 14px',borderColor:'rgba(52, 211, 153, 0.4)',color:'#34d399'}}
              onClick={() => handleFastLogin('student@edusphere.local', 'DemoOnly-Student-2026!')}
            >
              <span>🎓 <strong>Student (Rahul Sharma)</strong> (Homework & GPA)</span>
              <span style={{fontSize:11,opacity:0.8}}>student@edusphere.local →</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{justifyContent:'space-between',padding:'10px 14px',borderColor:'rgba(245, 158, 11, 0.4)',color:'#fbbf24'}}
              onClick={() => handleFastLogin('parent@edusphere.local', 'DemoOnly-Parent-2026!')}
            >
              <span>👨‍👩‍👧 <strong>Parent (Ravi Sharma)</strong> (Child Tracking & Fees)</span>
              <span style={{fontSize:11,opacity:0.8}}>parent@edusphere.local →</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{justifyContent:'space-between',padding:'10px 14px'}}
              onClick={() => handleFastLogin('superadmin@edusphere.local', 'DemoOnly-SuperAdmin-2026!')}
            >
              <span>🌐 <strong>Super Admin</strong> (Platform Governance)</span>
              <span style={{fontSize:11,opacity:0.8}}>superadmin@edusphere.local →</span>
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
// 3. INSTITUTION ADMIN / MANAGER PORTAL
// ----------------------------------------------------
function AdminPortal({ navigate, path }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classesData, setClassesData] = useState({ classes: [], sections: [], subjects: [] });
  const [feeData, setFeeData] = useState({ studentFees: [], payments: [] });
  const [loading, setLoading] = useState(true);

  // Student Admission Wizard State
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
      const [dDash, dStud, dTch, dCls, dFee] = await Promise.all([
        api('/admin/dashboard'),
        api('/admin/students'),
        api('/admin/teachers'),
        api('/admin/classes'),
        api('/admin/fees')
      ]);
      setDashboardData(dDash);
      setStudents(dStud.students || []);
      setTeachers(dTch.teachers || []);
      setClassesData(dCls);
      setFeeData(dFee);
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

  return (
    <AppShell role="admin" title="Operations & Administration Center" navigate={navigate} path={path}>
      {/* Overview KPIs */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Total Enrolled Students</div>
          <div className="value">{dashboardData ? dashboardData.totalStudents : 52}</div>
        </div>
        <div className="stat-card">
          <div className="label">Faculty & Teachers</div>
          <div className="value" style={{color:'#fbbf24'}}>{dashboardData ? dashboardData.totalTeachers : 12}</div>
        </div>
        <div className="stat-card">
          <div className="label">Today's Attendance Rate</div>
          <div className="value">{dashboardData ? dashboardData.todayAttendance.ratePercent : 94.5}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Fee Collections (YTD)</div>
          <div className="value" style={{color:'#34d399'}}>₹{(dashboardData ? dashboardData.feeSummary.collected : 2850000).toLocaleString()}</div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h3 className="section-title" style={{margin:0}}>Active Student Admissions & Master Directory</h3>
        <button className="btn" onClick={() => setShowAddStudent(!showAddStudent)}>
          {showAddStudent ? '✕ Close Admission Wizard' : '+ Register New Student Admission'}
        </button>
      </div>

      {/* 5-STEP STUDENT ADMISSION WIZARD */}
      {showAddStudent && (
        <div style={{background:'var(--bg-card)',padding:28,borderRadius:14,border:'1px solid var(--border)',marginBottom:24,boxShadow:'var(--shadow)'}}>
          <div style={{display:'flex',gap:8,marginBottom:20,borderBottom:'1px solid var(--border)',paddingBottom:14}}>
            {['1. Personal Data', '2. Academic Info', '3. Parent & Guardian', '4. Review & Confirm'].map((stTitle, sIdx) => (
              <button
                key={sIdx}
                type="button"
                className={'btn btn-sm ' + (admStep === sIdx + 1 ? '' : 'btn-outline')}
                onClick={() => setAdmStep(sIdx + 1)}
              >
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
                <div style={{gridColumn:'span 2',textAlign:'right'}}>
                  <button type="button" className="btn" onClick={() => setAdmStep(2)}>Next: Academic Info →</button>
                </div>
              </div>
            )}

            {admStep === 2 && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div className="form-group"><label>Class Level *</label><select className="input" value={newStudent.classId} onChange={e => setNewStudent({...newStudent, classId: e.target.value})}><option value="CLS-10">Grade 10</option><option value="CLS-09">Grade 9</option><option value="CLS-08">Grade 8</option></select></div>
                <div className="form-group"><label>Assigned Section *</label><select className="input" value={newStudent.sectionId} onChange={e => setNewStudent({...newStudent, sectionId: e.target.value})}><option value="SEC-10A">Section A</option><option value="SEC-10B">Section B</option><option value="SEC-09A">Section A (Grade 9)</option></select></div>
                <div className="form-group"><label>Admission Number</label><input className="input" value={newStudent.admissionNumber} onChange={e => setNewStudent({...newStudent, admissionNumber: e.target.value})} placeholder="Auto-generated if empty" /></div>
                <div className="form-group"><label>Roll Number</label><input className="input" value={newStudent.rollNumber} onChange={e => setNewStudent({...newStudent, rollNumber: e.target.value})} placeholder="Auto-assigned" /></div>
                <div style={{gridColumn:'span 2',display:'flex',justifyContent:'space-between'}}>
                  <button type="button" className="btn btn-outline" onClick={() => setAdmStep(1)}>← Back</button>
                  <button type="button" className="btn" onClick={() => setAdmStep(3)}>Next: Parent Details →</button>
                </div>
              </div>
            )}

            {admStep === 3 && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div className="form-group"><label>Parent / Guardian Name *</label><input className="input" required value={newStudent.parentName} onChange={e => setNewStudent({...newStudent, parentName: e.target.value})} /></div>
                <div className="form-group"><label>Relationship</label><select className="input" value={newStudent.parentRelationship} onChange={e => setNewStudent({...newStudent, parentRelationship: e.target.value})}><option>Father</option><option>Mother</option><option>Guardian</option></select></div>
                <div className="form-group"><label>Parent Contact Phone</label><input className="input" value={newStudent.parentPhone} onChange={e => setNewStudent({...newStudent, parentPhone: e.target.value})} /></div>
                <div className="form-group"><label>Parent Occupation</label><input className="input" value={newStudent.parentOccupation} onChange={e => setNewStudent({...newStudent, parentOccupation: e.target.value})} /></div>
                <div style={{gridColumn:'span 2',display:'flex',justifyContent:'space-between'}}>
                  <button type="button" className="btn btn-outline" onClick={() => setAdmStep(2)}>← Back</button>
                  <button type="button" className="btn" onClick={() => setAdmStep(4)}>Next: Review & Confirm →</button>
                </div>
              </div>
            )}

            {admStep === 4 && (
              <div>
                <div style={{background:'rgba(255,255,255,0.03)',padding:16,borderRadius:8,marginBottom:20}}>
                  <p><strong>Candidate:</strong> {newStudent.firstName} {newStudent.lastName} ({newStudent.gender})</p>
                  <p><strong>Class & Section:</strong> {newStudent.classId} — {newStudent.sectionId}</p>
                  <p><strong>Parent:</strong> {newStudent.parentName} ({newStudent.parentRelationship}) — {newStudent.parentPhone}</p>
                  <p><strong>Fee Plan:</strong> Standard Grade 10 Annual Tuition (₹65,000)</p>
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

      {/* Student Directory Table */}
      <table className="data-table">
        <thead>
          <tr>
            <th>Admission No</th>
            <th>Student Name</th>
            <th>Roll No</th>
            <th>Class / Section</th>
            <th>Contact Phone</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.slice(0, 15).map(s => (
            <tr key={s.id}>
              <td style={{fontFamily:'JetBrains Mono',fontSize:13}}>{s.admissionNumber}</td>
              <td style={{fontWeight:700,color:'#fff'}}>{s.name}</td>
              <td>{s.rollNumber}</td>
              <td>{s.classId} — {s.sectionId}</td>
              <td>{s.phone}</td>
              <td><span className="badge badge-green">Active</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppShell>
  );
}

// ----------------------------------------------------
// 4. TEACHER PORTAL (ATTENDANCE, HOMEWORK, MARKS)
// ----------------------------------------------------
function TeacherPortal({ navigate, path }) {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedSection, setSelectedSection] = useState('SEC-10A');
  const [attDate, setAttDate] = useState('2026-09-03');
  const [attendanceSheet, setAttendanceSheet] = useState({});
  const [submitting, setSubmitting] = useState(false);

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

      alert(`Attendance recorded successfully for ${students.length} students. Parent alerts dispatched!`);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
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
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Assigned Sections</div>
          <div className="value">Grade 10-A, 10-B</div>
        </div>
        <div className="stat-card">
          <div className="label">Primary Subject</div>
          <div className="value" style={{color:'#34d399'}}>Mathematics</div>
        </div>
        <div className="stat-card">
          <div className="label">Pending Assignment Reviews</div>
          <div className="value" style={{color:'#fbbf24'}}>{dash ? dash.pendingHomeworkReviews : 1}</div>
        </div>
        <div className="stat-card">
          <div className="label">Next Examination</div>
          <div className="value" style={{fontSize:20}}>Mid-Term 2026</div>
        </div>
      </div>

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
          <button className="btn btn-sm btn-gold" onClick={() => setShowHwModal(true)}>+ Publish Homework</button>
          <button className="btn btn-sm btn-outline" onClick={() => setShowMarksModal(true)}>📝 Enter Exam Marks</button>
          <button className="btn btn-sm" onClick={submitAttendance} disabled={submitting}>
            {submitting ? 'Submitting...' : '✅ Save & Broadcast Attendance'}
          </button>
        </div>
      </div>

      {/* Interactive Roll Attendance Table */}
      <table className="data-table">
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Student Full Name</th>
            <th>Admission No</th>
            <th>Attendance Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr key={s.id}>
              <td style={{fontWeight:800}}>{s.rollNumber}</td>
              <td style={{fontWeight:700,color:'#fff'}}>{s.name}</td>
              <td style={{fontFamily:'JetBrains Mono'}}>{s.admissionNumber}</td>
              <td>
                <div style={{display:'flex',gap:6}}>
                  {['present', 'absent', 'late', 'excused'].map(st => (
                    <button
                      key={st}
                      type="button"
                      className={'btn btn-sm ' + (attendanceSheet[s.id] === st ? (st === 'absent' ? 'btn-danger' : st === 'late' ? 'btn-gold' : '') : 'btn-outline')}
                      style={{padding:'4px 10px',fontSize:11,textTransform:'capitalize'}}
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

      {/* Homework Publish Modal */}
      {showHwModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'var(--bg-card)',padding:28,borderRadius:14,width:440,border:'1px solid var(--border)'}}>
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

      {/* Marks Entry Modal */}
      {showMarksModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'var(--bg-card)',padding:28,borderRadius:14,width:520,maxHeight:'80vh',overflowY:'auto',border:'1px solid var(--border)'}}>
            <h3 className="section-title">Enter Mid-Term Marks (Mathematics — Max 100)</h3>
            <div style={{display:'grid',gap:10,marginBottom:20}}>
              {students.slice(0, 8).map(s => (
                <div key={s.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(255,255,255,0.03)',padding:8,borderRadius:6}}>
                  <span>{s.rollNumber}. {s.name}</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="100"
                    style={{width:80,textAlign:'center',fontWeight:700,color:'#34d399'}}
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
// 5. STUDENT PORTAL (RAHUL SHARMA)
// ----------------------------------------------------
function StudentPortal({ navigate, path }) {
  const [data, setData] = useState(null);
  const [submittingHw, setSubmittingHw] = useState(null);
  const [hwContent, setHwContent] = useState('');

  const load = async () => {
    try {
      const d = await api('/student/dashboard');
      setData(d);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmitHw = async () => {
    try {
      await api('/student/homework/submit', {
        method: 'POST',
        body: JSON.stringify({ assignmentId: submittingHw.id, content: hwContent })
      });
      alert('Homework submitted successfully to instructor.');
      setSubmittingHw(null);
      setHwContent('');
      load();
    } catch (e) { alert(e.message); }
  };

  if (!data) return <AppShell role="student" title="Student Academic Portal" navigate={navigate} path={path}><div className="loading">Loading student academic profile...</div></AppShell>;

  return (
    <AppShell role="student" title={`Student Portal — ${data.student.name} (${data.student.classId})`} navigate={navigate} path={path}>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Overall Attendance</div>
          <div className="value">{data.attendance.percentage}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Academic Average</div>
          <div className="value" style={{color:'#34d399'}}>{data.academicAverage}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Current Term Division</div>
          <div className="value" style={{color:'#fbbf24'}}>First Division (A)</div>
        </div>
        <div className="stat-card">
          <div className="label">Pending Tasks</div>
          <div className="value">{data.homework.filter(h => !h.isSubmitted).length}</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:28}}>
        {/* Homework Tasks */}
        <div style={{background:'var(--bg-card)',padding:24,borderRadius:14,border:'1px solid var(--border)'}}>
          <h3 className="section-title">Assigned Homework & Projects</h3>
          {data.homework.map(h => (
            <div key={h.id} style={{background:'rgba(255,255,255,0.03)',padding:14,borderRadius:8,marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700,color:'#fff'}}>{h.title}</div>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>{h.subjectName} · Due: {h.deadline.split('T')[0]}</div>
              </div>
              {h.isSubmitted ? (
                <span className="badge badge-green">Submitted</span>
              ) : (
                <button className="btn btn-sm" onClick={() => setSubmittingHw(h)}>Submit Task</button>
              )}
            </div>
          ))}
        </div>

        {/* Examination Scores */}
        <div style={{background:'var(--bg-card)',padding:24,borderRadius:14,border:'1px solid var(--border)'}}>
          <h3 className="section-title">Latest Examination Marks & Grades</h3>
          <table className="data-table">
            <thead>
              <tr><th>Subject</th><th>Score</th><th>Grade</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.recentMarks.map(m => (
                <tr key={m.id}>
                  <td style={{fontWeight:600}}>{m.subjectName}</td>
                  <td style={{fontWeight:700,color:'#34d399'}}>{m.obtainedScore}/100</td>
                  <td><span className="badge badge-green">{m.grade}</span></td>
                  <td style={{fontSize:12,color:'var(--text-muted)'}}>{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {submittingHw && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'var(--bg-card)',padding:28,borderRadius:14,width:440,border:'1px solid var(--border)'}}>
            <h3 className="section-title">Submit Homework — {submittingHw.title}</h3>
            <div className="form-group"><label>Solution Text / Link</label><textarea className="input" rows={4} value={hwContent} onChange={e => setHwContent(e.target.value)} placeholder="Type solution derivations or upload reference link..." /></div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button className="btn" style={{flex:1}} onClick={handleSubmitHw}>Confirm Submission</button>
              <button className="btn btn-outline" onClick={() => setSubmittingHw(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ----------------------------------------------------
// 6. PARENT PORTAL (RAVI SHARMA - CHILD TRACKING & FEES)
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

  return (
    <AppShell role="parent" title={`Parent Portal — Ward: ${data.activeChild.name}`} navigate={navigate} path={path}>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Child Full Name</div>
          <div className="value" style={{fontSize:22}}>{data.activeChild.name}</div>
        </div>
        <div className="stat-card">
          <div className="label">Today's Attendance</div>
          <div className="value" style={{color:'#34d399'}}>Present (On-time)</div>
        </div>
        <div className="stat-card">
          <div className="label">Cumulative Attendance</div>
          <div className="value">{data.attendancePercentage}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Pending Fee Balance</div>
          <div className="value" style={{color: data.fees.pendingAmount > 0 ? '#f87171' : '#34d399'}}>
            ₹{data.fees.pendingAmount.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
        {/* Tuition Fee Breakdown & Payment */}
        <div style={{background:'var(--bg-card)',padding:24,borderRadius:14,border:'1px solid var(--border)'}}>
          <h3 className="section-title">Annual Tuition & Fee Clearance</h3>
          <div style={{background:'rgba(255,255,255,0.03)',padding:16,borderRadius:8,marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span>Total Academic Annual Fee:</span>
              <strong>₹{data.fees.totalAmount.toLocaleString()}</strong>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,color:'#34d399'}}>
              <span>Paid to Date:</span>
              <strong>₹{data.fees.paidAmount.toLocaleString()}</strong>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--border)',paddingTop:8,fontWeight:800,fontSize:16,color: data.fees.pendingAmount > 0 ? '#f87171' : '#34d399'}}>
              <span>Outstanding Balance:</span>
              <span>₹{data.fees.pendingAmount.toLocaleString()}</span>
            </div>
          </div>

          {data.fees.pendingAmount > 0 ? (
            <button className="btn" style={{width:'100%',padding:12}} onClick={handlePayFee} disabled={paying}>
              {paying ? 'Processing Simulated Gateway...' : `💳 Pay Balance of ₹${data.fees.pendingAmount.toLocaleString()} (Instant UPI)`}
            </button>
          ) : (
            <div style={{textAlign:'center',padding:10,background:'rgba(16, 185, 129, 0.15)',color:'#34d399',borderRadius:8,fontWeight:700}}>
              ✓ All Institutional Fees Fully Paid for 2025-2026
            </div>
          )}
        </div>

        {/* Child Exam Performance */}
        <div style={{background:'var(--bg-card)',padding:24,borderRadius:14,border:'1px solid var(--border)'}}>
          <h3 className="section-title">Academic Progress & Exam Scores</h3>
          <table className="data-table">
            <thead>
              <tr><th>Subject</th><th>Marks</th><th>Grade</th></tr>
            </thead>
            <tbody>
              {data.recentMarks.map(m => (
                <tr key={m.id}>
                  <td style={{fontWeight:600}}>{m.subjectName}</td>
                  <td style={{fontWeight:700,color:'#34d399'}}>{m.obtainedScore}/100</td>
                  <td><span className="badge badge-green">{m.grade}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

// ----------------------------------------------------
// 7. SUPER ADMIN PLATFORM GOVERNANCE
// ----------------------------------------------------
function SuperAdminPortal({ navigate, path }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/super-admin/dashboard').then(setData).catch(console.error);
  }, []);

  if (!data) return <AppShell role="super_admin" title="Super Admin Platform Governance" navigate={navigate} path={path}><div className="loading">Loading Platform Diagnostics...</div></AppShell>;

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
          <div className="value" style={{color:'#34d399',fontSize:18}}>Healthy (100%)</div>
        </div>
      </div>

      <div style={{background:'var(--bg-card)',padding:24,borderRadius:14,border:'1px solid var(--border)',marginBottom:24}}>
        <h3 className="section-title">Active Educational Institutions</h3>
        <div style={{background:'rgba(255,255,255,0.03)',padding:16,borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:800,fontSize:16,color:'#fff'}}>{data.institution.name} ({data.institution.code})</div>
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
