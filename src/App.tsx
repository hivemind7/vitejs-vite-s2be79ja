import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, 
  Users, 
  Settings, 
  Command, 
  Save, 
  Loader, 
  Send, 
  Plus, 
  Trash2, 
  FileText, 
  UploadCloud,
  CheckCircle,
  Globe,
  MessageCircle,
  ListChecks,
  Calendar as CalendarIcon,
  CheckSquare,
  BarChart2,
  BookOpen,
  Link as LinkIcon,
  PieChart,
  ThumbsUp,
  RefreshCw,
  AlertTriangle,
  Clock,
  Image as ImageIcon,
  X,
  Lightbulb,
  Book,
  Lock,
  Unlock,
  Shield,
  KeyRound,
  PenTool,
  Copy,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

// --- FIREBASE SETUP ---
// 1. User Keys (For StackBlitz/Live Site)
const userFirebaseConfig = {
  apiKey: "AIzaSyAgbSz3847Dgek5bLikXUnKRZ2xWUh90sM",
  authDomain: "global-learning-a3f0b.firebaseapp.com",
  projectId: "global-learning-a3f0b",
  storageBucket: "global-learning-a3f0b.firebasestorage.app",
  messagingSenderId: "245032253848",
  appId: "1:245032253848:web:6f5c42beeb2836673753ed"
};

// 2. Smart Config Switcher
// If running in Preview, use internal config. If on StackBlitz, use user keys.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : userFirebaseConfig;

// Initialize Firebase safely
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase Init Error:", e);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'global-learning-assistant';

// --- API KEY ---
// ⚠️ PASTE YOUR GEMINI KEY HERE ⚠️
const apiKey = ""; 

// --- MOCK INITIAL DATA ---
const INITIAL_CLASSES = [
  { id: 'c1', name: 'J1 - Japanese History', layout: 'u-shape', students: [
      {id: 1, name: 'Alex Johnson', performance: 85}, {id: 2, name: 'Sam Smith', performance: 60},
      {id: 3, name: 'Taylor Doe', performance: 92}, {id: 4, name: 'Jordan Lee', performance: 45},
      {id: 5, name: 'Casey Brown', performance: 78}, {id: 6, name: 'Jamie Wilson', performance: 88},
      {id: 7, name: 'Morgan Davis', performance: 70}, {id: 8, name: 'Riley Miller', performance: 55},
      {id: 9, name: 'Quinn Taylor', performance: 95}, {id: 10, name: 'Avery Moore', performance: 82}
    ] 
  },
];

const INITIAL_SCHEDULE = { 
  Monday: [
    { period: '1st Period', code: 'J1', time: '08:50 - 09:40', type: 'lesson', name: 'Japanese History', classId: 'c1' },
    { period: '2nd Period', code: 'M2', time: '09:50 - 10:40', type: 'lesson', name: 'Math B', classId: 'c1' } 
  ], 
  Tuesday: [], Wednesday: [], Thursday: [], Friday: [] 
};

const INITIAL_JOURNAL = [
  { id: 'j1', title: "CLIL in History: 3 Practical Strategies", category: "CLIL", date: new Date().toISOString(), content: "1. Visual Timelines: Use simplified language on timelines.\n2. Key Vocabulary Lists: Pre-teach 'Revolution', 'Trade', 'Empire'.\n3. Sentence Starters: Provide scaffolds like 'The main cause was...'." },
  { id: 'j2', title: "AI for Formative Assessment", category: "AI", date: new Date(Date.now() - 86400000).toISOString(), content: "Using AI to generate quick exit tickets based on today's lesson topic allows for immediate feedback loops. Try asking AI to 'Generate 3 quiz questions for [Topic]'." },
];

const REPORT_TRAITS = [
  "Participates Actively", "Needs Encouragement", "Good Leadership", "Distracted", 
  "Excellent Homework", "Misses Deadlines", "Polite", "Disruptive", 
  "Creative Thinker", "Struggles with Basics"
];

// --- HELPER: RANDOM PASTEL COLOR FOR AVATARS ---
const getAvatarColor = (name) => {
  const colors = ['bg-red-100 text-red-600', 'bg-orange-100 text-orange-600', 'bg-amber-100 text-amber-600', 'bg-emerald-100 text-emerald-600', 'bg-teal-100 text-teal-600', 'bg-cyan-100 text-cyan-600', 'bg-blue-100 text-blue-600', 'bg-indigo-100 text-indigo-600', 'bg-violet-100 text-violet-600', 'bg-fuchsia-100 text-fuchsia-600', 'bg-pink-100 text-pink-600'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// --- COMPONENTS ---

const Card = ({ children, className = "", noPadding = false }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-200 hover:shadow-md ${noPadding ? '' : 'p-6'} ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", icon: Icon, disabled = false }) => {
  const baseStyle = "px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm active:scale-95";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:bg-indigo-300",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
    admin: "bg-slate-800 text-white hover:bg-slate-900 shadow-lg shadow-slate-200",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200",
    ghost: "text-slate-500 hover:bg-slate-100",
    research: "bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-teal-200"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const Badge = ({ type }) => {
  const styles = {
    duty: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    lesson: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    alert: "bg-red-50 text-red-700 ring-1 ring-red-200",
    CLIL: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    AI: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
    Assessment: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Curriculum: "bg-pink-50 text-pink-700 ring-1 ring-pink-200",
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${styles[type] || styles.lesson}`}>{type}</span>
};

const Avatar = ({ name, size = "md" }) => {
  const sizes = { sm: "w-6 h-6 text-[10px]", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-xl" };
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "??";
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold ${getAvatarColor(name)}`}>
      {initials}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  // --- SECURITY STATE ---
  const [isLocked, setIsLocked] = useState(true);
  const [storedPassword, setStoredPassword] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // --- PRIVATE DATA STATES ---
  const [classes, setClasses] = useState(INITIAL_CLASSES);
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);
  const [attendanceHistory, setAttendanceHistory] = useState({});
  const [seatingChart, setSeatingChart] = useState({});
  const [homework, setHomework] = useState([]);
  const [scheduleImages, setScheduleImages] = useState({ weekly: null, yearly: null });
  const [journalEntries, setJournalEntries] = useState(INITIAL_JOURNAL);
  
  // --- SHARED DATA STATES ---
  const [sharedTodos, setSharedTodos] = useState([]);
  const [sharedPosts, setSharedPosts] = useState([]);
  const [sharedResources, setSharedResources] = useState([]);
  const [sharedPolls, setSharedPolls] = useState([]);

  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClassId, setSelectedClassId] = useState(INITIAL_CLASSES[0].id);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hubFilter, setHubFilter] = useState('all');
  const [swapSource, setSwapSource] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [readingFilter, setReadingFilter] = useState('All');

  // --- INPUT STATES ---
  const [plickersInput, setPlickersInput] = useState('');
  const [plickersAnalysis, setPlickersAnalysis] = useState(null);
  const [newPostText, setNewPostText] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [researchPrompt, setResearchPrompt] = useState('');
  
  // --- REPORT GENERATOR STATES ---
  const [reportStudentId, setReportStudentId] = useState('');
  const [reportTraits, setReportTraits] = useState([]);
  const [reportNotes, setReportNotes] = useState('');
  const [reportTone, setReportTone] = useState('Professional');
  const [generatedReport, setGeneratedReport] = useState('');
  
  // --- ADMIN STATES ---
  const [aiCommand, setAiCommand] = useState('');
  const [aiLog, setAiLog] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState('students');
  const [importTargetClass, setImportTargetClass] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // --- AUTH & SYNC ---
  useEffect(() => {
    const initAuth = async () => {
      if (!auth) return;
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error:", error);
        setAuthError("Connection Failed. Did you enable 'Anonymous Auth' in Firebase Console?");
      }
      setIsAuthLoading(false);
    };
    initAuth();
    if (auth) return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    
    const handleSnapError = (err) => {
      console.error("Snapshot Error:", err);
      if (err.code === 'permission-denied') {
        setPermissionError(true);
      }
    };

    // Private Sync (Main Data)
    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main');
    const unsubPrivate = onSnapshot(userDocRef, (docSnap) => {
      setPermissionError(false);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.password) setStoredPassword(data.password); else setStoredPassword(null);
        if (data.classes) {
           setClasses(data.classes);
           if (!data.classes.find(c => c.id === selectedClassId)) setSelectedClassId(data.classes[0]?.id || '');
        }
        if (data.schedule) setSchedule(data.schedule);
        if (data.attendanceHistory) setAttendanceHistory(data.attendanceHistory);
        if (data.seatingChart) setSeatingChart(data.seatingChart);
        if (data.homework) setHomework(data.homework);
        if (data.journalEntries) setJournalEntries(data.journalEntries);
      } else {
        setDoc(userDocRef, { 
          classes: INITIAL_CLASSES, 
          schedule: INITIAL_SCHEDULE, 
          attendanceHistory: {}, 
          seatingChart: {}, 
          homework: [], 
          journalEntries: INITIAL_JOURNAL,
          createdAt: serverTimestamp() 
        }).catch(handleSnapError);
      }
    }, handleSnapError);

    const imagesDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'images');
    const unsubImages = onSnapshot(imagesDocRef, (docSnap) => { if (docSnap.exists()) setScheduleImages(docSnap.data()); }, handleSnapError);

    const publicPath = (col) => collection(db, 'artifacts', appId, 'public', 'data', col);
    const unsubTodos = onSnapshot(query(publicPath('shared_todos'), orderBy('createdAt', 'desc')), s => setSharedTodos(s.docs.map(d => ({id:d.id, ...d.data()}))), handleSnapError);
    const unsubPosts = onSnapshot(query(publicPath('shared_posts'), orderBy('createdAt', 'desc')), s => setSharedPosts(s.docs.map(d => ({id:d.id, ...d.data()}))), handleSnapError);
    
    return () => { unsubPrivate(); unsubImages(); unsubTodos(); unsubPosts(); };
  }, [user]);

  const savePrivate = async (updates) => {
    if (!user || !db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main'), updates).catch(err => {
      if (err.code === 'permission-denied') setPermissionError(true);
    });
  };

  const saveImages = async (updates) => {
     if (!user || !db) return;
     await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'images'), updates, { merge: true }).catch(err => {
       if (err.code === 'permission-denied') setPermissionError(true);
     });
  };

  // --- SECURITY LOGIC ---
  const handleLogin = () => {
     if (passwordInput === storedPassword) { setIsLocked(false); setAuthError(''); setPasswordInput(''); } 
     else { setAuthError('Incorrect password'); }
  };
  const handleSetupPassword = () => {
     if (setupPassword.length < 4) { setAuthError('Password must be at least 4 characters'); return; }
     savePrivate({ password: setupPassword }); setIsLocked(false); setAuthError('');
  };
  const handleUpdatePassword = () => {
     if (newPasswordInput.length < 4) { alert('Password too short'); return; }
     savePrivate({ password: newPasswordInput }); setNewPasswordInput(''); alert('Password updated successfully');
  };

  // --- IMAGE HANDLING ---
  const handleImageUpload = (e, type) => {
    const file = e.target.files[0]; if (!file) return; processImageFile(file, type);
  };
  const handlePaste = (e) => {
    if (activeTab !== 'schedule') return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf('image') !== -1) { processImageFile(items[i].getAsFile(), 'weekly'); e.preventDefault(); } }
  };
  const processImageFile = (file, type) => {
     setIsUploading(true);
     const reader = new FileReader();
     reader.onloadend = () => {
        const base64 = reader.result;
        if (base64.length > 900000) { alert("Image too large. Try a smaller screenshot."); setIsUploading(false); return; }
        const update = type === 'weekly' ? { weekly: base64 } : { yearly: base64 };
        setScheduleImages(prev => ({ ...prev, ...update }));
        saveImages(update).then(() => setIsUploading(false));
     };
     reader.readAsDataURL(file);
  };

  // --- AI LOGIC ---
  const generatePedagogyTip = async () => {
    if (!researchPrompt.trim()) return;
    setIsProcessing(true);
    try {
       const context = `Expert researcher. Classes: ${classes.map(c => c.name).join(', ')}. Request: "${researchPrompt}". Focus: CLIL, Assessment, AI, Curriculum. Return JSON: { "title": "...", "category": "...", "content": "..." }`;
       const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: context }] }] }) });
       const result = JSON.parse(await response.json().then(d => d.candidates?.[0]?.content?.parts?.[0]?.text.replace(/```json|```/g, '').trim()));
       const newEntry = { id: Date.now(), title: result.title, category: result.category || 'General', content: result.content, date: new Date().toISOString() };
       const updatedJournal = [newEntry, ...journalEntries]; setJournalEntries(updatedJournal); savePrivate({ journalEntries: updatedJournal }); setResearchPrompt('');
    } catch(e) { alert("Error generating."); } finally { setIsProcessing(false); }
  };

  const generateStudentReport = async () => {
    const student = classes.find(c => c.id === selectedClassId)?.students.find(s => s.id === parseInt(reportStudentId));
    if (!student) { alert("Please select a student first."); return; }
    setIsProcessing(true);
    try {
       const context = `
         Write an end-of-term report for student: ${student.name}.
         Performance Score: ${student.performance || 70}%.
         Selected Traits: ${reportTraits.join(', ')}.
         Teacher's specific comments: "${reportNotes}".
         Tone: ${reportTone}.
         Length: Approx 100-150 words.
         Format: Paragraph form. Be specific and professional.
       `;
       const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: context }] }] }) });
       const text = await response.json().then(d => d.candidates?.[0]?.content?.parts?.[0]?.text);
       setGeneratedReport(text);
    } catch(e) { alert("Error generating report."); } finally { setIsProcessing(false); }
  };

  const executeAiCommand = async () => {
    if (!aiCommand.trim()) return; setIsProcessing(true);
    try {
      const context = `System Admin. Classes: ${JSON.stringify(classes.map(c => ({id: c.id, name: c.name})))}. Command: "${aiCommand}". Return JSON: { "action": "RENAME_CLASS" | "CREATE_CLASS" | "CHANGE_LAYOUT" | "ADVICE", ...args }`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: context }] }] }) });
      const result = JSON.parse(await response.json().then(d => d.candidates?.[0]?.content?.parts?.[0]?.text.replace(/```json|```/g, '').trim()));
      let newClasses = [...classes]; let logMsg = "";
      switch (result.action) {
        case 'RENAME_CLASS': newClasses = newClasses.map(c => c.id === result.classId ? { ...c, name: result.newName } : c); logMsg = `Renamed to "${result.newName}"`; break;
        case 'CREATE_CLASS': newClasses.push({ id: 'c' + Date.now(), name: result.name, layout: 'grid', students: [] }); logMsg = `Created class "${result.name}"`; break;
        case 'CHANGE_LAYOUT': newClasses = newClasses.map(c => c.id === result.classId ? { ...c, layout: result.layout } : c); logMsg = `Layout changed to ${result.layout}`; break;
        default: logMsg = result.message || "Command executed.";
      }
      if (result.action !== 'ADVICE') { setClasses(newClasses); await savePrivate({ classes: newClasses }); }
      setAiLog(prev => [{ time: new Date().toLocaleTimeString(), msg: logMsg }, ...prev]); setAiCommand('');
    } catch (err) { setAiLog(prev => [{ time: new Date().toLocaleTimeString(), msg: "Error." }, ...prev]); } finally { setIsProcessing(false); }
  };

  // --- BULK IMPORT ---
  const handleBulkImport = () => {
    if (!importText.trim()) return;
    const rows = importText.split('\n').filter(r => r.trim() !== '');
    let newClasses = [...classes];
    if (importMode === 'students') {
      if (!importTargetClass) { alert("Select a class."); return; }
      const newStudents = rows.map((row, idx) => ({ id: Date.now() + idx, name: row.replace(/['"]/g, '').trim(), performance: 70 }));
      newClasses = newClasses.map(c => c.id !== importTargetClass ? c : { ...c, students: [...c.students, ...newStudents] });
    } else {
       rows.forEach((row, idx) => newClasses.push({ id: 'c' + Date.now() + idx, name: row.trim(), layout: 'grid', students: [] }));
    }
    setClasses(newClasses); savePrivate({ classes: newClasses }); setImportText(''); alert("Import successful!");
  };

  // --- ACTIONS ---
  const handleAttendance = (studentId) => {
    const dateKey = currentDate.toISOString().split('T')[0];
    const newHistory = { ...attendanceHistory, [selectedClassId]: { ...attendanceHistory[selectedClassId], [dateKey]: { ...attendanceHistory[selectedClassId]?.[dateKey], [studentId]: attendanceHistory[selectedClassId]?.[dateKey]?.[studentId] === 'absent' ? 'present' : 'absent' } } };
    setAttendanceHistory(newHistory); savePrivate({ attendanceHistory: newHistory });
  };
  const analyzePlickers = () => {
    const lines = plickersInput.split('\n'); const results = lines.map(line => { const parts = line.trim().split(/\s+/); const score = parseInt(parts[parts.length - 1]); return { name: parts.slice(0, -1).join(' '), score: isNaN(score) ? 0 : score }; }).filter(r => r.name);
    setPlickersAnalysis({ results, struggling: results.filter(r => r.score < 60), suggestions: results.some(r => r.score < 60) ? ["Review topic with low scorers."] : ["Great job!"] });
  };
  const addPost = async () => { if (!newPostText.trim()) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shared_posts'), { text: newPostText, author: "Teacher", createdAt: serverTimestamp(), likes: [] }); setNewPostText(''); };
  const addTodo = async () => { if (!newTodo.trim()) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shared_todos'), { text: newTodo, completed: false, assignee: "Team", createdAt: serverTimestamp() }); setNewTodo(''); };
  const toggleTodo = async (todo) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_todos', todo.id), { completed: !todo.completed });
  const deleteTodo = async (id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_todos', id));
  const deleteJournalEntry = async (id) => { const updated = journalEntries.filter(j => j.id !== id); setJournalEntries(updated); savePrivate({ journalEntries: updated }); };

  // --- RENDERERS ---

  const renderLockScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-800 p-4">
       <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
             <Shield size={40} className="text-white"/>
          </div>
          
          {storedPassword === null ? (
             <>
                <h2 className="text-2xl font-bold mb-2">Welcome, Teacher</h2>
                <p className="text-slate-500 mb-6">Please create a secure password to protect your student data.</p>
                <input type="password" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-center text-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Create Password" value={setupPassword} onChange={e => setSetupPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSetupPassword()} />
                <Button onClick={handleSetupPassword} className="w-full h-12 text-lg" icon={CheckCircle}>Set Password & Enter</Button>
             </>
          ) : (
             <>
                <h2 className="text-2xl font-bold mb-2">System Locked</h2>
                <p className="text-slate-500 mb-6">Enter your password to access the dashboard.</p>
                <input type="password" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-center text-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter Password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                <Button onClick={handleLogin} className="w-full h-12 text-lg" icon={Unlock}>Unlock</Button>
             </>
          )}
          {authError && <div className="mt-4 text-red-500 text-sm font-medium bg-red-50 p-2 rounded-lg">{authError}</div>}
       </div>
       <div className="mt-8 text-slate-400 text-sm">Global Learning Assistant • Secure Mode</div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="relative rounded-3xl overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 to-purple-900/80 z-10"></div>
        <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" className="absolute inset-0 w-full h-full object-cover" alt="Classroom"/>
        <div className="relative z-20 p-8 md:p-12 text-white">
          <h1 className="text-4xl font-bold mb-3 tracking-tight">Global Learning Assistant</h1>
          <p className="text-lg opacity-90 max-w-2xl font-light leading-relaxed">Welcome back, Teacher. You have <span className="font-bold text-indigo-200">{classes.length} active classes</span> and <span className="font-bold text-indigo-200">{sharedTodos.filter(t => !t.completed).length} pending tasks</span> today.</p>
          <div className="flex gap-3 mt-8">
             <button onClick={() => setActiveTab('schedule')} className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-6 py-2.5 rounded-full text-sm font-semibold transition-all">View Schedule</button>
             <button onClick={() => setActiveTab('reading')} className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-indigo-900/20 transition-all">Research & Ideas</button>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
         <Card className="col-span-2 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-2 text-slate-800 font-bold text-lg"><Clock className="text-indigo-500"/> Today's Schedule</div><div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div></div>
            <div className="space-y-3 flex-1">
               {schedule['Monday']?.length > 0 ? schedule['Monday'].map((evt, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-50 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-100 transition-all group">
                     <div className="w-20 shrink-0 text-center"><div className="font-bold text-indigo-600 text-sm">{evt.code}</div><div className="text-xs text-slate-400 font-medium mt-1">{evt.time.split('-')[0]}</div></div>
                     <div className="w-px h-8 bg-slate-200 group-hover:bg-indigo-200 transition-colors"></div>
                     <div className="flex-1"><div className="font-bold text-slate-700">{evt.name || evt.subject}</div><div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><span className="opacity-75">{evt.period}</span></div></div>
                     <Badge type={evt.type || 'lesson'}/>
                  </div>
               )) : <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 border-2 border-dashed border-slate-100 rounded-xl"><CalendarIcon size={32} className="mb-2 opacity-20"/><p>No classes scheduled today.</p></div>}
            </div>
         </Card>
         <div className="space-y-6">
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none">
               <div className="flex items-center gap-2 mb-4 font-bold text-indigo-300"><ZapIcon/> Quick Actions</div>
               <div className="space-y-2">
                  <button onClick={() => setActiveTab('report')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"><div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300"><FileText size={16}/></div><span className="text-sm font-medium">Report Generator</span></button>
                  <button onClick={() => setActiveTab('hub')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"><div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300"><MessageCircle size={16}/></div><span className="text-sm font-medium">Staff Announcement</span></button>
                  <button onClick={() => setActiveTab('plickers')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"><div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-300"><BarChart2 size={16}/></div><span className="text-sm font-medium">Analyze Results</span></button>
               </div>
            </Card>
            <Card className="bg-indigo-50/50 border-indigo-100"><div className="flex items-center justify-between mb-3"><h4 className="font-bold text-indigo-900 text-sm">Upcoming Duties</h4><div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div></div><div className="space-y-2">{schedule['Monday']?.filter(e => e.type === 'duty').map((d, i) => (<div key={i} className="text-xs text-indigo-800 flex items-center gap-2"><CheckCircle size={12} className="text-indigo-400"/> {d.name} at {d.time.split('-')[0]}</div>))}</div></Card>
         </div>
      </div>
    </div>
  );

  // --- Helper Icon for Quick Actions ---
  const ZapIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;

  const renderReportGen = () => {
    const studentList = classes.find(c => c.id === selectedClassId)?.students || [];
    
    return (
      <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in h-[calc(100vh-150px)]">
        <div className="lg:col-span-4 flex flex-col gap-6">
           <Card className="p-6 bg-indigo-900 text-white border-none shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                 <PenTool className="text-indigo-300"/>
                 <div><h2 className="font-bold text-xl">Report Generator</h2><p className="text-xs text-indigo-300">AI-Powered Assessments</p></div>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-1 block">Class</label>
                    <select className="w-full p-2 bg-indigo-800/50 border border-indigo-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500" value={selectedClassId} onChange={e => {setSelectedClassId(e.target.value); setReportStudentId('');}}>
                       {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-1 block">Student</label>
                    <select className="w-full p-2 bg-indigo-800/50 border border-indigo-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500" value={reportStudentId} onChange={e => setReportStudentId(e.target.value)}>
                       <option value="">-- Select Student --</option>
                       {studentList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>
              </div>
           </Card>
           
           <Card className="p-6 flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Traits</h4>
              <div className="flex flex-wrap gap-2 mb-6">
                 {REPORT_TRAITS.map(trait => (
                    <button 
                       key={trait} 
                       onClick={() => setReportTraits(prev => prev.includes(trait) ? prev.filter(t => t !== trait) : [...prev, trait])}
                       className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${reportTraits.includes(trait) ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-200'}`}
                    >
                       {trait}
                    </button>
                 ))}
              </div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Specific Notes</h4>
              <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24 mb-4" placeholder="e.g. Improved greatly in geometry..." value={reportNotes} onChange={e => setReportNotes(e.target.value)} />
              
              <div className="flex justify-between items-center mb-4">
                 <div className="flex gap-2">
                    {['Professional', 'Encouraging', 'Direct'].map(tone => (
                       <button key={tone} onClick={() => setReportTone(tone)} className={`text-[10px] px-2 py-1 rounded border ${reportTone === tone ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-500 border-slate-200'}`}>{tone}</button>
                    ))}
                 </div>
              </div>
              
              <Button onClick={generateStudentReport} className="w-full" icon={Sparkles} disabled={isProcessing}>{isProcessing ? 'Writing...' : 'Generate Report'}</Button>
           </Card>
        </div>

        <div className="lg:col-span-8">
           <Card className="h-full p-8 flex flex-col bg-slate-50/50 relative">
              {generatedReport ? (
                 <>
                    <div className="flex justify-between items-start mb-6">
                       <h3 className="font-bold text-xl text-slate-800">Generated Report</h3>
                       <button onClick={() => {navigator.clipboard.writeText(generatedReport); alert("Copied!")}} className="text-xs bg-white border px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-2 shadow-sm"><Copy size={14}/> Copy Text</button>
                    </div>
                    <div className="flex-1 bg-white p-8 rounded-xl border border-slate-200 shadow-sm font-serif text-slate-700 leading-relaxed text-lg overflow-y-auto">
                       {generatedReport}
                    </div>
                 </>
              ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <FileText size={64} className="opacity-10 mb-4"/>
                    <p className="text-lg font-medium">Ready to write.</p>
                    <p className="text-sm opacity-70">Select a student and traits to begin.</p>
                 </div>
              )}
           </Card>
        </div>
      </div>
    );
  };

  const renderReading = () => (
    <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in h-[calc(100vh-150px)]">
       <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="p-8 bg-gradient-to-br from-teal-600 to-emerald-700 text-white border-none shadow-lg shadow-teal-900/10 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><BookOpen className="text-white" size={24}/></div><h2 className="font-bold text-2xl">Pedagogy<br/>Journal</h2></div>
                <p className="text-teal-100 text-sm mb-6 font-medium leading-relaxed">Generate context-aware lesson materials and stay updated with the latest research.</p>
                <div className="space-y-1">{['All', 'CLIL', 'AI', 'Assessment', 'Curriculum'].map(cat => (<button key={cat} onClick={() => setReadingFilter(cat)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex justify-between items-center ${readingFilter === cat ? 'bg-white text-teal-800 shadow-lg' : 'text-teal-50 hover:bg-white/10'}`}>{cat} {cat !== 'All' && <span className="text-xs opacity-60 bg-black/10 px-2 py-0.5 rounded-full">{journalEntries.filter(j => j.category === cat).length}</span>}</button>))}</div>
             </div>
          </Card>
          <Card className="flex-1 flex flex-col"><div className="flex items-center gap-2 mb-4 text-teal-700 font-bold"><Lightbulb size={20}/> AI Research Assistant</div><textarea className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none text-sm transition-all" placeholder="Ask for research or materials..." value={researchPrompt} onChange={e => setResearchPrompt(e.target.value)} /><div className="mt-4"><Button variant="research" onClick={generatePedagogyTip} disabled={isProcessing} className="w-full h-12" icon={Send}>{isProcessing ? 'Researching...' : 'Generate Insight'}</Button></div></Card>
       </div>
       <div className="lg:col-span-2 overflow-y-auto pr-2 pb-10">
          <div className="flex items-center justify-between mb-6"><h3 className="font-bold text-slate-700 flex items-center gap-2 text-lg"><Book size={20} className="text-indigo-500"/> Your Journal Feed</h3><span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{journalEntries.length} Entries</span></div>
          <div className="grid gap-6">{journalEntries.filter(j => readingFilter === 'All' || j.category === readingFilter).map(entry => (<Card key={entry.id} className="hover:shadow-lg hover:border-indigo-100 group transition-all duration-300"><div className="flex justify-between items-start mb-4"><Badge type={entry.category}/><div className="flex items-center gap-3"><span className="text-xs text-slate-400 font-medium">{new Date(entry.date).toLocaleDateString()}</span><button onClick={() => deleteJournalEntry(entry.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button></div></div><h4 className="text-xl font-bold text-slate-800 mb-3">{entry.title}</h4><div className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-100/50 font-light">{entry.content}</div></Card>))}</div>
       </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="space-y-8 animate-in fade-in" onPaste={handlePaste}>
       <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800 tracking-tight">My Schedule</h2>{isUploading && <span className="text-indigo-600 text-sm flex items-center gap-2 font-medium bg-indigo-50 px-3 py-1 rounded-full"><Loader className="animate-spin" size={14}/> Saving image...</span>}</div>
       <div className="grid lg:grid-cols-2 gap-8">
          <Card className="p-0 flex flex-col h-[600px] border-2 border-slate-100 shadow-lg"><div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm"><h3 className="font-bold text-slate-700 flex items-center gap-2"><CalendarIcon size={20} className="text-indigo-500"/> Weekly Timetable</h3><div className="flex gap-2"><label className="cursor-pointer text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"><UploadCloud size={14}/> Upload<input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'weekly')} /></label>{scheduleImages.weekly && <button onClick={() => {setScheduleImages(p=>({...p, weekly:null})); saveImages({weekly:null})}} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={16}/></button>}</div></div><div className="flex-1 bg-slate-50/50 flex items-center justify-center overflow-hidden relative group">{scheduleImages.weekly ? (<img src={scheduleImages.weekly} alt="Weekly Schedule" className="w-full h-full object-contain" />) : (<div className="text-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-2xl m-8"><ImageIcon size={48} className="mx-auto mb-4 opacity-20"/><p className="font-medium">No weekly schedule uploaded.</p><p className="text-xs mt-2 opacity-70">Click "Upload" or press <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-500 font-sans">Ctrl+V</kbd> to paste a screenshot.</p></div>)}</div></Card>
          <Card className="p-0 flex flex-col h-[600px] border-2 border-slate-100 shadow-lg"><div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm"><h3 className="font-bold text-slate-700 flex items-center gap-2"><Globe size={20} className="text-emerald-500"/> Yearly Calendar</h3><div className="flex gap-2"><label className="cursor-pointer text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"><UploadCloud size={14}/> Upload<input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'yearly')} /></label>{scheduleImages.yearly && <button onClick={() => {setScheduleImages(p=>({...p, yearly:null})); saveImages({yearly:null})}} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={16}/></button>}</div></div><div className="flex-1 bg-slate-50/50 flex items-center justify-center overflow-hidden">{scheduleImages.yearly ? (<img src={scheduleImages.yearly} alt="Yearly Calendar" className="w-full h-full object-contain" />) : (<div className="text-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-2xl m-8"><ImageIcon size={48} className="mx-auto mb-4 opacity-20"/><p className="font-medium">No yearly calendar uploaded.</p></div>)}</div></Card>
       </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in h-[calc(100vh-150px)]">
      <div className="flex flex-col gap-6">
        <Card className="p-8 bg-slate-900 text-white border-slate-800 h-full flex flex-col shadow-2xl shadow-slate-900/20">
          <div className="flex items-center gap-3 mb-6 text-indigo-400"><div className="p-2 bg-white/10 rounded-lg"><Command size={24} /></div><div><h2 className="text-xl font-bold">Smart Commander</h2><p className="text-xs text-slate-400">AI-Powered Admin Tools</p></div></div>
          <div className="flex-1 bg-black/30 rounded-2xl p-5 mb-6 overflow-y-auto font-mono text-xs border border-white/5 space-y-3">{aiLog.length === 0 && <div className="text-slate-600 italic text-center mt-20">System ready. Awaiting input...</div>}{aiLog.map((log, i) => (<div key={i} className="flex gap-3 border-b border-white/5 pb-2 last:border-0"><span className="text-slate-500 select-none">[{log.time}]</span><span className="text-emerald-400">{log.msg}</span></div>))}</div>
          <div className="relative"><input className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-5 pr-14 py-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner" placeholder="e.g. Rename Class A to Science" value={aiCommand} onChange={(e) => setAiCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && executeAiCommand()}/><button onClick={executeAiCommand} disabled={isProcessing} className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors disabled:opacity-50"><Send size={18}/></button></div>
        </Card>
      </div>
      <div className="flex flex-col gap-6">
         <Card className="p-8 flex flex-col bg-white">
            <div className="flex items-center gap-3 mb-6 text-slate-700"><div className="p-2 bg-slate-100 rounded-lg"><UploadCloud size={24}/></div><div><h2 className="font-bold text-lg">Bulk Import</h2><p className="text-xs text-slate-400">Excel / CSV Data Entry</p></div></div>
            <div className="flex gap-3 mb-4 p-1 bg-slate-100 rounded-xl w-fit">{['students', 'classes'].map(m => (<button key={m} onClick={() => setImportMode(m)} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${importMode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>))}</div>
            {importMode === 'students' && (<select className="w-full p-3 border border-slate-200 rounded-xl mb-4 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={importTargetClass} onChange={e => setImportTargetClass(e.target.value)}><option value="">-- Select Target Class --</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>)}
            <div className="flex-1 relative mb-6"><textarea className="w-full h-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none" placeholder={importMode === 'students' ? "Paste names column from Excel...\nJohn Doe\nJane Smith" : "Paste class names...\nMath 101\nHistory 5B"} value={importText} onChange={e => setImportText(e.target.value)} style={{ minHeight: '150px' }}/></div>
            <Button onClick={handleBulkImport} variant="success" icon={CheckCircle} className="w-full mb-6">Process Import</Button>
            <div className="border-t pt-6"><div className="flex items-center gap-2 mb-4 text-slate-700"><KeyRound size={20}/></div><div className="flex gap-2"><input type="password" className="flex-1 p-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="New Password" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)}/><Button onClick={handleUpdatePassword} variant="secondary">Update Password</Button></div></div>
         </Card>
      </div>
    </div>
  );

  const ChevronRight = ({className, size}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 18 15 12 9 6"></polyline></svg>;

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader className="animate-spin text-indigo-600" size={32}/></div>;

  if (permissionError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg border border-red-100">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4"/>
          <h2 className="text-2xl font-bold text-red-700 mb-2">Database Permission Denied</h2>
          <p className="text-slate-600 mb-4">Your Firebase Database rules are blocking the app from saving data.</p>
          <div className="text-left bg-slate-50 p-4 rounded-lg text-xs font-mono border border-slate-200 mb-6">
            1. Go to Firebase Console {'>'} Firestore Database {'>'} Rules.<br/>
            2. Change <code>allow read, write: if request.auth != null;</code> to <code>if true;</code><br/>
            3. Click Publish.
          </div>
          <Button onClick={() => window.location.reload()} icon={RefreshCw}>I Fixed It, Reload</Button>
        </div>
      </div>
    );
  }

  if (isLocked) { return renderLockScreen(); }

  return (
    <div className="min-h-screen bg-slate-100/50 flex flex-col font-sans text-slate-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3"><div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/20"><Globe size={20}/></div><span className="font-bold text-lg tracking-tight hidden sm:block text-slate-800">Global Learning <span className="font-light text-slate-400">Assistant</span></span></div>
          <nav className="hidden lg:flex space-x-1">
             {[{ id: 'dashboard', label: 'Home', icon: LayoutGrid }, { id: 'schedule', label: 'Schedule', icon: CalendarIcon }, { id: 'hub', label: 'Hub', icon: MessageCircle }, { id: 'reading', label: 'Journal', icon: BookOpen, special: 'teal' }, { id: 'report', label: 'Report Gen', icon: FileText, special: 'indigo' }, { id: 'todos', label: 'Tasks', icon: ListChecks }, { id: 'attendance', label: 'Attend', icon: CheckSquare }, { id: 'seating', label: 'Seats', icon: Users }, { id: 'plickers', label: 'Data', icon: BarChart2 }, { id: 'admin', label: 'Admin', icon: Settings, special: true }].map(item => (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === item.id ? (item.special === 'teal' ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200' : item.special === 'indigo' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : item.special ? 'bg-slate-800 text-white shadow-md' : 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200') : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}><item.icon size={14} className="mr-1.5"/> {item.label}</button>))}
          </nav>
          <div className="flex items-center gap-3"><button onClick={() => setIsLocked(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-full transition-colors" title="Lock Screen"><Lock size={16}/></button><div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs border-2 border-white shadow-sm">{user?.uid.slice(0,2).toUpperCase()}</div></div>
        </div>
      </header>
      <div className="lg:hidden bg-white border-b overflow-x-auto flex px-4 gap-2 py-3 no-scrollbar sticky top-16 z-40 shadow-sm">{['dashboard', 'schedule', 'hub', 'reading', 'report', 'todos', 'attendance', 'seating', 'plickers', 'admin'].map(t => (<button key={t} onClick={() => setActiveTab(t)} className={`flex flex-col items-center min-w-[64px] text-[10px] gap-1 font-medium px-2 py-1 rounded-lg transition-colors ${activeTab === t ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>{t === 'dashboard' && <LayoutGrid size={20}/>}{t === 'schedule' && <CalendarIcon size={20}/>}{t === 'hub' && <MessageCircle size={20}/>}{t === 'reading' && <BookOpen size={20}/>}{t === 'report' && <FileText size={20}/>}{t === 'todos' && <ListChecks size={20}/>}{t === 'attendance' && <CheckSquare size={20}/>}{t === 'seating' && <Users size={20}/>}{t === 'plickers' && <BarChart2 size={20}/>}{t === 'admin' && <Settings size={20}/>}{t.charAt(0).toUpperCase() + t.slice(1)}</button>))}</div>
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full pb-20">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'schedule' && renderSchedule()}
        {activeTab === 'hub' && renderHub()}
        {activeTab === 'reading' && renderReading()}
        {activeTab === 'report' && renderReportGen()}
        {activeTab === 'todos' && renderTodos()}
        {activeTab === 'attendance' && renderAttendance()}
        {activeTab === 'seating' && renderSeating()}
        {activeTab === 'plickers' && renderPlickers()}
        {activeTab === 'admin' && renderAdmin()}
      </main>
    </div>
  );
}