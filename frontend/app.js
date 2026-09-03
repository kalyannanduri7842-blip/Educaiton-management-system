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
    if (!res.ok) throw new Error(data.error || 'Invalid credentials. Please check password.');
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
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ----------------------------------------------------
// APP SHELL / WORKSPACE LAYOUT
// ----------------------------------------------------
function AppShell({ children, role, title, navigate, path }) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const navConfigs = {
    super_admin: [
      ['/super-admin', 'Platform Overview'],
      ['/super-admin/institutions', 'Institutions'],
      ['/super-admin/users', 'User Accounts'],
      ['/super-admin/audit', 'Security Audit Logs']
    ],
    admin: [
      ['/admin', 'Dashboard'],
      ['/admin/students', 'Students & Admissions'],
      ['/admin/checkins', 'Daily Arrival Check-Ins'],
      ['/admin/teachers', 'Teachers & Faculty'],
      ['/admin/classes', 'Classes & Sections'],
      ['/admin/attendance', 'Attendance Sessions'],
      ['/admin/exams', 'Exams & Marksheets'],
      ['/admin/fees', 'Fees & Payments'],
      ['/admin/reports', 'Reports & Summary']
    ],
    teacher: [
      ['/teacher', 'Overview & Check-In'],
      ['/teacher/attendance', 'Period Attendance'],
      ['/teacher/daily-work', 'Day-by-Day Tasks'],
      ['/teacher/homework', 'Homework & Assignments'],
      ['/teacher/marks', 'Marksheet Grade Entry'],
      ['/teacher/classes', 'My Classes']
    ],
    student: [
      ['/student', 'Overview & Check-In'],
      ['/student/daily-work', 'Day-by-Day Tasks'],
      ['/student/homework', 'Homework & Projects'],
      ['/student/marks', 'Exam Results & GPA'],
      ['/student/attendance', 'Attendance Record']
    ],
    parent: [
      ['/parent', 'Ward Overview'],
      ['/parent/daily-work', 'Daily Work Reports'],
      ['/parent/attendance', 'Attendance History'],
      ['/parent/results', 'Exam Performance'],
      ['/parent/fees', 'Tuition Fees & Payments']
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
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand" style={{fontSize:16}}>
            <span>🎓</span> EduSphere
          </div>
          <div style={{fontSize:11,color:'var(--primary)',fontWeight:700,marginTop:2}}>
            {role.toUpperCase().replace('_', ' ')} PORTAL
          </div>
        </div>

        <nav className="sidebar-menu">
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
            style={{marginTop:16,borderTop:'1px solid var(--border)',paddingTop:12,color:'var(--text-muted)'}}
          >
            ← Public Website
          </a>
        </nav>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <div style={{display:'flex',alignItems:'center',gap:16,flex:1}}>
            <h1 style={{fontSize:16,fontWeight:600,color:'#111827'}}>{title}</h1>
            <div style={{position:'relative',maxWidth:280,width:'100%'}}>
              <input
                className="input"
                style={{padding:'6px 10px',fontSize:13}}
                placeholder="Search students, teachers..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => setShowSearch(true)}
              />
              {showSearch && searchResults.length > 0 && (
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#ffffff',border:'1px solid var(--border)',borderRadius:4,marginTop:4,zIndex:50,boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)',padding:6}}>
                  {searchResults.map((r, i) => (
                    <div key={i} style={{padding:'6px 8px',borderBottom:'1px solid #f3f4f6',cursor:'pointer'}} onClick={() => setShowSearch(false)}>
                      <div style={{fontWeight:600,fontSize:13,color:'var(--primary)'}}>[{r.type}] {r.title}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.subtitle}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:600,fontSize:13}}>{user ? user.name : 'User'}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>{user ? user.email : ''}</div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => { logout(); navigate('/login'); }}>
              Sign Out
            </button>
          </div>
        </header>

        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 1. CLEAN PUBLIC LANDING PAGE
// ----------------------------------------------------
function LandingPage({ navigate }) {
  const [about, setAbout] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/about-us`).then(r => r.json()).then(setAbout).catch(console.error);
  }, []);

  return (
    <div>
      <nav className="navbar">
        <div className="container navbar-inner">
          <div className="brand"><span>🎓</span> EduSphere</div>
          <div className="nav-links">
            <a href="#about-us">About Us</a>
            <a href="#features">Features</a>
            <a href="#checkin-flow">Arrival Check-In</a>
            <a href="#daily-work">Day-by-Day Tasks</a>
          </div>
          <button className="btn btn-sm" onClick={() => navigate('/login')}>
            Sign In to Portal
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{background:'#ffffff',borderBottom:'1px solid var(--border)',padding:'56px 0 48px'}}>
        <div className="container" style={{textAlign:'center'}}>
          <div style={{display:'inline-block',padding:'4px 12px',background:'#ecfdf5',color:'#065f46',borderRadius:4,fontSize:12.5,fontWeight:600,marginBottom:16}}>
            Greenwood Global Academy — Academic Platform
          </div>
          <h1 style={{fontSize:36,fontWeight:700,color:'#111827',lineHeight:1.25,maxWidth:800,margin:'0 auto 16px'}}>
            School Academic Management, Daily Check-In & Student Work Tracking
          </h1>
          <p style={{fontSize:15,color:'var(--text-muted)',maxWidth:680,margin:'0 auto 28px',lineHeight:1.6}}>
            A simple, secure system for administration, faculty, students, and parents. Handles admissions, daily arrival check-ins, homework submissions, marks, and fees in one place.
          </p>
          <div style={{display:'flex',gap:12,justifyContent:'center'}}>
            <button className="btn" onClick={() => navigate('/login')}>
              Sign In to System
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/login')}>
              View 5 Role Portals
            </button>
          </div>
        </div>
      </section>

      {/* Core Highlights */}
      <section style={{padding:'40px 0'}}>
        <div className="container">
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))',gap:16}}>
            <div className="card">
              <div style={{fontWeight:600,fontSize:15,marginBottom:6,color:'#111827'}}>Daily Arrival Check-In</div>
              <p style={{fontSize:13,color:'var(--text-muted)'}}>Students and teachers record arrival on campus. Parents and administration receive on-time or late arrival status.</p>
            </div>
            <div className="card">
              <div style={{fontWeight:600,fontSize:15,marginBottom:6,color:'#111827'}}>Day-by-Day Syllabus Tasks</div>
              <p style={{fontSize:13,color:'var(--text-muted)'}}>Structured Day 1 to Day 5 curriculum tasks with student submission, grading, and teacher feedback.</p>
            </div>
            <div className="card">
              <div style={{fontWeight:600,fontSize:15,marginBottom:6,color:'#111827'}}>Academic Marksheets & GPA</div>
              <p style={{fontSize:13,color:'var(--text-muted)'}}>Standard 0-100 grading with automatic percentage division (Distinction, First Division) and report cards.</p>
            </div>
            <div className="card">
              <div style={{fontWeight:600,fontSize:15,marginBottom:6,color:'#111827'}}>Tuition Fees & Payments</div>
              <p style={{fontSize:13,color:'var(--text-muted)'}}>Clear fee balance ledger with online simulated payments and immediate payment receipts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about-us" style={{background:'#ffffff',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)',padding:'48px 0',scrollMarginTop:70}}>
        <div className="container">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
            <div>
              <div className="badge badge-green" style={{marginBottom:6}}>Institutional Profile</div>
              <h2 style={{fontSize:22,fontWeight:700,color:'#111827'}}>About Greenwood Global Academy</h2>
            </div>
            <div style={{display:'flex',gap:6}}>
              <span className="badge badge-gray">CBSE Affiliated</span>
              <span className="badge badge-green">Cambridge International</span>
              <span className="badge badge-gray">NABET Accredited</span>
            </div>
          </div>

          <p style={{fontSize:14,color:'#374151',lineHeight:1.7,marginBottom:28,maxWidth:900}}>
            {about && about.aboutUs ? about.aboutUs.overview : 'Greenwood Global Academy is a premier K-12 institution established in 2004, offering structured academic curricula, STEM laboratory programs, and digital academic governance.'}
          </p>

          <h3 style={{fontSize:15,fontWeight:600,color:'#111827',marginBottom:12}}>School Leadership</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))',gap:14}}>
            {(about && about.aboutUs && about.aboutUs.leadership ? about.aboutUs.leadership : [
              { name: 'Dr. Sunita Deshmukh', role: 'Principal & Head of School', qualification: 'Ph.D. in Education Leadership (Oxford)' },
              { name: 'Dr. Rajesh Varma', role: 'Academic Dean & Registrar', qualification: 'Ph.D. in Curriculum Architecture (IIT)' },
              { name: 'Prof. Vikram Sen', role: 'Head of Mathematics & STEM', qualification: 'M.Sc., B.Ed., 18 Years Faculty Experience' }
            ]).map((ldr, idx) => (
              <div key={idx} style={{background:'#f9fafb',border:'1px solid var(--border)',borderRadius:6,padding:14}}>
                <div style={{fontWeight:600,fontSize:14,color:'#111827'}}>{ldr.name}</div>
                <div style={{fontSize:12.5,color:'var(--primary)',fontWeight:600,marginTop:2}}>{ldr.role}</div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{ldr.qualification}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{padding:'48px 0',scrollMarginTop:70}}>
        <div className="container">
          <div style={{marginBottom:24}}>
            <h2 style={{fontSize:22,fontWeight:700,color:'#111827'}}>Platform Capabilities</h2>
            <p style={{fontSize:14,color:'var(--text-muted)'}}>Core functions available to school staff, students, and parents.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',gap:14}}>
            <div className="card">
              <strong>Student Admissions</strong>
              <p style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>5-step registration wizard for new student admissions, class allocation, and parent linkage.</p>
            </div>
            <div className="card">
              <strong>Roll Call Attendance</strong>
              <p style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>Daily subject attendance marking (Present, Absent, Late) with automatic absent alerts to parents.</p>
            </div>
            <div className="card">
              <strong>Daily Work Tracker</strong>
              <p style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>Day 1 to Day 5 curriculum schedule where students submit work and teachers evaluate with feedback.</p>
            </div>
            <div className="card">
              <strong>Examinations & Marks</strong>
              <p style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>Mid-term exam schedules, score recording, and printable student report cards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Arrival Check-In Flow */}
      <section id="checkin-flow" style={{background:'#ffffff',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)',padding:'48px 0',scrollMarginTop:70}}>
        <div className="container">
          <div style={{marginBottom:20}}>
            <h2 style={{fontSize:22,fontWeight:700,color:'#111827'}}>Arrival Check-In Flow</h2>
            <p style={{fontSize:14,color:'var(--text-muted)'}}>How student and teacher morning arrivals are tracked and communicated.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{background:'#f9fafb',border:'1px solid var(--border)',borderRadius:6,padding:16}}>
              <div style={{fontWeight:600,color:'var(--primary)',marginBottom:4}}>Student Check-In</div>
              <p style={{fontSize:13,color:'#374151'}}>Student logs arrival at campus gate kiosk. The system verifies if check-in is before 09:00 AM (On-Time) or after (Late). A real-time arrival alert is sent to the parent and school administrator.</p>
            </div>
            <div style={{background:'#f9fafb',border:'1px solid var(--border)',borderRadius:6,padding:16}}>
              <div style={{fontWeight:600,color:'var(--amber)',marginBottom:4}}>Faculty Check-In</div>
              <p style={{fontSize:13,color:'#374151'}}>Teacher logs arrival via their dashboard. Notification is immediately recorded and sent to the School Principal and Super Administrator.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Day-by-Day Tasks */}
      <section id="daily-work" style={{padding:'48px 0',scrollMarginTop:70}}>
        <div className="container">
          <div style={{marginBottom:20}}>
            <h2 style={{fontSize:22,fontWeight:700,color:'#111827'}}>Day-by-Day Syllabus Tasks</h2>
            <p style={{fontSize:14,color:'var(--text-muted)'}}>Standard curriculum tasks assigned for each academic day.</p>
          </div>
          <div style={{display:'grid',gap:10}}>
            {[
              { day: 'Day 1', sub: 'Mathematics', title: 'Quadratic Equations & Parabolic Roots Analysis', desc: 'Complete Problem Set 1.1 to 1.4. Derive discriminant roots and plot parabola vertices on graph sheets.' },
              { day: 'Day 2', sub: 'Physics', title: 'Faraday Magnetic Flux & EMF Calculation Worksheet', desc: 'Analyze the 5 electromagnetic induction problem sets and submit step-by-step vector flux calculations.' },
              { day: 'Day 3', sub: 'Computer Science', title: 'Binary Search Tree Insertion & Traversal In Pseudo-code', desc: 'Write preorder, inorder, and postorder traversal functions for a balanced BST with 10 nodes.' },
              { day: 'Day 4', sub: 'English Literature', title: 'Analytical Essay on The Merchant of Venice Act IV', desc: 'Compose a 600-word critical evaluation on the themes of justice versus mercy.' },
              { day: 'Day 5', sub: 'Chemistry', title: 'Acid-Base Titration Curves & pH Buffer Solutions', desc: 'Plot titration pH inflection curves and calculate dissociation constant Ka.' }
            ].map((t, idx) => (
              <div key={idx} style={{background:'#ffffff',border:'1px solid var(--border)',borderRadius:6,padding:14,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:2}}>
                    <span className="badge badge-green">{t.day}</span>
                    <span style={{fontSize:12.5,fontWeight:600,color:'#374151'}}>{t.sub}</span>
                  </div>
                  <div style={{fontWeight:600,fontSize:14,color:'#111827'}}>{t.title}</div>
                  <div style={{fontSize:12.5,color:'var(--text-muted)',marginTop:2}}>{t.desc}</div>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => navigate('/login')}>
                  View / Submit →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{background:'#ffffff',borderTop:'1px solid var(--border)',padding:'24px 0',textAlign:'center',fontSize:13,color:'var(--text-muted)'}}>
        <div className="container">
          Greenwood Global Academy · EduSphere Academic System · Bangalore, Karnataka
        </div>
      </footer>
    </div>
  );
}

// ----------------------------------------------------
// 2. CLEAN SECURE LOGIN PAGE (PASSWORD REQUIRED)
// ----------------------------------------------------
function LoginPage({ navigate }) {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('admin@edusphere.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [publicStudents, setPublicStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/public/students-list`)
      .then(r => r.json())
      .then(d => {
        setPublicStudents(d.students || []);
        if (d.students && d.students.length > 0) {
          setSelectedStudentId(d.students[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') navigate('/super-admin');
      else if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'teacher') navigate('/teacher');
      else if (user.role === 'student') navigate('/student');
      else if (user.role === 'parent') navigate('/parent');
    }
  }, [user]);

  // When clicking an account in the directory, fill the email, focus password field
  const selectAccount = (accEmail, defaultPassHint) => {
    setError('');
    setEmail(accEmail);
    setPassword('');
    // Focus password input for human user entry
    const pInput = document.getElementById('password-input');
    if (pInput) {
      pInput.focus();
    }
  };

  const handleStudentSelect = (e) => {
    const sId = e.target.value;
    setSelectedStudentId(sId);
    const found = publicStudents.find(s => s.id === sId);
    if (found) {
      setEmail(found.email);
      setPassword('');
      const pInput = document.getElementById('password-input');
      if (pInput) pInput.focus();
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your account password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.user.role === 'super_admin') navigate('/super-admin');
      else if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'teacher') navigate('/teacher');
      else if (data.user.role === 'student') navigate('/student');
      else if (data.user.role === 'parent') navigate('/parent');
    } catch (err) {
      setError(err.message || 'Incorrect password or email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{maxWidth:480,width:'100%',background:'#ffffff',border:'1px solid var(--border)',borderRadius:8,padding:28,boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
        <div style={{textAlign:'center',marginBottom:20}}>
          <div className="brand" style={{justifyContent:'center',fontSize:20,marginBottom:4}}>
            <span>🎓</span> EduSphere
          </div>
          <h2 style={{fontSize:18,fontWeight:700,color:'#111827'}}>Sign In to Account</h2>
          <p style={{fontSize:13,color:'var(--text-muted)'}}>Enter your credentials to access your portal</p>
        </div>

        {/* Directory helper */}
        <div style={{background:'#f9fafb',border:'1px solid var(--border)',borderRadius:6,padding:12,marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:8}}>
            Select Account to Sign In:
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
            <button
              type="button"
              className={'btn btn-sm ' + (email === 'admin@edusphere.local' ? '' : 'btn-outline')}
              onClick={() => selectAccount('admin@edusphere.local', 'DemoOnly-Admin-2026!')}
            >
              School Admin
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (email === 'teacher@edusphere.local' ? '' : 'btn-outline')}
              onClick={() => selectAccount('teacher@edusphere.local', 'DemoOnly-Teacher-2026!')}
            >
              Teacher (Prof. Sen)
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (email === 'parent@edusphere.local' ? '' : 'btn-outline')}
              onClick={() => selectAccount('parent@edusphere.local', 'DemoOnly-Parent-2026!')}
            >
              Parent (Ravi Sharma)
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (email === 'superadmin@edusphere.local' ? '' : 'btn-outline')}
              onClick={() => selectAccount('superadmin@edusphere.local', 'DemoOnly-SuperAdmin-2026!')}
            >
              Super Admin
            </button>
          </div>

          <div style={{borderTop:'1px solid var(--border)',paddingTop:8}}>
            <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>
              Or Select Specific Student (52 Roster):
            </label>
            <select className="input" style={{fontSize:12.5,padding:'6px 8px'}} value={selectedStudentId} onChange={handleStudentSelect}>
              {publicStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.rollNumber}. {s.name} ({s.admissionNumber} — {s.classId})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="alert alert-red">{error}</div>}

        <form onSubmit={handleLoginSubmit}>
          <div className="form-group">
            <label>Academic Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. admin@edusphere.local"
            />
          </div>

          <div className="form-group">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <label style={{margin:0}}>Account Password</label>
              <button
                type="button"
                style={{background:'none',border:'none',color:'var(--primary)',fontSize:11.5,fontWeight:600,cursor:'pointer'}}
                onClick={() => {
                  if (email.includes('admin@')) setPassword('DemoOnly-Admin-2026!');
                  else if (email.includes('teacher')) setPassword('DemoOnly-Teacher-2026!');
                  else if (email.includes('parent')) setPassword('DemoOnly-Parent-2026!');
                  else if (email.includes('superadmin')) setPassword('DemoOnly-SuperAdmin-2026!');
                  else setPassword('DemoOnly-Student-2026!');
                }}
              >
                Autofill Demo Password
              </button>
            </div>
            <input
              id="password-input"
              className="input"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password..."
            />
            <div style={{fontSize:11.5,color:'var(--text-muted)',marginTop:4}}>
              Demo passwords: <code>DemoOnly-Admin-2026!</code> / <code>DemoOnly-Teacher-2026!</code> / <code>DemoOnly-Student-2026!</code>
            </div>
          </div>

          <button className="btn" type="submit" style={{width:'100%',padding:10,marginTop:6}} disabled={loading}>
            {loading ? 'Verifying Credentials...' : 'Sign In'}
          </button>
        </form>

        <div style={{textAlign:'center',marginTop:16,fontSize:13}}>
          <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} style={{color:'var(--text-muted)'}}>
            ← Return to Public Home
          </a>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 3. INSTITUTION ADMIN PORTAL
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

  // Admission wizard state
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
      setCheckins(dChk.studentCheckins || []);
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
      alert(`Student ${newStudent.firstName} ${newStudent.lastName} registered successfully.`);
      setShowAddStudent(false);
      setAdmStep(1);
      loadAll();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <AppShell role="admin" title="Operations Center" navigate={navigate} path={path}><div className="loading">Loading records...</div></AppShell>;

  const titles = {
    '/admin': 'School Operations Dashboard',
    '/admin/students': 'Student Admissions & Master Roster',
    '/admin/checkins': 'Daily Arrival Check-Ins (Gate Kiosk)',
    '/admin/teachers': 'Faculty & Department Allocation',
    '/admin/classes': 'Classes, Sections & Subject Curriculum',
    '/admin/attendance': 'Attendance Sessions & Rate Analytics',
    '/admin/exams': 'Examinations & Marksheets Ledger',
    '/admin/fees': 'Tuition Fees & Payments Ledger',
    '/admin/reports': 'Institutional Summary Reports'
  };

  return (
    <AppShell role="admin" title={titles[path] || 'Operations Center'} navigate={navigate} path={path}>
      {/* 1. OPERATIONS DASHBOARD */}
      {path === '/admin' && (
        <div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Total Students</div>
              <div className="value">{dashboardData ? dashboardData.totalStudents : 52}</div>
            </div>
            <div className="stat-card">
              <div className="label">Today's Student Check-Ins</div>
              <div className="value" style={{color:'var(--primary)'}}>
                {dashboardData && dashboardData.todayCheckins ? `${dashboardData.todayCheckins.onTime} / ${dashboardData.todayCheckins.total}` : '1 / 2'}
              </div>
            </div>
            <div className="stat-card">
              <div className="label">Today's Attendance Rate</div>
              <div className="value">{dashboardData ? dashboardData.todayAttendance.ratePercent : 94.5}%</div>
            </div>
            <div className="stat-card">
              <div className="label">Fee Collections (YTD)</div>
              <div className="value" style={{color:'var(--amber)'}}>₹{(dashboardData ? dashboardData.feeSummary.collected : 2850000).toLocaleString()}</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div className="card">
              <h3 style={{fontSize:14,fontWeight:600,marginBottom:12,color:'#111827'}}>Recent Arrival Check-Ins (Gate Kiosk)</h3>
              {checkins.slice(0, 5).map(c => (
                <div key={c.id} style={{padding:'8px 0',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:600,color:'#111827'}}>{c.studentName}</div>
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>{c.checkinTime} · {c.gateLocation}</div>
                  </div>
                  <span className={'badge ' + (c.status === 'on_time' ? 'badge-green' : 'badge-amber')}>
                    {c.status === 'on_time' ? 'On-Time' : 'Late Arrival'}
                  </span>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 style={{fontSize:14,fontWeight:600,marginBottom:12,color:'#111827'}}>Administrative Activity Log</h3>
              {(dashboardData ? dashboardData.auditLogs : []).slice(0, 5).map(l => (
                <div key={l.id} style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{fontWeight:600,fontSize:13,color:'#111827'}}>{l.action}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>{l.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. STUDENTS & ADMISSIONS */}
      {path === '/admin/students' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h2 style={{fontSize:16,fontWeight:600}}>Enrolled Students ({students.length})</h2>
            <button className="btn btn-sm" onClick={() => setShowAddStudent(!showAddStudent)}>
              {showAddStudent ? 'Close Form' : '+ New Student Admission'}
            </button>
          </div>

          {showAddStudent && (
            <div className="card" style={{marginBottom:20}}>
              <div style={{display:'flex',gap:6,marginBottom:16,borderBottom:'1px solid var(--border)',paddingBottom:10}}>
                {['1. Personal Data', '2. Academic Info', '3. Parent Details', '4. Confirm'].map((stTitle, sIdx) => (
                  <button key={sIdx} type="button" className={'btn btn-sm ' + (admStep === sIdx + 1 ? '' : 'btn-outline')} onClick={() => setAdmStep(sIdx + 1)}>
                    {stTitle}
                  </button>
                ))}
              </div>
              <form onSubmit={handleCreateStudent}>
                {admStep === 1 && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div className="form-group"><label>First Name *</label><input className="input" required value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} /></div>
                    <div className="form-group"><label>Last Name *</label><input className="input" required value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} /></div>
                    <div className="form-group"><label>Date of Birth</label><input className="input" type="date" value={newStudent.dateOfBirth} onChange={e => setNewStudent({...newStudent, dateOfBirth: e.target.value})} /></div>
                    <div className="form-group"><label>Gender</label><select className="input" value={newStudent.gender} onChange={e => setNewStudent({...newStudent, gender: e.target.value})}><option>Male</option><option>Female</option></select></div>
                    <div className="form-group"><label>Phone</label><input className="input" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} /></div>
                    <div className="form-group"><label>Address</label><input className="input" value={newStudent.address} onChange={e => setNewStudent({...newStudent, address: e.target.value})} /></div>
                    <div style={{gridColumn:'span 2',textAlign:'right'}}><button type="button" className="btn btn-sm" onClick={() => setAdmStep(2)}>Next: Academic Info →</button></div>
                  </div>
                )}
                {admStep === 2 && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div className="form-group"><label>Class Level *</label><select className="input" value={newStudent.classId} onChange={e => setNewStudent({...newStudent, classId: e.target.value})}><option value="CLS-10">Grade 10</option><option value="CLS-09">Grade 9</option></select></div>
                    <div className="form-group"><label>Assigned Section *</label><select className="input" value={newStudent.sectionId} onChange={e => setNewStudent({...newStudent, sectionId: e.target.value})}><option value="SEC-10A">Section A</option><option value="SEC-10B">Section B</option></select></div>
                    <div style={{gridColumn:'span 2',display:'flex',justifyContent:'space-between'}}>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => setAdmStep(1)}>← Back</button>
                      <button type="button" className="btn btn-sm" onClick={() => setAdmStep(3)}>Next: Parent Details →</button>
                    </div>
                  </div>
                )}
                {admStep === 3 && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div className="form-group"><label>Parent Name *</label><input className="input" required value={newStudent.parentName} onChange={e => setNewStudent({...newStudent, parentName: e.target.value})} /></div>
                    <div className="form-group"><label>Relationship</label><select className="input" value={newStudent.parentRelationship} onChange={e => setNewStudent({...newStudent, parentRelationship: e.target.value})}><option>Father</option><option>Mother</option></select></div>
                    <div className="form-group"><label>Parent Phone</label><input className="input" value={newStudent.parentPhone} onChange={e => setNewStudent({...newStudent, parentPhone: e.target.value})} /></div>
                    <div style={{gridColumn:'span 2',display:'flex',justifyContent:'space-between'}}>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => setAdmStep(2)}>← Back</button>
                      <button type="button" className="btn btn-sm" onClick={() => setAdmStep(4)}>Next: Review →</button>
                    </div>
                  </div>
                )}
                {admStep === 4 && (
                  <div>
                    <div style={{background:'#f9fafb',padding:12,borderRadius:4,marginBottom:16,fontSize:13}}>
                      <p><strong>Student:</strong> {newStudent.firstName} {newStudent.lastName} (Class {newStudent.classId} - {newStudent.sectionId})</p>
                      <p><strong>Parent:</strong> {newStudent.parentName} ({newStudent.parentRelationship})</p>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => setAdmStep(3)}>← Back</button>
                      <button type="submit" className="btn btn-sm">Complete Admission</button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Admission No</th><th>Name</th><th>Roll</th><th>Class/Section</th><th>Phone</th><th>Status</th></tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td><code>{s.admissionNumber}</code></td>
                    <td style={{fontWeight:600}}>{s.name}</td>
                    <td>{s.rollNumber}</td>
                    <td>{s.classId} — {s.sectionId}</td>
                    <td>{s.phone}</td>
                    <td><span className="badge badge-green">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CHECK-INS */}
      {path === '/admin/checkins' && (
        <div>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:14}}>Campus Arrival Check-Ins</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Time</th><th>Student Name</th><th>Class</th><th>Gate</th><th>Status</th><th>Alerts</th></tr>
              </thead>
              <tbody>
                {checkins.map(c => (
                  <tr key={c.id}>
                    <td>{c.date}</td>
                    <td style={{fontWeight:600,color:'var(--primary)'}}>{c.checkinTime}</td>
                    <td style={{fontWeight:600}}>{c.studentName}</td>
                    <td>{c.classId}-{c.sectionId}</td>
                    <td>{c.gateLocation}</td>
                    <td><span className={'badge ' + (c.status === 'on_time' ? 'badge-green' : 'badge-amber')}>{c.status === 'on_time' ? 'On-Time' : 'Late'}</span></td>
                    <td><span className="badge badge-green">Dispatched</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TEACHERS */}
      {path === '/admin/teachers' && (
        <div>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:14}}>Faculty Roster</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Emp ID</th><th>Name</th><th>Department</th><th>Sections</th><th>Qualification</th></tr>
              </thead>
              <tbody>
                {teachers.map(t => (
                  <tr key={t.id}>
                    <td><code>{t.employeeId}</code></td>
                    <td style={{fontWeight:600}}>{t.name}</td>
                    <td><span className="badge badge-green">{t.department}</span></td>
                    <td>{t.assignedSections.join(', ')}</td>
                    <td>{t.qualification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. CLASSES */}
      {path === '/admin/classes' && (
        <div>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:14}}>Classes, Sections & Subjects</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div className="card">
              <strong>Sections & Rooms</strong>
              {classesData.sections.map(sec => (
                <div key={sec.id} style={{padding:'8px 0',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between'}}>
                  <span>{sec.classId} — {sec.name} ({sec.roomNumber})</span>
                  <span className="badge badge-gray">Teacher: {sec.classTeacherId}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <strong>Subject Curriculum</strong>
              {classesData.subjects.map(sub => (
                <div key={sub.id} style={{padding:'8px 0',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between'}}>
                  <span>{sub.name} ({sub.code})</span>
                  <span className="badge badge-amber">{sub.credits} Credits</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. ATTENDANCE */}
      {path === '/admin/attendance' && (
        <div>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:14}}>Attendance Sessions</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Period</th><th>Class</th><th>Present</th><th>Absent</th><th>Late</th></tr>
              </thead>
              <tbody>
                {attendanceData.sessions.map(s => (
                  <tr key={s.id}>
                    <td>{s.date}</td>
                    <td>{s.period}</td>
                    <td>{s.classId}-{s.sectionId}</td>
                    <td style={{fontWeight:600,color:'var(--primary)'}}>{s.presentCount}</td>
                    <td style={{fontWeight:600,color:'var(--red)'}}>{s.absentCount}</td>
                    <td style={{fontWeight:600,color:'var(--amber)'}}>{s.lateCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. EXAMS */}
      {path === '/admin/exams' && (
        <div>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:14}}>Examinations</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Exam Title</th><th>Term</th><th>Dates</th><th>Status</th></tr>
              </thead>
              <tbody>
                {examData.exams.map(e => (
                  <tr key={e.id}>
                    <td style={{fontWeight:600}}>{e.title}</td>
                    <td>{e.term}</td>
                    <td>{e.startDate} to {e.endDate}</td>
                    <td><span className="badge badge-green">{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. FEES */}
      {path === '/admin/fees' && (
        <div>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:14}}>Tuition Fee Ledger</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Student Name</th><th>Class</th><th>Total Fee</th><th>Paid</th><th>Pending Balance</th><th>Status</th></tr>
              </thead>
              <tbody>
                {feeData.studentFees.slice(0, 15).map(f => (
                  <tr key={f.id}>
                    <td style={{fontWeight:600}}>{f.studentName}</td>
                    <td>{f.classId}</td>
                    <td>₹{f.totalAmount.toLocaleString()}</td>
                    <td style={{color:'var(--primary)',fontWeight:600}}>₹{f.paidAmount.toLocaleString()}</td>
                    <td style={{color: f.pendingAmount > 0 ? 'var(--red)' : 'var(--primary)',fontWeight:600}}>₹{f.pendingAmount.toLocaleString()}</td>
                    <td><span className={'badge ' + (f.status === 'paid' ? 'badge-green' : 'badge-amber')}>{f.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. REPORTS */}
      {path === '/admin/reports' && (
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h2 style={{fontSize:16,fontWeight:600}}>Academic Summary Report (2025-2026)</h2>
            <button className="btn btn-sm btn-outline" onClick={() => window.print()}>Print</button>
          </div>
          <p style={{fontSize:13,color:'var(--text-muted)'}}>
            Total Students: 52 · Faculty: 12 · Overall Attendance: 94.5% · Total Fees Collected: ₹2,850,000
          </p>
        </div>
      )}
    </AppShell>
  );
}

// ----------------------------------------------------
// 4. TEACHER PORTAL (FACULTY CHECK-IN & TASKS)
// ----------------------------------------------------
function TeacherPortal({ navigate, path }) {
  const [dash, setDash] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedSection, setSelectedSection] = useState('SEC-10A');
  const [attDate, setAttDate] = useState('2026-09-03');
  const [attendanceSheet, setAttendanceSheet] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  // New Day Task
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('Mathematics');
  const [newTaskInstructions, setNewTaskInstructions] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('2026-09-07');

  const load = async () => {
    try {
      const [dDash, dStud] = await Promise.all([
        api('/teacher/dashboard'),
        api(`/teacher/students?sectionId=${selectedSection}`)
      ]);
      setDash(dDash);
      setStudents(dStud.students || []);

      const initAtt = {};
      (dStud.students || []).forEach(s => { initAtt[s.id] = 'present'; });
      setAttendanceSheet(initAtt);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, [selectedSection]);

  const handleTeacherCheckin = async () => {
    setCheckingIn(true);
    try {
      const res = await api('/teacher/checkin', { method: 'POST' });
      alert(res.message);
      load();
    } catch (e) { alert(e.message); }
    finally { setCheckingIn(false); }
  };

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

      alert(`Attendance recorded for ${students.length} students. Parent alerts & Manager report dispatched.`);
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
      alert('Day-by-Day Task added and broadcast to Students.');
      setShowNewTaskModal(false);
      setNewTaskTitle('');
      setNewTaskInstructions('');
      load();
    } catch (e) { alert(e.message); }
  };

  const tchCheckin = dash && dash.checkinToday;

  return (
    <AppShell role="teacher" title="Teacher Classroom Hub" navigate={navigate} path={path}>
      {/* Faculty Check-in Alert */}
      <div className={'alert ' + (tchCheckin ? 'alert-green' : 'alert-amber')} style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div>
          <strong>{tchCheckin ? `Faculty Arrival Recorded (${tchCheckin.status.toUpperCase()}) at ${tchCheckin.checkinTime}` : 'Morning Faculty Check-In Required'}</strong>
          <div style={{fontSize:12,marginTop:2}}>{tchCheckin ? 'Status logged. Alerts sent to School Admin & Super Admin.' : 'Tap check-in upon arriving on campus.'}</div>
        </div>
        {!tchCheckin && (
          <button className="btn btn-sm btn-amber" onClick={handleTeacherCheckin} disabled={checkingIn}>
            {checkingIn ? 'Checking In...' : 'Tap Faculty Check-In'}
          </button>
        )}
      </div>

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
              <div className="value" style={{color:'var(--primary)'}}>Mathematics</div>
            </div>
            <div className="stat-card">
              <div className="label">Day-by-Day Tasks</div>
              <div className="value">{dash && dash.dailyTasks ? dash.dailyTasks.length : 5} Active</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ATTENDANCE */}
      {(path === '/teacher/attendance' || path === '/teacher') && (
        <div style={{marginTop: path === '/teacher' ? 20 : 0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:10}}>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <label style={{margin:0}}>Section:</label>
              <select className="input" style={{width:140}} value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
                <option value="SEC-10A">Grade 10-A</option>
                <option value="SEC-10B">Grade 10-B</option>
              </select>
              <input className="input" type="date" style={{width:140}} value={attDate} onChange={e => setAttDate(e.target.value)} />
            </div>
            <button className="btn btn-sm" onClick={submitAttendance} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save & Send Attendance to Parents'}
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Roll</th><th>Student Name</th><th>Admission No</th><th>Status</th></tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td>{s.rollNumber}</td>
                    <td style={{fontWeight:600}}>{s.name}</td>
                    <td><code>{s.admissionNumber}</code></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        {['present', 'absent', 'late'].map(st => (
                          <button
                            key={st}
                            type="button"
                            className={'btn btn-sm ' + (attendanceSheet[s.id] === st ? (st === 'absent' ? 'btn-danger' : st === 'late' ? 'btn-amber' : '') : 'btn-outline')}
                            style={{padding:'2px 8px',fontSize:11.5,textTransform:'capitalize'}}
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
        </div>
      )}

      {/* 3. DAY-BY-DAY TASKS */}
      {path === '/teacher/daily-work' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h2 style={{fontSize:16,fontWeight:600}}>Day-by-Day Syllabus Tasks</h2>
            <button className="btn btn-sm" onClick={() => setShowNewTaskModal(true)}>+ Add Day Task</button>
          </div>

          <div style={{display:'grid',gap:12}}>
            {(dash && dash.dailyTasks ? dash.dailyTasks : []).map(task => (
              <div key={task.id} className="card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <div>
                    <span className="badge badge-green">{task.dayTitle}</span>
                    <strong style={{marginLeft:8,color:'#111827'}}>{task.title}</strong>
                  </div>
                  <span style={{fontSize:12,color:'var(--text-muted)'}}>Due: {task.dueDate}</span>
                </div>
                <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:10}}>{task.instructions}</p>
                <div style={{fontSize:12.5}}>
                  <strong>Submissions ({(task.submissions || []).length}):</strong>
                  {(task.submissions || []).map((subm, sIdx) => (
                    <div key={sIdx} style={{background:'#f9fafb',padding:8,borderRadius:4,marginTop:6,display:'flex',justifyContent:'space-between'}}>
                      <span><strong>{subm.studentName}:</strong> {subm.content || 'Submitted'}</span>
                      <span className="badge badge-green">Score: {subm.score || 24}/{task.maxScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. HOMEWORK */}
      {path === '/teacher/homework' && (
        <div className="card">
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:8}}>Homework & Assignments</h2>
          <p style={{fontSize:13,color:'var(--text-muted)'}}>Assignments published for Grade 10 Mathematics and Science.</p>
        </div>
      )}

      {/* 5. MARKS */}
      {path === '/teacher/marks' && (
        <div>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:14}}>Marksheet Entry</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Roll</th><th>Student Name</th><th>Score</th><th>Grade</th></tr>
              </thead>
              <tbody>
                {students.slice(0, 10).map(s => (
                  <tr key={s.id}>
                    <td>{s.rollNumber}</td>
                    <td style={{fontWeight:600}}>{s.name}</td>
                    <td style={{fontWeight:600,color:'var(--primary)'}}>88 / 100</td>
                    <td><span className="badge badge-green">A (First Division)</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. CLASSES */}
      {path === '/teacher/classes' && (
        <div className="card">
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:8}}>Assigned Classes</h2>
          <p style={{fontSize:13}}>Grade 10-A (20 Students, Room 301) · Grade 10-B (15 Students, Room 302)</p>
        </div>
      )}

      {/* Add Task Modal */}
      {showNewTaskModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'#ffffff',padding:24,borderRadius:8,width:440,border:'1px solid var(--border)'}}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:12}}>Add Day-by-Day Task</h3>
            <form onSubmit={handleCreateDailyTask}>
              <div className="form-group"><label>Task Title *</label><input className="input" required value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="e.g. Day 6: Linear Equations" /></div>
              <div className="form-group"><label>Subject *</label><input className="input" required value={newTaskSubject} onChange={e => setNewTaskSubject(e.target.value)} /></div>
              <div className="form-group"><label>Due Date</label><input className="input" type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} /></div>
              <div className="form-group"><label>Instructions *</label><textarea className="input" rows={3} required value={newTaskInstructions} onChange={e => setNewTaskInstructions(e.target.value)} /></div>
              <div style={{display:'flex',gap:8,marginTop:16}}>
                <button type="submit" className="btn btn-sm" style={{flex:1}}>Create Task</button>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowNewTaskModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ----------------------------------------------------
// 5. STUDENT PORTAL (CHECK-IN & SUBMIT WORK)
// ----------------------------------------------------
function StudentPortal({ navigate, path }) {
  const [data, setData] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskAnswer, setTaskAnswer] = useState('');

  // Student Adds Own Project
  const [showAddHwModal, setShowAddHwModal] = useState(false);
  const [selfHwTitle, setSelfHwTitle] = useState('');
  const [selfHwSubject, setSelfHwSubject] = useState('Computer Science');
  const [selfHwContent, setSelfHwContent] = useState('');

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

  const handleCreateSelfHomework = async (e) => {
    e.preventDefault();
    try {
      const res = await api('/student/homework/create', {
        method: 'POST',
        body: JSON.stringify({
          title: selfHwTitle,
          subjectName: selfHwSubject,
          content: selfHwContent
        })
      });
      alert(res.message);
      setShowAddHwModal(false);
      setSelfHwTitle('');
      setSelfHwContent('');
      load();
    } catch (e) { alert(e.message); }
  };

  if (!data) return <AppShell role="student" title="Student Portal" navigate={navigate} path={path}><div className="loading">Loading student data...</div></AppShell>;

  const checkinInfo = data.checkinToday;

  return (
    <AppShell role="student" title={`Student Portal — ${data.student.name} (${data.student.admissionNumber})`} navigate={navigate} path={path}>
      {/* Daily Arrival Check-in Alert */}
      <div className={'alert ' + (checkinInfo ? 'alert-green' : 'alert-amber')} style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div>
          <strong>{checkinInfo ? `Arrival Recorded (${checkinInfo.status === 'on_time' ? 'ON-TIME' : 'LATE'}) at ${checkinInfo.checkinTime}` : 'Daily Morning Arrival Check-In'}</strong>
          <div style={{fontSize:12,marginTop:2}}>{checkinInfo ? `Location: ${checkinInfo.gateLocation}. Parent & Manager notified.` : 'Tap check-in upon arriving at the school gate.'}</div>
        </div>

        {!checkinInfo && (
          <button className="btn btn-sm" onClick={handleStudentCheckin} disabled={checkingIn}>
            {checkingIn ? 'Recording...' : 'Tap Check-In Now'}
          </button>
        )}
      </div>

      {/* 1. STUDENT OVERVIEW */}
      {path === '/student' && (
        <div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Attendance Rate</div>
              <div className="value">{data.attendance.percentage}%</div>
            </div>
            <div className="stat-card">
              <div className="label">Academic Average</div>
              <div className="value" style={{color:'var(--primary)'}}>{data.academicAverage}%</div>
            </div>
            <div className="stat-card">
              <div className="label">Division Ranking</div>
              <div className="value" style={{color:'var(--amber)'}}>First Division (A)</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DAY-BY-DAY TASKS */}
      {(path === '/student/daily-work' || path === '/student') && (
        <div style={{marginTop: path === '/student' ? 20 : 0}}>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:12}}>Day-by-Day Syllabus Tasks</h2>
          <div style={{display:'grid',gap:10}}>
            {(data.dailyWorkTasks || []).map(task => {
              const mySubm = (task.submissions || []).find(s => s.studentId === data.student.id);
              return (
                <div key={task.id} className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                  <div>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:2}}>
                      <span className="badge badge-green">{task.dayTitle.split('—')[0]}</span>
                      <span style={{fontSize:12,color:'var(--text-muted)'}}>{task.subjectName} · Due: {task.dueDate}</span>
                    </div>
                    <div style={{fontWeight:600,fontSize:14}}>{task.title}</div>
                    <div style={{fontSize:12.5,color:'var(--text-muted)',marginTop:2}}>{task.instructions}</div>
                  </div>

                  <div>
                    {mySubm ? (
                      <div style={{textAlign:'right'}}>
                        <span className="badge badge-green">Submitted ({mySubm.score}/{task.maxScore})</span>
                      </div>
                    ) : (
                      <button className="btn btn-sm" onClick={() => setSelectedTask(task)}>
                        Submit Task →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. HOMEWORK & STUDENT PROJECT CREATOR */}
      {path === '/student/homework' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h2 style={{fontSize:16,fontWeight:600}}>Homework & Study Projects</h2>
            <button className="btn btn-sm btn-outline" onClick={() => setShowAddHwModal(true)}>+ Add Project / Notes</button>
          </div>
          {data.homework.map(h => (
            <div key={h.id} className="card" style={{marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:600}}>{h.title}</div>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>{h.subjectName} · Due: {h.deadline.split('T')[0]}</div>
              </div>
              <span className="badge badge-green">Submitted</span>
            </div>
          ))}
        </div>
      )}

      {/* 4. MARKS */}
      {path === '/student/marks' && (
        <div>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:12}}>Examination Report Card</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Subject</th><th>Score</th><th>Grade</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.recentMarks.map(m => (
                  <tr key={m.id}>
                    <td style={{fontWeight:600}}>{m.subjectName}</td>
                    <td style={{fontWeight:600,color:'var(--primary)'}}>{m.obtainedScore}/100</td>
                    <td><span className="badge badge-green">{m.grade}</span></td>
                    <td style={{fontSize:12,color:'var(--text-muted)'}}>{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. ATTENDANCE */}
      {path === '/student/attendance' && (
        <div>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:12}}>Attendance Records</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Session</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.attendance.records.map((r, i) => (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>Period 1 (09:00 - 09:50)</td>
                    <td><span className="badge badge-green">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddHwModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'#ffffff',padding:24,borderRadius:8,width:440,border:'1px solid var(--border)'}}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:12}}>Add Self-Study Project</h3>
            <form onSubmit={handleCreateSelfHomework}>
              <div className="form-group"><label>Project Title *</label><input className="input" required value={selfHwTitle} onChange={e => setSelfHwTitle(e.target.value)} /></div>
              <div className="form-group"><label>Subject *</label><input className="input" required value={selfHwSubject} onChange={e => setSelfHwSubject(e.target.value)} /></div>
              <div className="form-group"><label>Notes / Solution *</label><textarea className="input" rows={4} required value={selfHwContent} onChange={e => setSelfHwContent(e.target.value)} /></div>
              <div style={{display:'flex',gap:8,marginTop:16}}>
                <button type="submit" className="btn btn-sm" style={{flex:1}}>Submit</button>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowAddHwModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Task Modal */}
      {selectedTask && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'#ffffff',padding:24,borderRadius:8,width:440,border:'1px solid var(--border)'}}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:4}}>Submit {selectedTask.dayTitle}</h3>
            <p style={{fontSize:12.5,color:'var(--text-muted)',marginBottom:12}}>{selectedTask.title}</p>
            <div className="form-group">
              <label>Solution Text / Notes</label>
              <textarea className="input" rows={4} value={taskAnswer} onChange={e => setTaskAnswer(e.target.value)} placeholder="Type solution notes..." />
            </div>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button className="btn btn-sm" style={{flex:1}} onClick={handleSubmitDailyTask}>Confirm & Send</button>
              <button className="btn btn-sm btn-outline" onClick={() => setSelectedTask(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ----------------------------------------------------
// 6. PARENT PORTAL
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
      alert('Tuition fee payment processed. Receipt generated.');
      load();
    } catch (e) { alert(e.message); }
    finally { setPaying(false); }
  };

  if (!data) return <AppShell role="parent" title="Parent Dashboard" navigate={navigate} path={path}><div className="loading">Loading parent portal...</div></AppShell>;

  const checkin = data.childCheckin;

  return (
    <AppShell role="parent" title={`Parent Portal — Ward: ${data.activeChild.name}`} navigate={navigate} path={path}>
      {/* Real-time Arrival Alert */}
      <div className="alert alert-green" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <strong>Arrival Notification: {data.activeChild.name}</strong>
          <div style={{fontSize:12,marginTop:2}}>Checked in <strong>{checkin ? checkin.status.toUpperCase().replace('_', '-') : 'ON-TIME'}</strong> at {checkin ? checkin.checkinTime : '08:42 AM'} (Gate Kiosk 1).</div>
        </div>
        <span className="badge badge-green">In-School</span>
      </div>

      {/* 1. PARENT OVERVIEW */}
      {path === '/parent' && (
        <div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Ward Name</div>
              <div className="value" style={{fontSize:20}}>{data.activeChild.name}</div>
            </div>
            <div className="stat-card">
              <div className="label">Attendance</div>
              <div className="value">{data.attendancePercentage}%</div>
            </div>
            <div className="stat-card">
              <div className="label">Fee Balance</div>
              <div className="value" style={{color: data.fees.pendingAmount > 0 ? 'var(--red)' : 'var(--primary)'}}>
                ₹{data.fees.pendingAmount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DAY-BY-DAY WORK */}
      {(path === '/parent/daily-work' || path === '/parent') && (
        <div style={{marginTop: path === '/parent' ? 20 : 0}}>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:12}}>Ward's Day-by-Day Work Reports</h2>
          <div style={{display:'grid',gap:10}}>
            {(data.dailyWorkTasks || []).map(task => {
              const subm = (task.submissions || []).find(s => s.studentId === data.activeChild.id);
              return (
                <div key={task.id} className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:600}}>{task.dayTitle} — {task.title}</div>
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>{task.subjectName} · Due: {task.dueDate}</div>
                  </div>
                  <div>
                    {subm ? (
                      <span className="badge badge-green">Submitted ({subm.score}/{task.maxScore})</span>
                    ) : (
                      <span className="badge badge-amber">Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ATTENDANCE */}
      {path === '/parent/attendance' && (
        <div>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:12}}>Ward's Attendance History</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Period</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.attendanceRecords.map((r, i) => (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>Period 1 (09:00 - 09:50)</td>
                    <td><span className="badge badge-green">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. RESULTS */}
      {path === '/parent/results' && (
        <div>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:12}}>Ward's Academic Performance</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Subject</th><th>Marks</th><th>Grade</th></tr>
              </thead>
              <tbody>
                {data.recentMarks.map(m => (
                  <tr key={m.id}>
                    <td style={{fontWeight:600}}>{m.subjectName}</td>
                    <td style={{fontWeight:600,color:'var(--primary)'}}>{m.obtainedScore}/100</td>
                    <td><span className="badge badge-green">{m.grade}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. FEES */}
      {(path === '/parent/fees' || path === '/parent') && (
        <div className="card" style={{marginTop: path === '/parent' ? 20 : 0}}>
          <h2 style={{fontSize:16,fontWeight:600,marginBottom:12}}>Tuition Fees</h2>
          <div style={{background:'#f9fafb',padding:12,borderRadius:4,marginBottom:14,fontSize:13.5}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span>Annual Fee:</span>
              <strong>₹{data.fees.totalAmount.toLocaleString()}</strong>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,color:'var(--primary)'}}>
              <span>Paid:</span>
              <strong>₹{data.fees.paidAmount.toLocaleString()}</strong>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--border)',paddingTop:4,fontWeight:600,color: data.fees.pendingAmount > 0 ? 'var(--red)' : 'var(--primary)'}}>
              <span>Outstanding:</span>
              <span>₹{data.fees.pendingAmount.toLocaleString()}</span>
            </div>
          </div>

          {data.fees.pendingAmount > 0 ? (
            <button className="btn" style={{width:'100%',padding:10}} onClick={handlePayFee} disabled={paying}>
              {paying ? 'Processing...' : `Pay Outstanding Balance (₹${data.fees.pendingAmount.toLocaleString()})`}
            </button>
          ) : (
            <div style={{textAlign:'center',padding:8,background:'#ecfdf5',color:'#065f46',borderRadius:4,fontWeight:600}}>
              All Fees Paid
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

// ----------------------------------------------------
// 7. SUPER ADMIN PORTAL
// ----------------------------------------------------
function SuperAdminPortal({ navigate, path }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/super-admin/dashboard').then(setData).catch(console.error);
  }, []);

  if (!data) return <AppShell role="super_admin" title="Super Admin Portal" navigate={navigate} path={path}><div className="loading">Loading platform data...</div></AppShell>;

  return (
    <AppShell role="super_admin" title="Platform Governance & Telemetry" navigate={navigate} path={path}>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Institutions</div>
          <div className="value">{data.totalInstitutions}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Students</div>
          <div className="value">{data.totalStudents}</div>
        </div>
        <div className="stat-card">
          <div className="label">Faculty Check-Ins Today</div>
          <div className="value" style={{color:'var(--primary)'}}>{data.teacherCheckins ? data.teacherCheckins.length : 2}</div>
        </div>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <h2 style={{fontSize:16,fontWeight:600,marginBottom:8}}>Active Institutions</h2>
        <p><strong>{data.institution.name} ({data.institution.code})</strong> — {data.institution.affiliation}</p>
      </div>

      <h2 style={{fontSize:16,fontWeight:600,marginBottom:12}}>Audit Trail</h2>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Module</th><th>Details</th></tr>
          </thead>
          <tbody>
            {data.recentAuditLogs.map(l => (
              <tr key={l.id}>
                <td>{l.timestamp.split('T')[0]}</td>
                <td style={{fontWeight:600}}>{l.user}</td>
                <td><span className="badge badge-amber">{l.action}</span></td>
                <td>{l.module}</td>
                <td style={{fontSize:12.5,color:'var(--text-muted)'}}>{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
