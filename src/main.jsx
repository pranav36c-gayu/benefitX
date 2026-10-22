import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, Bookmark, BriefcaseBusiness,
  Check, ChevronDown, CircleHelp, GraduationCap, HeartHandshake, Landmark,
  LockKeyhole, LogOut, Mail, Menu, Search, ShieldCheck, Sparkles, Star,
  Users, Wallet, X, Zap, Clock3, Filter, ExternalLink, RefreshCw, CircleUserRound,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabase';
import './styles.css';

const DEMO_SCHEMES = [
  {
    id: 'demo-post-matric', title: 'Post-Matric Scholarship', category: 'scholarship',
    provider: 'Government scholarship programme', description: 'Financial support for eligible students continuing education after Class 10.',
    eligibility: 'Eligibility depends on state, category, family income and course. Verify current rules on the official portal.',
    benefits: 'Tuition or maintenance assistance as defined by the current scheme rules.',
    official_url: 'https://scholarships.gov.in/', tag: 'Popular', icon: 'education',
  },
  {
    id: 'demo-merit-cum-means', title: 'Merit-cum-Means Scholarship', category: 'scholarship',
    provider: 'Student financial assistance', description: 'A route to explore assistance for eligible students pursuing approved courses.',
    eligibility: 'Check the current notification for course, merit, income and other conditions.',
    benefits: 'Assistance may include approved course fees and/or maintenance support.',
    official_url: 'https://scholarships.gov.in/', tag: 'Merit based', icon: 'star',
  },
  {
    id: 'demo-mahadbt', title: 'MahaDBT Student Schemes', category: 'scholarship',
    provider: 'Government of Maharashtra', description: 'Explore Maharashtra post-matric and other student benefit schemes.',
    eligibility: 'Scheme-specific. Depends on course, domicile, category and income requirements.',
    benefits: 'Benefit varies by the selected scheme and approved eligibility.',
    official_url: 'https://mahadbt.maharashtra.gov.in/', tag: 'Maharashtra', icon: 'state',
  },
  {
    id: 'demo-national-portal', title: 'National Scholarship Portal', category: 'scholarship',
    provider: 'Government of India', description: 'Discover central and participating scholarship opportunities through the official portal.',
    eligibility: 'Use the portal filters and each scheme guideline to confirm eligibility.',
    benefits: 'Depends on the selected scholarship and its official guidelines.',
    official_url: 'https://scholarships.gov.in/', tag: 'Official portal', icon: 'book',
  },
  {
    id: 'demo-pension', title: 'Social Security & Pension Schemes', category: 'government_scheme',
    provider: 'Government benefits directory', description: 'Find official information about pension and social security benefits.',
    eligibility: 'Rules vary by scheme, age, income, state and other conditions.',
    benefits: 'Scheme-specific pension or support as defined by the official authority.',
    official_url: 'https://www.myscheme.gov.in/', tag: 'Citizen support', icon: 'citizen',
  },
  {
    id: 'demo-myscheme', title: 'myScheme: Government Benefits', category: 'government_scheme',
    provider: 'Government of India', description: 'Explore government schemes and check their official eligibility criteria.',
    eligibility: 'Use the official scheme eligibility tool and read the latest guidelines.',
    benefits: 'Varies by scheme. This directory is for discovery, not an approval guarantee.',
    official_url: 'https://www.myscheme.gov.in/', tag: 'Explore schemes', icon: 'landmark',
  },
];

const iconFor = (name) => ({education: GraduationCap, star: Star, state: Landmark, book: BookOpen, citizen: HeartHandshake, landmark: Landmark}[name] || GraduationCap);
const prettyStatus = (status='saved') => ({saved:'Saved', preparing:'Preparing documents', submitted:'Submitted', in_review:'Under review', approved:'Approved', rejected:'Not approved'}[status] || status.replaceAll('_',' '));

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mode, setMode] = useState('signin');
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [schemes, setSchemes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('discover');
  const [selected, setSelected] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const [profile, setProfile] = useState({ full_name: '', state: 'Maharashtra', education_level: 'Undergraduate', category: '', annual_income: '' });

  const user = session?.user;
  const isStudent = role === 'student';

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({data}) => { setSession(data.session); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setNotice('');
      // Role comes from the signed-in user's editable profile, not a client-only role toggle.
      const { data: profileData, error: profileError } = await supabase
        .from('profiles').select('role, full_name, state, education_level, category, annual_income')
        .eq('id', user.id).maybeSingle();
      if (!alive) return;
      if (profileError && profileError.code !== 'PGRST116') {
        setNotice('Profile table is not configured yet. Follow SETUP.md to add it. Showing the student demo view for now.');
      }
      const chosenRole = profileData?.role === 'citizen' ? 'citizen' : 'student';
      setRole(chosenRole);
      if (profileData) setProfile(p => ({...p, ...profileData}));
      await loadSchemes(chosenRole, alive);
      await loadApplications(alive);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  async function loadSchemes(currentRole=role, alive=true) {
    const category = currentRole === 'student' ? 'scholarship' : 'government_scheme';
    if (supabase) {
      const { data, error } = await supabase.from('schemes').select('*').eq('category', category).order('created_at', {ascending:false});
      if (!error && data?.length) { if (alive) setSchemes(data); return; }
      if (error) console.error('Loading schemes:', error.message);
    }
    if (alive) setSchemes(DEMO_SCHEMES.filter(s => s.category === category));
  }

  async function loadApplications(alive=true) {
    if (!supabase || !user) return;
    // This query assumes applications.user_id references auth.users and scheme_id references schemes.id.
    const { data, error } = await supabase.from('applications')
      .select('id, user_id, scheme_id, status, notes, created_at, schemes(id,title,description,category,official_url,benefits,eligibility)')
      .eq('user_id', user.id).order('created_at', {ascending:false});
    if (!alive) return;
    if (error) {
      console.error('Loading applications:', error.message);
      setNotice('Your schemes loaded, but the tracker could not load from Supabase. Check the applications table columns and RLS policies in SETUP.md.');
      setApplications([]);
      return;
    }
    setApplications(data || []);
  }

  async function signIn(e) {
    e.preventDefault(); setAuthError(''); setAuthMessage(''); setLoading(true);
    if (!supabase) { setAuthError('Add your Supabase URL and publishable key to .env.local first.'); setLoading(false); return; }
    const { data, error } = await supabase.auth.signInWithPassword({email: email.trim(), password});
    if (error) setAuthError(error.message);
    else { setSession(data.session); setAuthMessage('Signed in. Loading your Benefit X dashboard…'); }
    setLoading(false);
  }

  async function signUp(e) {
    e.preventDefault(); setAuthError(''); setAuthMessage(''); setLoading(true);
    if (!supabase) { setAuthError('Add your Supabase URL and publishable key to .env.local first.'); setLoading(false); return; }
    const { data, error } = await supabase.auth.signUp({email: email.trim(), password, options:{data:{preferred_role:role}}});
    if (error) setAuthError(error.message);
    else if (!data.session) setAuthMessage('Account created. Check your email to confirm your address, then sign in. Your access type is assigned by the site administrator.');
    else { setSession(data.session); setAuthMessage('Account created. Loading your dashboard…'); }
    setLoading(false);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null); setApplications([]); setSchemes([]); setSelected(null);
    setActiveTab('discover'); setNotice('You have signed out.');
  }

  async function saveApplication(scheme) {
    if (!supabase || !user) { setNotice('Sign in to save and sync applications.'); return; }
    const { data: existing, error: findError } = await supabase.from('applications').select('id').eq('user_id', user.id).eq('scheme_id', scheme.id).maybeSingle();
    if (findError) { setNotice(`Could not check your tracker: ${findError.message}`); return; }
    if (existing) { setNotice('This scheme is already in your tracker.'); setActiveTab('tracker'); return; }
    const { error } = await supabase.from('applications').insert({user_id:user.id, scheme_id:scheme.id, status:'saved', notes:''});
    if (error) { setNotice(`Could not save this application: ${error.message}. Check your applications table and RLS policies.`); return; }
    await loadApplications();
    setNotice('Added to your application tracker.');
    setActiveTab('tracker');
  }

  async function updateStatus(application, status) {
    const { error } = await supabase.from('applications').update({status}).eq('id', application.id).eq('user_id', user.id);
    if (error) { setNotice(`Could not update status: ${error.message}`); return; }
    await loadApplications();
    setNotice('Application status updated.');
  }

  async function updateProfile(e) {
    e.preventDefault();
    const { error } = await supabase.from('profiles').upsert({id:user.id, ...profile, role, updated_at:new Date().toISOString()});
    if (error) setNotice(`Profile not saved: ${error.message}. Check SETUP.md.`);
    else setNotice('Profile saved.');
  }

  const filteredSchemes = useMemo(() => schemes.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || [s.title,s.description,s.provider,s.eligibility,s.benefits].filter(Boolean).some(v=>String(v).toLowerCase().includes(q));
    const matchFilter = filter === 'all' || (filter === 'saved' && applications.some(a=>a.scheme_id===s.id)) || (filter === 'popular' && /popular|merit|official|maharashtra/i.test(s.tag||s.title));
    return matchSearch && matchFilter;
  }), [schemes, search, filter, applications]);

  if (authLoading) return <div className="loading-screen"><div className="brand-mark"><Sparkles size={24}/></div><p>Preparing your Benefit X experience…</p><div className="loading-line"/></div>;
  if (!user) return <AuthScreen {...{mode,setMode,role,setRole,email,setEmail,password,setPassword,authError,authMessage,loading,signIn,signUp}} />;

  const activeApplications = applications.filter(a => !['approved','rejected'].includes(a.status));
  const savedCount = applications.length;
  const title = isStudent ? 'Your next opportunity starts here.' : 'Support and schemes, made easier.';
  const subTitle = isStudent ? 'Find scholarships that can help you keep learning, growing, and building your future.' : 'Explore public benefits and services, with clear routes to official information.';
  const nav = [
    {id:'discover', label:isStudent?'Scholarships':'Government schemes', icon:isStudent?GraduationCap:Landmark},
    {id:'tracker', label:'My applications', icon:Bookmark},
    {id:'profile', label:'My profile', icon:CircleUserRound},
  ];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={20}/></div><div><strong>benefit<span>x</span></strong><small>OPPORTUNITIES, MADE ACCESSIBLE</small></div><button className="icon-button mobile-close" onClick={()=>setMobileMenu(false)}><X/></button></div>
      <div className="sidebar-label">YOUR SPACE</div>
      <nav>{nav.map(item=><button key={item.id} className={`nav-item ${activeTab===item.id?'active':''}`} onClick={()=>{setActiveTab(item.id);setMobileMenu(false)}}><item.icon size={18}/><span>{item.label}</span>{item.id==='tracker'&&applications.length>0&&<b className="nav-count">{applications.length}</b>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><HeartHandshake size={19}/></div><strong>Need a hand?</strong><p>Every opportunity begins with one clear next step.</p><a href="https://www.myscheme.gov.in/" target="_blank" rel="noreferrer">Explore official guidance <ArrowUpRight size={14}/></a></div>
        <div className="sidebar-user"><div className="avatar">{(user.email||'U')[0].toUpperCase()}</div><div className="user-lines"><strong>{profile.full_name||user.email?.split('@')[0]||'Your account'}</strong><span>{isStudent?'Student account':'Citizen account'}</span></div><button className="icon-button" title="Sign out" onClick={signOut}><LogOut size={17}/></button></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={()=>setMobileMenu(true)}><Menu/></button><div className="breadcrumb">Benefit X <span>/</span> <b>{nav.find(n=>n.id===activeTab)?.label||'Dashboard'}</b></div><div className="top-actions"><span className="secure-pill"><ShieldCheck size={15}/> Supabase secured</span><button className="profile-pill" onClick={()=>setActiveTab('profile')}><div className="avatar small">{(user.email||'U')[0].toUpperCase()}</div><span>{profile.full_name||user.email?.split('@')[0]}</span><ChevronDown size={15}/></button></div></header>
      <div className="content-wrap">
        {notice&&<div className="notice"><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}
        {activeTab==='discover'&&<>
          <section className="welcome-grid">
            <div className="welcome-copy"><div className="eyebrow"><span className="pulse-dot"/>{isStudent?'YOUR STUDENT OPPORTUNITY HUB':'YOUR CITIZEN BENEFITS HUB'}</div><h1>{isStudent?<>Make your ambition<br/><em>go further.</em></>:<>Find support that<br/><em>fits your needs.</em></>}</h1><p>{subTitle}</p><div className="hero-actions"><button className="btn-primary" onClick={()=>document.getElementById('opportunity-list')?.scrollIntoView({behavior:'smooth'})}>Explore {isStudent?'scholarships':'schemes'} <ArrowRight size={17}/></button><button className="btn-secondary" onClick={()=>setActiveTab('profile')}>Personalise my profile</button></div><div className="trust-row"><span><ShieldCheck size={15}/> Official links</span><span><BadgeCheck size={15}/> Clear eligibility</span><span><LockKeyhole size={15}/> Private tracker</span></div></div>
            <div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-illustration"><div className="illustration-top"><span>YOUR NEXT CHAPTER</span><Sparkles size={17}/></div><div className="book-stack"><div className="book book-a"><span>LEARN</span></div><div className="book book-b"><span>GROW</span></div><div className="book book-c"><GraduationCap size={40}/></div></div><div className="floating-card float-scholar"><div className="float-icon"><Wallet size={18}/></div><div><strong>Financial support</strong><span>Opportunities worth exploring</span></div><Check size={17}/></div><div className="floating-card float-match"><div className="match-ring"><Sparkles size={19}/></div><div><strong>Your future, in focus</strong><span>One step at a time</span></div></div><div className="sparkle s1">✳</div><div className="sparkle s2">✦</div></div></div>
          </section>
          <section className="stats-row"><div className="stat-card"><div className="stat-icon green"><BookOpen size={19}/></div><div><span>Opportunities shown</span><strong>{schemes.length}</strong><small>In your selected category</small></div></div><div className="stat-card"><div className="stat-icon peach"><Bookmark size={19}/></div><div><span>My tracked items</span><strong>{savedCount}</strong><small>Saved to your account</small></div></div><div className="stat-card"><div className="stat-icon lilac"><Clock3 size={19}/></div><div><span>In progress</span><strong>{activeApplications.length}</strong><small>Keep your next steps moving</small></div></div></section>
          <section id="opportunity-list" className="opportunity-section"><div className="section-heading"><div><div className="eyebrow muted">CURATED FOR YOU</div><h2>{isStudent?'Scholarships to explore':'Government schemes to explore'}</h2><p>{isStudent?'Start with trusted portals, then confirm the latest rules before applying.':'Discover services and benefits from official sources.'}</p></div><button className="text-button" onClick={()=>{setSearch('');setFilter('all')}}>Reset filters <RefreshCw size={14}/></button></div>
            <div className="search-tools"><label className="searchbox"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isStudent?'Search scholarships, courses, eligibility…':'Search schemes, benefits, eligibility…'}/>{search&&<button onClick={()=>setSearch('')}><X size={15}/></button>}</label><div className="filter-tabs"><button className={filter==='all'?'selected':''} onClick={()=>setFilter('all')}>All opportunities</button><button className={filter==='popular'?'selected':''} onClick={()=>setFilter('popular')}>Recommended</button><button className={filter==='saved'?'selected':''} onClick={()=>setFilter('saved')}>In my tracker</button></div></div>
            {loading&&<div className="inline-loading"><div className="loading-line"/>Refreshing your information…</div>}
            <div className="scheme-grid">{filteredSchemes.map((scheme,i)=>{const Icon=iconFor(scheme.icon);const tracked=applications.some(a=>a.scheme_id===scheme.id);return <article className="scheme-card" style={{'--delay':`${i*55}ms`}} key={scheme.id}><div className="scheme-card-top"><div className={`scheme-icon icon-tone-${i%4}`}><Icon size={22}/></div><span className="scheme-tag">{scheme.tag|| (isStudent?'Student support':'Public benefit')}</span><button className={`bookmark-button ${tracked?'is-saved':''}`} title={tracked?'Already tracked':'Save to tracker'} onClick={()=>saveApplication(scheme)}><Bookmark size={17} fill={tracked?'currentColor':'none'}/></button></div><div className="scheme-provider">{scheme.provider|| (isStudent?'STUDENT OPPORTUNITY':'GOVERNMENT SCHEME')}</div><h3>{scheme.title}</h3><p>{scheme.description}</p><div className="scheme-footer"><button className="details-link" onClick={()=>setSelected(scheme)}>View details <ArrowRight size={15}/></button><a href={scheme.official_url||'https://www.myscheme.gov.in/'} target="_blank" rel="noreferrer" aria-label="Open official website"><ExternalLink size={16}/></a></div></article>})}</div>
            {!filteredSchemes.length&&<div className="empty-state"><Search size={25}/><h3>No matching opportunities</h3><p>Try another keyword or reset your filters.</p><button className="btn-secondary" onClick={()=>{setSearch('');setFilter('all')}}>Clear filters</button></div>}
            <div className="disclaimer"><ShieldCheck size={17}/><p><strong>Make informed decisions.</strong> Benefit X helps you discover opportunities. Eligibility, deadlines and benefit amounts can change. Always confirm details on the official scheme website before applying.</p></div>
          </section>
        </>}
        {activeTab==='tracker'&&<section className="page-section"><div className="eyebrow muted">YOUR PROGRESS</div><h1 className="page-title">My application tracker<span>.</span></h1><p className="page-intro">Keep your next steps organised. Your records are linked to your signed-in account.</p><div className="tracker-summary"><div><span>Total tracked</span><strong>{applications.length}</strong></div><div><span>In progress</span><strong>{activeApplications.length}</strong></div><div><span>Completed decisions</span><strong>{applications.filter(a=>['approved','rejected'].includes(a.status)).length}</strong></div></div>
          {!applications.length?<div className="empty-state tracker-empty"><div className="empty-graphic"><Bookmark size={29}/></div><h3>Your tracker starts here</h3><p>Explore a scholarship or scheme and choose “Save to tracker”. It will appear here after it is saved successfully.</p><button className="btn-primary" onClick={()=>setActiveTab('discover')}>Explore opportunities <ArrowRight size={16}/></button></div>:<div className="tracker-list">{applications.map(a=><article className="tracker-item" key={a.id}><div className="tracker-symbol"><BookOpen size={20}/></div><div className="tracker-details"><h3>{a.schemes?.title||`Saved opportunity #${a.scheme_id}`}</h3><p>{a.schemes?.description||'Open the official scheme details to review eligibility and next steps.'}</p><span className="tracker-date">Added {a.created_at?new Date(a.created_at).toLocaleDateString():''}</span></div><div className="tracker-controls"><span className={`status-pill status-${a.status}`}>{prettyStatus(a.status)}</span><label className="status-select-label">Update status<select value={a.status||'saved'} onChange={e=>updateStatus(a,e.target.value)}><option value="saved">Saved</option><option value="preparing">Preparing documents</option><option value="submitted">Submitted</option><option value="in_review">Under review</option><option value="approved">Approved</option><option value="rejected">Not approved</option></select></label><button className="icon-button danger" title="Remove from tracker" onClick={async()=>{const {error}=await supabase.from('applications').delete().eq('id',a.id).eq('user_id',user.id);if(error)setNotice(error.message);else{await loadApplications();setNotice('Removed from tracker.')}}}><X size={17}/></button></div></article>)}</div>}
        </section>}
        {activeTab==='profile'&&<section className="page-section profile-page"><div className="eyebrow muted">MAKE IT YOURS</div><h1 className="page-title">Your profile<span>.</span></h1><p className="page-intro">A little context helps you keep your next steps organised. This does not automatically confirm eligibility.</p><form className="profile-form" onSubmit={updateProfile}><div className="profile-form-head"><div className="profile-avatar"><CircleUserRound size={31}/></div><div><h2>Personal information</h2><p>{user.email}</p></div><span className="role-pill">{isStudent?'Student':'Citizen'}</span></div><div className="form-grid"><label>Full name<input value={profile.full_name||''} onChange={e=>setProfile({...profile,full_name:e.target.value})} placeholder="Your name"/></label><label>State / Union Territory<select value={profile.state||'Maharashtra'} onChange={e=>setProfile({...profile,state:e.target.value})}><option>Maharashtra</option><option>Gujarat</option><option>Madhya Pradesh</option><option>Karnataka</option><option>Goa</option><option>Other</option></select></label>{isStudent&&<label>Current education level<select value={profile.education_level||'Undergraduate'} onChange={e=>setProfile({...profile,education_level:e.target.value})}><option>School</option><option>Diploma</option><option>Undergraduate</option><option>Postgraduate</option><option>Research</option><option>Other</option></select></label>}<label>Category (optional)<select value={profile.category||''} onChange={e=>setProfile({...profile,category:e.target.value})}><option value="">Prefer not to say / not applicable</option><option>General</option><option>OBC</option><option>SC</option><option>ST</option><option>EWS</option></select></label><label>Annual family income (optional)<select value={profile.annual_income||''} onChange={e=>setProfile({...profile,annual_income:e.target.value})}><option value="">Choose range</option><option>Below ₹1 lakh</option><option>₹1–2.5 lakh</option><option>₹2.5–5 lakh</option><option>₹5–8 lakh</option><option>Above ₹8 lakh</option><option>Prefer not to say</option></select></label></div><div className="profile-note"><LockKeyhole size={17}/><p>Only share details you are comfortable providing. Check the official scheme rules for required documents. Never share passwords or OTPs with anyone.</p></div><button className="btn-primary" type="submit">Save profile <Check size={16}/></button></form></section>}
        <footer className="footer"><div className="footer-brand"><div className="brand-mark mini"><Sparkles size={14}/></div> benefit<span>x</span></div><span>Built to make opportunity easier to find.</span><a href="https://www.myscheme.gov.in/" target="_blank" rel="noreferrer">Official scheme directory <ArrowUpRight size={13}/></a></footer>
      </div>
    </main>
    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><section className="detail-modal" onClick={e=>e.stopPropagation()}><button className="icon-button modal-close" onClick={()=>setSelected(null)}><X/></button><div className="scheme-icon icon-tone-0"><GraduationCap size={23}/></div><div className="eyebrow muted">{selected.provider||'OPPORTUNITY DETAILS'}</div><h2>{selected.title}</h2><p className="modal-description">{selected.description}</p><div className="detail-block"><h4>Eligibility to check</h4><p>{selected.eligibility||'Eligibility criteria are defined in the official scheme guidelines. Review the current notice before applying.'}</p></div><div className="detail-block"><h4>Potential benefits</h4><p>{selected.benefits||'Benefits depend on the official scheme rules and your approved application.'}</p></div><div className="modal-actions"><button className="btn-primary" onClick={()=>saveApplication(selected)}>Save to my tracker <Bookmark size={16}/></button><a className="btn-secondary" href={selected.official_url||'https://www.myscheme.gov.in/'} target="_blank" rel="noreferrer">Official website <ExternalLink size={15}/></a></div><p className="modal-disclaimer">This listing is a discovery aid, not a guarantee of eligibility or approval.</p></section></div>}
  </div>;
}

function AuthScreen({mode,setMode,role,setRole,email,setEmail,password,setPassword,authError,authMessage,loading,signIn,signUp}) {
  return <div className="auth-page"><div className="auth-left"><div className="brand auth-brand"><div className="brand-mark"><Sparkles size={20}/></div><div><strong>benefit<span>x</span></strong><small>OPPORTUNITIES, MADE ACCESSIBLE</small></div></div><div className="auth-hero"><div className="eyebrow"><span className="pulse-dot"/> A BETTER WAY TO FIND SUPPORT</div><h1>Your effort deserves<br/> <em>an opportunity.</em></h1><p>One calm, clear place to discover scholarships, understand eligibility, and keep your next steps moving.</p><div className="auth-feature-list"><div><div className="feature-icon"><GraduationCap size={19}/></div><span><strong>Student-first discovery</strong><small>Scholarships and education support in focus.</small></span><Check size={16}/></div><div><div className="feature-icon"><ShieldCheck size={19}/></div><span><strong>Trusted official links</strong><small>Always verify the latest rules at the source.</small></span><Check size={16}/></div><div><div className="feature-icon"><Bookmark size={19}/></div><span><strong>Your progress, in one place</strong><small>Keep track of the opportunities you save.</small></span><Check size={16}/></div></div></div><div className="auth-left-bottom"><span>Built around access. Designed for your next step.</span><span><LockKeyhole size={14}/> Supabase authentication</span></div><div className="auth-decor auth-decor-a"/><div className="auth-decor auth-decor-b"/></div>
    <div className="auth-right"><div className="auth-card"><div className="auth-mobile-brand"><div className="brand-mark"><Sparkles size={18}/></div><strong>benefit<span>x</span></strong></div><div className="auth-heading"><div className="welcome-label">{mode==='signin'?'WELCOME BACK':'YOUR NEXT CHAPTER'}</div><h2>{mode==='signin'?'Sign in to Benefit X':'Create your account'}</h2><p>{mode==='signin'?'Pick up where you left off. Your tracker is waiting.':'A more organised way to discover support starts here.'}</p></div><div className="auth-mode-switch"><button className={mode==='signin'?'active':''} onClick={()=>{setMode('signin')}}>Sign in</button><button className={mode==='signup'?'active':''} onClick={()=>{setMode('signup')}}>Create account</button></div><form onSubmit={mode==='signin'?signIn:signUp}><label className="auth-label">I am joining as</label><div className="role-choice"><button type="button" className={role==='student'?'chosen':''} onClick={()=>setRole('student')}><GraduationCap size={18}/><span><strong>Student</strong><small>Scholarships & education</small></span>{role==='student'&&<Check size={16}/>}</button><button type="button" className={role==='citizen'?'chosen':''} onClick={()=>setRole('citizen')}><Landmark size={18}/><span><strong>Citizen</strong><small>Government schemes</small></span>{role==='citizen'&&<Check size={16}/>}</button></div><label className="auth-label" htmlFor="email">Email address</label><div className="input-with-icon"><Mail size={17}/><input id="email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></div><label className="auth-label" htmlFor="password">Password</label><div className="input-with-icon"><LockKeyhole size={17}/><input id="password" type="password" autoComplete={mode==='signin'?'current-password':'new-password'} minLength={6} required placeholder="At least 6 characters" value={password} onChange={e=>setPassword(e.target.value)}/></div>{authError&&<div className="auth-alert error">{authError}</div>}{authMessage&&<div className="auth-alert success">{authMessage}</div>}<button className="btn-primary auth-submit" disabled={loading}>{loading?'Please wait…':mode==='signin'?'Sign in securely':'Create account'} <ArrowRight size={17}/></button></form><div className="auth-divider"><span/> <small>YOUR INFORMATION STAYS YOURS</small> <span/></div><p className="auth-legal">By continuing, you agree to use official scheme links to confirm deadlines, eligibility, and benefit details. Benefit X does not guarantee approval.</p><div className="auth-support"><CircleHelp size={15}/> Trouble signing in? Check your email confirmation and Supabase Auth settings.</div></div></div></div>;
}

createRoot(document.getElementById('root')).render(<App/>);
