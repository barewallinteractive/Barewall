import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {onAuthStateChanged} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import {auth, db, firebaseReady, loginWithEmail, registerWithEmail, signOut} from './firebase';
import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock3,
  Code2,
  Film,
  Gauge,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  MailPlus,
  Menu,
  Palette,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
  Zap
} from 'lucide-react';
import './styles.css';

const DEPTS = ['3D', 'Level Design', 'Programming', 'Animation', 'Environment / Lighting', '2D Art'];
const STATUSES = ['Not Started', 'In Progress', 'Completed', 'For Review'];
const statusClass = s => s.toLowerCase().replaceAll(' ', '-');
const icons = {Dashboard: LayoutDashboard, Tasks: CheckCircle2, Team: Users, Time: Clock3};

const demoMembers = [
  {id: 'demo-admin', name: 'Alex Morgan', email: 'admin@forgeops.demo', department: 'Production', role: 'admin', password: 'admin123', totalSeconds: 28620, avatar: 'AM'},
  {id: 'demo-3d', name: 'Maya Chen', email: 'maya@forgeops.demo', department: '3D', role: 'member', password: 'artist123', totalSeconds: 24780, avatar: 'MC'},
  {id: 'demo-code', name: 'Arjun Rao', email: 'arjun@forgeops.demo', department: 'Programming', role: 'member', password: 'programmer123', totalSeconds: 31200, avatar: 'AR'},
  {id: 'demo-level', name: 'Noah Williams', email: 'noah@forgeops.demo', department: 'Level Design', role: 'member', password: 'level123', totalSeconds: 19800, avatar: 'NW'},
  {id: 'demo-anim', name: 'Priya Shah', email: 'priya@forgeops.demo', department: 'Animation', role: 'member', password: 'animator123', totalSeconds: 22140, avatar: 'PS'}
];

const initialDemoInvitations = [
  {
    id: 'demo-inv-1',
    name: 'Elena Rostova',
    email: 'elena@forgeops.demo',
    department: 'Environment / Lighting',
    role: 'member',
    invited: true,
    claimed: false,
    invitedBy: 'demo-admin',
    createdAt: '2026-09-06T10:00:00.000Z'
  }
];

const demoTasks = [
  {id: 't1', title: 'Combat arena greybox', description: 'Block out the first arena and validate traversal lanes.', assigneeId: 'demo-level', department: 'Level Design', status: 'In Progress', priority: 'High', due: '2026-09-12', notes: []},
  {id: 't2', title: 'Character idle polish', description: 'Clean the final idle loop and export game-ready clips.', assigneeId: 'demo-anim', department: 'Animation', status: 'For Review', priority: 'Medium', due: '2026-09-10', notes: []},
  {id: 't3', title: 'Hero material pass', description: 'Finalize roughness and normal response for hero asset.', assigneeId: 'demo-3d', department: '3D', status: 'Not Started', priority: 'Medium', due: '2026-09-14', notes: []},
  {id: 't4', title: 'Save system edge cases', description: 'Handle corrupted saves and version migration.', assigneeId: 'demo-code', department: 'Programming', status: 'Completed', priority: 'Critical', due: '2026-09-08', notes: []}
];

function useDemoData() {
  const [members, setMembers] = useState(() => {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem('forge-members') || 'null');
    } catch {}
    const list = Array.isArray(saved) ? saved : demoMembers;
    const hasAdmin = list.some(m => m.email?.toLowerCase() === 'admin@forgeops.demo' && m.role === 'admin');
    return (hasAdmin ? list : demoMembers).map(m => ({...m, password: m.password || 'demo123'}));
  });
  const [invitations, setInvitations] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('forge-invitations') || 'null');
      return Array.isArray(saved) ? saved : initialDemoInvitations;
    } catch {
      return initialDemoInvitations;
    }
  });
  const [tasks, setTasks] = useState(() => {
    try {
      const x = JSON.parse(localStorage.getItem('forge-tasks') || 'null');
      return Array.isArray(x) ? x : demoTasks;
    } catch {
      return demoTasks;
    }
  });
  const [sessions, setSessions] = useState(() => {
    try {
      const x = JSON.parse(localStorage.getItem('forge-sessions') || '[]');
      return Array.isArray(x) ? x : [];
    } catch {
      return [];
    }
  });

  useEffect(() => localStorage.setItem('forge-members', JSON.stringify(members)), [members]);
  useEffect(() => localStorage.setItem('forge-invitations', JSON.stringify(invitations)), [invitations]);
  useEffect(() => localStorage.setItem('forge-tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('forge-sessions', JSON.stringify(sessions)), [sessions]);

  return {members, setMembers, invitations, setInvitations, tasks, setTasks, sessions, setSessions};
}

function asMillis(v) {
  if (!v) return 0;
  if (typeof v === 'string' || typeof v === 'number') return new Date(v).getTime();
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  return new Date(v).getTime();
}

function fmt(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function initials(name) {
  if (!name || typeof name !== 'string') return 'BW';
  const clean = name.trim();
  if (!clean) return 'BW';
  const parts = clean.split(/\s+/).filter(Boolean);
  const inits = parts.map(x => x[0]).slice(0, 2).join('').toUpperCase();
  return inits || 'BW';
}

function getFirstName(name) {
  if (!name || typeof name !== 'string') return '';
  const clean = name.trim();
  if (!clean) return '';
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts[0] || '';
}

function BrandLogo({compact = false}) {
  return (
    <div className={compact ? 'logo-image-wrap compact' : 'logo-image-wrap'}>
      <img
        src={`${import.meta.env.BASE_URL}LOGO ALONE.png`}
        alt="Barewall Interactive logo"
        onError={e => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling;
          if (fallback) fallback.style.display = 'grid';
        }}
      />
      <div className="logo-icon logo-fallback"><Zap size={19} /></div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {error: null};
  }
  static getDerivedStateFromError(error) {
    return {error};
  }
  componentDidCatch(error) {
    console.error('Barewall Interactive UI error', error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="error-screen">
          <div>
            <div className="logo-icon"><Zap size={19} /></div>
            <h1>Something went wrong</h1>
            <p>{this.state.error?.message || 'Unexpected application error.'}</p>
            <button className="primary" onClick={() => window.location.reload()}>Reload application</button>
            <button className="secondary" onClick={() => { localStorage.removeItem('forge-user'); window.location.reload(); }}>Reset login</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const demo = !firebaseReady;
  const local = useDemoData();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('Dashboard');
  const [sidebar, setSidebar] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [toast, setToast] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(null);

  const [members, setMembers] = useState(local.members);
  const [invitations, setInvitations] = useState(local.invitations);
  const [tasks, setTasks] = useState(local.tasks);
  const [sessions, setSessions] = useState(local.sessions);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const persistUser = u => {
    if (u) localStorage.setItem('forge-user', JSON.stringify({id: u.id, email: u.email}));
    else localStorage.removeItem('forge-user');
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (demo) {
      const saved = JSON.parse(localStorage.getItem('forge-user') || 'null');
      const restored = saved ? local.members.find(m => m.id === saved.id || m.email === saved.email) : null;
      setUser(restored || null);
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, async u => {
      setUser(u);
      if (u) {
        let snap = await getDoc(doc(db, 'members', u.uid));
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          // Check for pending invitation by email
          const invEmail = (u.email || '').toLowerCase();
          const invRef = doc(db, 'invitations', invEmail);
          let invSnap = await getDoc(invRef);
          let invData = invSnap.exists() ? invSnap.data() : null;
          let targetRef = invRef;

          if (!invData) {
            const q = query(collection(db, 'invitations'), where('email', '==', invEmail), where('claimed', '==', false));
            const qs = await getDocs(q);
            if (!qs.empty) {
              invData = qs.docs[0].data();
              targetRef = qs.docs[0].ref;
            }
          }

          if (invData && !invData.claimed) {
            const profileData = {
              name: invData.name || 'Team Member',
              email: invEmail,
              department: invData.department || 'Production',
              role: 'member',
              totalSeconds: 0,
              avatar: initials(invData.name || 'TM'),
              invited: true,
              claimed: true,
              createdAt: serverTimestamp()
            };
            await setDoc(doc(db, 'members', u.uid), profileData);
            await updateDoc(targetRef, {
              claimed: true,
              claimedAt: serverTimestamp(),
              claimedBy: u.uid
            });
            setProfile(profileData);
          } else {
            // Reject/remove accounts that don't have a valid invitation
            try {
              await u.delete();
            } catch (delErr) {
              console.warn('Could not delete uninvited auth user, signing out', delErr);
              await signOut(auth);
            }
            setUser(null);
            setProfile(null);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, [demo]);

  const userId = user?.uid || user?.id || null;
  const current = useMemo(
    () => members.find(m => m.id === userId) || members.find(m => m.email?.toLowerCase() === user?.email?.toLowerCase()) || profile,
    [members, profile, user, userId]
  );
  const isAdmin = current?.role === 'admin';

  useEffect(() => {
    if (!demo && user) {
      console.log('[Firestore Listeners] Initializing active listeners for members, tasks, and sessions');

      console.log('[members listener] Attaching snapshot listener to collection("members")');
      const un1 = onSnapshot(
        collection(db, 'members'),
        s => {
          console.log('[members listener] Success! Received snapshot with', s.docs.length, 'documents');
          setMembers(s.docs.map(d => ({id: d.id, ...d.data()})));
        },
        err => {
          console.error('[members listener] Permission or snapshot error:', err);
        }
      );

      console.log('[tasks listener] Attaching snapshot listener to query(collection("tasks"), orderBy("createdAt", "desc"))');
      const un2 = onSnapshot(
        query(collection(db, 'tasks'), orderBy('createdAt', 'desc')),
        s => {
          console.log('[tasks listener] Success! Received snapshot with', s.docs.length, 'documents');
          setTasks(s.docs.map(d => ({id: d.id, ...d.data()})));
        },
        err => {
          console.error('[tasks listener] Permission or snapshot error:', err);
        }
      );

      console.log('[sessions listener] Attaching snapshot listener to collection("sessions")');
      const un3 = onSnapshot(
        collection(db, 'sessions'),
        s => {
          console.log('[sessions listener] Success! Received snapshot with', s.docs.length, 'documents');
          setSessions(s.docs.map(d => ({id: d.id, ...d.data()})));
        },
        err => {
          console.error('[sessions listener] Permission or snapshot error:', err);
        }
      );

      return () => {
        console.log('[Firestore Listeners] Detaching members, tasks, and sessions listeners');
        un1();
        un2();
        un3();
      };
    }
  }, [demo, user]);

  // Invitations listener: Admins listen to collection("invitations"); invited/non-admin members query strictly where('email', '==', userEmail)
  useEffect(() => {
    if (!demo && user && user.email) {
      const userEmail = (user.email || '').trim().toLowerCase();
      const invQuery = isAdmin
        ? collection(db, 'invitations')
        : query(collection(db, 'invitations'), where('email', '==', userEmail));

      console.log(`[invitations listener] Attaching snapshot listener (${isAdmin ? 'Admin: all invitations' : `Invited Member: email == "${userEmail}"`})`);
      const un0 = onSnapshot(
        invQuery,
        s => {
          console.log('[invitations listener] Success! Received snapshot with', s.docs.length, 'documents');
          setInvitations(s.docs.map(d => ({id: d.id, ...d.data()})));
        },
        err => {
          console.error('[invitations listener] Permission or snapshot error:', err);
        }
      );

      return () => {
        console.log('[invitations listener] Detaching invitations snapshot listener');
        un0();
      };
    }
  }, [demo, user, isAdmin]);
  const activeSession = sessions.find(s => s.userId === userId && !s.endedAt);
  const liveSeconds = activeSession ? Math.max(0, Math.floor((now - asMillis(activeSession.startedAt)) / 1000)) : 0;
  const deptStats = DEPTS.map(d => ({
    dept: d,
    seconds: members.filter(m => m.department === d).reduce((a, m) => a + (m.totalSeconds || 0) + (m.id === userId ? liveSeconds : 0), 0)
  }));
  const flash = x => {
    setToast(x);
    setTimeout(() => setToast(''), 2500);
  };

  async function startWork() {
    if (activeSession) return;
    const s = {userId, startedAt: new Date().toISOString()};
    if (demo) {
      const ns = {id: crypto.randomUUID(), ...s};
      setSessions([...sessions, ns]);
    } else {
      await addDoc(collection(db, 'sessions'), {...s, startedAt: serverTimestamp()});
    }
    flash('Work session started');
  }

  async function stopWork() {
    if (!activeSession) return;
    const elapsed = Math.max(0, Math.floor((now - asMillis(activeSession.startedAt)) / 1000));
    if (demo) {
      setSessions(sessions.map(s => (s.id === activeSession.id ? {...s, endedAt: new Date().toISOString(), duration: elapsed} : s)));
      setMembers(members.map(m => (m.id === userId ? {...m, totalSeconds: (m.totalSeconds || 0) + elapsed} : m)));
    } else {
      await updateDoc(doc(db, 'sessions', activeSession.id), {endedAt: serverTimestamp(), duration: elapsed});
      await updateDoc(doc(db, 'members', userId), {totalSeconds: (current.totalSeconds || 0) + elapsed});
    }
    flash('Work session saved');
  }

  async function changeTask(id, status) {
    if (demo) setTasks(tasks.map(t => (t.id === id ? {...t, status} : t)));
    else await updateDoc(doc(db, 'tasks', id), {status, updatedAt: serverTimestamp()});
    flash('Task updated');
  }

  async function addTaskNote(id, text) {
    const author = {authorId: userId, authorName: current?.name || 'Team Member', text, createdAt: new Date().toISOString()};
    if (demo) {
      setTasks(tasks.map(t => (t.id === id ? {...t, notes: [...(t.notes || []), author]} : t)));
    } else {
      const target = tasks.find(t => t.id === id);
      await updateDoc(doc(db, 'tasks', id), {notes: [...(target?.notes || []), author], updatedAt: serverTimestamp()});
    }
    flash('Update added');
  }

  // Spark invitation creation: only admins, name, email, department, role=member, invited=true, claimed=false. No password stored.
  async function inviteMember(e) {
    e.preventDefault();
    if (!isAdmin) {
      flash('Admin access required');
      return;
    }
    const f = new FormData(e.currentTarget);
    const email = f.get('email').trim().toLowerCase();
    const name = f.get('name').trim();
    const dept = f.get('department');

    if (members.some(m => m.email?.toLowerCase() === email)) {
      flash('That email is already a registered team member');
      return;
    }
    if (invitations.some(i => i.email?.toLowerCase() === email && !i.claimed)) {
      flash('A pending invitation already exists for that email');
      return;
    }

    try {
      if (demo) {
        const item = {
          id: 'inv-' + crypto.randomUUID(),
          name,
          email,
          department: dept,
          role: 'member',
          invited: true,
          claimed: false,
          invitedBy: current?.id || 'demo-admin',
          createdAt: new Date().toISOString()
        };
        setInvitations([...invitations, item]);
        setInviteSuccess({name, email, department: dept});
      } else {
        await setDoc(doc(db, 'invitations', email), {
          name,
          email,
          department: dept,
          role: 'member',
          invited: true,
          claimed: false,
          invitedBy: userId,
          createdAt: serverTimestamp()
        });
        setInviteSuccess({name, email, department: dept});
      }
      setShowInvite(false);
      flash(`Invitation created for ${email}`);
    } catch (err) {
      console.error(err);
      flash(err?.message || 'Could not create team invitation');
    }
  }

  async function cancelInvitation(inv) {
    if (!isAdmin) return;
    try {
      if (demo) {
        setInvitations(invitations.filter(i => i.id !== inv.id));
      } else {
        await deleteDoc(doc(db, 'invitations', inv.id || inv.email));
      }
      flash(`Cancelled invitation for ${inv.email}`);
    } catch (err) {
      console.error(err);
      flash(err?.message || 'Could not cancel invitation');
    }
  }

  async function removeMember(member) {
  if (!isAdmin || member.role === 'admin' || member.id === userId) return;

  const confirmed = window.confirm(
    `Remove ${member.name} from the active team?\n\nTheir previous tasks and recorded work history will be kept.`
  );

  if (!confirmed) return;

  try {
    if (demo) {
      setMembers(members.filter(m => m.id !== member.id));
    } else {
      await deleteDoc(doc(db, 'members', member.id));
    }

    flash(`${member.name} removed from the active team`);
  } catch (err) {
    console.error(err);
    flash(err?.message || 'Could not remove team member');
  }
}

  async function doLogin(email, password) {
    const clean = (email || '').trim().toLowerCase();
    if (demo) {
      const u = members.find(m => m.email.toLowerCase() === clean && m.password === password);
      if (!u) {
        return {success: false, error: 'Invalid demo email or password.'};
      }
      setUser(u);
      persistUser(u);
      flash(`Signed in as ${u.name}${u.role === 'admin' ? ' (Admin)' : ''}`);
      return {success: true};
    }
    try {
      await loginWithEmail(clean, password);
      return {success: true};
    } catch (err) {
      console.error(err);
      let msg = 'Email or password is incorrect.';
      if (err?.code === 'auth/user-not-found') msg = 'No account found with this email.';
      if (err?.code === 'auth/wrong-password') msg = 'Incorrect password.';
      return {success: false, error: msg};
    }
  }

  // Spark invited team account creation: creates Firebase Auth account, checks pending invitation, creates members/{uid}, marks claimed. Rejects uninvited.
  async function doRegister(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (demo) {
      const pending = invitations.find(i => i.email.toLowerCase() === cleanEmail && !i.claimed);
      if (!pending) {
        return {
          success: false,
          error: 'No pending invitation found for this email. Ask your studio administrator to invite you first.'
        };
      }
      const newMember = {
        id: 'mem-' + crypto.randomUUID(),
        name: pending.name,
        email: cleanEmail,
        department: pending.department,
        role: 'member',
        password,
        totalSeconds: 0,
        avatar: initials(pending.name),
        invited: true,
        claimed: true,
        createdAt: new Date().toISOString()
      };
      setInvitations(invitations.map(i => (i.id === pending.id ? {...i, claimed: true, claimedAt: new Date().toISOString()} : i)));
      setMembers([...members, newMember]);
      setUser(newMember);
      persistUser(newMember);
      flash(`Welcome to Barewall Interactive, ${newMember.name}!`);
      return {success: true};
    }

    try {
      // 1. Create Firebase Auth account
      const cred = await registerWithEmail(cleanEmail, password);
      const u = cred.user;

      // 2. Find pending invitation by email in Firestore
      const invRef = doc(db, 'invitations', cleanEmail);
      let invSnap = await getDoc(invRef);
      let invData = invSnap.exists() ? invSnap.data() : null;
      let targetRef = invRef;

      if (!invData) {
        const q = query(collection(db, 'invitations'), where('email', '==', cleanEmail), where('claimed', '==', false));
        const qs = await getDocs(q);
        if (!qs.empty) {
          invData = qs.docs[0].data();
          targetRef = qs.docs[0].ref;
        }
      }

      // 3. Reject/remove accounts that don't have a valid invitation
      if (!invData || invData.claimed) {
        try {
          await u.delete();
        } catch (delErr) {
          console.warn('Could not delete uninvited user account:', delErr);
          await signOut(auth);
        }
        return {
          success: false,
          error: 'No valid pending invitation found for this email. Contact your studio administrator.'
        };
      }

      // 4. Create members/{uid} profile
      const profileData = {
        name: invData.name || 'Team Member',
        email: cleanEmail,
        department: invData.department || 'Production',
        role: 'member',
        totalSeconds: 0,
        avatar: initials(invData.name || 'TM'),
        invited: true,
        claimed: true,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'members', u.uid), profileData);

      // 5. Mark invitation claimed
      await updateDoc(targetRef, {
        claimed: true,
        claimedAt: serverTimestamp(),
        claimedBy: u.uid
      });

      setProfile(profileData);
      flash(`Account created! Welcome, ${profileData.name}`);
      return {success: true};
    } catch (err) {
      console.error('Registration error:', err);
      let msg = err?.message || 'Failed to create invited account.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
      } else if (err?.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      return {success: false, error: msg};
    }
  }

  async function doLogout() {
    if (demo) {
      persistUser(null);
      setUser(null);
      setView('Dashboard');
      return;
    }
    await signOut(auth);
    setUser(null);
  }

  if (loading) {
    return (
      <div className="splash">
        <div className="brand-mark"><Sparkles size={22} /></div>
        <div>
          <b>Barewall Interactive</b>
          <span>initializing studio workspace…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={doLogin} onRegister={doRegister} demo={demo} invitations={invitations} />;
  }

  return (
    <div className="app">
      <aside className={sidebar ? 'sidebar open' : 'sidebar'}>
        <div className="logo">
          <BrandLogo />
          <div>
            <b>Barewall Interactive</b>
            <small>STUDIO OPERATIONS</small>
          </div>
        </div>
        <nav>
          {['Dashboard', 'Tasks', 'Team', 'Time'].map(v => {
            const I = icons[v];
            return (
              <button key={v} className={view === v ? 'nav active' : 'nav'} onClick={() => { setView(v); setSidebar(false); }}>
                <I size={18} />
                {v}
              </button>
            );
          })}
        </nav>
        <div className="side-bottom">
          <div className="mini-status">
            <span className="pulse"></span>
            <span>Studio systems online</span>
          </div>
          <button className="profile-mini" onClick={doLogout} title="Sign out of workspace">
            <div className="avatar">{initials(current?.name)}</div>
            <div>
              <b>{current?.name || user.displayName || 'Team Member'}</b>
              <span>{isAdmin ? 'Administrator' : current?.department || 'Team Member'}</span>
            </div>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header>
          <button className="mobile-menu" onClick={() => setSidebar(!sidebar)}><Menu /></button>
          <div>
            <p className="eyebrow">GAME DEVELOPMENT / {view.toUpperCase()}</p>
            <h1>{view === 'Dashboard' ? 'Studio command center' : view}</h1>
          </div>
          <div className="header-actions">
            <div className="live-chip">
              <span className="pulse"></span>
              {!isOnline ? 'OFFLINE' : (activeSession ? 'WORKING' : 'ONLINE')}
            </div>
            <div className="avatar big">{initials(current?.name || user.displayName)}</div>
          </div>
        </header>

        {toast && <div className="toast"><CheckCircle2 size={16} />{toast}</div>}

        {view === 'Dashboard' && (
          <Dashboard
            current={current}
            members={members}
            tasks={tasks}
            deptStats={deptStats}
            liveSeconds={liveSeconds}
            activeSession={activeSession}
            startWork={startWork}
            stopWork={stopWork}
            isAdmin={isAdmin}
            onTasks={() => setView('Tasks')}
          />
        )}
        {view === 'Tasks' && (
          <TasksView
            tasks={tasks}
            members={members}
            current={current}
            isAdmin={isAdmin}
            changeTask={changeTask}
            addTaskNote={addTaskNote}
            demo={demo}
            setTasks={setTasks}
          />
        )}
        {view === 'Team' && (
          <TeamView
            members={members}
            invitations={invitations}
            deptStats={deptStats}
            isAdmin={isAdmin}
            onInvite={() => setShowInvite(true)}
            onCancelInvite={cancelInvitation}
            onRemoveMember={removeMember}
          />
        )}
        {view === 'Time' && (
          <TimeView
            members={members}
            deptStats={deptStats}
            sessions={sessions}
            now={now}
          />
        )}

        <footer>
          Barewall Interactive • Developed by Adithyan V <span>Spark Flow v1.2</span>
        </footer>
      </main>

      {showInvite && (
        <Modal title="Invite by email" onClose={() => setShowInvite(false)}>
          <form className="form" onSubmit={inviteMember}>
            <label>
              Full name
              <input name="name" required placeholder="Jordan Lee" autoFocus />
            </label>
            <label>
              Work email
              <input name="email" type="email" required placeholder="jordan@barewallinteractive.com" />
            </label>
            <label>
              Department
              <select name="department" defaultValue="3D">
                {DEPTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </label>
            <p className="hint">
              <strong>Spark Invitation:</strong> The admin creates a pending invitation in Firestore. No password is generated or stored. The team member will create their own secure password using <em>"First time? Create your invited team account"</em> on the login screen.
            </p>
            <button className="primary wide"><Send size={16} /> Send invitation</button>
          </form>
        </Modal>
      )}

      {inviteSuccess && (
        <Modal title="Invitation Created" onClose={() => setInviteSuccess(null)}>
          <div className="credential-box">
            <span>PENDING INVITATION</span>
            <b>{inviteSuccess.name}</b>
            <code>{inviteSuccess.email}</code>
            <p>
              An invitation was registered for <strong>{inviteSuccess.email}</strong> in the <strong>{inviteSuccess.department}</strong> department with <code>role: "member"</code>.
            </p>
            <p>
              The invited team member can now open Barewall Interactive, click <strong>"First time? Create your invited team account"</strong> on the login screen, enter this email address, and set their own password.
            </p>
          </div>
          <button className="primary wide" onClick={() => setInviteSuccess(null)}>Done</button>
        </Modal>
      )}
    </div>
  );
}

function Login({onLogin, onRegister, demo, invitations = []}) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'invited'
  const [email, setEmail] = useState(demo ? 'admin@forgeops.demo' : '');
  const [password, setPassword] = useState(demo ? 'admin123' : '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pendingInvitations = invitations.filter(i => !i.claimed);

  const handleSignIn = async e => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await onLogin(email, password);
    setBusy(false);
    if (!res.success) {
      setError(res.error || 'Email or password is incorrect.');
    }
  };

  const handleRegister = async e => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const res = await onRegister(email, password);
    setBusy(false);
    if (!res.success) {
      setError(res.error || 'Failed to create invited account.');
    }
  };

  const fill = (e, p) => {
    setEmail(e);
    setPassword(p);
    setError('');
  };

  const selectInvitedDemo = inv => {
    setEmail(inv.email);
    setPassword('invited123');
    setConfirmPassword('invited123');
    setMode('invited');
    setError('');
  };

  return (
    <div className="login">
      <div className="login-art">
        <div className="grid"></div>
        <div className="orb orb1"></div>
        <div className="orb orb2"></div>
        <div className="login-copy">
          <span className="kicker">INTERNAL STUDIO OS</span>
          <h1>Ship better.<br /><em>See everything.</em></h1>
          <p>One workspace for production time, tasks, people, and momentum.</p>
          <div className="feature-row">
            <span><Gauge size={16} />Live production</span>
            <span><Users size={16} />Team visibility</span>
            <span><ShieldCheck size={16} />Role-based access</span>
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="logo login-logo">
          <BrandLogo />
          <div>
            <b>Barewall Interactive</b>
            <small>STUDIO OPERATIONS</small>
          </div>
        </div>

        <div className="login-card">
          {mode === 'signin' ? (
            <>
              <span className="kicker">WELCOME BACK</span>
              <h2>Enter the studio.</h2>
              <p>
                {demo
                  ? 'Sign in with one of the local demo accounts or test invited onboarding below.'
                  : 'Sign in with your Barewall Interactive email and password.'}
              </p>

              <form className="form" onSubmit={handleSignIn}>
                <label>
                  Work email
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="you@barewallinteractive.com"
                  />
                </label>
                <label>
                  Password
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type="password"
                    required
                    placeholder="••••••••"
                  />
                </label>
                {error && <div className="login-error">{error}</div>}
                <button className="primary wide" disabled={busy}>
                  {busy ? 'Signing in…' : <>Sign in <ArrowRight size={17} /></>}
                </button>
              </form>

              <div className="auth-switch">
                <span>First time?</span>
                <button
                  type="button"
                  className="link-btn accent"
                  onClick={() => {
                    setMode('invited');
                    setError('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Create your invited team account
                </button>
              </div>

              {demo && (
                <>
                  <div className="demo-accounts">
                    <span>QUICK DEMO ACCOUNTS</span>
                    <button type="button" onClick={() => fill('admin@forgeops.demo', 'admin123')}>
                      <b>Admin</b>
                      <small>admin@forgeops.demo · admin123</small>
                    </button>
                    <button type="button" onClick={() => fill('maya@forgeops.demo', 'artist123')}>
                      <b>3D Artist</b>
                      <small>maya@forgeops.demo · artist123</small>
                    </button>
                    <button type="button" onClick={() => fill('arjun@forgeops.demo', 'programmer123')}>
                      <b>Programmer</b>
                      <small>arjun@forgeops.demo · programmer123</small>
                    </button>
                    <button type="button" onClick={() => fill('noah@forgeops.demo', 'level123')}>
                      <b>Level Designer</b>
                      <small>noah@forgeops.demo · level123</small>
                    </button>
                    <button type="button" onClick={() => fill('priya@forgeops.demo', 'animator123')}>
                      <b>Animator</b>
                      <small>priya@forgeops.demo · animator123</small>
                    </button>

                    {pendingInvitations.length > 0 && (
                      <>
                        <span style={{marginTop: 8}}>PENDING INVITATIONS</span>
                        {pendingInvitations.map(inv => (
                          <button key={inv.id || inv.email} type="button" onClick={() => selectInvitedDemo(inv)}>
                            <b>Activate: {inv.name}</b>
                            <small>{inv.email} · ({inv.department})</small>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="demo-note">
                    <Sparkles size={15} />
                    <span>
                      <b>Spark invitation flow active</b><br />
                      Admins create pending invitations without passwords. Invited members create their own password.
                    </span>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <span className="kicker">TEAM ONBOARDING</span>
              <h2>Activate your account.</h2>
              <p>Enter your invited work email and create your password to access Barewall Interactive.</p>

              <form className="form" onSubmit={handleRegister}>
                <label>
                  Invited work email
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="you@barewallinteractive.com"
                    autoFocus
                  />
                </label>
                <label>
                  Create password
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                  />
                </label>
                <label>
                  Confirm password
                  <input
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    type="password"
                    required
                    minLength={6}
                    placeholder="Re-enter password"
                  />
                </label>
                {error && <div className="login-error">{error}</div>}
                <button className="primary wide" disabled={busy}>
                  {busy ? 'Activating account…' : <>Create invited account <UserPlus size={17} /></>}
                </button>
              </form>

              <div className="auth-switch">
                <span>Already set up your account?</span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setMode('signin');
                    setError('');
                  }}
                >
                  Sign in to studio
                </button>
              </div>

              {demo && pendingInvitations.length > 0 && (
                <div className="demo-accounts" style={{marginTop: 18}}>
                  <span>SELECT PENDING INVITATION TO TEST</span>
                  {pendingInvitations.map(inv => (
                    <button key={inv.id || inv.email} type="button" onClick={() => selectInvitedDemo(inv)}>
                      <b>{inv.name}</b>
                      <small>{inv.email} · {inv.department}</small>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="login-foot">Secure workspace • Authorized team members only</div>
      </div>
    </div>
  );
}

function Dashboard({current, members, tasks, deptStats, liveSeconds, activeSession, startWork, stopWork, isAdmin, onTasks}) {
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const review = tasks.filter(t => t.status === 'For Review').length;

  return (
    <section className="content">
      <div className="hero">
        <div>
          <span className="kicker">GOOD DAY, {(getFirstName(current?.name) || 'DEVELOPER').toUpperCase()}</span>
          <h2>Make the next build<br /><em>worth shipping.</em></h2>
          <p>Track production health across every discipline without slowing the team down.</p>
        </div>
        <div className="work-widget">
          <div className="work-top">
            <div>
              <span>MY TIME TODAY</span>
              <strong>{fmt((current?.totalSeconds || 0) + liveSeconds)}</strong>
            </div>
            <div className={activeSession ? 'timer-dot active' : 'timer-dot'}><Clock3 size={19} /></div>
          </div>
          {activeSession ? (
            <button className="stop" onClick={stopWork}>
              <span className="square"></span> Stop work <small>{fmt(liveSeconds)}</small>
            </button>
          ) : (
            <button className="primary" onClick={startWork}>
              <LogIn size={17} /> Start work
            </button>
          )}
          <div className="work-hint">{activeSession ? 'Live session is running' : 'Clock in when you start your shift'}</div>
        </div>
      </div>

      <div className="stats">
        <Stat label="Team members" value={members.length} sub="across production" icon={<Users />} />
        <Stat label="Active tasks" value={tasks.filter(t => t.status === 'In Progress').length} sub="currently moving" icon={<Activity />} />
        <Stat label="For review" value={review} sub="awaiting feedback" icon={<RefreshCw />} />
        <Stat label="Completed" value={completed} sub="in current board" icon={<CheckCircle2 />} />
      </div>

      <div className="section-head">
        <div>
          <span className="kicker">PRODUCTION PULSE</span>
          <h3>Hours by discipline</h3>
        </div>
        <span className="muted">All recorded studio time</span>
      </div>

      <div className="dept-grid">
        {deptStats.map(x => (
          <div className="dept-card" key={x.dept}>
            <div className="dept-icon"><DeptIcon dept={x.dept} /></div>
            <div>
              <b>{x.dept}</b>
              <span>{fmt(x.seconds)}</span>
            </div>
            <div className="bar">
              <i style={{width: `${Math.min(100, Math.max(8, x.seconds / 360))}%`}}></i>
            </div>
          </div>
        ))}
      </div>

      <div className="section-head task-head">
        <div>
          <span className="kicker">WORK QUEUE</span>
          <h3>Recent tasks</h3>
        </div>
        <button className="text-btn" onClick={onTasks}>View all <ArrowRight size={15} /></button>
      </div>

      <div className="task-list">
        {tasks.slice(0, 4).map(t => <TaskRow key={t.id} task={t} members={members} />)}
      </div>
    </section>
  );
}

function Stat({label, value, sub, icon}) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    </div>
  );
}

function DeptIcon({dept}) {
  if (dept === '3D') return <Boxes size={19} />;
  if (dept === 'Programming') return <Code2 size={19} />;
  if (dept === 'Animation') return <Film size={19} />;
  if (dept === '2D Art') return <Palette size={19} />;
  if (dept === 'Environment / Lighting') return <Sparkles size={19} />;
  return <LayoutDashboard size={19} />;
}

function TaskRow({task, members}) {
  const m = members.find(x => x.id === task.assigneeId);
  return (
    <div className="task-row">
      <div className="task-main">
        <span className={`status-dot ${statusClass(task.status)}`}></span>
        <div>
          <b>{task.title}</b>
          <span>{task.department} • {m?.name || 'Unassigned'}</span>
        </div>
      </div>
      <span className={`badge ${statusClass(task.status)}`}>{task.status}</span>
      <span className={`priority ${task.priority?.toLowerCase()}`}>{task.priority}</span>
    </div>
  );
}

function TasksView({tasks, members, current, isAdmin, changeTask, addTaskNote, demo, setTasks}) {
  const [filter, setFilter] = useState('All');
  const [showNew, setShowNew] = useState(false);
  const visible = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);
  const boardTasks = isAdmin ? visible : visible.filter(t => t.assigneeId === current?.id);

  async function create(e) {
    e.preventDefault();
    if (!isAdmin) return;
    const f = new FormData(e.currentTarget);
    const assignee = f.get('assignee');
    const t = {
      title: f.get('title'),
      description: f.get('description'),
      assigneeId: assignee,
      department: members.find(m => m.id === assignee)?.department || '3D',
      status: 'Not Started',
      priority: f.get('priority'),
      due: f.get('due'),
      notes: []
    };
    if (demo) setTasks([{id: crypto.randomUUID(), ...t}, ...tasks]);
    else await addDoc(collection(db, 'tasks'), {...t, createdAt: serverTimestamp()});
    setShowNew(false);
  }

  return (
    <section className="content">
      <div className="page-tools">
        <div>
          <span className="kicker">PRODUCTION BOARD</span>
          <h2>{isAdmin ? 'Task Assignment' : 'My Tasks'}</h2>
          <p>
            {isAdmin
              ? 'Only administrators can assign work. Team members update progress and add delivery notes.'
              : 'Work assigned to you by the administrator. Update your status and leave notes for the team.'}
          </p>
        </div>
        {isAdmin && (
          <button className="primary" onClick={() => setShowNew(true)}>
            <Plus size={17} /> Assign task
          </button>
        )}
      </div>

      <div className="filters">
        {['All', ...STATUSES].map(x => (
          <button className={filter === x ? 'selected' : ''} key={x} onClick={() => setFilter(x)}>
            {x}
          </button>
        ))}
      </div>

      <div className="board">
        {boardTasks.map(t => (
          <TaskCard
            key={t.id}
            task={t}
            members={members}
            current={current}
            isAdmin={isAdmin}
            changeTask={changeTask}
            addTaskNote={addTaskNote}
          />
        ))}
      </div>

      {boardTasks.length === 0 && (
        <div className="empty-state">
          <CheckCircle2 size={24} />
          <h3>{isAdmin ? 'No tasks yet' : 'No tasks assigned to you'}</h3>
          <p>{isAdmin ? 'Create the first assignment for your team.' : 'Your administrator will assign work here.'}</p>
        </div>
      )}

      {showNew && (
        <Modal title="Assign task" onClose={() => setShowNew(false)}>
          <form className="form" onSubmit={create}>
            <label>
              Task title
              <input name="title" required placeholder="e.g. Boss arena lighting pass" />
            </label>
            <label>
              Description
              <textarea name="description" rows="3" placeholder="What needs to be delivered?" />
            </label>
            <label>
              Assign to
              <select name="assignee" required defaultValue="">
                <option value="" disabled>Select team member</option>
                {members.filter(m => m.role !== 'admin').map(m => (
                  <option value={m.id} key={m.id}>{m.name} — {m.department}</option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Priority
                <select name="priority" defaultValue="Medium">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </label>
              <label>
                Due date
                <input name="due" type="date" />
              </label>
            </div>
            <button className="primary wide">Assign task <ArrowRight size={17} /></button>
          </form>
        </Modal>
      )}
    </section>
  );
}

function TaskCard({task, members, current, isAdmin, changeTask, addTaskNote}) {
  const [note, setNote] = useState('');
  const m = members.find(x => x.id === task.assigneeId);
  const canEdit = !isAdmin && task.assigneeId === current?.id;

  return (
    <div className="task-card">
      <div className="task-card-top">
        <span className={`badge ${statusClass(task.status)}`}>{task.status}</span>
        <span className={`priority ${task.priority?.toLowerCase()}`}>{task.priority}</span>
      </div>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <div className="task-meta">
        <div className="assignee">
          <div className="avatar">{initials(m?.name || 'NA')}</div>
          <span>{m?.name || 'Unassigned'}</span>
        </div>
        <span>Due {task.due || '—'}</span>
      </div>

      {canEdit && (
        <>
          <label className="inline-label">
            Your status
            <select value={task.status} onChange={e => changeTask(task.id, e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <div className="note-box">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows="2"
              placeholder="Add a progress note, blocker or delivery message…"
            />
            <button
              className="secondary"
              onClick={() => {
                if (note.trim()) {
                  addTaskNote(task.id, note);
                  setNote('');
                }
              }}
            >
              Add update
            </button>
          </div>
        </>
      )}

      {isAdmin && (
        <div className="admin-task-state">
          <span>Team member status</span>
          <strong>{task.status}</strong>
          {task.notes?.length > 0 && <small>{task.notes.length} update{task.notes.length > 1 ? 's' : ''}</small>}
        </div>
      )}

      {task.notes?.length > 0 && (
        <div className="task-notes">
          {task.notes.slice(-3).map((n, i) => (
            <div key={i}>
              <b>{n.authorName}</b>
              <span>{n.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

  function TeamView({members, invitations = [], deptStats, isAdmin, onInvite, onCancelInvite, onRemoveMember}) {
  const pendingInvitations = invitations.filter(i => !i.claimed);

  return (
    <section className="content">
      <div className="page-tools">
        <div>
          <span className="kicker">PEOPLE</span>
          <h2>Team</h2>
          <p>Everyone working on the project, grouped by discipline.</p>
        </div>
        {isAdmin && (
          <button className="primary" onClick={onInvite}>
            <MailPlus size={17} /> Invite by email
          </button>
        )}
      </div>

      {pendingInvitations.length > 0 && (
        <>
          <div className="section-head">
            <div>
              <span className="kicker">SPARK ONBOARDING QUEUE</span>
              <h3>Pending invitations ({pendingInvitations.length})</h3>
            </div>
            <span className="muted">Awaiting account activation by email</span>
          </div>

          <div className="invitation-list">
            {pendingInvitations.map(inv => (
              <div className="invitation-card" key={inv.id || inv.email}>
                <div className="invitation-head">
                  <div>
                    <h4>{inv.name}</h4>
                    <p>{inv.email}</p>
                  </div>
                  <span className="badge pending">INVITATION PENDING</span>
                </div>
                <div className="invitation-foot">
                  <span>Department: <b>{inv.department}</b></span>
                  {isAdmin && (
                    <button
                      className="delete-btn"
                      title="Cancel invitation"
                      onClick={() => onCancelInvite(inv)}
                    >
                      <Trash2 size={13} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-head" style={{marginTop: pendingInvitations.length > 0 ? 10 : 0}}>
        <div>
          <span className="kicker">ACTIVE ROSTER</span>
          <h3>Active team members ({members.length})</h3>
        </div>
      </div>

      <div className="team-grid">
        {members.map(m => (
          <div className="member-card" key={m.id}>
            <div className="member-head">
              <div className="avatar large">{m.avatar || initials(m.name)}</div>
              <span className={m.role === 'admin' ? 'role admin' : 'role'}>
                {m.role === 'admin' ? 'ADMIN' : 'TEAM MEMBER'}
              </span>
            </div>
            <h3>{m.name}</h3>
            <p>{m.email}</p>
            <div className="member-foot">
              <span>{m.department}</span>
              <strong>{fmt(m.totalSeconds || 0)}</strong>

              {isAdmin && m.role !== 'admin' && (
                <button
                  className="delete-btn"
                  title={`Remove ${m.name}`}
                  onClick={() => onRemoveMember(m)}
                >
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="section-head">
        <div>
          <span className="kicker">DEPARTMENT TOTALS</span>
          <h3>Studio time</h3>
        </div>
      </div>

      <div className="table">
        <div className="tr th">
          <span>Department</span>
          <span>Members</span>
          <span>Total hours</span>
          <span>Share</span>
        </div>
        {deptStats.map(d => {
          const count = members.filter(m => m.department === d.dept).length;
          return (
            <div className="tr" key={d.dept}>
              <span><DeptIcon dept={d.dept} />{d.dept}</span>
              <span>{count}</span>
              <span>{fmt(d.seconds)}</span>
              <span>
                <div className="bar">
                  <i style={{width: `${Math.min(100, d.seconds / 360)}%`}}></i>
                </div>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TimeView({members, deptStats, sessions, now}) {
  return (
    <section className="content">
      <div className="page-tools">
        <div>
          <span className="kicker">TIME TRACKING</span>
          <h2>Studio hours</h2>
          <p>Transparent time totals across the entire production team.</p>
        </div>
        <div className="total-time">
          <span>TOTAL RECORDED</span>
          <b>{fmt(members.reduce((a, m) => a + (m.totalSeconds || 0), 0))}</b>
        </div>
      </div>

      <div className="time-grid">
        {members.map(m => (
          <div className="time-card" key={m.id}>
            <div className="time-avatar avatar">{m.avatar || initials(m.name)}</div>
            <div>
              <b>{m.name}</b>
              <span>{m.department}</span>
            </div>
            <strong>{fmt(m.totalSeconds || 0)}</strong>
          </div>
        ))}
      </div>

      <div className="section-head">
        <div>
          <span className="kicker">ACTIVITY</span>
          <h3>Department distribution</h3>
        </div>
      </div>

      <div className="dept-grid">
        {deptStats.map(d => (
          <div className="dept-card" key={d.dept}>
            <div className="dept-icon"><DeptIcon dept={d.dept} /></div>
            <div>
              <b>{d.dept}</b>
              <span>{fmt(d.seconds)}</span>
            </div>
            <div className="bar">
              <i style={{width: `${Math.min(100, d.seconds / 360)}%`}}></i>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Modal({title, onClose, children}) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <div>
            <span className="kicker">BAREWALL INTERACTIVE</span>
            <h3>{title}</h3>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
