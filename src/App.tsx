import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, Users, Settings, Command, Save, Loader, Send, Plus, Trash2, 
  FileText, UploadCloud, CheckCircle, Globe, MessageCircle, ListChecks, 
  Calendar as CalendarIcon, CheckSquare, BarChart2, BookOpen, Link as LinkIcon, 
  PieChart, ThumbsUp, RefreshCw, AlertTriangle, Clock, Image as ImageIcon, 
  X, Lightbulb, Book, Lock, Unlock, Shield, KeyRound, PenTool, Copy, 
  ChevronRight, Bell, Search, Menu, MoreVertical, Filter, LucideIcon,
  Moon, Sun, Download
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, Analytics } from "firebase/analytics"; 
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User, Auth
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, onSnapshot, collection, addDoc, updateDoc, 
  deleteDoc, serverTimestamp, query, orderBy, arrayUnion, arrayRemove, where, Firestore
} from 'firebase/firestore';

// --- GLOBAL DECLARATIONS ---
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

// --- TYPE DEFINITIONS ---
interface Student {
  id: number;
  name: string;
  performance: number;
}

interface ClassData {
  id: string;
  name: string;
  layout: string;
  students: Student[];
}

type ScheduleType = 'lesson' | 'duty' | 'alert';

interface ScheduleEntry {
  period: string;
  code: string;
  time: string;
  type: ScheduleType;
  name: string;
  classId: string;
}

interface Homework {
  id: number;
  title: string;
  dueDate: string;
  classId: string;
  completedStudentIds: number[];
  createdAt: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: any;
  assignee?: string;
}

interface PlickerResult {
  name: string;
  score: number;
}

interface PlickerAnalysis {
  results: PlickerResult[];
  average: number;
  struggling: PlickerResult[];
}

type AttendanceStatus = 'present' | 'absent' | 'late';

// --- CONFIG & INITIALIZATION ---
const appId = typeof __app_id !== 'undefined' && __app_id ? __app_id : 'global-learning-assistant';

// YOUR REAL CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyAWQg_QaPJbcoDtWywzaB7E-hfmwXrOFeM",
  authDomain: "global-learning-248f6.firebaseapp.com",
  projectId: "global-learning-248f6",
  storageBucket: "global-learning-248f6.firebasestorage.app",
  messagingSenderId: "389987283650",
  appId: "1:389987283650:web:dbd8b70e88c6f38b69c15b",
  measurementId: "G-JXF0XR39DV"
};

// Robust Initialization
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let analytics: Analytics | undefined;
let isDemoMode = false; 

try {
    // Ensure apiKey is present and valid before initializing
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.length < 10) {
        throw new Error("Invalid or missing API Key");
    }
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    analytics = getAnalytics(app);
} catch (e) {
  console.warn("Firebase initialization failed. Running in DEMO MODE.", e);
  isDemoMode = true;
}

// --- MOCK DATA ---
const INITIAL_CLASSES: ClassData[] = [
  { 
    id: 'c1', name: 'J1 - Japanese History', layout: 'u-shape', 
    students: [
      {id: 1, name: 'Alex Johnson', performance: 85}, {id: 2, name: 'Sam Smith', performance: 60},
      {id: 3, name: 'Taylor Doe', performance: 92}, {id: 4, name: 'Jordan Lee', performance: 45},
      {id: 5, name: 'Casey Brown', performance: 78}, {id: 6, name: 'Jamie Wilson', performance: 88},
      {id: 7, name: 'Morgan Davis', performance: 70}, {id: 8, name: 'Riley Miller', performance: 55},
      {id: 9, name: 'Quinn Taylor', performance: 95}, {id: 10, name: 'Avery Moore', performance: 82}
    ] 
  },
];

const INITIAL_SCHEDULE: Record<string, ScheduleEntry[]> = { 
  Monday: [
    { period: '1st', code: 'J1', time: '08:50 - 09:40', type: 'lesson', name: 'Japanese History', classId: 'c1' },
    { period: '2nd', code: 'M2', time: '09:50 - 10:40', type: 'lesson', name: 'Math B', classId: 'c1' },
    { period: 'Lunch', code: 'DT', time: '12:30 - 13:15', type: 'duty', name: 'Hallway Duty', classId: '' }
  ], 
  Tuesday: [], Wednesday: [], Thursday: [], Friday: [] 
};

// --- COMPONENTS ---

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = "", noPadding = false, onClick }) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-indigo-100 dark:hover:border-slate-600 ${noPadding ? '' : 'p-6'} ${className}`}>
    {children}
  </div>
);

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  className?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', className = "", icon: Icon, disabled = false, size = 'md' }) => {
  const baseStyle = "rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variants = { 
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200",
    secondary: "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600",
    danger: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-100 dark:border-red-800",
    ghost: "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200",
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  );
};

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, size = "md", className = "" }) => { 
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-xl" }; 
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "??"; 
  
  const colors = [
    'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200', 
    'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-200', 
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-200', 
    'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200', 
    'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-200', 
    'bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-200',
  ];
  
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;

  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold shadow-sm ${colors[colorIndex]} ${className}`}>
      {initials}
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Settings State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Security State
  const [isLocked, setIsLocked] = useState(true);
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [setupPassword, setSetupPassword] = useState('');

  // Data States
  const [classes, setClasses] = useState<ClassData[]>(INITIAL_CLASSES);
  const [schedule, setSchedule] = useState<Record<string, ScheduleEntry[]>>(INITIAL_SCHEDULE);
  // Record<ClassId, Record<Date, Record<StudentId, Status>>>
  const [attendanceHistory, setAttendanceHistory] = useState<Record<string, Record<string, Record<string, AttendanceStatus>>>>({}); 
  const [seatingChart, setSeatingChart] = useState<Record<string, (number | undefined)[]>>({});
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [scheduleImages, setScheduleImages] = useState<{ weekly: string | null, yearly: string | null }>({ weekly: null, yearly: null });
  const [sharedTodos, setSharedTodos] = useState<Todo[]>([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClassId, setSelectedClassId] = useState('c1');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Feature Specific States
  const [plickersInput, setPlickersInput] = useState('');
  const [plickersAnalysis, setPlickersAnalysis] = useState<PlickerAnalysis | null>(null);
  const [swapSource, setSwapSource] = useState<number | null>(null);
  const [newHomework, setNewHomework] = useState({ title: '', dueDate: '', classId: 'c1' });
  
  // Report Gen States
  const [reportStudentId, setReportStudentId] = useState('');
  const [generatedReport, setGeneratedReport] = useState('');

  // --- MEMOIZED HELPERS ---
  const currentClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const studentList = useMemo(() => currentClass?.students || [], [currentClass]);
  
  const currentAttendance = useMemo(() => {
    const dateKey = currentDate.toISOString().split('T')[0];
    return attendanceHistory[selectedClassId]?.[dateKey] || {};
  }, [attendanceHistory, selectedClassId, currentDate]);

  // --- EFFECTS ---
  
  // Dark Mode Toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Reset password input when locked
  useEffect(() => {
    if (isLocked) {
      setPasswordInput('');
    }
  }, [isLocked]);

  // Auth Init
  useEffect(() => {
    // If we defaulted to demo mode initially, just set the fake user
    if (isDemoMode) {
      setTimeout(() => {
        setUser({ uid: 'demo-teacher', email: 'teacher@demo.com' } as User);
        setIsAuthLoading(false);
      }, 800);
      return;
    }

    // Attempt connection
    const initAuth = async () => {
      if (!auth) return;
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth connection failed, falling back to demo mode", error);
        // Fallback to demo user if connection fails (e.g. bad API key or network)
        setUser({ uid: 'demo-teacher', email: 'teacher@demo.com' } as User);
        setIsAuthLoading(false);
      }
    };
    initAuth();
    
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (u) {
            setUser(u);
            setIsAuthLoading(false);
        }
      });
      return () => unsubscribe();
    }
    return;
  }, []);

  // Data Sync
  useEffect(() => {
    // If we can't sync, just return a no-op cleanup function
    if (!user || isDemoMode || !db) return () => {};

    let unsubMain: (() => void) | undefined;
    let unsubImg: (() => void) | undefined;
    let unsubTodos: (() => void) | undefined;

    // We wrap this in a try-catch to prevent crashes if Firestore is locked
    try {
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main');
        unsubMain = onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            if (data.password) setStoredPassword(data.password);
            if (data.classes) setClasses(data.classes as ClassData[]);
            if (data.schedule) setSchedule(data.schedule as Record<string, ScheduleEntry[]>);
            if (data.attendanceHistory) setAttendanceHistory(data.attendanceHistory);
            if (data.seatingChart) setSeatingChart(data.seatingChart);
            if (data.homeworkList) setHomeworkList(data.homeworkList as Homework[]);
        } else {
            setDoc(userDocRef, {
            classes: INITIAL_CLASSES,
            schedule: INITIAL_SCHEDULE,
            attendanceHistory: {},
            seatingChart: {},
            homeworkList: [],
            createdAt: serverTimestamp()
            });
        }
        }, (err) => {
            console.error("Private Sync Error", err);
            // If permission denied or other error, we can stay logged in but data might not sync
        });

        const imgDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'images');
        unsubImg = onSnapshot(imgDocRef, (snap) => {
        if (snap.exists()) setScheduleImages(snap.data() as { weekly: string | null, yearly: string | null });
        });

        const todosRef = collection(db, 'artifacts', appId, 'public', 'data', 'shared_todos');
        unsubTodos = onSnapshot(query(todosRef, orderBy('createdAt', 'desc')), (snap) => {
        setSharedTodos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Todo)));
        });

    } catch (err) {
        console.error("Setup failed", err);
    }

    // ALWAYS return a cleanup function to satisfy TypeScript strict mode
    return () => {
        if (unsubMain) unsubMain();
        if (unsubImg) unsubImg();
        if (unsubTodos) unsubTodos();
    };
  }, [user]);

  // --- ACTIONS ---

  const savePrivate = async (data: any) => {
    if (data.password) setStoredPassword(data.password);
    if (isDemoMode || !user || !db) return; 
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main'), data);
  };

  const handleLogin = () => {
    if (passwordInput === storedPassword) {
      setIsLocked(false);
      setAuthError('');
      setPasswordInput(''); // FIX: Clear input on successful login
    } else {
      setAuthError('Incorrect Access Code');
    }
  };

  const handleSetup = () => {
    if (setupPassword.length < 4) {
      setAuthError('Code must be at least 4 characters');
      return;
    }
    setStoredPassword(setupPassword); 
    savePrivate({ password: setupPassword });
    setIsLocked(false);
    setSetupPassword(''); // FIX: Clear setup input
  };

  const handleLock = () => {
    setIsLocked(true);
    setPasswordInput(''); // FIX: Clear input when locking
  };

  const toggleAttendance = (studentId: number) => {
    const dateKey = currentDate.toISOString().split('T')[0];
    const sIdStr = String(studentId);
    const currentStatus = currentAttendance[sIdStr];
    
    let newStatus: AttendanceStatus = 'absent';
    if (currentStatus === 'absent') newStatus = 'late';
    else if (currentStatus === 'late') newStatus = 'present';

    const newHistory = {
      ...attendanceHistory,
      [selectedClassId]: {
        ...attendanceHistory[selectedClassId],
        [dateKey]: {
          ...attendanceHistory[selectedClassId]?.[dateKey],
          [sIdStr]: newStatus
        }
      }
    };
    
    setAttendanceHistory(newHistory);
    savePrivate({ attendanceHistory: newHistory });
  };

  const analyzePlickers = () => {
    const lines = plickersInput.split('\n').filter(l => l.trim());
    const results = lines.map(line => {
      const match = line.match(/(.+?)[\s,]+(\d+)$/);
      if (match) {
        return { name: match[1].trim(), score: parseInt(match[2]) };
      }
      return { name: line, score: 0 };
    });
    
    const average = results.reduce((acc, r) => acc + r.score, 0) / (results.length || 1);
    const struggling = results.filter(r => r.score < 60);
    
    setPlickersAnalysis({ results, average, struggling });
  };

  const addHomework = () => {
    if (!newHomework.title || !newHomework.dueDate) return;
    const newAssignment: Homework = {
      id: Date.now(),
      ...newHomework,
      completedStudentIds: [],
      createdAt: new Date().toISOString()
    };
    const updatedList = [newAssignment, ...homeworkList];
    setHomeworkList(updatedList);
    savePrivate({ homeworkList: updatedList });
    setNewHomework({ ...newHomework, title: '' });
  };

  const toggleHomework = (assignmentId: number, studentId: number) => {
    const updatedList = homeworkList.map(hw => {
      if (hw.id !== assignmentId) return hw;
      const isCompleted = hw.completedStudentIds.includes(studentId);
      return {
        ...hw,
        completedStudentIds: isCompleted 
          ? hw.completedStudentIds.filter(id => id !== studentId)
          : [...hw.completedStudentIds, studentId]
      };
    });
    setHomeworkList(updatedList);
    savePrivate({ homeworkList: updatedList });
  };

  const generateSimpleReport = () => {
    const s = studentList.find(s => String(s.id) === reportStudentId);
    if (!s) return;
    
    const comments = [
        s.performance > 80 ? `${s.name} is excelling in class.` : `${s.name} is working hard but needs support.`,
        "Participation has been consistent.",
        `Current average: ${s.performance}%.`
    ];
    setGeneratedReport(comments.join("\n"));
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if(printWindow) {
        printWindow.document.write('<html><head><title>Student Report</title>');
        printWindow.document.write('</head><body style="font-family: sans-serif; padding: 40px;">');
        printWindow.document.write(`<h1>Student Report</h1>`);
        printWindow.document.write(`<h3>Student: ${studentList.find(s=>String(s.id)===reportStudentId)?.name}</h3>`);
        printWindow.document.write(`<h3>Date: ${new Date().toLocaleDateString()}</h3>`);
        printWindow.document.write('<hr/><br/>');
        printWindow.document.write(`<p style="white-space: pre-wrap; line-height: 1.6;">${generatedReport}</p>`);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    }
  };

  // --- RENDERERS ---

  const renderLockScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4 animate-in fade-in">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-10 flex flex-col items-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
            <Shield size={40} />
          </div>
          <h1 className="text-2xl font-bold">Teacher Portal</h1>
          <p className="text-indigo-200 text-sm">Secure Classroom Management</p>
          {isDemoMode && <span className="mt-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">DEMO MODE</span>}
        </div>
        <div className="p-8">
          {storedPassword === null ? (
            <>
              <p className="text-slate-600 dark:text-slate-400 mb-6 text-center">Set up a secure access code to protect student data.</p>
              <div className="space-y-4">
                <input type="password" placeholder="Create 4-digit PIN" 
                  className="w-full text-center text-2xl tracking-widest p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                  value={setupPassword} onChange={e => setSetupPassword(e.target.value)} 
                />
                <Button onClick={handleSetup} className="w-full py-4">Set Code & Enter</Button>
              </div>
            </>
          ) : (
            <>
               <p className="text-slate-600 dark:text-slate-400 mb-6 text-center">Enter your PIN to unlock the dashboard.</p>
               <div className="space-y-4">
                <input type="password" placeholder="••••" 
                  className="w-full text-center text-2xl tracking-widest p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                  value={passwordInput} onChange={e => setPasswordInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <Button onClick={handleLogin} className="w-full py-4" icon={Unlock}>Unlock System</Button>
              </div>
            </>
          )}
          {authError && <p className="mt-4 text-center text-red-500 text-sm font-medium bg-red-50 py-2 rounded-lg">{authError}</p>}
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todaysSchedule = schedule[today] || [];
    
    const lastSessionAlerts: {class: string, date: string, students: string[]}[] = [];
    
    const classHistory = attendanceHistory[selectedClassId];
    if (classHistory) {
      const dates = Object.keys(classHistory).sort().reverse();
      const lastDate = dates.find(d => d < new Date().toISOString().split('T')[0]);
      if (lastDate) {
         const absentees = Object.entries(classHistory[lastDate])
           .filter(([_, status]) => status === 'absent')
           .map(([id]) => studentList.find(s => String(s.id) === id)?.name)
           .filter((name): name is string => !!name);
         
         if (absentees.length > 0) {
           lastSessionAlerts.push({ 
             class: currentClass?.name || 'Unknown Class', 
             date: lastDate, 
             students: absentees 
           });
         }
      }
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 to-purple-600/90 z-10" />
          <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80" className="absolute inset-0 w-full h-full object-cover opacity-50" alt="Classroom" />
          <div className="relative z-20 p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Good Morning, Teacher</h1>
              <p className="text-indigo-100">You have <span className="font-bold text-white">{todaysSchedule.length} sessions</span> and <span className="font-bold text-white">{sharedTodos.filter(t => !t.completed).length} tasks</span> today.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('schedule')} icon={CalendarIcon}>View Week</Button>
              <Button onClick={() => setActiveTab('attendance')} size="sm" icon={CheckSquare}>Take Attendance</Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             {lastSessionAlerts.length > 0 && (
               <Card className="bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800">
                 <div className="flex items-start gap-4">
                   <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-full text-amber-600 dark:text-amber-400"><AlertTriangle size={24}/></div>
                   <div>
                     <h3 className="text-amber-800 dark:text-amber-200 font-bold text-lg">Preparation Needed</h3>
                     <p className="text-amber-700 dark:text-amber-300 text-sm mb-2">The following students were absent last lesson. Prepare catch-up handouts.</p>
                     <div className="space-y-2">
                       {lastSessionAlerts.map((alert, i) => (
                         <div key={i} className="bg-white/60 dark:bg-black/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800 text-sm">
                           <span className="font-bold text-amber-900 dark:text-amber-100">{alert.class} ({alert.date}):</span> <span className="dark:text-slate-300">{alert.students.join(', ')}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               </Card>
             )}

             <div className="grid md:grid-cols-2 gap-6">
               <Card>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><Clock className="text-indigo-500" size={20}/> Today's Plan</h3>
                   <span className="text-xs font-bold text-slate-400 uppercase">{today}</span>
                 </div>
                 <div className="space-y-3">
                   {todaysSchedule.length > 0 ? todaysSchedule.map((evt, i) => (
                     <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border border-slate-100 dark:border-slate-700">
                       <div className="text-center w-12 shrink-0">
                         <div className="text-xs font-bold text-slate-400">{evt.time.split(' - ')[0]}</div>
                       </div>
                       <div className="w-1 h-8 bg-indigo-200 dark:bg-indigo-600 rounded-full" />
                       <div>
                         <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{evt.name}</div>
                         <div className="text-xs text-slate-500 dark:text-slate-400">{evt.code} • {evt.period}</div>
                       </div>
                     </div>
                   )) : (
                     <div className="text-center py-8 text-slate-400">No classes scheduled today.</div>
                   )}
                 </div>
               </Card>

               <Card>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><ListChecks className="text-emerald-500" size={20}/> Quick Tasks</h3>
                 </div>
                 <div className="space-y-2">
                   {sharedTodos.slice(0, 4).map(todo => (
                     <div key={todo.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer" onClick={() => setActiveTab('todos')}>
                       <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${todo.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-500'}`}>
                         {todo.completed && <CheckSquare size={12} />}
                       </div>
                       <span className={`text-sm ${todo.completed ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>{todo.text}</span>
                     </div>
                   ))}
                   <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setActiveTab('todos')}>View All Tasks</Button>
                 </div>
               </Card>
             </div>
          </div>

          <div className="space-y-6">
            <Card className="bg-gradient-to-b from-slate-800 to-slate-900 text-white border-none">
              <h3 className="font-bold text-indigo-300 mb-4 flex items-center gap-2"><Bell size={18}/> Notices</h3>
              <div className="space-y-4">
                 <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                   <span className="text-[10px] font-bold bg-indigo-500 px-2 py-0.5 rounded text-white mb-2 inline-block">MEETING</span>
                   <p className="text-sm font-medium">Staff meeting today at 16:00 in the main hall.</p>
                 </div>
                 <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                   <span className="text-[10px] font-bold bg-orange-500 px-2 py-0.5 rounded text-white mb-2 inline-block">DUTY</span>
                   <p className="text-sm font-medium">Entrance gate greetings tomorrow morning (08:00).</p>
                 </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderReportGen = () => (
    <div className="grid lg:grid-cols-12 gap-6 animate-in fade-in h-full">
        <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="flex-1 flex flex-col">
                <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-6">Report Generator</h3>
                <div className="space-y-4 flex-1">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Select Student</label>
                        <select className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none dark:text-white" value={reportStudentId} onChange={e => setReportStudentId(e.target.value)}>
                            <option value="">-- Select --</option>
                            {studentList.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                        </select>
                    </div>
                    <Button onClick={generateSimpleReport} disabled={!reportStudentId} icon={FileText} className="w-full">Generate Draft</Button>
                </div>
            </Card>
        </div>
        <div className="lg:col-span-8 flex flex-col gap-6 h-full">
            <Card className="flex-1 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-white">Report Preview</h3>
                    {generatedReport && (
                        <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(generatedReport)} icon={Copy}>Copy</Button>
                            <Button size="sm" onClick={handlePrintPDF} icon={Download}>Save as PDF</Button>
                        </div>
                    )}
                </div>
                <textarea 
                    className="flex-1 w-full p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl resize-none outline-none font-serif leading-relaxed text-slate-700 dark:text-slate-300" 
                    placeholder="Report content will appear here..." 
                    value={generatedReport} 
                    onChange={e => setGeneratedReport(e.target.value)}
                />
            </Card>
        </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Attendance Tracker</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Tap status button to toggle: Present → Absent → Late</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
           <select className="bg-transparent font-bold text-slate-700 dark:text-slate-200 text-sm outline-none cursor-pointer" 
             value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
             {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
           </select>
           <div className="w-px h-6 bg-slate-200 dark:bg-slate-600"></div>
           <input type="date" className="bg-transparent font-medium text-slate-600 dark:text-slate-300 text-sm outline-none cursor-pointer" 
             value={currentDate.toISOString().split('T')[0]} onChange={e => setCurrentDate(new Date(e.target.value))} />
        </div>
      </div>

      <Card className="flex-1 p-0 overflow-hidden flex flex-col">
        <div className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 p-4 grid grid-cols-12 gap-4 font-bold text-xs text-slate-500 dark:text-slate-300 uppercase tracking-wider">
          <div className="col-span-6 md:col-span-4">Student</div>
          <div className="col-span-3 md:col-span-4 text-center">Status</div>
          <div className="col-span-3 md:col-span-4 text-right">Performance</div>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {studentList.map(student => {
            const status = currentAttendance[String(student.id)] || 'present';
            const statusStyles = {
              present: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200",
              absent: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-200",
              late: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-200"
            };

            return (
              <div key={student.id} className="grid grid-cols-12 gap-4 items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                <div className="col-span-6 md:col-span-4 flex items-center gap-3">
                  <Avatar name={student.name} size="md" />
                  <div>
                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">{student.name}</div>
                    <div className="text-xs text-slate-400">ID: {student.id}</div>
                  </div>
                </div>
                <div className="col-span-3 md:col-span-4 flex justify-center">
                  <button 
                    onClick={() => toggleAttendance(student.id)}
                    className={`w-28 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all active:scale-95 ${statusStyles[status]}`}
                  >
                    {status}
                  </button>
                </div>
                <div className="col-span-3 md:col-span-4 flex justify-end">
                  <div className={`text-sm font-bold ${student.performance < 60 ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                    {student.performance}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  const renderHomework = () => (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Homework Tracker</h2>
        <Button variant="primary" icon={Plus} onClick={() => {
           document.getElementById('add-hw-title')?.focus();
        }}>New Assignment</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 h-full overflow-hidden">
        <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden">
          <Card className="bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800">
             <div className="flex flex-col md:flex-row gap-4 items-end">
               <div className="flex-1 w-full">
                 <label className="text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1 block">Assignment Title</label>
                 <input id="add-hw-title" type="text" placeholder="e.g. History Essay ch.4" 
                   className="w-full p-2 rounded-lg border border-indigo-200 dark:border-indigo-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                   value={newHomework.title} onChange={e => setNewHomework({...newHomework, title: e.target.value})}
                 />
               </div>
               <div className="w-full md:w-48">
                 <label className="text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1 block">Due Date</label>
                 <input type="date" 
                   className="w-full p-2 rounded-lg border border-indigo-200 dark:border-indigo-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                   value={newHomework.dueDate} onChange={e => setNewHomework({...newHomework, dueDate: e.target.value})}
                 />
               </div>
               <Button onClick={addHomework} disabled={!newHomework.title || !newHomework.dueDate}>Assign</Button>
             </div>
          </Card>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-20">
            {homeworkList.filter(hw => hw.classId === selectedClassId).length === 0 && (
              <div className="text-center py-12 text-slate-400">No active assignments for this class.</div>
            )}
            {homeworkList.filter(hw => hw.classId === selectedClassId).map(hw => {
              const pendingCount = studentList.length - hw.completedStudentIds.length;
              return (
                <Card key={hw.id} className="overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">{hw.title}</h3>
                      <div className="flex items-center gap-2 text-xs mt-1">
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">Due: {new Date(hw.dueDate).toLocaleDateString()}</span>
                        {pendingCount > 0 ? (
                          <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded border border-red-100 dark:border-red-800">{pendingCount} Missing</span>
                        ) : (
                           <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">All Complete</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => {
                      const newList = homeworkList.filter(h => h.id !== hw.id);
                      setHomeworkList(newList);
                      savePrivate({homeworkList: newList});
                    }} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {studentList.map(student => {
                      const isDone = hw.completedStudentIds.includes(student.id);
                      return (
                        <div key={student.id} 
                          onClick={() => toggleHomework(hw.id, student.id)}
                          className={`cursor-pointer p-2 rounded-lg border text-xs flex items-center gap-2 transition-all ${isDone ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-indigo-300'}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500'}`}>
                            {isDone && <CheckSquare size={10} />}
                          </div>
                          <span className="truncate font-medium">{student.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-slate-800 text-white h-full border-none">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><AlertTriangle className="text-amber-400"/> Homework Watchlist</h3>
            <p className="text-sm text-slate-300 mb-6">Students with multiple missing assignments across all active tasks.</p>
            <div className="space-y-3">
              {studentList.map(s => {
                 const missingCount = homeworkList.filter(hw => hw.classId === selectedClassId && !hw.completedStudentIds.includes(s.id)).length;
                 if (missingCount === 0) return null;
                 return (
                   <div key={s.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                     <div className="flex items-center gap-3">
                       <Avatar name={s.name} size="sm" />
                       <span className="text-sm font-medium">{s.name}</span>
                     </div>
                     <span className={`text-xs font-bold px-2 py-1 rounded ${missingCount > 2 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                       {missingCount} Missing
                     </span>
                   </div>
                 )
              }).sort((a,b) => (b?.props?.children?.props?.children[1]?.props?.children[0] || 0) - (a?.props?.children?.props?.children[1]?.props?.children[0] || 0)).slice(0, 8)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderPlickers = () => (
    <div className="grid lg:grid-cols-12 gap-6 animate-in fade-in h-full">
      <div className="lg:col-span-5 flex flex-col gap-6 h-full">
        <Card className="bg-white dark:bg-slate-800 border-indigo-100 dark:border-slate-700 flex-1 flex flex-col">
          <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart2 className="text-indigo-500"/> Input Results
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Paste data directly. Supports "Name Score" or CSV "Name, Score".</p>
          <textarea 
            className="flex-1 w-full p-4 text-sm font-mono border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-4 dark:text-white"
            placeholder={"Alex Johnson, 85\nSam Smith, 42"}
            value={plickersInput}
            onChange={e => setPlickersInput(e.target.value)}
          />
          <Button onClick={analyzePlickers} className="w-full" icon={RefreshCw}>Analyze Data</Button>
        </Card>
      </div>
      
      <div className="lg:col-span-7 flex flex-col gap-6 h-full overflow-y-auto">
        {plickersAnalysis ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 flex flex-col items-center justify-center p-4">
                <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{Math.round(plickersAnalysis.average)}%</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wide">Class Average</span>
              </Card>
              <Card className="bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800 flex flex-col items-center justify-center p-4">
                <span className="text-3xl font-bold text-red-700 dark:text-red-400">{plickersAnalysis.struggling.length}</span>
                <span className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-wide">Students Struggling</span>
              </Card>
            </div>

            <Card>
              <h3 className="font-bold text-slate-800 dark:text-white mb-4">Recommendations</h3>
              {plickersAnalysis.average < 60 ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-xl border border-amber-100 dark:border-amber-800 text-sm">
                  <strong className="block mb-1"><Lightbulb size={16} className="inline mr-1"/> Reteach Needed</strong>
                  Class mastery is low. Consider reviewing the material or grouping strong students with those struggling for peer review.
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded-xl border border-emerald-100 dark:border-emerald-800 text-sm">
                  <strong className="block mb-1"><ThumbsUp size={16} className="inline mr-1"/> Move Forward</strong>
                  Class mastery is good. You can likely proceed to the next topic.
                </div>
              )}
              
              {plickersAnalysis.struggling.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Focus Group</h4>
                  <div className="flex flex-wrap gap-2">
                    {plickersAnalysis.struggling.map((s, i) => (
                      <span key={i} className="text-xs bg-white dark:bg-slate-700 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-2 py-1 rounded-lg font-medium">
                        {s.name} ({s.score}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <PieChart size={48} className="mb-4 opacity-20"/>
            <p>Waiting for data...</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSeating = () => {
     const chart = seatingChart[selectedClassId] || [];
     const slots = Array.from({ length: 25 });
     
     const handleSeatClick = (index: number) => {
       if (swapSource === null) {
         setSwapSource(index);
       } else {
         const newLayout = [...chart];
         while (newLayout.length <= Math.max(index, swapSource)) newLayout.push(undefined);
         
         const temp = newLayout[swapSource];
         newLayout[swapSource] = newLayout[index];
         newLayout[index] = temp;
         
         const newSeatingChart = { ...seatingChart, [selectedClassId]: newLayout };
         setSeatingChart(newSeatingChart);
         savePrivate({ seatingChart: newSeatingChart });
         setSwapSource(null);
       }
     };

     return (
       <div className="h-full flex flex-col animate-in fade-in">
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Seating Planner</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Tap a student, then tap a destination to move/swap.</span>
              <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => {
                 const defaultLayout = studentList.map(s => s.id);
                 const newChart = { ...seatingChart, [selectedClassId]: defaultLayout };
                 setSeatingChart(newChart);
                 savePrivate({ seatingChart: newChart });
              }}>Reset Layout</Button>
            </div>
         </div>
         
         <div className="flex-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-3xl shadow-inner border border-slate-200 dark:border-slate-700 p-8 overflow-auto flex justify-center items-center relative">
            <div className="absolute top-4 bg-slate-800 dark:bg-slate-700 text-white px-8 py-2 rounded-full text-xs font-bold tracking-widest shadow-lg">FRONT OF CLASS</div>
            
            <div className="grid grid-cols-5 gap-4 mt-12">
              {slots.map((_, i) => {
                 const studentId = chart[i] !== undefined ? chart[i] : (studentList[i] ? studentList[i].id : undefined);
                 const displayId = (chart.length > 0) ? chart[i] : (i < studentList.length ? studentList[i].id : undefined);
                 
                 const student = studentList.find(s => s.id === displayId);
                 const isSelected = swapSource === i;

                 return (
                   <div 
                     key={i} 
                     onClick={() => handleSeatClick(i)}
                     className={`w-32 h-24 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center p-2 shadow-sm
                       ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white scale-105 z-10 ring-4 ring-indigo-200' : 
                         student ? 'bg-white dark:bg-slate-700 border-white dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md' : 'bg-slate-100 dark:bg-slate-800/50 border-dashed border-slate-300 dark:border-slate-600 opacity-50 hover:opacity-100 hover:bg-white dark:hover:bg-slate-700'}
                     `}
                   >
                     {student ? (
                       <>
                         <Avatar name={student.name} size="sm" className="mb-2"/>
                         <span className="text-xs font-bold text-center leading-tight truncate w-full dark:text-white">{student.name}</span>
                         <span className="text-[10px] opacity-70 dark:text-slate-300">{student.performance}%</span>
                       </>
                     ) : (
                       <span className="text-xs font-bold text-slate-400 dark:text-slate-600">Empty</span>
                     )}
                   </div>
                 )
              })}
            </div>
         </div>
       </div>
     );
  };

  const renderSchedule = () => (
     <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Class Schedule</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Upload screenshots of your timetable for quick reference.</p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-6">
           {(['weekly', 'yearly'] as const).map(type => (
             <Card key={type} className="h-[600px] flex flex-col p-0">
               <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-700 dark:text-slate-200 capitalize">{type} Calendar</h3>
                 <div className="flex items-center gap-2">
                    <label className="cursor-pointer text-xs font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2 text-slate-600 dark:text-slate-300 transition-colors">
                      <UploadCloud size={14}/> Upload
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if(file && user && !isDemoMode) {
                           const reader = new FileReader();
                           reader.onloadend = () => {
                             const update = { ...scheduleImages, [type]: reader.result as string };
                             setScheduleImages(update);
                             savePrivate(update);
                           };
                           reader.readAsDataURL(file);
                        }
                      }}/>
                    </label>
                    {scheduleImages[type] && user && (
                      <button onClick={() => {
                         const update = { ...scheduleImages, [type]: null };
                         setScheduleImages(update);
                         savePrivate(update);
                      }} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                    )}
                 </div>
               </div>
               <div className="flex-1 bg-slate-200/50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden relative group">
                 {scheduleImages[type] ? (
                   <img src={scheduleImages[type]!} className="w-full h-full object-contain" alt={type}/>
                 ) : (
                   <div className="text-center text-slate-400">
                     <ImageIcon size={48} className="mx-auto mb-4 opacity-20"/>
                     <p className="font-medium">No image uploaded</p>
                   </div>
                 )}
               </div>
             </Card>
           ))}
        </div>
     </div>
  );

  // --- LAYOUT SHELL ---

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader className="animate-spin text-indigo-600"/></div>;
  if (!user || storedPassword === null || isLocked) return renderLockScreen();

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'seating', label: 'Seating Plan', icon: Users },
    { id: 'homework', label: 'Homework', icon: Book },
    { id: 'plickers', label: 'Data Analysis', icon: BarChart2 },
    { id: 'report', label: 'Report Gen', icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-200">
            <Globe size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-800 dark:text-white">TeacherAssistant</span>
        </div>
        
        <nav className="p-4 space-y-1">
          {navigation.map(item => (
            <button 
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-800' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
             <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
             {isDarkMode ? <Moon size={14}/> : <Sun size={14}/>}
          </button>

          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
             <div className="flex items-center gap-3 mb-3">
               <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                 {user.uid?.slice(0,2).toUpperCase() || 'TE'}
               </div>
               <div className="flex-1 overflow-hidden">
                 <div className="text-xs font-bold text-slate-800 dark:text-white truncate">Teacher Admin</div>
                 <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{isDemoMode ? 'Demo Mode' : 'Live Data'}</div>
               </div>
             </div>
             <Button variant="secondary" size="sm" className="w-full" icon={Lock} onClick={handleLock}>Lock System</Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300"><Menu/></button>
          <span className="font-bold text-slate-800 dark:text-white">TeacherAssistant</span>
          <div className="w-8" />
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'attendance' && renderAttendance()}
            {activeTab === 'seating' && renderSeating()}
            {activeTab === 'homework' && renderHomework()}
            {activeTab === 'plickers' && renderPlickers()}
            {activeTab === 'schedule' && renderSchedule()}
            {activeTab === 'report' && renderReportGen()}
          </div>
        </div>
      </main>
    </div>
  );
}