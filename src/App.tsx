import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutGrid, Users, Settings, Command, Save, Loader, Send, Plus, Trash2, 
  FileText, UploadCloud, CheckCircle, Globe, MessageCircle, ListChecks, 
  Calendar as CalendarIcon, CheckSquare, BarChart2, BookOpen, Link as LinkIcon, 
  PieChart, ThumbsUp, RefreshCw, AlertTriangle, Clock, Image as ImageIcon, 
  X, Lightbulb, Book, Lock, Unlock, Shield, KeyRound, PenTool, Copy, 
  ChevronRight, Bell, Search, Menu, MoreVertical, Filter, 
  Moon, Sun, Download, Sparkles, FileSpreadsheet, Edit, ChevronDown, Clipboard,
  CalendarDays, BookOpenCheck, Database, Save as SaveIcon, Shuffle, Users2, Timer, StickyNote,
  Maximize2, Minimize2, MonitorPlay, CloudSun, Zap, GripVertical, GraduationCap, LucideIcon
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, Analytics } from "firebase/analytics"; 
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, Auth, User
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, onSnapshot, collection, addDoc, updateDoc, 
  deleteDoc, serverTimestamp, query, orderBy, Firestore
} from 'firebase/firestore';

// --- GLOBAL DECLARATIONS ---
// Explicitly declare the global variables provided by the environment to fix TS errors
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

const appId = typeof __app_id !== 'undefined' && __app_id ? __app_id : 'global-learning-assistant';
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : '';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';

// --- TYPES ---
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

interface LessonPlan {
  week: number;
  topic: string;
  materials: string;
  dateLabel: string;
}

// Curriculum structure: ClassID -> TermID -> WeekNumber -> LessonPlan
interface CurriculumData {
  [classId: string]: {
    [termId: string]: {
      [week: number]: LessonPlan;
    };
  };
}

interface ScheduleEntry {
  period: string;
  code: string;
  time: string;
  type: string;
  name: string;
  classId: string;
}

interface ScheduleData {
  [day: string]: ScheduleEntry[];
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: any;
}

interface ScheduleImages {
  weekly: string | null;
  yearly: string | null;
}

// --- DATA FROM EXCEL INTEGRATION ---

const INITIAL_CLASSES_DATA: ClassData[] = [
  { 
    id: 'c1', name: 'J1 - Global Studies', layout: 'u-shape', 
    students: [
      {id: 101, name: 'Kenji T.', performance: 85}, {id: 102, name: 'Hana S.', performance: 92},
      {id: 103, name: 'Yuto M.', performance: 78}, {id: 104, name: 'Sakura I.', performance: 88},
    ] 
  },
  { 
    id: 'c2', name: 'J2 - Science & Bio', layout: 'rows', 
    students: [
      {id: 201, name: 'Ryu K.', performance: 75}, {id: 202, name: 'Emi O.', performance: 82},
      {id: 203, name: 'Takumi Y.', performance: 95}, {id: 204, name: 'Nao L.', performance: 60},
    ] 
  },
  { 
    id: 'c3', name: 'J3 - Cultural Studies', layout: 'groups', 
    students: [
      {id: 301, name: 'Hiroshi A.', performance: 88}, {id: 302, name: 'Mari P.', performance: 91},
      {id: 303, name: 'Kaito S.', performance: 70}, {id: 304, name: 'Yui K.', performance: 85},
    ] 
  },
];

// Typed Curriculum Data
const INITIAL_CURRICULUM_DATA: CurriculumData = {
  'c1': { // J1 (中１)
    't1': {
      1: { week: 1, topic: 'Video call with Thailand', materials: 'Assignments', dateLabel: 'W1' },
      2: { week: 2, topic: 'Practice Phrases', materials: 'Explain shoe using learned phrases', dateLabel: 'W2' },
      3: { week: 3, topic: 'Voice Note Recording', materials: 'Recording of shoe', dateLabel: 'W3' },
      4: { week: 4, topic: 'Vocab Book', materials: '', dateLabel: 'W4' },
    },
    't2': {
      1: { week: 1, topic: 'Continents', materials: '', dateLabel: 'W1' },
      2: { week: 2, topic: 'Landmarks 1', materials: 'Video: Final piece talking about landmark', dateLabel: 'W2' },
      3: { week: 3, topic: 'Landmarks 2', materials: 'Famous landmarks quiz / Edpuzzle', dateLabel: 'W3' },
      4: { week: 4, topic: 'Maasai Tribe', materials: 'Clothing pattern and colours, traditions', dateLabel: 'W4' },
      5: { week: 5, topic: 'Animal 1', materials: '', dateLabel: 'W5' },
      6: { week: 6, topic: 'Animal 2', materials: 'Animal word search', dateLabel: 'W6' },
      7: { week: 7, topic: 'Introduce Assignments', materials: 'Intro of African country', dateLabel: 'W7' },
    },
    't3': {
      1: { week: 1, topic: 'Discovering Thailand', materials: 'Geography & Activities', dateLabel: 'W1' },
      2: { week: 2, topic: 'Culture and Customs 1', materials: '', dateLabel: 'W2' },
      3: { week: 3, topic: 'Culture and Customs 2', materials: '', dateLabel: 'W3' },
      4: { week: 4, topic: 'Language & Comm 1', materials: '', dateLabel: 'W4' },
      5: { week: 5, topic: 'Language & Comm 2', materials: '', dateLabel: 'W5' },
      6: { week: 6, topic: 'Catch Up', materials: '', dateLabel: 'W6' },
    }
  },
  'c2': { // J2 (中２)
    't1': {
      1: { week: 1, topic: 'Assignments', materials: '', dateLabel: 'W1' },
      2: { week: 2, topic: 'Test: Photosynthesis', materials: '', dateLabel: 'W2' },
      3: { week: 3, topic: 'Written H/W', materials: 'Talk about plant/flower in area', dateLabel: 'W3' },
      4: { week: 4, topic: 'Presentation', materials: 'Send picture of flower to teacher', dateLabel: 'W4' },
    },
    't2': {
      1: { week: 1, topic: 'Introducing Organs', materials: 'Quiz: Tic Tac Toe, Draw organs', dateLabel: 'W1' },
      2: { week: 2, topic: 'Prepositions', materials: 'Edpuzzle Speaking Activity', dateLabel: 'W2' },
      3: { week: 3, topic: 'Functions of Organs 1', materials: 'Quiz Speaking Worksheet', dateLabel: 'W3' },
      4: { week: 4, topic: 'Functions of Organs 2', materials: 'Review Quiz Worksheet Kahoot', dateLabel: 'W4' },
      5: { week: 5, topic: 'Assignments Start', materials: 'Make PP, Finish slides', dateLabel: 'W5' },
    },
    't3': {
      1: { week: 1, topic: 'Self-Study', materials: '', dateLabel: 'W1' },
      2: { week: 2, topic: 'Catch Up', materials: '', dateLabel: 'W2' },
    }
  },
  'c3': { // J3 (中３)
    't1': {
       1: { week: 1, topic: 'Assignments', materials: '', dateLabel: 'W1' },
       3: { week: 3, topic: 'Presentation', materials: 'Lunchbox design', dateLabel: 'W3' },
       4: { week: 4, topic: 'Written', materials: 'Opinion on meal sustenance', dateLabel: 'W4' },
       8: { week: 8, topic: 'India', materials: '', dateLabel: 'W8' },
       9: { week: 9, topic: 'Quiz', materials: '', dateLabel: 'W9' },
    },
    't2': {
      1: { week: 1, topic: 'Geography', materials: '', dateLabel: 'W1' },
      2: { week: 2, topic: 'Aboriginal Art 1', materials: 'Make aboriginal art', dateLabel: 'W2' },
      3: { week: 3, topic: 'Aboriginal Art 2', materials: 'Finish art, write thank you letter', dateLabel: 'W3' },
      4: { week: 4, topic: 'Conversation 1', materials: 'Ordering', dateLabel: 'W4' },
      5: { week: 5, topic: 'Conversation 2', materials: 'Host Family Conversation', dateLabel: 'W5' },
      6: { week: 6, topic: 'PowerPoint 1', materials: '', dateLabel: 'W6' },
    },
    't3': {
      1: { week: 1, topic: '', materials: '', dateLabel: 'W1' },
      2: { week: 2, topic: '', materials: '', dateLabel: 'W2' },
      3: { week: 3, topic: '', materials: '', dateLabel: 'W3' },
    }
  }
};

const INITIAL_SCHEDULE_DATA: ScheduleData = { 
  Monday: [
    { period: '1st', code: 'J1', time: '08:50 - 09:40', type: 'lesson', name: 'Global Studies', classId: 'c1' },
    { period: '2nd', code: 'J2', time: '09:50 - 10:40', type: 'lesson', name: 'Science & Bio', classId: 'c2' },
    { period: 'Lunch', code: 'DT', time: '12:30 - 13:15', type: 'duty', name: 'Hallway Duty', classId: '' }
  ], 
  Tuesday: [
    { period: '3rd', code: 'J3', time: '10:50 - 11:40', type: 'lesson', name: 'Cultural Studies', classId: 'c3' },
  ], 
  Wednesday: [], Thursday: [], Friday: [] 
};

const INITIAL_TERM_SETTINGS_DATA = {
  t1: new Date().toISOString().split('T')[0],
  t2: '',
  t3: ''
};

// --- CONFIG & INITIALIZATION ---

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let analytics: Analytics | undefined;
let isDemoMode = false; 

try {
    if (!firebaseConfigStr) {
        console.warn("Missing Firebase Config - Defaulting to Demo Mode");
        isDemoMode = true;
    } else {
        const firebaseConfig = JSON.parse(firebaseConfigStr);
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        analytics = getAnalytics(app);
    }
} catch (e) {
  console.warn("Firebase initialization failed. Running in DEMO MODE.", e);
  isDemoMode = true;
}

// --- COMPONENTS ---

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  onClick?: () => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  tabIndex?: number;
  // Allow other props for div
  [x: string]: any;
}

const Card: React.FC<CardProps> = ({ children, className = "", noPadding = false, onClick, onPaste, tabIndex, ...props }) => (
  <div 
    onClick={onClick} 
    onPaste={onPaste}
    tabIndex={tabIndex}
    className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-indigo-100 dark:hover:border-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${noPadding ? '' : 'p-6'} ${className}`}
    {...props}
  >
    {children}
  </div>
);

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'ai';
  className?: string;
  icon?: React.ElementType;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', className = "", icon: Icon, disabled = false, size = 'md' }) => {
  const baseStyle = "rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variants = { 
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none",
    secondary: "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600",
    danger: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-100 dark:border-red-800",
    ghost: "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200",
    ai: "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-purple-200",
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  );
};

const Avatar = ({ name, size = "md", className = "" }: { name: string, size?: 'sm'|'md'|'lg', className?: string }) => { 
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-xl" }; 
  // Safe handling if name is missing
  const displayName = name || "User";
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  const colors = [
    'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200', 
    'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-200', 
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-200', 
    'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200', 
    'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-200', 
    'bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-200',
  ];
  
  const colorIndex = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;

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
  const [classes, setClasses] = useState<ClassData[]>(INITIAL_CLASSES_DATA);
  const [schedule, setSchedule] = useState<ScheduleData>(INITIAL_SCHEDULE_DATA);
  const [attendanceHistory, setAttendanceHistory] = useState<Record<string, any>>({}); 
  const [scheduleImages, setScheduleImages] = useState<ScheduleImages>({ weekly: null, yearly: null });
  const [sharedTodos, setSharedTodos] = useState<Todo[]>([]);
  
  // Curriculum States
  const [termSettings, setTermSettings] = useState(INITIAL_TERM_SETTINGS_DATA);
  const [curriculum, setCurriculum] = useState<CurriculumData>(INITIAL_CURRICULUM_DATA);
  const [activeTermId, setActiveTermId] = useState('t2'); // Default to Term 2 

  // UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClassId, setSelectedClassId] = useState('c1');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isCmdOpen, setIsCmdOpen] = useState(false); 
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null); 
  const [viewingScheduleImage, setViewingScheduleImage] = useState<string | null>(null); // Schedule Zoom
  const [isFocusMode, setIsFocusMode] = useState(false); // Focus Mode
  const [weather, setWeather] = useState({ temp: 24, condition: 'Sunny' });
  
  // Feature Specific States
  const [quickNotes, setQuickNotes] = useState(''); // Scratchpad
  const [teacherXP, setTeacherXP] = useState(1250); // Gamification
  
  // Tools States
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // --- MEMOIZED HELPERS ---
  const currentClass = useMemo(() => classes.find(c => c.id === selectedClassId) || classes[0], [classes, selectedClassId]);
  const studentList = useMemo(() => currentClass?.students || [], [currentClass]);
  
  const currentAttendance = useMemo(() => {
    const dateKey = currentDate.toISOString().split('T')[0];
    return attendanceHistory[selectedClassId]?.[dateKey] || {};
  }, [attendanceHistory, selectedClassId, currentDate]);

  // Calculate current Term and Week based on termSettings
  const getTermContext = (date: Date) => {
    // Robust fallback to Term 2, Week 2 if data missing
    if (!termSettings?.t1) return { term: 't2', week: 2 };

    const dateStr = date.toISOString().split('T')[0];
    
    const getWeekDiff = (startStr: string) => {
        if (!startStr) return -1;
        const start = new Date(startStr);
        const diffTime = date.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const week = Math.ceil(diffDays / 7);
        return week;
    };

    let term = 't1';
    let week = getWeekDiff(termSettings.t1);

    if (termSettings.t2 && dateStr >= termSettings.t2) {
        term = 't2';
        week = getWeekDiff(termSettings.t2);
    }
    if (termSettings.t3 && dateStr >= termSettings.t3) {
        term = 't3';
        week = getWeekDiff(termSettings.t3);
    }

    return { term, week: week > 0 ? week : 1 };
  };

  // --- EFFECTS ---
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  // Command Palette Shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCmdOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Reset password input when locked
  useEffect(() => {
    if (isLocked) {
      setPasswordInput('');
    }
  }, [isLocked]);

  // Auth Init
  useEffect(() => {
    if (isDemoMode) {
      setTimeout(() => {
        setUser({ uid: 'demo-teacher', email: 'teacher@demo.com' } as User);
        setIsAuthLoading(false);
      }, 800);
      return;
    }

    const initAuth = async () => {
      if (!auth) return;
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth connection failed, falling back to demo mode", error);
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
    if (!user || isDemoMode || !db) return () => {};

    let unsubMain: (() => void) | undefined;
    let unsubImg: (() => void) | undefined;
    let unsubTodos: (() => void) | undefined;

    try {
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main');
        unsubMain = onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            if (data.password) setStoredPassword(data.password);
            if (data.classes) setClasses(data.classes as ClassData[]);
            if (data.schedule) setSchedule(data.schedule as ScheduleData);
            if (data.attendanceHistory) setAttendanceHistory(data.attendanceHistory);
            if (data.termSettings) setTermSettings(data.termSettings);
            if (data.curriculum) setCurriculum(data.curriculum as CurriculumData);
            if (data.quickNotes) setQuickNotes(data.quickNotes);
            if (data.teacherXP) setTeacherXP(data.teacherXP || 0);
        } else {
            // Initialize with the pre-loaded excel data if new user
            setDoc(userDocRef, {
            classes: INITIAL_CLASSES_DATA,
            schedule: INITIAL_SCHEDULE_DATA,
            attendanceHistory: {},
            homeworkList: [],
            termSettings: INITIAL_TERM_SETTINGS_DATA,
            curriculum: INITIAL_CURRICULUM_DATA,
            quickNotes: '',
            teacherXP: 1250,
            createdAt: serverTimestamp()
            });
        }
        }, (err) => {
            console.error("Private Sync Error", err);
        });

        const imgDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'images');
        unsubImg = onSnapshot(imgDocRef, (snap) => {
        if (snap.exists()) setScheduleImages(snap.data() as ScheduleImages);
        });

        const todosRef = collection(db, 'artifacts', appId, 'public', 'data', 'shared_todos');
        unsubTodos = onSnapshot(query(todosRef, orderBy('createdAt', 'desc')), (snap) => {
        setSharedTodos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Todo)));
        });

    } catch (err) {
        console.error("Setup failed", err);
    }

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

  const addXP = (amount: number) => {
      const newXP = teacherXP + amount;
      setTeacherXP(newXP);
      savePrivate({ teacherXP: newXP });
  };

  const saveImages = async (data: any) => {
    if (isDemoMode || !user || !db) return;
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'images'), data, { merge: true });
  };

  const handleLogin = () => {
    if (passwordInput === storedPassword) {
      setIsLocked(false);
      setAuthError('');
      setPasswordInput('');
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
    setSetupPassword('');
  };

  const handleLock = () => {
    setIsLocked(true);
    setPasswordInput('');
  };

  // --- PASTE FUNCTION FOR IMAGES ---
  const handlePaste = (e: React.ClipboardEvent, type: 'weekly' | 'yearly') => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
             const result = event.target?.result as string;
             const update = { ...scheduleImages, [type]: result };
             setScheduleImages(update);
             setUploadStatus("Pasted successfully! Click Save.");
             // Auto save for better UX
             if (!isDemoMode && user && db) {
                saveImages({ [type]: result });
             }
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const saveSchedule = (type: 'weekly' | 'yearly') => {
      if (scheduleImages[type]) {
          saveImages({ [type]: scheduleImages[type] });
          setUploadStatus("Image Saved!");
          setTimeout(() => setUploadStatus(''), 3000);
      }
  };

  const clearSchedule = (type: 'weekly' | 'yearly') => {
      const update = { ...scheduleImages, [type]: null };
      setScheduleImages(update);
      if (!isDemoMode && user && db) {
          saveImages(update);
      }
      setUploadStatus("Cleared");
      setTimeout(() => setUploadStatus(''), 3000);
  };

  // --- CURRICULUM MANIPULATION ---
  const updateCurriculum = (week: number, field: 'topic' | 'materials', value: string) => {
    const newCurriculum = { ...curriculum };
    if (!newCurriculum[selectedClassId]) newCurriculum[selectedClassId] = {};
    if (!newCurriculum[selectedClassId][activeTermId]) newCurriculum[selectedClassId][activeTermId] = {};
    
    if (!newCurriculum[selectedClassId][activeTermId][week]) {
        newCurriculum[selectedClassId][activeTermId][week] = { week, topic: '', materials: '', dateLabel: `W${week}` };
    }
    
    newCurriculum[selectedClassId][activeTermId][week][field] = value;
    setCurriculum(newCurriculum);
    savePrivate({ curriculum: newCurriculum });
  };

  // --- CLASS & STUDENT ACTIONS ---
  const toggleAttendance = (studentId: number) => {
    const dateKey = currentDate.toISOString().split('T')[0];
    const sIdStr = String(studentId);
    const currentStatus = currentAttendance[sIdStr];
    
    let newStatus = 'absent';
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

  const markAllPresent = () => {
    if (!currentClass) return;
    const dateKey = currentDate.toISOString().split('T')[0];
    const newRecords = { ...attendanceHistory[selectedClassId]?.[dateKey] };
    
    currentClass.students.forEach(s => {
      newRecords[String(s.id)] = 'present';
    });
    
    const newHistory = {
        ...attendanceHistory,
        [selectedClassId]: {
          ...attendanceHistory[selectedClassId],
          [dateKey]: newRecords
        }
    };
    setAttendanceHistory(newHistory);
    savePrivate({ attendanceHistory: newHistory });
    addXP(10);
  };

  const toggleWeather = () => {
      setWeather(prev => ({
          temp: prev.temp === 24 ? 18 : 24,
          condition: prev.condition === 'Sunny' ? 'Rainy' : 'Sunny'
      }));
  }

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

  const renderFocusMode = () => {
      if (!isFocusMode) return null;
      const { term: currentTerm, week: currentWeek } = getTermContext(new Date());
      // Defensive check: Ensure we access curriculum safely
      const lessonPlan = curriculum?.[selectedClassId]?.[currentTerm]?.[currentWeek];

      return (
          <div className="fixed inset-0 bg-slate-900 text-white z-[200] flex flex-col animate-in zoom-in duration-300">
              {/* Header */}
              <div className="p-6 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                       <div className="bg-white/10 p-2 rounded-lg">
                            <CloudSun size={32} />
                       </div>
                       <div>
                           <h1 className="text-3xl font-bold tracking-tight">{currentClass?.name}</h1>
                           <div className="text-lg text-slate-300 flex gap-2 items-center">
                               <span className="bg-indigo-500/50 px-2 py-0.5 rounded text-sm uppercase font-bold tracking-wider">Focus Mode</span>
                               Week {currentWeek} • Term {currentTerm.replace('t','')}
                           </div>
                       </div>
                  </div>
                  <button onClick={() => setIsFocusMode(false)} className="p-4 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><Minimize2 size={32}/></button>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center gap-16 p-12">
                  {/* Clock */}
                  <div className="text-[12rem] font-black tracking-tighter font-mono leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                      {timer > 0 ? 
                         `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}` 
                         : currentDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                      }
                  </div>
                  
                  <div className="w-full max-w-6xl grid grid-cols-2 gap-12">
                      <div className="bg-indigo-900/30 border border-indigo-500/30 p-10 rounded-[2rem] backdrop-blur-sm">
                          <h2 className="text-2xl font-bold text-indigo-300 mb-4 flex items-center gap-3"><BookOpen size={28}/> Current Topic</h2>
                          <div className="text-5xl font-bold leading-tight text-white">{lessonPlan?.topic || 'No Topic Set'}</div>
                      </div>
                      <div className="bg-emerald-900/30 border border-emerald-500/30 p-10 rounded-[2rem] backdrop-blur-sm">
                          <h2 className="text-2xl font-bold text-emerald-300 mb-4 flex items-center gap-3"><Clipboard size={28}/> Materials & Activities</h2>
                          <div className="text-4xl font-medium leading-snug text-emerald-50">{lessonPlan?.materials || 'Check lesson plan'}</div>
                      </div>
                  </div>

                  {/* Timer Controls inside Focus Mode */}
                  <div className="flex gap-4">
                        <button onClick={() => { setTimer(300); setIsTimerRunning(true); }} className="px-8 py-3 bg-white/10 rounded-full hover:bg-white/20 font-bold">5 Min</button>
                        <button onClick={() => { setTimer(600); setIsTimerRunning(true); }} className="px-8 py-3 bg-white/10 rounded-full hover:bg-white/20 font-bold">10 Min</button>
                        <button onClick={() => { setTimer(0); setIsTimerRunning(false); }} className="px-8 py-3 bg-red-500/20 text-red-300 hover:bg-red-500/40 rounded-full font-bold border border-red-500/50">Reset</button>
                  </div>
              </div>
          </div>
      );
  };

  const renderImageModal = () => {
      if (!viewingScheduleImage) return null;
      return (
          <div className="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewingScheduleImage(null)}>
              <button className="absolute top-6 right-6 text-white/70 hover:text-white"><X size={32}/></button>
              <img src={viewingScheduleImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}/>
          </div>
      );
  };

  const renderDashboard = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todaysSchedule = schedule[today] || [];
    const { term: currentTerm, week: currentWeek } = getTermContext(new Date());

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Welcome Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 to-purple-600/90 z-10" />
          <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80" className="absolute inset-0 w-full h-full object-cover opacity-50" alt="Classroom" />
          <div className="relative z-20 p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 text-indigo-200">
                  <span className="text-xs font-bold uppercase tracking-wider bg-white/10 px-2 py-1 rounded">{currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                  <button onClick={toggleWeather} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded text-xs font-bold text-yellow-300 hover:bg-white/20 transition-colors">
                      <CloudSun size={14}/> 
                      <span>{weather.temp}°C {weather.condition}</span>
                  </button>
              </div>
              <h1 className="text-3xl font-bold mb-2">Good Morning, Teacher</h1>
              <p className="text-indigo-100">You have <span className="font-bold text-white">{todaysSchedule.length} sessions</span> today.</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setIsFocusMode(true)} size="lg" variant="ai" icon={MonitorPlay}>Start Class Focus</Button>
              <Button onClick={() => setActiveTab('attendance')} size="lg" variant="secondary" icon={CheckSquare}>Attendance</Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Schedule & Curriculum */}
          <div className="lg:col-span-2 space-y-6">
             {/* Today's Timeline */}
             <Card>
                <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><Clock className="text-indigo-500" size={20}/> Today's Timeline</h3>
                   <span className="text-xs font-bold text-slate-400 uppercase">{today}</span>
                </div>
                <div className="space-y-3">
                   {todaysSchedule.length > 0 ? todaysSchedule.map((evt, i) => {
                      const lessonPlan = curriculum?.[evt.classId]?.[currentTerm]?.[currentWeek];
                      return (
                         <div key={i} className="flex flex-col gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border border-slate-100 dark:border-slate-700">
                             <div className="flex items-center gap-3">
                                 <div className="text-center w-16 shrink-0">
                                     <div className="text-xs font-bold text-slate-400">{evt.time.split(' - ')[0]}</div>
                                     <div className="text-[10px] text-slate-300">{evt.time.split(' - ')[1]}</div>
                                 </div>
                                 <div className="w-1 h-10 bg-indigo-200 dark:bg-indigo-600 rounded-full" />
                                 <div className="flex-1">
                                     <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{evt.name}</div>
                                     <div className="text-xs text-slate-500 dark:text-slate-400">{evt.code} • {evt.period}</div>
                                 </div>
                             </div>
                             {lessonPlan && (
                                 <div className="ml-20 mt-1 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-sm shadow-sm">
                                     <div className="flex justify-between items-start mb-1">
                                         <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-wider">Week {currentWeek} Topic</span>
                                         {lessonPlan.dateLabel && <span className="text-[10px] text-slate-400 font-mono">{lessonPlan.dateLabel}</span>}
                                     </div>
                                     <div className="text-slate-800 dark:text-slate-200 font-medium">{lessonPlan.topic || 'No topic set'}</div>
                                 </div>
                             )}
                         </div>
                      );
                   }) : (
                      <div className="text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                          No classes scheduled for {today}.
                      </div>
                   )}
                </div>
             </Card>
          </div>

          {/* Right Column: Utilities */}
          <div className="space-y-6">
            {/* Sticky Note */}
            <Card className="bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30 relative group">
                 <div className="absolute -top-3 -right-3 bg-amber-200 text-amber-800 p-2 rounded-full transform rotate-12 shadow-sm group-hover:rotate-0 transition-transform">
                     <Zap size={16} fill="currentColor"/>
                 </div>
                 <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400 font-bold text-sm uppercase tracking-wider">
                     <StickyNote size={16}/> Sticky Note
                 </div>
                 <textarea 
                    className="w-full bg-transparent resize-none outline-none text-sm text-amber-900 dark:text-amber-200 h-40 placeholder-amber-400/50 font-medium leading-relaxed"
                    placeholder="Type quick reminders here..."
                    value={quickNotes}
                    onChange={e => {
                        setQuickNotes(e.target.value);
                        savePrivate({ quickNotes: e.target.value });
                    }}
                 />
            </Card>

            {/* Tasks */}
            <Card>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><ListChecks className="text-emerald-500" size={20}/> Todo List</h3>
                 </div>
                 <div className="space-y-2">
                   {sharedTodos.slice(0, 4).map(todo => (
                     <div key={todo.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors">
                       <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${todo.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-500'}`}>
                         {todo.completed && <CheckSquare size={12} />}
                       </div>
                       <span className={`text-sm ${todo.completed ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>{todo.text}</span>
                     </div>
                   ))}
                   {sharedTodos.length === 0 && <div className="text-sm text-slate-400 italic">No pending tasks</div>}
                 </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderSchedule = () => (
     <div className="space-y-6 animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><CalendarIcon className="text-indigo-500"/> Class Schedule</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Click any image to <span className="font-bold text-indigo-500">Zoom</span>. 
                Click inside a box and press <span className="font-bold text-indigo-500 bg-indigo-50 px-1 rounded">Ctrl+V</span> to paste a screenshot.
            </p>
          </div>
          {uploadStatus && (
              <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold animate-pulse flex items-center gap-2">
                  <CheckCircle size={16}/> {uploadStatus}
              </div>
          )}
        </div>
        
        <div className="grid lg:grid-cols-2 gap-6">
           {(['weekly', 'yearly'] as const).map(type => (
             <Card 
                key={type} 
                className="h-[600px] flex flex-col p-0 outline-none focus:ring-4 focus:ring-indigo-100 transition-all group" 
                tabIndex={0}
                onPaste={(e) => handlePaste(e, type)}
             >
               <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-700 dark:text-slate-200 capitalize flex items-center gap-2">
                     {type === 'weekly' ? <CalendarDays size={18}/> : <CalendarIcon size={18}/>}
                     {type} Calendar
                 </h3>
                 <div className="flex items-center gap-2">
                    {scheduleImages[type] && (
                        <>
                            <Button size="sm" variant="success" onClick={() => saveSchedule(type)} icon={SaveIcon}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => clearSchedule(type)} icon={Trash2}>Clear</Button>
                        </>
                    )}
                    <label className="cursor-pointer text-xs font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2 text-slate-600 dark:text-slate-300 transition-colors">
                      <UploadCloud size={14}/> Upload
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if(file) {
                           const reader = new FileReader();
                           reader.onloadend = () => {
                             const result = reader.result as string;
                             const update = { ...scheduleImages, [type]: result };
                             setScheduleImages(update);
                             if (!isDemoMode && user && db) {
                                saveImages(update);
                             }
                             setUploadStatus("File uploaded!");
                             setTimeout(() => setUploadStatus(''), 3000);
                           };
                           reader.readAsDataURL(file);
                        }
                      }}/>
                    </label>
                 </div>
               </div>
               <div className="flex-1 bg-slate-100 dark:bg-slate-900/30 flex items-center justify-center overflow-hidden relative cursor-zoom-in" onClick={() => scheduleImages[type] && setViewingScheduleImage(scheduleImages[type])}>
                 {scheduleImages[type] ? (
                   <img src={scheduleImages[type]!} className="w-full h-full object-contain" alt={type}/>
                 ) : (
                   <div className="text-center text-slate-400">
                     <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                         <ImageIcon size={32} className="opacity-50"/>
                     </div>
                     <p className="font-medium">Click here & Press Ctrl+V</p>
                     <p className="text-xs mt-2 opacity-70">to paste from clipboard</p>
                   </div>
                 )}
                 {scheduleImages[type] && (
                     <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center pointer-events-none">
                         <div className="bg-black/50 text-white px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold flex items-center gap-2">
                             <Maximize2 size={16}/> Click to Zoom
                         </div>
                     </div>
                 )}
               </div>
             </Card>
           ))}
        </div>
     </div>
  );

  const renderCurriculum = () => (
    <div className="h-full flex flex-col gap-6 animate-in fade-in">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><BookOpenCheck className="text-indigo-500"/> Curriculum Planner</h2>
                <p className="text-slate-500 text-sm">Manage term dates and weekly lesson plans.</p>
            </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
            {/* Left: Selection */}
            <div className="w-full lg:w-64 space-y-4">
                <Card className="h-full">
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Select Class</label>
                            <select 
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white cursor-pointer hover:border-indigo-500 transition-colors outline-none"
                                value={selectedClassId}
                                onChange={e => setSelectedClassId(e.target.value)}
                            >
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Select Term</label>
                            <div className="flex flex-col gap-2">
                                {(['t1', 't2', 't3'] as const).map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setActiveTermId(t)}
                                        className={`w-full py-3 px-4 rounded-xl text-sm font-bold border transition-all flex justify-between items-center ${activeTermId === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                    >
                                        <span>Term {t.replace('t', '')}</span>
                                        {activeTermId === t && <CheckCircle size={16}/>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Right: Editor */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-10">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-lg">
                    <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-sm">Term {activeTermId.replace('t', '')}</span>
                    Plan for {classes.find(c => c.id === selectedClassId)?.name}
                </h3>
                {Array.from({ length: 10 }).map((_, i) => {
                    const weekNum = i + 1;
                    const plan = curriculum?.[selectedClassId]?.[activeTermId]?.[weekNum] || { week: weekNum, topic: '', materials: '', dateLabel: '' };
                    return (
                        <Card key={weekNum} noPadding className="flex flex-col md:flex-row group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 flex items-center justify-center border-r border-slate-100 dark:border-slate-700 w-32 shrink-0 flex-col gap-1">
                                <span className="font-bold text-slate-400 text-sm uppercase">Week</span>
                                <span className="text-3xl font-black text-slate-700 dark:text-slate-300">{weekNum}</span>
                                {plan.dateLabel && <span className="text-[10px] font-mono text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{plan.dateLabel}</span>}
                            </div>
                            <div className="flex-1 p-4 grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Topic / Theme</label>
                                    <input 
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none dark:text-white transition-all"
                                        placeholder="e.g. Introduction to..."
                                        value={plan.topic}
                                        onChange={e => updateCurriculum(weekNum, 'topic', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Materials & Notes</label>
                                    <input 
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none dark:text-white transition-all"
                                        placeholder="e.g. Textbook p.40, Quiz..."
                                        value={plan.materials}
                                        onChange={e => updateCurriculum(weekNum, 'materials', e.target.value)}
                                    />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    </div>
  );

  const renderAttendance = () => (
      <div className="animate-in fade-in">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Attendance</h2>
              <div className="flex gap-2">
                  <select 
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none"
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                  >
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Button onClick={markAllPresent} size="sm" variant="success" icon={CheckCircle}>Mark All Present</Button>
              </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {studentList.map(student => {
                  const status = currentAttendance[student.id] || 'absent';
                  const statusColors: Record<string, string> = {
                      present: 'bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300',
                      absent: 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400',
                      late: 'bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300'
                  };
                  
                  return (
                      <div 
                        key={student.id} 
                        onClick={() => toggleAttendance(student.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 select-none ${statusColors[status]}`}
                      >
                          <div className="flex items-center justify-between mb-2">
                              <Avatar name={student.name} size="sm" className="bg-white dark:bg-slate-900"/>
                              <span className="text-xs font-bold uppercase tracking-wider">{status}</span>
                          </div>
                          <div className="font-bold text-lg">{student.name}</div>
                          <div className="text-xs opacity-70">ID: {student.id}</div>
                      </div>
                  );
              })}
          </div>
      </div>
  );

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader className="animate-spin text-indigo-600"/></div>;
  if (!user || storedPassword === null || isLocked) return renderLockScreen();

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
    { id: 'curriculum', label: 'Curriculum', icon: BookOpenCheck },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'report', label: 'Reports', icon: FileText },
    { id: 'ai_assistant', label: 'Assistant', icon: Sparkles }, 
    { id: 'settings', label: 'Settings', icon: Settings }, 
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-200">
            <Globe size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-800 dark:text-white">Teacher<span className="text-indigo-600">App</span></span>
        </div>
        
        {/* XP Bar */}
        <div className="px-6 pt-6 pb-2">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase mb-1.5">
                <span className="flex items-center gap-1"><GraduationCap size={12}/> Lvl {Math.floor(teacherXP / 1000) + 1}</span>
                <span>{teacherXP} XP</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style={{ width: `${(teacherXP % 1000) / 10}%` }}/>
            </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-260px)]">
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

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 dark:border-slate-700 space-y-4 bg-white dark:bg-slate-800">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
              {isDarkMode ? <Moon size={14}/> : <Sun size={14}/>}
          </button>

          <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                  {user.uid?.slice(0,2).toUpperCase() || 'TE'}
              </div>
              <div className="flex-1 overflow-hidden">
                  <div className="text-xs font-bold text-slate-800 dark:text-white truncate">Teacher Admin</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{isDemoMode ? 'Demo Mode' : 'Online'}</div>
              </div>
              <button onClick={handleLock} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><Lock size={14}/></button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300"><Menu/></button>
          <span className="font-bold text-slate-800 dark:text-white">TeacherApp</span>
          <div className="w-8" />
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'curriculum' && renderCurriculum()}
            {activeTab === 'schedule' && renderSchedule()}
            {activeTab === 'attendance' && renderAttendance()}
            {/* Placeholders for other tabs to prevent crash if clicked */}
            {activeTab === 'report' && <div className="flex flex-col items-center justify-center h-full text-slate-400"><FileText size={48} className="mb-4 opacity-20"/><p>Report Generation Module</p></div>}
            {activeTab === 'ai_assistant' && <div className="flex flex-col items-center justify-center h-full text-slate-400"><Sparkles size={48} className="mb-4 opacity-20"/><p>AI Assistant Module</p></div>}
            {activeTab === 'settings' && <div className="flex flex-col items-center justify-center h-full text-slate-400"><Settings size={48} className="mb-4 opacity-20"/><p>Settings Module</p></div>}
          </div>
        </div>

        {/* Overlays */}
        {renderFocusMode()}
        {renderImageModal()}
      </main>
    </div>
  );
}