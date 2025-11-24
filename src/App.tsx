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
  Maximize2, Minimize2, MonitorPlay, CloudSun, Zap, GripVertical, GraduationCap, 
  Dice5, Layers, UserCircle, Calculator, BrainCircuit, Wand2
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
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

const appId = typeof __app_id !== 'undefined' && __app_id ? __app_id : 'global-learning-assistant';
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : '';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';

// --- API KEY ---
const SYSTEM_GEMINI_KEY = "AIzaSyAWQg_QaPJbcoDtWywzaB7E-hfmwXrOFeM"; 

// --- AI HELPER FUNCTION ---
async function callGemini(prompt: string, customKey?: string) {
  const keyToUse = customKey || SYSTEM_GEMINI_KEY;
  if (!keyToUse) return "Please configure your Gemini API Key in Settings.";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${keyToUse}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Request Failed", error);
    return "I'm currently offline. Please try again later.";
  }
}

// --- TYPES ---
interface Student {
  id: number;
  name: string;
  performance: number;
}

interface ClassData {
  id: string;
  name: string;
  gradeLevel: 'grade1' | 'grade2' | 'grade3';
  layout: string;
  students: Student[];
}

interface LessonPlan {
  week: number;
  topic: string;
  materials: string;
  dateLabel: string;
}

interface CurriculumData {
  [gradeId: string]: {
    [termId: string]: {
      [week: number]: LessonPlan;
    };
  };
}

interface ScheduleEntry {
  period: string;
  code: string;
  time: string;
  type: 'lesson' | 'duty' | 'cleaning' | 'welcome';
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
}

interface ScheduleImages {
  weekly: string | null;
  yearly: string | null;
}

// --- HELPER TO FILL CLASS TO 20 STUDENTS ---
const fillClass = (baseStudents: Student[], startId: number): Student[] => {
  const surnames = ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi'];
  const names = ['Ren', 'Hiroto', 'Sota', 'Yuto', 'Haruto', 'Yui', 'Rio', 'Yuna', 'Hina', 'Mei', 'Sakura', 'Koharu'];
  
  const fullRoster = [...baseStudents];
  let currentCount = baseStudents.length;
  
  while (currentCount < 20) {
    const randomName = `${surnames[Math.floor(Math.random() * surnames.length)]} ${names[Math.floor(Math.random() * names.length)]}`;
    fullRoster.push({
      id: startId + currentCount,
      name: `${currentCount + 1}. ${randomName}`,
      performance: 60 + Math.floor(Math.random() * 35)
    });
    currentCount++;
  }
  return fullRoster;
};

const rPerf = () => 70 + Math.floor(Math.random() * 25);

// --- INITIAL DATA ---
const INITIAL_CLASSES_DATA: ClassData[] = [
  // --- GRADE 1 (J1) ---
  { 
    id: 'j1a', name: 'J1-A (Global)', gradeLevel: 'grade1', layout: 'u-shape', 
    students: fillClass([
      {id: 101, name: '1. Abe Touma', performance: rPerf()}, {id: 102, name: '2. Arai Yuzu', performance: rPerf()},
      {id: 103, name: '3. Itou Akari', performance: rPerf()}, {id: 104, name: '4. Itou Luna', performance: rPerf()},
      {id: 105, name: '5. Utsumi Tooru', performance: rPerf()},
    ], 100)
  },
  { 
    id: 'j1b', name: 'J1-B (Global)', gradeLevel: 'grade1', layout: 'u-shape', 
    students: fillClass([
      {id: 111, name: '1. Awaji Yui', performance: rPerf()}, {id: 112, name: '2. Iida Ryouta', performance: rPerf()},
      {id: 113, name: '3. Ishikawa Yuu', performance: rPerf()}, {id: 114, name: '4. Inami Shun', performance: rPerf()},
      {id: 115, name: '5. Imai Tomohisa', performance: rPerf()}, {id: 116, name: '6. Imada Ayane', performance: rPerf()},
    ], 110)
  },
  { 
    id: 'j1c', name: 'J1-C (Global)', gradeLevel: 'grade1', layout: 'u-shape', 
    students: fillClass([
      {id: 121, name: '1. Abe Shion', performance: rPerf()}, {id: 122, name: '2. Iijima Kou', performance: rPerf()},
      {id: 123, name: '3. Ishii Riko', performance: rPerf()}, {id: 124, name: '4. Ishikawa Eri', performance: rPerf()},
      {id: 125, name: '5. Ichikawa Nana', performance: rPerf()}, {id: 126, name: '6. Ooura R...', performance: rPerf()},
    ], 120)
  },
  { 
    id: 'j1d', name: 'J1-D (Global)', gradeLevel: 'grade1', layout: 'u-shape', 
    students: fillClass([
      {id: 131, name: '1. Asakura Hinako', performance: rPerf()}, {id: 132, name: '2. Abe Hanaka', performance: rPerf()},
      {id: 133, name: '3. Amabe Haruto', performance: rPerf()}, {id: 134, name: '4. Arakawa Rema', performance: rPerf()},
      {id: 135, name: '5. Aramaki Yuri', performance: rPerf()},
    ], 130)
  },
  { 
    id: 'j1e', name: 'J1-E (Global)', gradeLevel: 'grade1', layout: 'u-shape', 
    students: fillClass([
      {id: 141, name: '1. Akagawa Shiori', performance: rPerf()}, {id: 142, name: '2. Akiyama Kaito', performance: rPerf()},
      {id: 143, name: '3. Abe Rui', performance: rPerf()}, {id: 144, name: '4. Ishimoto Aoba', performance: rPerf()},
      {id: 145, name: '5. Imai Maya', performance: rPerf()},
    ], 140)
  },

  // --- GRADE 2 (J2) ---
  { 
    id: 'j2a', name: 'J2-A (Science)', gradeLevel: 'grade2', layout: 'rows', 
    students: fillClass([
      {id: 201, name: '1. Andou Akari', performance: rPerf()}, {id: 202, name: '2. Ishida Yuuma', performance: rPerf()},
      {id: 203, name: '3. Itou Chisato', performance: rPerf()}, {id: 204, name: '4. Ooyabu Takumi', performance: rPerf()},
      {id: 205, name: '5. Okabe Hanako', performance: rPerf()}, {id: 206, name: '6. Kazamaki Chihaya', performance: rPerf()},
    ], 200)
  },
  { 
    id: 'j2b', name: 'J2-B (Science)', gradeLevel: 'grade2', layout: 'rows', 
    students: fillClass([
      {id: 211, name: '1. Asao Hasumi', performance: rPerf()}, {id: 212, name: '2. Aratame Anna', performance: rPerf()},
      {id: 213, name: '3. Ishikawa Satsuki', performance: rPerf()}, {id: 214, name: '4. Ishiyama Shin', performance: rPerf()},
      {id: 215, name: '5. Inoue Eren', performance: rPerf()}, {id: 216, name: '6. Ooizumi Shinnosuke', performance: rPerf()},
    ], 210)
  },
  { 
    id: 'j2c', name: 'J2-C (Science)', gradeLevel: 'grade2', layout: 'rows', 
    students: fillClass([
      {id: 221, name: '1. Aoki Hanayo', performance: rPerf()}, {id: 222, name: '2. Ashino Hyuuga', performance: rPerf()},
      {id: 223, name: '3. Andou Ayame', performance: rPerf()}, {id: 224, name: '4. Ikeda Rise', performance: rPerf()},
      {id: 225, name: '5. Ihata Kou', performance: rPerf()},
    ], 220)
  },
  { 
    id: 'j2d', name: 'J2-D (Science)', gradeLevel: 'grade2', layout: 'rows', 
    students: fillClass([
      {id: 231, name: '1. Aoyama Haruki', performance: rPerf()}, {id: 232, name: '2. Akimoto Yuuto', performance: rPerf()},
      {id: 233, name: '3. Amako Misa', performance: rPerf()}, {id: 234, name: '4. Ariga Yuuri', performance: rPerf()},
      {id: 235, name: '5. Iida Yui', performance: rPerf()},
    ], 230)
  },
  { 
    id: 'j2e', name: 'J2-E (Science)', gradeLevel: 'grade2', layout: 'rows', 
    students: fillClass([
      {id: 241, name: '1. Aoki Mana', performance: rPerf()}, {id: 242, name: '2. Ikeda Yoshiki', performance: rPerf()},
      {id: 243, name: '3. Ishikawa An', performance: rPerf()}, {id: 244, name: '4. Ishiyama Haru', performance: rPerf()},
      {id: 245, name: '5. Itou Maika', performance: rPerf()},
    ], 240)
  },

  // --- GRADE 3 (J3) ---
  { 
    id: 'j3a', name: 'J3-A (Cultural)', gradeLevel: 'grade3', layout: 'groups', 
    students: fillClass([
      {id: 301, name: '1. Akaiwa Shintarou', performance: rPerf()}, {id: 302, name: '2. Ike Eirin', performance: rPerf()},
      {id: 303, name: '3. Inoue Shima', performance: rPerf()}, {id: 304, name: '4. Iwai Masahiro', performance: rPerf()},
      {id: 305, name: '5. Ueda Kai', performance: rPerf()}, {id: 306, name: '6. Ueda Tokiwa', performance: rPerf()},
    ], 300)
  },
  { 
    id: 'j3b', name: 'J3-B (Cultural)', gradeLevel: 'grade3', layout: 'groups', 
    students: fillClass([
      {id: 311, name: '1. Ikegami Yuuga', performance: rPerf()}, {id: 312, name: '2. Ishii Minori', performance: rPerf()},
      {id: 313, name: '3. Idetsuki Sakura', performance: rPerf()}, {id: 314, name: '4. Emura Kira', performance: rPerf()},
      {id: 315, name: '5. Ookawara Myuu', performance: rPerf()}, {id: 316, name: '6. Ookubo Koto', performance: rPerf()},
    ], 310)
  },
  { 
    id: 'j3c', name: 'J3-C (Cultural)', gradeLevel: 'grade3', layout: 'groups', 
    students: fillClass([
      {id: 321, name: '1. Akita Natsuki', performance: rPerf()}, {id: 322, name: '2. Adachi Hana', performance: rPerf()},
      {id: 323, name: '3. Ishizaka Sousuke', performance: rPerf()}, {id: 324, name: '4. Ishibashi Masaki', performance: rPerf()},
      {id: 325, name: '5. Isozaki Shouya', performance: rPerf()}, {id: 326, name: '6. Uchino Rina', performance: rPerf()},
    ], 320)
  },
  { 
    id: 'j3d', name: 'J3-D (Cultural)', gradeLevel: 'grade3', layout: 'groups', 
    students: fillClass([
      {id: 331, name: '1. Arahata Ayano', performance: rPerf()}, {id: 332, name: '2. Isobe Shinta', performance: rPerf()},
      {id: 333, name: '3. Ichikawa Kokomi', performance: rPerf()}, {id: 334, name: '4. Umezawa Mahiro', performance: rPerf()},
      {id: 335, name: '5. Enomoto Mizuki', performance: rPerf()}, {id: 336, name: '6. Ooba Hana', performance: rPerf()},
    ], 330)
  },
  { 
    id: 'j3e', name: 'J3-E (Cultural)', gradeLevel: 'grade3', layout: 'groups', 
    students: fillClass([
      {id: 341, name: '1. Ishii Naruchika', performance: rPerf()}, {id: 342, name: '2. Usui Jyuri', performance: rPerf()},
      {id: 343, name: '3. Uchida Shidou', performance: rPerf()}, {id: 344, name: '4. Uchida Tokiharu', performance: rPerf()},
      {id: 345, name: '5. Umetani Haruka', performance: rPerf()}, {id: 346, name: '6. Ehara Kiyonori', performance: rPerf()},
    ], 340)
  },
];

const INITIAL_CURRICULUM_DATA: CurriculumData = {
  'grade1': {
    't1': { 
        1: { week: 1, topic: 'Video call with Thailand', materials: 'Video Link', dateLabel: 'W1' },
        2: { week: 2, topic: 'Practice Phrases', materials: 'Worksheet 1.1', dateLabel: 'W2' },
        3: { week: 3, topic: 'Voice Note Recording', materials: 'Recording App', dateLabel: 'W3' }
    },
    't2': {
        1: { week: 1, topic: 'Continents', materials: 'Map', dateLabel: 'W1' },
        2: { week: 2, topic: 'Landmarks 1', materials: 'Booklet', dateLabel: 'W2' },
        4: { week: 4, topic: 'Maasai Tribe', materials: 'Clothing patterns', dateLabel: 'W4' }
    },
    't3': {
        1: { week: 1, topic: 'Discovering Thailand', materials: 'Geography', dateLabel: 'W1' },
        2: { week: 2, topic: 'Culture and Customs 1', materials: '', dateLabel: 'W2' }
    }
  },
  'grade2': {
    't1': { 
        1: { week: 1, topic: 'Assignments Intro', materials: '', dateLabel: 'W1' },
        2: { week: 2, topic: 'Test: Photosynthesis', materials: 'Review Sheet', dateLabel: 'W2' },
        3: { week: 3, topic: 'Written H/W - Plants', materials: 'Local Flower', dateLabel: 'W3' }
    },
    't2': {
        1: { week: 1, topic: 'Introducing Organs', materials: 'Tic Tac Toe Quiz', dateLabel: 'W1' },
        2: { week: 2, topic: 'Prepositions', materials: 'Edpuzzle', dateLabel: 'W2' },
        3: { week: 3, topic: 'Functions of Organs', materials: 'Worksheet', dateLabel: 'W3' }
    },
    't3': {
        6: { week: 6, topic: 'Catch Up', materials: 'Review', dateLabel: 'W6' },
        7: { week: 7, topic: 'Self-Study', materials: 'Textbook', dateLabel: 'W7' }
    }
  },
  'grade3': {
    't1': { 
        1: { week: 1, topic: 'Assignments', materials: '', dateLabel: 'W1' },
        3: { week: 3, topic: 'Presentation: Lunchbox', materials: 'Design Sheet', dateLabel: 'W3' },
        4: { week: 4, topic: 'Written: Meal Sustenance', materials: 'Opinion Essay', dateLabel: 'W4' }
    },
    't2': {
        1: { week: 1, topic: 'Geography', materials: '', dateLabel: 'W1' },
        2: { week: 2, topic: 'Aboriginal Art 1', materials: 'Art Supplies', dateLabel: 'W2' },
        3: { week: 3, topic: 'Aboriginal Art 2', materials: 'Finish Art', dateLabel: 'W3' }
    },
    't3': {
        1: { week: 1, topic: 'Self Study / Prep', materials: '', dateLabel: 'W1' },
        7: { week: 7, topic: 'Final Review', materials: '', dateLabel: 'W7' }
    }
  }
};

const INITIAL_SCHEDULE_DATA: ScheduleData = { 
  Monday: [
    { period: 'Morning', code: 'HR', time: '08:20 - 08:35', type: 'welcome', name: 'Welcoming Students', classId: '' },
    { period: '1st', code: 'J1', time: '08:50 - 09:40', type: 'lesson', name: 'J1 Global Studies', classId: 'j1a' },
    { period: '2nd', code: 'J3', time: '09:50 - 10:40', type: 'lesson', name: 'J3 Cultural Studies', classId: 'j3a' },
  ], 
  Tuesday: [
    { period: 'Morning', code: 'HR', time: '08:20 - 08:35', type: 'welcome', name: 'Welcoming Students', classId: '' },
    { period: '3rd', code: 'J2', time: '10:50 - 11:40', type: 'lesson', name: 'J2 Science', classId: 'j2a' },
  ],
  Wednesday: [
    { period: 'Morning', code: 'HR', time: '08:20 - 08:35', type: 'welcome', name: 'Welcoming Students', classId: '' },
    { period: 'After School', code: 'CLN', time: '15:20 - 15:35', type: 'cleaning', name: 'Cleaning Duty', classId: '' }
  ],
  Thursday: [
    { period: 'Morning', code: 'HR', time: '08:20 - 08:35', type: 'welcome', name: 'Welcoming Students', classId: '' },
    { period: 'After School', code: 'CLN', time: '15:20 - 15:35', type: 'cleaning', name: 'Cleaning Duty', classId: '' }
  ],
  Friday: [
    { period: 'Morning', code: 'HR', time: '08:20 - 08:35', type: 'welcome', name: 'Welcoming Students', classId: '' },
    { period: 'After School', code: 'CLN', time: '15:20 - 15:35', type: 'cleaning', name: 'Cleaning Duty', classId: '' }
  ]
};

// --- MAIN APP COMPONENT ---

export default function App() {
  // Auth & Settings
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  
  // Data
  const [classes, setClasses] = useState<ClassData[]>(INITIAL_CLASSES_DATA);
  const [schedule, setSchedule] = useState<ScheduleData>(INITIAL_SCHEDULE_DATA);
  const [attendanceHistory, setAttendanceHistory] = useState<Record<string, any>>({}); 
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [curriculum, setCurriculum] = useState<CurriculumData>(INITIAL_CURRICULUM_DATA);
  const [scheduleImages, setScheduleImages] = useState<ScheduleImages>({ weekly: null, yearly: null });
  const [quickNotes, setQuickNotes] = useState('');
  const [todos, setTodos] = useState<Todo[]>([
    { id: '1', text: 'Grade J1 essays', completed: false },
    { id: '2', text: 'Prepare J3 handout', completed: true },
  ]);
  
  // UI State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClassId, setSelectedClassId] = useState('j1a'); // Default to J1A
  const [activeTermId, setActiveTermId] = useState('t1');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false); 
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  // Modals & Tools
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null); 
  const [generatedGroups, setGeneratedGroups] = useState<Student[][]>([]);
  const [randomStudent, setRandomStudent] = useState<Student | null>(null);
  const [bulkNamesInput, setBulkNamesInput] = useState('');
  
  // Importers
  const [curriculumImportText, setCurriculumImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [plickersData, setPlickersData] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [generatedReports, setGeneratedReports] = useState<Record<string, string>>({});

  // AI State
  const [aiChatHistory, setAiChatHistory] = useState<{role: string, text: string}[]>([
    { role: 'model', text: "Hello! I'm your teaching assistant. I can update your schedule, process grades, or create reports. Just ask!" }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Tools State
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [teacherXP, setTeacherXP] = useState(1250);

  // Derived State
  const currentClass = useMemo(() => classes.find(c => c.id === selectedClassId) || classes[0], [classes, selectedClassId]);
  const studentList = useMemo(() => currentClass?.students || [], [currentClass]);
  
  // --- FIREBASE INIT ---
  let auth: Auth | undefined;
  let db: Firestore | undefined;
  let isDemoMode = false; 

  if (!firebaseConfigStr) isDemoMode = true;
  else {
    try {
      const app = initializeApp(JSON.parse(firebaseConfigStr));
      auth = getAuth(app);
      db = getFirestore(app);
    } catch (e) { isDemoMode = true; }
  }

  // --- EFFECTS ---
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Timer
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timer > 0) interval = setInterval(() => setTimer(t => t - 1), 1000);
    else if (timer === 0) setIsTimerRunning(false);
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  // Command Palette & Shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCmdOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Auth & Data Sync
  useEffect(() => {
    if (isDemoMode) {
        setTimeout(() => { setUser({ uid: 'demo', email: 'demo@teacher.com' } as User); setIsAuthLoading(false); }, 500);
        return;
    }
    const initAuth = async () => {
        if (!auth) return;
        try {
            if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
            else await signInAnonymously(auth);
        } catch { setUser({ uid: 'demo', email: 'demo@teacher.com' } as User); setIsAuthLoading(false); }
    };
    initAuth();
    if (auth) onAuthStateChanged(auth, u => { if(u) { setUser(u); setIsAuthLoading(false); } });
  }, []);

  useEffect(() => {
    if (!user || isDemoMode || !db) return;
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main'), snap => {
        if(snap.exists()) {
            const data = snap.data();
            if(data.classes) setClasses(data.classes);
            if(data.curriculum) setCurriculum(data.curriculum);
            if(data.attendanceHistory) setAttendanceHistory(data.attendanceHistory);
            if(data.studentNotes) setStudentNotes(data.studentNotes);
            if(data.password) setStoredPassword(data.password);
            if(data.schedule) setSchedule(data.schedule);
            if(data.quickNotes) setQuickNotes(data.quickNotes);
            if(data.todos) setTodos(data.todos);
        }
    });
    return () => unsub();
  }, [user]);

  // --- ACTIONS ---
  const savePrivate = async (data: any) => {
    if (isDemoMode || !user || !db) return;
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main'), data, { merge: true });
  };

  const handleBulkImport = () => {
    if (!bulkNamesInput.trim()) return;
    const names = bulkNamesInput.split('\n').filter(n => n.trim().length > 0);
    const newClasses: ClassData[] = [];
    
    // Create 15 classes with 20 slots each
    for (let i = 1; i <= 15; i++) {
        const classStudents: Student[] = [];
        for (let j = 0; j < 20; j++) {
            const name = names.length > 0 ? names.shift() : `Student ${j + 1}`;
            classStudents.push({
                id: i * 1000 + j,
                name: name!,
                performance: 70 + Math.floor(Math.random() * 30)
            });
        }
        newClasses.push({
            id: `c${i}`,
            name: `Class ${i}`,
            layout: 'u-shape',
            gradeLevel: 'grade1', // Default
            students: classStudents
        });
    }
    setClasses(newClasses);
    savePrivate({ classes: newClasses });
    setBulkNamesInput('');
    alert("Successfully created 15 classes with 20 students each!");
  };

  const processCurriculumImport = async () => {
    if(!curriculumImportText.trim()) return;
    setIsImporting(true);
    const prompt = `
      I have this syllabus/lesson plan text: "${curriculumImportText}".
      Please convert this into a JSON object that matches this structure:
      {
        "weekNumber": { "week": number, "topic": "string", "materials": "string", "dateLabel": "W#" }
      }
      Only return the valid JSON object. Do not include markdown formatting.
    `;
    
    try {
      const response = await callGemini(prompt, customApiKey);
      const jsonStr = response.replace(/```json|```/g, '').trim();
      const newData = JSON.parse(jsonStr);
      
      const targetGrade = currentClass.gradeLevel;
      const updatedCurriculum = { ...curriculum };
      if(!updatedCurriculum[targetGrade]) updatedCurriculum[targetGrade] = {};
      if(!updatedCurriculum[targetGrade][activeTermId]) updatedCurriculum[targetGrade][activeTermId] = {};
      
      Object.entries(newData).forEach(([key, val]: any) => {
          // Heuristic: if key is numeric, treat as week
          const weekNum = parseInt(key) || val.week;
          updatedCurriculum[targetGrade][activeTermId][weekNum] = val;
      });
      
      setCurriculum(updatedCurriculum);
      savePrivate({ curriculum: updatedCurriculum });
      setCurriculumImportText('');
      alert("Curriculum processed and imported successfully!");
    } catch (e) {
      alert("Failed to parse AI response. Please try again.");
      console.error(e);
    } finally {
      setIsImporting(false);
    }
  };

  const analyzePlickersData = async () => {
      if(!plickersData.trim()) return;
      setIsImporting(true);
      
      const prompt = `
        Analyze the following student performance data (CSV/Text) for class context: "${plickersData}".
        
        1. Return a JSON object where keys are exact student names found in the text and values are their numeric scores (0-100).
        2. Also provide a text "recommendation" on seating plans (e.g. mix high/low performers) and teaching strategies based on the data.
        
        Format your response exactly like this:
        {
           "scores": { "Student Name": 85, ... },
           "recommendation": "Your analysis here..."
        }
      `;

      try {
        const response = await callGemini(prompt, customApiKey);
        const jsonStr = response.replace(/```json|```/g, '').trim();
        const result = JSON.parse(jsonStr);
        
        // Update Scores
        if (result.scores) {
            const updatedClasses = [...classes];
            const targetClass = updatedClasses.find(c => c.id === selectedClassId);
            if (targetClass) {
                let matchCount = 0;
                targetClass.students = targetClass.students.map(s => {
                    // Fuzzy match could go here, but strict for now
                    if (result.scores[s.name]) {
                        matchCount++;
                        return { ...s, performance: result.scores[s.name] };
                    }
                    return s;
                });
                setClasses(updatedClasses);
                savePrivate({ classes: updatedClasses });
                setAnalysisResult(`Updated scores for ${matchCount} students.\n\n${result.recommendation}`);
            }
        }
      } catch (e) {
          setAnalysisResult("Error processing data. Ensure names match exactly.");
      } finally {
          setIsImporting(false);
      }
  };

  const generateReports = async () => {
      setIsImporting(true);
      const studentDataSummary = studentList.map(s => ({
          name: s.name,
          performance: s.performance,
          attendance: getStudentStats(s.id).rate,
          notes: studentNotes[s.id] || ''
      }));

      const prompt = `
        Generate a short, professional end-of-term report card comment (2-3 sentences) for each student based on this data:
        ${JSON.stringify(studentDataSummary)}
        
        Return ONLY a JSON object: { "Student Name": "Comment string..." }
      `;

      try {
          const response = await callGemini(prompt, customApiKey);
          const jsonStr = response.replace(/```json|```/g, '').trim();
          const reports = JSON.parse(jsonStr);
          setGeneratedReports(reports);
      } catch (e) {
          alert("Failed to generate reports.");
      } finally {
          setIsImporting(false);
      }
  };

  const handleAiAction = async () => {
      if (!aiInput.trim()) return;
      const userMsg = { role: 'user', text: aiInput };
      setAiChatHistory(prev => [...prev, userMsg]);
      setAiInput('');
      setIsAiThinking(true);

      // We inject context about the app state so the AI can "act"
      const systemContext = `
        You are a smart teacher's assistant. You have control over the app's data.
        If the user asks to "Change schedule", "Update student score", "Add lesson plan", you should return JSON data representing the state change along with a text message.
        
        Current State Context:
        - Class: ${currentClass.name}
        - Current Week Schedule: ${JSON.stringify(schedule['Monday'] || [])} (Monday example)
        
        If you want to perform an action, include a JSON block at the start of your message:
        { "action": "UPDATE_SCHEDULE", "data": { "Monday": [...] } }
        or
        { "action": "UPDATE_CURRICULUM", "data": { "week": 1, "topic": "..." } }

        Always follow the JSON with a friendly text response.
      `;

      try {
          const response = await callGemini(userMsg.text + `\n\nSystem: ${systemContext}`, customApiKey);
          
          // Attempt to parse "Action" JSON from response
          let displayText = response;
          try {
             const jsonMatch = response.match(/\{[\s\S]*?\}/);
             if (jsonMatch) {
                 const actionData = JSON.parse(jsonMatch[0]);
                 if (actionData.action === 'UPDATE_SCHEDULE') {
                     const newSchedule = { ...schedule, ...actionData.data };
                     setSchedule(newSchedule);
                     savePrivate({ schedule: newSchedule });
                     displayText = response.replace(jsonMatch[0], '').trim();
                 }
                 // Add more actions as needed
             }
          } catch (e) {
              console.log("No auto-action detected or failed parse");
          }

          setAiChatHistory(prev => [...prev, { role: 'model', text: displayText || response }]);
      } catch (e) {
          setAiChatHistory(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now." }]);
      } finally {
          setIsAiThinking(false);
      }
  };

  const pickRandomStudent = () => {
    if (!studentList.length) return;
    let count = 0;
    const interval = setInterval(() => {
        setRandomStudent(studentList[Math.floor(Math.random() * studentList.length)]);
        count++;
        if (count > 10) clearInterval(interval);
    }, 100);
  };

  const generateGroups = (size: number) => {
    const shuffled = [...studentList].sort(() => 0.5 - Math.random());
    const groups: Student[][] = [];
    for (let i = 0; i < shuffled.length; i += size) {
        groups.push(shuffled.slice(i, i + size));
    }
    setGeneratedGroups(groups);
  };

  const toggleAttendance = (studentId: number) => {
      const dateKey = currentDate.toISOString().split('T')[0];
      const sId = String(studentId);
      const current = attendanceHistory[selectedClassId]?.[dateKey]?.[sId] || 'absent';
      const next = current === 'absent' ? 'present' : current === 'present' ? 'late' : 'absent';
      
      const newHistory = {
          ...attendanceHistory,
          [selectedClassId]: {
              ...attendanceHistory[selectedClassId],
              [dateKey]: {
                  ...attendanceHistory[selectedClassId]?.[dateKey],
                  [sId]: next
              }
          }
      };
      setAttendanceHistory(newHistory);
      savePrivate({ attendanceHistory: newHistory });
  };

  const addTodo = (text: string) => {
      const newTodos = [{ id: Date.now().toString(), text, completed: false }, ...todos];
      setTodos(newTodos);
      savePrivate({ todos: newTodos });
  };

  const toggleTodo = (id: string) => {
      const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      setTodos(newTodos);
      savePrivate({ todos: newTodos });
  };

  const deleteTodo = (id: string) => {
      const newTodos = todos.filter(t => t.id !== id);
      setTodos(newTodos);
      savePrivate({ todos: newTodos });
  };

  // Stats Calculation
  const getStudentStats = (studentId: number) => {
      const sId = String(studentId);
      let totalDays = 0;
      let presentDays = 0;
      const classHistory = attendanceHistory[selectedClassId] || {};
      
      Object.values(classHistory).forEach((dayRecords: any) => {
          if (dayRecords[sId]) {
              totalDays++;
              if (dayRecords[sId] === 'present') presentDays++;
              if (dayRecords[sId] === 'late') presentDays += 0.5;
          }
      });
      
      const rate = totalDays === 0 ? 100 : Math.round((presentDays / totalDays) * 100);
      return { rate, totalDays };
  };

  // --- RENDERERS ---

  const renderCommandPalette = () => {
    if (!isCmdOpen) return null;
    const actions = [
        { icon: LayoutGrid, label: 'Dashboard', action: () => setActiveTab('dashboard') },
        { icon: CheckSquare, label: 'Attendance', action: () => setActiveTab('attendance') },
        { icon: Users, label: 'Seating Plan', action: () => setActiveTab('classroom') },
        { icon: BarChart2, label: 'Analytics & Reports', action: () => setActiveTab('analytics') },
        { icon: Shuffle, label: 'Random Student', action: () => { setActiveTab('tools'); setTimeout(pickRandomStudent, 500); } },
        { icon: Timer, label: 'Start 5m Timer', action: () => { setTimer(300); setIsTimerRunning(true); setIsFocusMode(true); } },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-[20vh] animate-in fade-in" onClick={() => setIsCmdOpen(false)}>
            <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="flex items-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <Search className="text-slate-400 mr-3"/>
                    <input 
                        autoFocus
                        placeholder="Type a command or search..."
                        className="flex-1 bg-transparent outline-none text-lg text-slate-800 dark:text-white"
                        onKeyDown={e => e.key === 'Escape' && setIsCmdOpen(false)}
                    />
                    <div className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">ESC</div>
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    {actions.map((act, i) => (
                        <button key={i} 
                            onClick={() => { act.action(); setIsCmdOpen(false); }}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-left transition-colors group"
                        >
                            <act.icon size={18} className="text-slate-400 group-hover:text-indigo-500"/>
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{act.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderStudentProfile = () => {
      if (!viewingStudent) return null;
      const stats = getStudentStats(viewingStudent.id);
      const note = studentNotes[String(viewingStudent.id)] || '';

      return (
          <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4" onClick={() => setViewingStudent(null)}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
                      <button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full"><X size={16}/></button>
                  </div>
                  <div className="px-6 pb-6 -mt-12">
                      <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full p-1 shadow-lg mx-auto mb-4">
                           <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-400">
                                {viewingStudent.name.charAt(0)}
                           </div>
                      </div>
                      <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-1">{viewingStudent.name}</h2>
                      <p className="text-center text-slate-500 text-sm mb-6">Student ID: {viewingStudent.id}</p>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-center">
                              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.rate}%</div>
                              <div className="text-xs font-bold text-emerald-800/60 dark:text-emerald-200/60 uppercase">Attendance</div>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center">
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{viewingStudent.performance}%</div>
                              <div className="text-xs font-bold text-blue-800/60 dark:text-blue-200/60 uppercase">Homework</div>
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                              <Lock size={12}/> Private Notes
                          </label>
                          <textarea 
                             className="w-full h-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                             placeholder="Behavioral notes, reminders, etc..."
                             value={note}
                             onChange={(e) => {
                                 const newNotes = { ...studentNotes, [String(viewingStudent.id)]: e.target.value };
                                 setStudentNotes(newNotes);
                                 savePrivate({ studentNotes: newNotes });
                             }}
                          />
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderTools = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
          {/* Random Picker */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Shuffle/> Random Student</h3>
              <div className="h-40 flex items-center justify-center">
                  {randomStudent ? (
                      <div className="text-center animate-in zoom-in">
                           <div className="text-4xl font-black mb-2">{randomStudent.name}</div>
                           <div className="opacity-80">Selected</div>
                      </div>
                  ) : (
                      <div className="text-white/50 italic">Click Pick to start</div>
                  )}
              </div>
              <Button onClick={pickRandomStudent} className="w-full bg-white text-indigo-600 hover:bg-indigo-50 border-none">Pick Student</Button>
          </Card>

          {/* Group Generator */}
          <Card>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-700 dark:text-white"><Users2 size={20}/> Group Generator</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                  {[2,3,4,5].map(size => (
                      <button key={size} onClick={() => generateGroups(size)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                          Groups of {size}
                      </button>
                  ))}
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                  {generatedGroups.map((group, i) => (
                      <div key={i} className="flex gap-2 p-2 border border-slate-100 dark:border-slate-700 rounded-lg">
                          <span className="font-bold text-slate-400 w-6">{i+1}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-300">{group.map(s => s.name).join(', ')}</span>
                      </div>
                  ))}
                  {generatedGroups.length === 0 && <div className="text-center text-slate-400 py-4 text-sm">Select a size to generate groups</div>}
              </div>
          </Card>

          {/* Timer Tool */}
          <Card>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-700 dark:text-white"><Timer size={20}/> Focus Timer</h3>
              <div className="text-center py-6">
                  <div className="text-6xl font-black text-slate-800 dark:text-white font-mono mb-6">
                      {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                  </div>
                  <div className="flex gap-2 justify-center">
                      <Button size="sm" onClick={() => { setTimer(300); setIsTimerRunning(true); }}>5m</Button>
                      <Button size="sm" onClick={() => { setTimer(900); setIsTimerRunning(true); }}>15m</Button>
                      <Button size="sm" variant="danger" onClick={() => { setTimer(0); setIsTimerRunning(false); }}>Stop</Button>
                  </div>
              </div>
          </Card>
      </div>
  );

  const renderClassroomManager = () => (
      <div className="h-full flex flex-col gap-6 animate-in fade-in">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Users className="text-indigo-500"/> Seating Plan</h2>
                  <p className="text-sm text-slate-500">U-Shape Layout (Groups of 5)</p>
              </div>
              <select 
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 outline-none"
                  value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
              >
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
          </div>

          <div className="flex-1 bg-slate-100 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-8 relative overflow-y-auto">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-8 py-2 rounded-b-xl shadow-lg font-bold text-sm tracking-widest uppercase">
                  Whiteboard / Front
              </div>
              
              <div className="mt-16 flex flex-wrap justify-center gap-16">
                  {/* Render students in chunks of 5 (Clusters) */}
                  {Array.from({ length: Math.ceil(studentList.length / 5) }).map((_, i) => {
                      const group = studentList.slice(i * 5, (i + 1) * 5);
                      // Arrange them in a mini U-shape: 2 left, 1 bottom, 2 right roughly
                      return (
                          <div key={i} className="relative w-48 h-40 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50">
                               <div className="absolute -top-3 left-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded">Group {i+1}</div>
                               
                               {/* 5 Slots */}
                               <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-2 px-1">
                                   {group[0] && <StudentSeat student={group[0]} onClick={() => setViewingStudent(group[0])} />}
                                   {group[1] && <StudentSeat student={group[1]} onClick={() => setViewingStudent(group[1])} />}
                               </div>
                               <div className="absolute bottom-0 left-12 right-12 h-12 flex justify-center items-end pb-1">
                                   {group[2] && <StudentSeat student={group[2]} onClick={() => setViewingStudent(group[2])} />}
                               </div>
                               <div className="absolute right-0 top-0 bottom-0 w-12 flex flex-col justify-between py-2 px-1">
                                   {group[3] && <StudentSeat student={group[3]} onClick={() => setViewingStudent(group[3])} />}
                                   {group[4] && <StudentSeat student={group[4]} onClick={() => setViewingStudent(group[4])} />}
                               </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>
  );

  const renderCurriculum = () => {
    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in">
             <div className="flex justify-between items-start">
                  <div>
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><BookOpenCheck className="text-indigo-500"/> Curriculum Planner</h2>
                      <p className="text-sm text-slate-500">View and edit weekly lesson plans.</p>
                  </div>
                  <div className="flex gap-2">
                      <select className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 outline-none text-sm" value={activeTermId} onChange={e => setActiveTermId(e.target.value)}>
                          <option value="t1">Term 1</option><option value="t2">Term 2</option><option value="t3">Term 3</option>
                      </select>
                      <select className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 outline-none text-sm" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
             </div>

             <div className="grid lg:grid-cols-3 gap-6 h-full min-h-0">
                  {/* Editor */}
                  <div className="lg:col-span-2 overflow-y-auto space-y-4 pb-10">
                      {Array.from({ length: 10 }).map((_, i) => {
                          const weekNum = i + 1;
                          const targetGrade = classes.find(c => c.id === selectedClassId)?.gradeLevel || 'grade1';
                          const plan = curriculum?.[targetGrade]?.[activeTermId]?.[weekNum] || { week: weekNum, topic: '', materials: '', dateLabel: '' };
                          
                          return (
                              <Card key={weekNum} className="flex flex-col md:flex-row group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors p-0 overflow-hidden">
                                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 flex items-center justify-center border-r border-slate-100 dark:border-slate-700 w-24 shrink-0 flex-col gap-1">
                                      <span className="font-bold text-slate-400 text-xs uppercase">Week</span>
                                      <span className="text-2xl font-black text-slate-700 dark:text-slate-300">{weekNum}</span>
                                  </div>
                                  <div className="flex-1 p-4 grid gap-2">
                                      <input 
                                          className="font-bold text-slate-800 dark:text-white bg-transparent outline-none placeholder:text-slate-300"
                                          placeholder="Topic / Theme"
                                          value={plan.topic}
                                          onChange={e => {
                                              const updated = { ...curriculum };
                                              if(!updated[targetGrade]) updated[targetGrade] = {};
                                              if(!updated[targetGrade][activeTermId]) updated[targetGrade][activeTermId] = {};
                                              updated[targetGrade][activeTermId][weekNum] = { ...plan, topic: e.target.value };
                                              setCurriculum(updated);
                                              savePrivate({ curriculum: updated });
                                          }}
                                      />
                                      <input 
                                          className="text-sm text-slate-500 dark:text-slate-400 bg-transparent outline-none placeholder:text-slate-300"
                                          placeholder="Materials needed..."
                                          value={plan.materials}
                                          onChange={e => {
                                              const updated = { ...curriculum };
                                              if(!updated[targetGrade]) updated[targetGrade] = {};
                                              if(!updated[targetGrade][activeTermId]) updated[targetGrade][activeTermId] = {};
                                              updated[targetGrade][activeTermId][weekNum] = { ...plan, materials: e.target.value };
                                              setCurriculum(updated);
                                              savePrivate({ curriculum: updated });
                                          }}
                                      />
                                  </div>
                              </Card>
                          );
                      })}
                  </div>

                  {/* AI Import */}
                  <div className="space-y-4">
                      <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50">
                           <h3 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2 mb-2"><Wand2 size={16}/> AI Curriculum Import</h3>
                           <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-3">Paste your syllabus or lesson plan text below. AI will format it for you.</p>
                           <textarea 
                               className="w-full h-32 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-700 p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none mb-3"
                               placeholder="e.g. Week 1: Introduction to Biology, read chapter 1..."
                               value={curriculumImportText}
                               onChange={e => setCurriculumImportText(e.target.value)}
                           />
                           <Button onClick={processCurriculumImport} disabled={isImporting || !curriculumImportText.trim()} className="w-full text-xs" icon={Sparkles}>
                               {isImporting ? 'Processing...' : 'Process & Import'}
                           </Button>
                      </Card>
                  </div>
             </div>
        </div>
    );
  };

  const renderAnalytics = () => (
      <div className="h-full flex flex-col gap-6 animate-in fade-in">
          <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><BarChart2 className="text-indigo-500"/> Analytics & Reports</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 h-full min-h-0 overflow-y-auto pb-10">
              {/* Plickers / Quiz Data */}
              <div className="space-y-4">
                  <Card>
                      <h3 className="font-bold flex items-center gap-2 mb-2"><Database size={16}/> Plickers / Quiz Analysis</h3>
                      <p className="text-xs text-slate-500 mb-4">Paste CSV or text data (Name, Score) to update student performance and get AI recommendations.</p>
                      <textarea 
                          className="w-full h-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                          placeholder="John Doe, 85&#10;Jane Smith, 92..."
                          value={plickersData}
                          onChange={e => setPlickersData(e.target.value)}
                      />
                      <Button onClick={analyzePlickersData} disabled={isImporting || !plickersData.trim()} className="w-full" icon={BrainCircuit}>
                          {isImporting ? 'Analyzing...' : 'Analyze Data'}
                      </Button>
                  </Card>
                  
                  {analysisResult && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap">
                          <h4 className="font-bold mb-2 flex items-center gap-2"><Lightbulb size={16}/> AI Analysis</h4>
                          {analysisResult}
                      </div>
                  )}
              </div>

              {/* Report Cards */}
              <div className="space-y-4">
                  <Card>
                      <h3 className="font-bold flex items-center gap-2 mb-2"><FileText size={16}/> Report Card Generator</h3>
                      <p className="text-xs text-slate-500 mb-4">Generate end-of-term comments for {currentClass.name} based on attendance, scores, and private notes.</p>
                      <Button onClick={generateReports} disabled={isImporting} variant="secondary" className="w-full" icon={Sparkles}>
                          {isImporting ? 'Writing Reports...' : 'Generate Student Reports'}
                      </Button>
                  </Card>

                  {Object.keys(generatedReports).length > 0 && (
                      <div className="space-y-3">
                          {Object.entries(generatedReports).map(([name, report], i) => (
                              <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                  <div className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">{name}</div>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">"{report}"</p>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      </div>
  );

  const renderAiChat = () => (
      <div className="h-full flex flex-col gap-4 animate-in fade-in">
          <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Sparkles className="text-indigo-500"/> AI Assistant</h2>
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full font-bold">Active Mode</span>
          </div>
          <Card className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 p-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {aiChatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                              msg.role === 'user' 
                              ? 'bg-indigo-600 text-white rounded-br-none' 
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'
                          }`}>
                              {msg.text}
                          </div>
                      </div>
                  ))}
                  {isAiThinking && (
                      <div className="flex justify-start">
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-700 flex gap-2 items-center">
                              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}/>
                              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
                          </div>
                      </div>
                  )}
                  <div ref={chatEndRef} />
              </div>
              <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                  <input 
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      placeholder="Ask to change schedule, add scores, or plan lessons..."
                      value={aiInput}
                      onChange={e => setAiInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAiAction()}
                  />
                  <Button onClick={handleAiAction} disabled={!aiInput.trim() || isAiThinking} icon={Send} className="rounded-xl">Send</Button>
              </div>
          </Card>
      </div>
  );

  const renderSettings = () => (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in">
          <Card>
              <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Class Generation</h3>
              <p className="text-sm text-slate-500 mb-4">Paste a list of student names (one per line) to automatically create 15 classes with 20 students each.</p>
              <textarea 
                  className="w-full h-40 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                  placeholder="Paste Names Here..."
                  value={bulkNamesInput}
                  onChange={e => setBulkNamesInput(e.target.value)}
              />
              <Button onClick={handleBulkImport} icon={Database} disabled={!bulkNamesInput.trim()}>
                  Generate 15 Classes
              </Button>
          </Card>
          
          <Card>
              <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">API Configuration</h3>
              <label className="text-xs font-bold text-slate-500 block mb-2">Custom Gemini API Key</label>
              <div className="flex gap-2">
                  <input 
                      type="password" 
                      className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 outline-none focus:border-indigo-500 transition-colors"
                      placeholder="AIza..."
                      value={apiKeyInput}
                      onChange={e => setApiKeyInput(e.target.value)}
                  />
                  <Button onClick={() => { setCustomApiKey(apiKeyInput); alert("API Key Saved!"); }} icon={CheckCircle} variant="success">
                      Save
                  </Button>
              </div>
              {customApiKey && <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><CheckCircle size={10}/> Key is currently active</p>}
          </Card>
      </div>
  );

  const Dashboard = ({ schedule, classes, quickNotes, setQuickNotes, savePrivate, todos, setTodos }: any) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todaysSchedule = schedule[today] || [];

    // Helper to get random absent students for "Last Week" visual
    const getAbsenteeSummary = (cls: ClassData) => {
        if (!cls || !cls.students) return [];
        // Deterministic random based on class ID to keep it consistent during render
        const count = (cls.id.charCodeAt(0) + cls.id.charCodeAt(1)) % 3; // 0, 1, or 2 absent
        return cls.students.slice(0, count);
    };

    const toggleTodo = (id: string) => {
        const newTodos = todos.map((t: any) => t.id === id ? { ...t, completed: !t.completed } : t);
        setTodos(newTodos);
        savePrivate({ todos: newTodos });
    };

    const addTodo = (e: any) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            const newTodos = [{ id: Date.now().toString(), text: e.target.value, completed: false }, ...todos];
            setTodos(newTodos);
            savePrivate({ todos: newTodos });
            e.target.value = '';
        }
    };

    const deleteTodo = (id: string) => {
        const newTodos = todos.filter((t: any) => t.id !== id);
        setTodos(newTodos);
        savePrivate({ todos: newTodos });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
             {/* Welcome Banner */}
             <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                 <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Good Morning, Teacher</h1>
                        <p className="opacity-90">You have {todaysSchedule.length} sessions today.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md" icon={MonitorPlay} onClick={() => { setTimer(300); setIsTimerRunning(true); setIsFocusMode(true); }}>
                            Start Focus
                        </Button>
                        <Button variant="secondary" className="bg-white text-indigo-600 border-white hover:bg-indigo-50 shadow-lg" icon={CheckSquare} onClick={() => setActiveTab('attendance')}>
                            Take Attendance
                        </Button>
                    </div>
                 </div>
                 <Sparkles className="absolute top-4 right-4 text-white/10 w-32 h-32"/>
             </div>

             <div className="grid lg:grid-cols-3 gap-6">
                 {/* Left Column: Schedule & Absentees */}
                 <div className="lg:col-span-2 space-y-6">
                     <Card>
                         <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2 mb-4"><Clock size={18}/> Today's Schedule</h3>
                         <div className="space-y-3">
                            {todaysSchedule.length ? todaysSchedule.map((s: any, i: number) => {
                                const relatedClass = classes.find((c: any) => c.id === s.classId);
                                const absentLastWeek = relatedClass ? getAbsenteeSummary(relatedClass) : [];
                                const colors: any = {
                                    'welcome': 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200',
                                    'cleaning': 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200',
                                    'lesson': 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-600 text-slate-800 dark:text-white',
                                    'duty': 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                                };

                                return (
                                    <div key={i} className={`flex flex-col md:flex-row gap-4 p-4 rounded-xl border shadow-sm transition-all hover:shadow-md ${colors[s.type] || colors['lesson']}`}>
                                        {/* Time & Info */}
                                        <div className="flex gap-4 items-center flex-1">
                                            <div className="text-center min-w-[4rem]">
                                                <div className="text-sm font-bold opacity-70">{s.time.split(' - ')[0]}</div>
                                                <div className="text-[10px] opacity-50">{s.time.split(' - ')[1]}</div>
                                            </div>
                                            <div className="w-px h-10 bg-current opacity-10 hidden md:block"></div>
                                            <div>
                                                <div className="font-bold text-base">{s.name}</div>
                                                <div className="text-xs opacity-60 uppercase tracking-wide font-semibold">{s.code}</div>
                                            </div>
                                        </div>

                                        {/* Absentee Insight */}
                                        {s.type === 'lesson' && absentLastWeek.length > 0 && (
                                            <div className="md:border-l border-current border-opacity-10 md:pl-4 md:w-1/3">
                                                <div className="text-[10px] font-bold uppercase opacity-60 mb-1 flex items-center gap-1"><AlertTriangle size={10}/> Absent Last Week</div>
                                                <div className="flex -space-x-2 overflow-hidden pb-1">
                                                    {absentLastWeek.map((st: Student) => (
                                                        <div key={st.id} className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-800 bg-red-100 dark:bg-red-900 flex items-center justify-center text-[8px] font-bold text-red-800 dark:text-red-200" title={st.name}>
                                                            {st.name.split(' ')[1]?.[0] || st.name[0]}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="text-[10px] opacity-80 truncate">
                                                    {absentLastWeek.map((s:Student) => s.name.split('. ')[1]).join(', ')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }) : <div className="text-slate-400 text-sm italic text-center py-8">No classes scheduled for today. Enjoy your prep time!</div>}
                         </div>
                     </Card>
                 </div>

                 {/* Right Column: Widgets */}
                 <div className="space-y-6">
                     {/* Sticky Note */}
                     <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 relative group">
                         <div className="absolute -top-3 -right-3 bg-yellow-300 text-yellow-800 p-2 rounded-full shadow-sm transform rotate-12 group-hover:rotate-0 transition-transform">
                             <StickyNote size={16} fill="currentColor" className="opacity-80"/>
                         </div>
                         <h3 className="font-bold text-yellow-800 dark:text-yellow-200 text-sm uppercase tracking-wider mb-2">Quick Notes</h3>
                         <textarea 
                            className="w-full h-32 bg-transparent border-none resize-none outline-none text-sm text-yellow-900 dark:text-yellow-100 placeholder-yellow-800/30 leading-relaxed"
                            placeholder="Type reminders here..."
                            value={quickNotes}
                            onChange={e => { setQuickNotes(e.target.value); savePrivate({ quickNotes: e.target.value }); }}
                         />
                     </Card>

                     {/* Todo List */}
                     <Card>
                         <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2 mb-4"><ListChecks size={18}/> Todo List</h3>
                         <input 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                            placeholder="Add a task + Enter"
                            onKeyDown={addTodo}
                         />
                         <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                             {todos.map((todo: Todo) => (
                                 <div key={todo.id} className="flex items-center gap-3 group">
                                     <button onClick={() => toggleTodo(todo.id)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${todo.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'}`}>
                                         {todo.completed && <CheckSquare size={12}/>}
                                     </button>
                                     <span className={`text-sm flex-1 ${todo.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{todo.text}</span>
                                     <button onClick={() => deleteTodo(todo.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <X size={14}/>
                                     </button>
                                 </div>
                             ))}
                             {todos.length === 0 && <div className="text-xs text-slate-400 text-center py-4">No tasks yet.</div>}
                         </div>
                     </Card>
                 </div>
             </div>
        </div>
    );
  };

  // --- MAIN LAYOUT ---
  if (isAuthLoading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader className="animate-spin text-indigo-600"/></div>;
  if (!user || isLocked) return <LockScreen isLocked={isLocked} isDemo={isDemoMode} onUnlock={() => setIsLocked(false)} />;

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
    { id: 'curriculum', label: 'Curriculum', icon: BookOpenCheck },
    { id: 'analytics', label: 'Data & Reports', icon: BarChart2 },
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'classroom', label: 'Class Manager', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'ai_assistant', label: 'Assistant', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg"><Globe size={20} /></div>
          <span className="font-bold text-lg text-slate-800 dark:text-white">Teacher<span className="text-indigo-600">App</span></span>
        </div>
        
        {/* XP Bar */}
        <div className="px-6 pt-6 pb-2">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase mb-1.5">
                <span className="flex items-center gap-1"><GraduationCap size={12}/> Lvl {Math.floor(teacherXP / 1000) + 1}</span>
                <span>{teacherXP} XP</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${(teacherXP % 1000) / 10}%` }}/>
            </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {navigation.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === item.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 dark:border-slate-700 space-y-4 bg-white dark:bg-slate-800">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-bold">
              <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>{isDarkMode ? <Moon size={14}/> : <Sun size={14}/>}
          </button>
          <div className="flex items-center gap-3 px-2">
               <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-700">TE</div>
               <div className="flex-1 text-xs"><div className="font-bold">Teacher Admin</div><div className="opacity-60">{isDemoMode ? 'Demo' : 'Online'}</div></div>
               <button onClick={() => setIsLocked(true)}><Lock size={14} className="text-slate-400"/></button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2"><Menu/></button>
          <span className="font-bold">TeacherApp</span>
          <div className="w-8" />
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {activeTab === 'dashboard' && <Dashboard schedule={schedule} classes={classes} quickNotes={quickNotes} setQuickNotes={setQuickNotes} savePrivate={savePrivate} todos={todos} setTodos={setTodos} />}
            {activeTab === 'classroom' && renderClassroomManager()}
            {activeTab === 'tools' && renderTools()}
            {activeTab === 'attendance' && <AttendanceView classes={classes} attendance={attendanceHistory[selectedClassId] || {}} onToggle={toggleAttendance} selectedClassId={selectedClassId} setSelectedClassId={setSelectedClassId} onStudentClick={setViewingStudent} />}
            {activeTab === 'curriculum' && renderCurriculum()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'ai_assistant' && renderAiChat()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>

        {/* Floating Action Button (Mobile) */}
        <button onClick={() => setIsCmdOpen(true)} className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center z-30 active:scale-95 transition-transform">
             <Search size={24}/>
        </button>

        {renderCommandPalette()}
        {renderStudentProfile()}
        {isFocusMode && <FocusOverlay timer={timer} isRunning={isTimerRunning} onStop={() => { setIsFocusMode(false); setIsTimerRunning(false); }} />}
      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---

const Card = ({ children, className = "", onClick }: any) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', icon: Icon, disabled, className = "", size = "md" }: any) => {
  const variants: any = { 
    primary: "bg-indigo-600 text-white hover:bg-indigo-700", 
    secondary: "bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 14 : 18} />} {children}
    </button>
  );
};

const StudentSeat = ({ student, onClick }: { student: Student, onClick: () => void }) => (
    <div onClick={onClick} className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-bold shadow-sm cursor-pointer hover:scale-110 transition-transform hover:bg-indigo-50 dark:hover:bg-indigo-900 text-slate-700 dark:text-slate-200" title={student.name}>
        {student.name.substring(0,2).toUpperCase()}
    </div>
);

const AttendanceView = ({ classes, attendance, onToggle, selectedClassId, setSelectedClassId, onStudentClick }: any) => {
    const currentClass = classes.find((c: any) => c.id === selectedClassId) || classes[0];
    return (
        <div className="animate-in fade-in">
             <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold dark:text-white">Attendance</h2>
                  <select className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                      {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                 {currentClass?.students.map((s: any) => {
                     const status = attendance[s.id] || 'absent';
                     const colors: any = { present: 'bg-emerald-100 text-emerald-700 border-emerald-200', absent: 'bg-slate-100 text-slate-500 border-slate-200', late: 'bg-amber-100 text-amber-700 border-amber-200' };
                     return (
                         <div key={s.id} className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${colors[status]}`} onClick={() => onToggle(s.id)}>
                             <div className="flex justify-between items-start">
                                 <div className="font-bold text-lg truncate" onClick={(e) => { e.stopPropagation(); onStudentClick(s); }}>{s.name}</div>
                                 <span className="text-[10px] font-bold uppercase">{status}</span>
                             </div>
                             <div className="text-xs opacity-70 mt-1">ID: {s.id}</div>
                         </div>
                     );
                 })}
             </div>
        </div>
    );
};

const FocusOverlay = ({ timer, isRunning, onStop }: any) => (
    <div className="fixed inset-0 bg-slate-900 text-white z-[200] flex flex-col items-center justify-center animate-in zoom-in duration-300">
        <div className="text-[12rem] font-black font-mono leading-none tracking-tighter">
            {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
        </div>
        <div className="mt-8 flex gap-4">
            <button onClick={onStop} className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-bold">Minimize / Stop</button>
        </div>
    </div>
);

const LockScreen = ({ isLocked, isDemo, onUnlock }: any) => {
    const [pin, setPin] = useState('');
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
             <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden">
                 <div className="bg-indigo-600 p-8 text-center text-white">
                     <Shield size={48} className="mx-auto mb-4 opacity-50"/>
                     <h1 className="text-2xl font-bold">Teacher Portal</h1>
                     {isDemo && <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded font-bold">DEMO MODE</span>}
                 </div>
                 <div className="p-8">
                     <p className="text-center text-slate-500 mb-6">Enter PIN to access (Try any for Demo)</p>
                     <input type="password" value={pin} onChange={e => setPin(e.target.value)} className="w-full text-center text-3xl tracking-[1em] p-4 bg-slate-100 dark:bg-slate-700 rounded-xl outline-none mb-6 dark:text-white" maxLength={4} placeholder="••••"/>
                     <Button onClick={onUnlock} className="w-full py-4">Unlock System</Button>
                 </div>
             </div>
        </div>
    );
};

const Wrench = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;