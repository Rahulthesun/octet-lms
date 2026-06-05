export const student = {
  name: 'Arjun Sharma',
  email: 'arjun.sharma@student.com',
  mobile: '+91 9876543210',
  grade: '11',
  avatar: null,
  joinedDate: '2024-06-15',
  rollNumber: 'OCT-2024-047',
}

export const courses = [
  {
    id: 'c1',
    title: 'Physical Chemistry',
    grade: '11',
    subject: 'physical' as const,
    chapters: [
      {
        id: 'ch1',
        title: 'Some Basic Concepts of Chemistry',
        duration: '4h 20m',
        progress: 100,
        subtopics: [
          { id: 't1', title: 'Importance of Chemistry', duration: '18m', watched: true, videoId: 'v1' },
          { id: 't2', title: 'Nature of Matter', duration: '22m', watched: true, videoId: 'v2' },
          { id: 't3', title: 'Properties of Matter & Their Measurement', duration: '35m', watched: true, videoId: 'v3' },
          { id: 't4', title: 'Uncertainty in Measurement', duration: '28m', watched: true, videoId: 'v4' },
          { id: 't5', title: 'Laws of Chemical Combinations', duration: '30m', watched: true, videoId: 'v5' },
          { id: 't6', title: 'Dalton\'s Atomic Theory', duration: '20m', watched: true, videoId: 'v6' },
          { id: 't7', title: 'Mole Concept & Molar Mass', duration: '47m', watched: true, videoId: 'v7' },
        ],
      },
      {
        id: 'ch2',
        title: 'Structure of Atom',
        duration: '6h 15m',
        progress: 70,
        subtopics: [
          { id: 't8', title: 'Discovery of Electron, Proton and Neutron', duration: '25m', watched: true, videoId: 'v8' },
          { id: 't9', title: 'Thomson\'s Model and Rutherford\'s Model', duration: '32m', watched: true, videoId: 'v9' },
          { id: 't10', title: 'Bohr\'s Model for Hydrogen Atom', duration: '48m', watched: true, videoId: 'v10' },
          { id: 't11', title: 'Quantum Mechanical Model', duration: '55m', watched: false, videoId: 'v11' },
          { id: 't12', title: 'Orbitals and Quantum Numbers', duration: '40m', watched: false, videoId: 'v12' },
          { id: 't13', title: 'Electronic Configuration', duration: '35m', watched: false, videoId: 'v13' },
        ],
      },
      {
        id: 'ch3',
        title: 'Classification of Elements & Periodicity',
        duration: '5h 10m',
        progress: 30,
        subtopics: [
          { id: 't14', title: 'Significance of Classification', duration: '20m', watched: true, videoId: 'v14' },
          { id: 't15', title: 'Modern Periodic Law', duration: '30m', watched: false, videoId: 'v15' },
          { id: 't16', title: 'Periodic Trends in Properties', duration: '45m', watched: false, videoId: 'v16' },
        ],
      },
      {
        id: 'ch4',
        title: 'Chemical Bonding and Molecular Structure',
        duration: '7h 30m',
        progress: 0,
        subtopics: [
          { id: 't17', title: 'Kossel-Lewis Approach', duration: '35m', watched: false, videoId: 'v17' },
          { id: 't18', title: 'Ionic/Electrovalent Bond', duration: '42m', watched: false, videoId: 'v18' },
          { id: 't19', title: 'Covalent Bond', duration: '50m', watched: false, videoId: 'v19' },
          { id: 't20', title: 'VSEPR Theory', duration: '38m', watched: false, videoId: 'v20' },
        ],
      },
    ],
  },
  {
    id: 'c2',
    title: 'Organic Chemistry',
    grade: '11',
    subject: 'organic' as const,
    chapters: [
      {
        id: 'ch5',
        title: 'Some Basic Principles and Techniques',
        duration: '5h 45m',
        progress: 45,
        subtopics: [
          { id: 't21', title: 'General Introduction', duration: '20m', watched: true, videoId: 'v21' },
          { id: 't22', title: 'Classification of Organic Compounds', duration: '35m', watched: true, videoId: 'v22' },
          { id: 't23', title: 'Nomenclature of Organic Compounds', duration: '55m', watched: false, videoId: 'v23' },
          { id: 't24', title: 'Isomerism', duration: '48m', watched: false, videoId: 'v24' },
        ],
      },
      {
        id: 'ch6',
        title: 'Hydrocarbons',
        duration: '8h 20m',
        progress: 0,
        subtopics: [
          { id: 't25', title: 'Alkanes', duration: '1h 10m', watched: false, videoId: 'v25' },
          { id: 't26', title: 'Alkenes', duration: '1h 20m', watched: false, videoId: 'v26' },
          { id: 't27', title: 'Alkynes', duration: '1h 05m', watched: false, videoId: 'v27' },
          { id: 't28', title: 'Aromatic Hydrocarbons', duration: '1h 30m', watched: false, videoId: 'v28' },
        ],
      },
    ],
  },
  {
    id: 'c3',
    title: 'Inorganic Chemistry',
    grade: '11',
    subject: 'inorganic' as const,
    chapters: [
      {
        id: 'ch7',
        title: 'Redox Reactions',
        duration: '4h 00m',
        progress: 85,
        subtopics: [
          { id: 't29', title: 'Classical Concept of Redox Reactions', duration: '25m', watched: true, videoId: 'v29' },
          { id: 't30', title: 'Oxidation Number', duration: '40m', watched: true, videoId: 'v30' },
          { id: 't31', title: 'Balancing Redox Equations', duration: '50m', watched: false, videoId: 'v31' },
        ],
      },
    ],
  },
  {
    id: 'c4',
    title: 'Electrochemistry',
    grade: '12',
    subject: 'physical' as const,
    chapters: [
      {
        id: 'ch8',
        title: 'Electrochemical Cells',
        duration: '5h 30m',
        progress: 20,
        subtopics: [
          { id: 't32', title: 'Electrochemical Cells', duration: '30m', watched: true, videoId: 'v32' },
          { id: 't33', title: 'Galvanic Cells', duration: '45m', watched: false, videoId: 'v33' },
          { id: 't34', title: 'Nernst Equation', duration: '50m', watched: false, videoId: 'v34' },
        ],
      },
    ],
  },
  {
    id: 'c5',
    title: 'Aldehydes & Ketones',
    grade: '12',
    subject: 'organic' as const,
    chapters: [
      {
        id: 'ch9',
        title: 'Aldehydes, Ketones & Carboxylic Acids',
        duration: '9h 15m',
        progress: 0,
        subtopics: [
          { id: 't35', title: 'Nomenclature & Structure', duration: '35m', watched: false, videoId: 'v35' },
          { id: 't36', title: 'Preparation Methods', duration: '55m', watched: false, videoId: 'v36' },
          { id: 't37', title: 'Physical Properties', duration: '25m', watched: false, videoId: 'v37' },
          { id: 't38', title: 'Chemical Reactions', duration: '1h 20m', watched: false, videoId: 'v38' },
          { id: 't39', title: 'Important Reactions - Aldol Condensation', duration: '45m', watched: false, videoId: 'v39' },
        ],
      },
    ],
  },
]

export const lastWatched = {
  chapterId: 'ch2',
  topicId: 't10',
  topicTitle: 'Bohr\'s Model for Hydrogen Atom',
  courseTitle: 'Physical Chemistry',
  progress: 65,
  thumbnail: null,
}

export const notes = [
  {
    id: 'n1',
    title: 'Mole Concept - Complete Notes',
    category: 'Lecture Notes',
    chapter: 'Some Basic Concepts of Chemistry',
    addedDate: '2024-11-10',
    pages: 12,
    size: '2.4 MB',
    icon: 'notes',
  },
  {
    id: 'n2',
    title: 'Periodic Table - Cheat Sheet',
    category: 'Cheat Sheet',
    chapter: 'Classification of Elements',
    addedDate: '2024-11-15',
    pages: 2,
    size: '0.8 MB',
    icon: 'cheatsheet',
  },
  {
    id: 'n3',
    title: 'Chemical Bonding Formula Sheet',
    category: 'Formula Sheet',
    chapter: 'Chemical Bonding',
    addedDate: '2024-11-20',
    pages: 4,
    size: '1.1 MB',
    icon: 'formula',
  },
  {
    id: 'n4',
    title: 'Organic Reactions - Master List',
    category: 'Important Reactions',
    chapter: 'Organic Chemistry',
    addedDate: '2024-11-25',
    pages: 8,
    size: '1.9 MB',
    icon: 'reactions',
  },
  {
    id: 'n5',
    title: 'Electrochemistry - Lecture Notes',
    category: 'Lecture Notes',
    chapter: 'Electrochemistry',
    addedDate: '2024-12-01',
    pages: 15,
    size: '3.2 MB',
    icon: 'notes',
    isNew: true,
  },
  {
    id: 'n6',
    title: 'Aldehydes & Ketones - Quick Revision',
    category: 'Cheat Sheet',
    chapter: 'Aldehydes & Ketones',
    addedDate: '2024-12-05',
    pages: 3,
    size: '0.9 MB',
    icon: 'cheatsheet',
    isNew: true,
  },
  {
    id: 'n7',
    title: 'p-Block Elements Formula Sheet',
    category: 'Formula Sheet',
    chapter: 'p-Block Elements',
    addedDate: '2024-12-03',
    pages: 5,
    size: '1.3 MB',
    icon: 'formula',
  },
]

export const attendance = {
  online: {
    total: 48,
    attended: 42,
    percentage: 87.5,
  },
  offline: {
    total: 36,
    attended: 31,
    percentage: 86.1,
  },
  monthlyData: [
    { month: 'Jul', online: 100, offline: 100 },
    { month: 'Aug', online: 90, offline: 83 },
    { month: 'Sep', online: 85, offline: 90 },
    { month: 'Oct', online: 80, offline: 75 },
    { month: 'Nov', online: 88, offline: 88 },
    { month: 'Dec', online: 92, offline: 85 },
  ],
  history: [
    { id: 'a1', type: 'online', status: 'present', date: '2024-12-10', time: '07:00 PM' },
    { id: 'a2', type: 'offline', status: 'present', date: '2024-12-09', time: '10:00 AM' },
    { id: 'a3', type: 'online', status: 'absent', date: '2024-12-07', time: '07:00 PM' },
    { id: 'a4', type: 'offline', status: 'present', date: '2024-12-06', time: '10:00 AM' },
    { id: 'a5', type: 'online', status: 'present', date: '2024-12-05', time: '07:00 PM' },
    { id: 'a6', type: 'online', status: 'present', date: '2024-12-03', time: '07:00 PM' },
    { id: 'a7', type: 'offline', status: 'absent', date: '2024-12-02', time: '10:00 AM' },
    { id: 'a8', type: 'online', status: 'present', date: '2024-11-30', time: '07:00 PM' },
    { id: 'a9', type: 'offline', status: 'present', date: '2024-11-29', time: '10:00 AM' },
    { id: 'a10', type: 'online', status: 'present', date: '2024-11-28', time: '07:00 PM' },
  ],
}

export const tests = [
  {
    id: 'test1',
    title: 'Chapter Test - Mole Concept',
    type: 'offline',
    status: 'completed',
    date: '2024-11-15',
    time: '10:00 AM',
    duration: '2 hours',
    totalMarks: 50,
    marksObtained: 42,
    percentage: 84,
    rank: 3,
    totalStudents: 24,
  },
  {
    id: 'test2',
    title: 'Online Quiz - Periodic Table',
    type: 'online',
    status: 'completed',
    date: '2024-11-22',
    time: '07:00 PM',
    duration: '1 hour',
    totalMarks: 30,
    marksObtained: 26,
    percentage: 86.7,
    rank: 2,
    totalStudents: 24,
  },
  {
    id: 'test3',
    title: 'Unit Test - Chemical Bonding',
    type: 'offline',
    status: 'missed',
    date: '2024-11-30',
    time: '10:00 AM',
    duration: '2 hours',
    totalMarks: 50,
    marksObtained: null,
    percentage: null,
    rank: null,
    totalStudents: 24,
  },
  {
    id: 'test4',
    title: 'Online Test - Redox Reactions',
    type: 'online',
    status: 'completed',
    date: '2024-12-05',
    time: '07:00 PM',
    duration: '90 minutes',
    totalMarks: 40,
    marksObtained: 36,
    percentage: 90,
    rank: 1,
    totalStudents: 24,
  },
  {
    id: 'test5',
    title: 'Chapter Test - Aldehydes & Ketones',
    type: 'offline',
    status: 'upcoming',
    date: '2024-12-18',
    time: '10:00 AM',
    duration: '2 hours',
    totalMarks: 50,
    marksObtained: null,
    percentage: null,
    rank: null,
    totalStudents: 24,
    studyMaterials: [
      { id: 'n4', title: 'Organic Reactions - Master List', type: 'Important Reactions' },
      { id: 'n6', title: 'Aldehydes & Ketones - Quick Revision', type: 'Cheat Sheet' },
    ],
  },
  {
    id: 'test6',
    title: 'Online Quiz - Electrochemistry',
    type: 'online',
    status: 'upcoming',
    date: '2024-12-20',
    time: '07:00 PM',
    duration: '1 hour',
    totalMarks: 30,
    marksObtained: null,
    percentage: null,
    rank: null,
    totalStudents: 24,
    studyMaterials: [
      { id: 'n5', title: 'Electrochemistry - Lecture Notes', type: 'Lecture Notes' },
    ],
  },
]

export const performanceHistory = [
  { test: 'Mole Concept', score: 84, date: 'Nov 15' },
  { test: 'Periodic Table', score: 87, date: 'Nov 22' },
  { test: 'Redox Reactions', score: 90, date: 'Dec 5' },
]

export const landingReviews = [
  {
    id: 'r1',
    name: 'Priya Venkataraman',
    role: 'Parent of 12th Grade Student',
    text: 'My daughter went from dreading chemistry to scoring 95 in her boards. Chemistry@OCTET is nothing short of miraculous.',
    rating: 5,
  },
  {
    id: 'r2',
    name: 'Karthik Subramanian',
    role: '12th Grade Student',
    text: 'The way complex reactions are broken down here made everything click. Never thought I\'d say this — I actually love chemistry now!',
    rating: 5,
  },
  {
    id: 'r3',
    name: 'Meena Rajesh',
    role: 'Parent of 11th Grade Student',
    text: 'Best investment we made for our son\'s education. The notes, video lectures, and regular tests keep him consistently engaged.',
    rating: 5,
  },
  {
    id: 'r4',
    name: 'Aditya Krishnaswamy',
    role: '11th Grade Student',
    text: 'The cheat sheets and formula sheets are absolute gold. Cleared my doubts in minutes that my school couldn\'t clear in months.',
    rating: 5,
  },
  {
    id: 'r5',
    name: 'Lakshmi Narayan',
    role: 'Parent of 12th Grade Student',
    text: 'Transparent tracking of attendance and test performance — I always know exactly where my child stands. Truly professional.',
    rating: 5,
  },
  {
    id: 'r6',
    name: 'Sneha Padmanabhan',
    role: '12th Grade Student',
    text: 'Electrochemistry was my nightmare. After Chemistry@OCTET, it\'s my strongest chapter. The explanations are just unmatched.',
    rating: 5,
  },
  {
    id: 'r7',
    name: 'Rajan Iyer',
    role: 'Parent of 11th Grade Student',
    text: 'The structured approach to teaching organic chemistry is phenomenal. My child\'s confidence has skyrocketed.',
    rating: 5,
  },
  {
    id: 'r8',
    name: 'Divya Chandrasekhar',
    role: '12th Grade Student',
    text: 'I joined just 4 months before boards and still managed to score 91. The team at Chemistry@OCTET is incredible.',
    rating: 5,
  },
]

export const landingCourses = [
  {
    id: 'lc1',
    title: 'Physical Chemistry',
    grade: '11th & 12th',
    description: 'Master thermodynamics, kinetics, equilibrium, electrochemistry, and atomic structure with deep conceptual clarity.',
    icon: 'atom',
    color: '#e9deb5',
    chapters: 14,
  },
  {
    id: 'lc2',
    title: 'Organic Chemistry',
    grade: '11th & 12th',
    description: 'From basic principles to advanced reactions — IUPAC nomenclature, mechanisms, and named reactions made simple.',
    icon: 'compound',
    color: '#daeae4',
    chapters: 12,
  },
  {
    id: 'lc3',
    title: 'Inorganic Chemistry',
    grade: '11th & 12th',
    description: 'Periodic table, chemical bonding, p-block, d-block, f-block elements — systematically and memorably taught.',
    icon: 'flask',
    color: '#d4c5e2',
    chapters: 10,
  },
  {
    id: 'lc4',
    title: 'JEE Chemistry',
    grade: '11th & 12th',
    description: 'Targeted preparation for JEE Mains & Advanced with high-yield problem sets and shortcut techniques.',
    icon: 'testtube',
    color: '#c8e0da',
    chapters: 18,
  },
  {
    id: 'lc5',
    title: 'NEET Chemistry',
    grade: '11th & 12th',
    description: 'Board-aligned and NEET-optimized curriculum covering all high-weightage topics with PYQ analysis.',
    icon: 'microscope',
    color: '#e0d5b8',
    chapters: 16,
  },
  {
    id: 'lc6',
    title: 'Board Excellence',
    grade: '11th & 12th',
    description: 'Complete CBSE/State board preparation with chapter-wise notes, important questions, and exam strategies.',
    icon: 'beaker',
    color: '#d8e8f0',
    chapters: 13,
  },
]

// ─── Student portal: grouped by the three required subdivisions ──────────────
// Physical / Organic / Inorganic only. Derived from `courses` above so content
// stays in sync. Extra grade-12 courses are folded into their parent subject.

type CourseChapter = (typeof courses)[number]['chapters'][number]

export type VideoTopic = { id: string; title: string; duration: string; watched: boolean }
export type VideoChapter = { id: string; title: string; topics: VideoTopic[] }
export type VideoSubject = {
  id: 'physical' | 'organic' | 'inorganic'
  title: string
  chapters: VideoChapter[]
}

const toVideoChapter = (ch: CourseChapter): VideoChapter => ({
  id: ch.id,
  title: ch.title,
  topics: ch.subtopics.map((t) => ({
    id: t.id,
    title: t.title,
    duration: t.duration,
    watched: t.watched,
  })),
})

// Subjects shown to the student, scoped to THEIR grade. An 11th-grader only
// sees grade-11 chapters (grade-12 courses are excluded).
const SUBJECT_META = [
  { id: 'physical', title: 'Physical Chemistry' },
  { id: 'organic', title: 'Organic Chemistry' },
  { id: 'inorganic', title: 'Inorganic Chemistry' },
] as const

const gradeCourses = courses.filter((c) => c.grade === student.grade)

export const videoSubjects: VideoSubject[] = SUBJECT_META.map((s) => ({
  id: s.id,
  title: s.title,
  chapters: gradeCourses
    .filter((c) => c.subject === s.id)
    .flatMap((c) => c.chapters)
    .map(toVideoChapter),
})).filter((s) => s.chapters.length > 0)

export type NoteClass = { id: string; label: string; title: string; pages: number; size: string }
export type NoteChapter = { id: string; title: string; classes: NoteClass[] }
export type NoteSubject = {
  id: 'physical' | 'organic' | 'inorganic'
  title: string
  chapters: NoteChapter[]
}

const pdfSizes = ['1.2 MB', '0.9 MB', '2.4 MB', '1.8 MB']

const toNoteChapter = (ch: CourseChapter): NoteChapter => ({
  id: ch.id,
  title: ch.title,
  classes: ch.subtopics.slice(0, 4).map((t, i) => ({
    id: `${ch.id}-pdf-${i + 1}`,
    label: `Class ${i + 1}`,
    title: t.title,
    pages: 6 + ((i * 5 + ch.subtopics.length) % 12),
    size: pdfSizes[i % pdfSizes.length],
  })),
})

export const noteSubjects: NoteSubject[] = SUBJECT_META.map((s) => ({
  id: s.id,
  title: s.title,
  chapters: gradeCourses
    .filter((c) => c.subject === s.id)
    .flatMap((c) => c.chapters)
    .map(toNoteChapter),
})).filter((s) => s.chapters.length > 0)
