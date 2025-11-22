import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutGrid, Users, Settings, Command, Save, Loader, Send, Plus, Trash2, 
  FileText, UploadCloud, CheckCircle, Globe, MessageCircle, ListChecks, 
  Calendar as CalendarIcon, CheckSquare, BarChart2, BookOpen, Link as LinkIcon, 
  PieChart, ThumbsUp, RefreshCw, AlertTriangle, Clock, Image as ImageIcon, 
  X, Lightbulb, Book, Lock, Unlock, Shield, KeyRound, PenTool, Copy, 
  ChevronRight, Bell, Search, Menu, MoreVertical, Filter, LucideIcon,
  Moon, Sun, Download, Sparkles, FileSpreadsheet, Edit, ChevronDown, Clipboard,
  CalendarDays, BookOpenCheck
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

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

interface TermSettings {
  t1: string;
  t2: string;
  t3: string;
}

interface LessonPlan {
  topic: string;
  materials: string;
}

// classId -> termId ('t1'|'t2'|'t3') -> weekNum -> LessonPlan
type CurriculumData = Record<string, Record<string, Record<number, LessonPlan>>>;

type AttendanceStatus = 'present' | 'absent' | 'late';

// --- CONFIG & INITIALIZATION ---
const appId = typeof __app_id !== 'undefined' && __app_id ? __app_id : 'global-learning-assistant';

// YOUR REAL CONFIGURATION
const firebaseConfig = {
  apiKey: "AAIzaSyAWQg_QaPJbcoDtWywzaB7E-hfmwXrOFeM",
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

// --- GEMINI API HELPER ---
const GEMINI_API_KEY = ""; // Provided by runtime environment

async function callGemini(prompt: string): Promise<string> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Request Failed", error);
    return "I'm currently offline or experiencing high traffic. Please try again later.";
  }
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

const INITIAL_TERM_SETTINGS: TermSettings = {
  t1: new Date().toISOString().split('T')[0],
  t2: '',
  t3: ''
};

// --- COMPONENTS ---

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  onClick?: () => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  tabIndex?: number;
}

const Card: React.FC<CardProps> = ({ children, className = "", noPadding = false, onClick, onPaste, tabIndex }) => (
  <div 
    onClick={onClick} 
    onPaste={onPaste}
    tabIndex={tabIndex}
    className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-indigo-100 dark:hover:border-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${noPadding ? '' : 'p-6'} ${className}`}
  >
    {children}
  </div>
);

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'ai';
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
    ai: "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-purple-200",
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
  const [attendanceHistory, setAttendanceHistory] = useState<Record<string, Record<string, Record<string, AttendanceStatus>>>>({}); 
  const [seatingChart, setSeatingChart] = useState<Record<string, (number | undefined)[]>>({});
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [scheduleImages, setScheduleImages] = useState<{ weekly: string | null, yearly: string | null }>({ weekly: null, yearly: null });
  const [sharedTodos, setSharedTodos] = useState<Todo[]>([]);
  
  // Curriculum States
  const [termSettings, setTermSettings] = useState<TermSettings>(INITIAL_TERM_SETTINGS);
  const [curriculum, setCurriculum] = useState<CurriculumData>({});
  const [activeTermId, setActiveTermId] = useState<'t1' | 't2' | 't3'>('t1');

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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // AI Chat States
  const [aiChatHistory, setAiChatHistory] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello! I'm your teaching assistant. I can help you plan lessons, write emails, or analyze student data. How can I help you today?", timestamp: Date.now() }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Class Management States
  const [newClassName, setNewClassName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');

  // --- MEMOIZED HELPERS ---
  const currentClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const studentList = useMemo(() => currentClass?.students || [], [currentClass]);
  
  const currentAttendance = useMemo(() => {
    const dateKey = currentDate.toISOString().split('T')[0];
    return attendanceHistory[selectedClassId]?.[dateKey] || {};
  }, [attendanceHistory, selectedClassId, currentDate]);

  // Calculate current Term and Week based on termSettings
  const getTermContext = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Helper to check if date is within range (approx 12 weeks)
    const getWeekDiff = (startStr: string) => {
        if (!startStr) return -1;
        const start = new Date(startStr);
        const diffTime = date.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const week = Math.ceil(diffDays / 7);
        return week;
    };

    // Naive check: Assuming terms don't overlap and are in order for current usage
    // Prioritize latest term that has started
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
  
  // Load Excel Library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatHistory]);

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
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
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
            if (data.schedule) setSchedule(data.schedule as Record<string, ScheduleEntry[]>);
            if (data.attendanceHistory) setAttendanceHistory(data.attendanceHistory);
            if (data.seatingChart) setSeatingChart(data.seatingChart);
            if (data.homeworkList) setHomeworkList(data.homeworkList as Homework[]);
            if (data.aiChatHistory) setAiChatHistory(data.aiChatHistory);
            if (data.termSettings) setTermSettings(data.termSettings);
            if (data.curriculum) setCurriculum(data.curriculum);
        } else {
            setDoc(userDocRef, {
            classes: INITIAL_CLASSES,
            schedule: INITIAL_SCHEDULE,
            attendanceHistory: {},
            seatingChart: {},
            homeworkList: [],
            termSettings: INITIAL_TERM_SETTINGS,
            curriculum: {},
            createdAt: serverTimestamp()
            });
        }
        }, (err) => {
            console.error("Private Sync Error", err);
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

  // --- EXCEL IMPORT ---
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      // @ts-ignore - using global SheetJS loaded from CDN
      if (typeof window.XLSX === 'undefined') {
        alert("Excel parser is loading, please try again in a moment.");
        return;
      }
      // @ts-ignore
      const wb = window.XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      // @ts-ignore
      const data: any[] = window.XLSX.utils.sheet_to_json(ws);

      // Heuristic: Check columns
      if (!currentClass) {
        alert("Please select a class first.");
        return;
      }

      const newStudents: Student[] = [...currentClass.students];
      let addedCount = 0;

      data.forEach(row => {
        // Basic "Name" column or first column
        const name = row['Name'] || row['name'] || row['Student'] || Object.values(row)[0];
        const performance = row['Performance'] || row['Score'] || row['Grade'] || 50; // Default 50

        if (name && typeof name === 'string') {
            const existing = newStudents.find(s => s.name.toLowerCase() === name.toLowerCase());
            if (!existing) {
                newStudents.push({
                    id: Date.now() + Math.random(),
                    name: name.trim(),
                    performance: Number(performance) || 50
                });
                addedCount++;
            } else {
                // Update performance if student exists
                existing.performance = Number(performance) || existing.performance;
            }
        }
      });

      if (addedCount > 0) {
        const updatedClasses = classes.map(c => c.id === currentClass.id ? { ...c, students: newStudents } : c);
        setClasses(updatedClasses);
        savePrivate({ classes: updatedClasses });
        alert(`Imported ${addedCount} students successfully!`);
      } else {
        alert("No new students found. Check your Excel columns (needs 'Name' header).");
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- CURRICULUM EXCEL IMPORT ---
  const handleCurriculumUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const bstr = evt.target?.result;
        // @ts-ignore
        if (typeof window.XLSX === 'undefined') {
            alert("Excel parser is loading...");
            return;
        }
        // @ts-ignore
        const wb = window.XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // @ts-ignore
        const data: any[] = window.XLSX.utils.sheet_to_json(ws);

        if (!currentClass || !activeTermId) {
            alert("Select class and term first.");
            return;
        }

        const newCurriculum = { ...curriculum };
        if (!newCurriculum[selectedClassId]) newCurriculum[selectedClassId] = {};
        if (!newCurriculum[selectedClassId][activeTermId]) newCurriculum[selectedClassId][activeTermId] = {};

        let count = 0;
        data.forEach(row => {
            const week = row['Week'] || row['week'];
            const topic = row['Topic'] || row['topic'] || row['Theme'];
            const materials = row['Materials'] || row['materials'] || row['Resources'];

            if (week && topic) {
                newCurriculum[selectedClassId][activeTermId][week] = {
                    topic: String(topic),
                    materials: String(materials || '')
                };
                count++;
            }
        });

        setCurriculum(newCurriculum);
        savePrivate({ curriculum: newCurriculum });
        alert(`Imported plans for ${count} weeks!`);
    };
    reader.readAsBinaryString(file);
  };

  // --- CLASS MANAGEMENT ACTIONS ---
  const addClass = () => {
    if (!newClassName.trim()) return;
    const newClass: ClassData = {
        id: `c${Date.now()}`,
        name: newClassName,
        layout: 'grid',
        students: []
    };
    const updated = [...classes, newClass];
    setClasses(updated);
    savePrivate({ classes: updated });
    setNewClassName('');
    setSelectedClassId(newClass.id);
  };

  const deleteClass = (classId: string) => {
    if (confirm('Are you sure you want to delete this class?')) {
        const updated = classes.filter(c => c.id !== classId);
        setClasses(updated);
        savePrivate({ classes: updated });
        // Safely switch selection if current class was deleted
        if (selectedClassId === classId) {
            setSelectedClassId(updated.length > 0 ? updated[0].id : '');
        }
    }
  };

  const addStudent = () => {
    if (!newStudentName.trim() || !currentClass) return;
    const newStudent: Student = {
        id: Date.now(),
        name: newStudentName,
        performance: 50
    };
    const updatedClasses = classes.map(c => 
        c.id === selectedClassId ? { ...c, students: [...c.students, newStudent] } : c
    );
    setClasses(updatedClasses);
    savePrivate({ classes: updatedClasses });
    setNewStudentName('');
  };

  const deleteStudent = (studentId: number) => {
    const updatedClasses = classes.map(c => 
        c.id === selectedClassId ? { ...c, students: c.students.filter(s => s.id !== studentId) } : c
    );
    setClasses(updatedClasses);
    savePrivate({ classes: updatedClasses });
  };

  const updateStudentScore = (studentId: number, newScore: number) => {
     const updatedClasses = classes.map(c => 
        c.id === selectedClassId ? { ...c, students: c.students.map(s => s.id === studentId ? {...s, performance: newScore} : s) } : c
    );
    setClasses(updatedClasses);
    savePrivate({ classes: updatedClasses });
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

  const handlePaste = (e: React.ClipboardEvent, type: 'weekly' | 'yearly') => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Change for-of loop to indexed for loop to fix TS error
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
             saveImages(update); // Fixed: Save to Images doc, not Main doc
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const updateCurriculum = (week: number, field: 'topic' | 'materials', value: string) => {
    const newCurriculum = { ...curriculum };
    if (!newCurriculum[selectedClassId]) newCurriculum[selectedClassId] = {};
    if (!newCurriculum[selectedClassId][activeTermId]) newCurriculum[selectedClassId][activeTermId] = {};
    
    if (!newCurriculum[selectedClassId][activeTermId][week]) {
        newCurriculum[selectedClassId][activeTermId][week] = { topic: '', materials: '' };
    }
    
    newCurriculum[selectedClassId][activeTermId][week][field] = value;
    setCurriculum(newCurriculum);
    savePrivate({ curriculum: newCurriculum });
  };

  // --- AI FUNCTIONS ---
  
  const sendAiMessage = async () => {
    if (!aiInput.trim()) return;
    const newUserMsg: ChatMessage = { role: 'user', text: aiInput, timestamp: Date.now() };
    const updatedHistory = [...aiChatHistory, newUserMsg];
    setAiChatHistory(updatedHistory);
    setAiInput('');
    setIsAiThinking(true);

    try {
        const responseText = await callGemini(aiInput);
        const modelMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
        const finalHistory = [...updatedHistory, modelMsg];
        setAiChatHistory(finalHistory);
        savePrivate({ aiChatHistory: finalHistory });
    } catch (e) {
        // Error handled in callGemini
    } finally {
        setIsAiThinking(false);
    }
  };

  const generateAiReport = async () => {
    const s = studentList.find(s => String(s.id) === reportStudentId);
    if (!s) return;
    
    setIsGeneratingReport(true);
    try {
        const prompt = `Write a short, professional progress report for a student named ${s.name}. 
        Their current performance score is ${s.performance}%. 
        Based on this score, determine if they are excelling, doing okay, or struggling. 
        Include 2 specific sentences about their participation and potential areas for growth. 
        Keep it under 100 words.`;

        const report = await callGemini(prompt);
        setGeneratedReport(report);
    } catch (e) {
        setGeneratedReport("Failed to generate AI report. Please try again.");
    } finally {
        setIsGeneratingReport(false);
    }
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
    
    const { term: currentTerm, week: currentWeek } = getTermContext(new Date());

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
              <p className="text-indigo-100">You have <span className="font-bold text-white">{todaysSchedule.length} sessions</span> today.</p>
              <div className="flex items-center gap-2 mt-2">
                  <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase">Term {currentTerm.replace('t','')}</span>
                  <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase">Week {currentWeek}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('schedule')} icon={CalendarIcon}>View Week</Button>
              <Button onClick={() => setActiveTab('attendance')} size="sm" icon={CheckSquare}>Take Attendance</Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             <div className="grid md:grid-cols-2 gap-6">
               <Card className="md:col-span-2">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><Clock className="text-indigo-500" size={20}/> Today's Plan</h3>
                   <span className="text-xs font-bold text-slate-400 uppercase">{today}</span>
                 </div>
                 <div className="space-y-3">
                   {todaysSchedule.length > 0 ? todaysSchedule.map((evt, i) => {
                     const lessonPlan = curriculum[evt.classId]?.[currentTerm]?.[currentWeek];
                     return (
                        <div key={i} className="flex flex-col gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="text-center w-12 shrink-0">
                                    <div className="text-xs font-bold text-slate-400">{evt.time.split(' - ')[0]}</div>
                                </div>
                                <div className="w-1 h-8 bg-indigo-200 dark:bg-indigo-600 rounded-full" />
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{evt.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{evt.code} • {evt.period}</div>
                                </div>
                            </div>
                            {lessonPlan && (
                                <div className="ml-16 mt-1 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-sm">
                                    <div className="font-semibold text-indigo-600 dark:text-indigo-400 text-xs uppercase mb-1">Week {currentWeek} Topic</div>
                                    <div className="text-slate-800 dark:text-slate-200 font-medium">{lessonPlan.topic || 'No topic set'}</div>
                                    {lessonPlan.materials && (
                                        <div className="mt-2 text-xs text-slate-500 flex items-start gap-1">
                                            <Clipboard size={12} className="mt-0.5"/> Need: {lessonPlan.materials}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                     );
                   }) : (
                     <div className="text-center py-8 text-slate-400">No classes scheduled today.</div>
                   )}
                 </div>
               </Card>
             </div>
          </div>

          <div className="space-y-6">
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
      </div>
    );
  };

  const renderCurriculum = () => (
    <div className="h-full flex flex-col gap-6 animate-in fade-in">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><BookOpenCheck className="text-indigo-500"/> Curriculum Planner</h2>
                <p className="text-slate-500 text-sm">Manage term dates and weekly lesson plans.</p>
            </div>
            <div className="flex gap-2">
                <label className="cursor-pointer bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                    <FileSpreadsheet size={16}/>
                    Import Excel Plan
                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleCurriculumUpload} />
                </label>
            </div>
        </div>

        <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-sm uppercase text-slate-500 mb-3">Term Start Dates</h3>
            <div className="grid grid-cols-3 gap-4">
                {(['t1', 't2', 't3'] as const).map(t => (
                    <div key={t}>
                        <label className="text-xs font-bold text-slate-400 block mb-1 uppercase">Term {t.replace('t','')}</label>
                        <input 
                            type="date" 
                            className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm"
                            value={termSettings[t]}
                            onChange={e => {
                                const newSettings = { ...termSettings, [t]: e.target.value };
                                setTermSettings(newSettings);
                                savePrivate({ termSettings: newSettings });
                            }}
                        />
                    </div>
                ))}
            </div>
        </Card>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
            {/* Left: Selection */}
            <div className="w-full lg:w-64 space-y-4">
                <Card className="h-full">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Select Class</label>
                            <select 
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                value={selectedClassId}
                                onChange={e => setSelectedClassId(e.target.value)}
                            >
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Select Term</label>
                            <div className="flex gap-2">
                                {(['t1', 't2', 't3'] as const).map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setActiveTermId(t)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${activeTermId === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}
                                    >
                                        {t.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Right: Editor */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-10">
                <h3 className="font-bold text-slate-700 dark:text-slate-200">
                    {activeTermId.toUpperCase()} Plan for {classes.find(c => c.id === selectedClassId)?.name}
                </h3>
                {Array.from({ length: 12 }).map((_, i) => {
                    const weekNum = i + 1;
                    const plan = curriculum[selectedClassId]?.[activeTermId]?.[weekNum] || { topic: '', materials: '' };
                    return (
                        <Card key={weekNum} noPadding className="flex flex-col md:flex-row">
                            <div className="bg-slate-100 dark:bg-slate-900/50 p-4 flex items-center justify-center border-r border-slate-100 dark:border-slate-700 w-24 shrink-0">
                                <span className="font-bold text-slate-400">Week {weekNum}</span>
                            </div>
                            <div className="flex-1 p-4 grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Topic / Theme</label>
                                    <input 
                                        className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none py-1 dark:text-white"
                                        placeholder="e.g. Introduction to Era..."
                                        value={plan.topic}
                                        onChange={e => updateCurriculum(weekNum, 'topic', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Materials Needed</label>
                                    <input 
                                        className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none py-1 dark:text-white"
                                        placeholder="e.g. Textbook p.40, Map..."
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

  const renderClassManager = () => (
    <div className="grid lg:grid-cols-12 gap-6 animate-in fade-in h-full">
        {/* Left Panel: Class List */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="flex-1 flex flex-col">
                <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Settings className="text-indigo-500"/> Manage Classes</h3>
                
                <div className="flex gap-2 mb-6">
                    <input 
                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white"
                        placeholder="New Class Name"
                        value={newClassName}
                        onChange={e => setNewClassName(e.target.value)}
                    />
                    <Button onClick={addClass} size="sm" variant="primary" icon={Plus} disabled={!newClassName}>Add</Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {classes.map(c => (
                        <div key={c.id} 
                             onClick={() => setSelectedClassId(c.id)}
                             className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${selectedClassId === c.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700 ring-1 ring-indigo-200' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50'}`}>
                            <div>
                                <div className="font-bold text-slate-700 dark:text-slate-200">{c.name}</div>
                                <div className="text-xs text-slate-500">{c.students.length} Students</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteClass(c.id); }} className="text-slate-400 hover:text-red-500 p-2">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    ))}
                    {classes.length === 0 && (
                        <div className="text-center p-4 text-slate-400 text-sm">
                            No classes yet. Add one to get started.
                        </div>
                    )}
                </div>
            </Card>
        </div>

        {/* Right Panel: Student List & Excel Import */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full">
             <Card className="flex-1 flex flex-col h-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{currentClass?.name} Students</h3>
                        <p className="text-xs text-slate-500">Manage student roster for this class</p>
                    </div>
                    <div className="flex gap-2">
                        <label className="cursor-pointer bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                            <FileSpreadsheet size={16}/>
                            Import Excel
                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} />
                        </label>
                    </div>
                </div>

                <div className="flex gap-2 mb-4">
                     <input 
                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white"
                        placeholder="Student Name"
                        value={newStudentName}
                        onChange={e => setNewStudentName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addStudent()}
                    />
                    <Button onClick={addStudent} size="sm" variant="secondary" icon={Plus} disabled={!newStudentName}>Add Student</Button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-400 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-lg">Name</th>
                                <th className="px-4 py-3 text-center">Perf %</th>
                                <th className="px-4 py-3 text-right rounded-tr-lg">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {studentList.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{s.name}</td>
                                    <td className="px-4 py-3 text-center">
                                        <input 
                                            type="number" 
                                            className="w-12 text-center bg-transparent border-b border-transparent focus:border-indigo-500 outline-none"
                                            value={s.performance}
                                            onChange={(e) => updateStudentScore(s.id, Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => deleteStudent(s.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {studentList.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                                        No students in this class yet. Add manually or import Excel.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             </Card>
        </div>
    </div>
  );

  const renderReportGen = () => (
    <div className="grid lg:grid-cols-12 gap-6 animate-in fade-in h-full">
        <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="flex-1 flex flex-col">
                <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Sparkles className="text-indigo-500"/> AI Report Writer</h3>
                <div className="space-y-4 flex-1">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Select Student</label>
                        <select className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none dark:text-white" value={reportStudentId} onChange={e => setReportStudentId(e.target.value)}>
                            <option value="">-- Select --</option>
                            {studentList.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
                        <p><strong>How it works:</strong> The AI analyzes the student's performance score ({studentList.find(s => String(s.id) === reportStudentId)?.performance || '-'}%) and generates a personalized progress comment suitable for report cards.</p>
                    </div>
                    <Button onClick={generateAiReport} disabled={!reportStudentId || isGeneratingReport} icon={Sparkles} variant="ai" className="w-full">
                        {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                    </Button>
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
                    className="flex-1 w-full p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl resize-none outline-none font-serif leading-relaxed text-slate-700 dark:text-slate-300 shadow-inner" 
                    placeholder="Generated report content will appear here..." 
                    value={generatedReport} 
                    onChange={e => setGeneratedReport(e.target.value)}
                />
            </Card>
        </div>
    </div>
  );

  const renderAiChat = () => (
     <div className="h-full flex flex-col gap-4 animate-in fade-in">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Sparkles className="text-purple-500"/> AI Assistant</h2>
                <p className="text-slate-500 text-sm">Ask for lesson plans, email drafts, or classroom advice.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => {
                setAiChatHistory([{ role: 'model', text: "Hello! I'm your teaching assistant. How can I help you today?", timestamp: Date.now() }]);
                savePrivate({ aiChatHistory: [] });
            }} icon={Trash2}>Clear Chat</Button>
        </div>

        <Card className="flex-1 flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-none">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {aiChatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isAiThinking && (
                    <div className="flex justify-start">
                         <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                             <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"/>
                             <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75"/>
                             <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"/>
                         </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                <input 
                    className="flex-1 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    placeholder="Ask Gemini anything..."
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendAiMessage()}
                />
                <Button onClick={sendAiMessage} variant="primary" icon={Send} disabled={!aiInput || isAiThinking}>Send</Button>
            </div>
        </Card>
     </div>
  );

  const renderAttendance = () => (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Attendance Tracker</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Tap card to toggle: <span className="text-emerald-600 font-bold">Present</span> → <span className="text-red-600 font-bold">Absent</span> → <span className="text-amber-600 font-bold">Late</span></p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
           <select className="bg-transparent font-bold text-slate-700 dark:text-slate-200 text-sm outline-none cursor-pointer" 
             value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
             {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
           </select>
           <div className="w-px h-6 bg-slate-200 dark:bg-slate-600"></div>
           <input type="date" className="bg-transparent font-medium text-slate-600 dark:text-slate-300 text-sm outline-none cursor-pointer" 
             value={currentDate.toISOString().split('T')[0]} onChange={e => setCurrentDate(new Date(e.target.value))} />
            <Button size="sm" variant="primary" onClick={markAllPresent} icon={CheckCircle}>Mark All Present</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {studentList.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400">No students in this class.</div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {studentList.map(student => {
                const status = currentAttendance[String(student.id)] || 'present';
                const statusStyles = {
                present: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 ring-emerald-500",
                absent: "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 ring-red-500",
                late: "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 ring-amber-500"
                };
                const textStyles = {
                    present: "text-emerald-800 dark:text-emerald-200",
                    absent: "text-red-800 dark:text-red-200",
                    late: "text-amber-800 dark:text-amber-200"
                }

                return (
                <button 
                    key={student.id} 
                    onClick={() => toggleAttendance(student.id)}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md ${statusStyles[status]}`}
                >
                    <Avatar name={student.name} size="lg" className="shadow-md"/>
                    <div className="text-center">
                        <div className={`font-bold text-sm line-clamp-1 ${textStyles[status]}`}>{student.name}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{status}</div>
                    </div>
                    {status !== 'present' && (
                        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${status === 'absent' ? 'bg-red-500' : 'bg-amber-500'}`}/>
                    )}
                </button>
                );
            })}
            </div>
        )}
      </div>
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
          <p className="text-sm text-slate-500 dark:text-slate-400">Upload screenshots of your timetable or click a box and <span className="font-bold text-indigo-500">Ctrl+V</span> to paste.</p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-6">
           {(['weekly', 'yearly'] as const).map(type => (
             <Card 
                key={type} 
                className="h-[600px] flex flex-col p-0" 
                tabIndex={0}
                onPaste={(e) => handlePaste(e, type)}
             >
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
                             saveImages(update); // Fixed: Save to Images doc, not Main doc
                           };
                           reader.readAsDataURL(file);
                        }
                      }}/>
                    </label>
                    {scheduleImages[type] && user && (
                      <button onClick={() => {
                          const update = { ...scheduleImages, [type]: null };
                          setScheduleImages(update);
                          saveImages(update); // Fixed: Save to Images doc, not Main doc
                      }} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                    )}
                 </div>
               </div>
               <div className="flex-1 bg-slate-200/50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden relative group outline-none">
                 {scheduleImages[type] ? (
                   <img src={scheduleImages[type]!} className="w-full h-full object-contain" alt={type}/>
                 ) : (
                   <div className="text-center text-slate-400">
                     <ImageIcon size={48} className="mx-auto mb-4 opacity-20"/>
                     <p className="font-medium">Click here & Press Ctrl+V</p>
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
    { id: 'curriculum', label: 'Curriculum Plans', icon: BookOpenCheck }, // NEW
    { id: 'classes', label: 'Manage Classes', icon: Settings }, 
    { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'seating', label: 'Seating Plan', icon: Users },
    { id: 'homework', label: 'Homework', icon: Book },
    { id: 'plickers', label: 'Data Analysis', icon: BarChart2 },
    { id: 'report', label: 'Report Gen', icon: FileText },
    { id: 'ai_assistant', label: 'AI Assistant', icon: Sparkles }, 
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
        
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
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
            {activeTab === 'curriculum' && renderCurriculum()}
            {activeTab === 'classes' && renderClassManager()} 
            {activeTab === 'attendance' && renderAttendance()}
            {activeTab === 'seating' && renderSeating()}
            {activeTab === 'homework' && renderHomework()}
            {activeTab === 'plickers' && renderPlickers()}
            {activeTab === 'schedule' && renderSchedule()}
            {activeTab === 'report' && renderReportGen()}
            {activeTab === 'ai_assistant' && renderAiChat()} 
          </div>
        </div>
      </main>
    </div>
  );
}