import fs from 'fs';
import path from 'path';

export interface UserRecord {
  id: number;
  username: string;
  fullName: string;
  studentId?: string;
  password_hash: string;
  created_at: string;
}

export interface SessionRecord {
  token: string;
  user_id: number;
  created_at: string;
}

export interface UserGradeRecord {
  id: number;
  user_id: number;
  course_id: string;
  semester_number: number;
  grade_letter: string | null;
  numerical_score: number | null;
  grade_points: number | null;
  status: string;
  updated_at: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  sessions: SessionRecord[];
  grades: UserGradeRecord[];
  nextUserId: number;
  nextGradeId: number;
}

const DATA_DIR = path.join(process.cwd(), 'server_data');
const DB_FILE = path.join(DATA_DIR, 'portal_data.json');

let inMemoryData: DatabaseSchema | null = null;

function loadDatabase(): DatabaseSchema {
  if (inMemoryData) {
    return inMemoryData;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      inMemoryData = JSON.parse(raw);
      const hasDemo = inMemoryData.users.some(u => u.username.toLowerCase() === 'student_tvtc');
      if (!hasDemo) {
        inMemoryData.users.push({
          id: inMemoryData.nextUserId++,
          username: 'student_tvtc',
          fullName: 'فيصل بن عبدالله القحطاني',
          studentId: '44410298',
          password_hash: '$2b$10$vjKh6S1xvYfmuKtI/5BFku6ctAxqmqOa7z6iK3A03nO3GPOtx79XC',
          created_at: new Date().toISOString(),
        });
        saveDatabase();
      }
      return inMemoryData;
    } catch (err) {
      console.error('Error reading portal database, reinitializing fresh storage:', err);
    }
  }

  inMemoryData = {
    users: [
      {
        id: 1,
        username: 'student_tvtc',
        fullName: 'فيصل بن عبدالله القحطاني',
        studentId: '44410298',
        password_hash: '$2b$10$vjKh6S1xvYfmuKtI/5BFku6ctAxqmqOa7z6iK3A03nO3GPOtx79XC',
        created_at: new Date().toISOString(),
      },
    ],
    sessions: [],
    grades: [],
    nextUserId: 2,
    nextGradeId: 1,
  };

  saveDatabase();
  return inMemoryData;
}

export function saveDatabase() {
  if (!inMemoryData) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryData, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save portal database:', err);
  }
}

// User operations
export async function findUserByUsername(username: string): Promise<UserRecord | undefined> {
  const db = loadDatabase();
  const clean = username.trim().toLowerCase();
  return db.users.find((u) => u.username.toLowerCase() === clean);
}

export async function findUserById(id: number): Promise<UserRecord | undefined> {
  const db = loadDatabase();
  return db.users.find((u) => u.id === id);
}

export async function createUser(
  username: string,
  fullName: string,
  studentId: string | undefined,
  password_hash: string
): Promise<UserRecord> {
  const db = loadDatabase();
  const newUser: UserRecord = {
    id: db.nextUserId++,
    username: username.trim().toLowerCase(),
    fullName: fullName.trim(),
    studentId: studentId?.trim() || undefined,
    password_hash,
    created_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDatabase();
  return newUser;
}

// Session operations
export async function createSession(token: string, userId: number): Promise<void> {
  const db = loadDatabase();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  db.sessions.push({
    token,
    user_id: userId,
    created_at: new Date().toISOString(),
  });
  saveDatabase();
}

export async function findSession(token: string): Promise<SessionRecord | undefined> {
  const db = loadDatabase();
  return db.sessions.find((s) => s.token === token);
}

export async function removeSession(token: string): Promise<void> {
  const db = loadDatabase();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  saveDatabase();
}

// Grades operations
export async function fetchUserGrades(userId: number): Promise<UserGradeRecord[]> {
  const db = loadDatabase();
  return db.grades.filter((g) => g.user_id === userId);
}

export async function upsertUserGrades(
  userId: number,
  gradesList: Array<{
    courseId: string;
    semesterNumber: number;
    gradeLetter?: string | null;
    numericalScore?: number | null;
    gradePoints?: number | null;
    status?: string;
  }>
): Promise<UserGradeRecord[]> {
  const db = loadDatabase();

  // Remove existing grades for this user and rebuild from current valid list
  const otherUsersGrades = db.grades.filter((g) => g.user_id !== userId);
  const newRecords: UserGradeRecord[] = [];

  for (const item of gradesList) {
    // Only persist courses that have active grade data or in-progress status
    const hasData =
      (item.gradeLetter && item.gradeLetter.trim().length > 0) ||
      item.numericalScore !== null && item.numericalScore !== undefined ||
      item.status === 'in-progress';

    if (hasData) {
      newRecords.push({
        id: db.nextGradeId++,
        user_id: userId,
        course_id: item.courseId,
        semester_number: item.semesterNumber,
        grade_letter: item.gradeLetter !== undefined ? item.gradeLetter : null,
        numerical_score: item.numericalScore !== undefined ? item.numericalScore : null,
        grade_points: item.gradePoints !== undefined ? item.gradePoints : null,
        status: item.status || 'completed',
        updated_at: new Date().toISOString(),
      });
    }
  }

  db.grades = [...otherUsersGrades, ...newRecords];
  saveDatabase();
  return fetchUserGrades(userId);
}

export async function clearUserGrades(userId: number): Promise<void> {
  const db = loadDatabase();
  db.grades = db.grades.filter((g) => g.user_id !== userId);
  saveDatabase();
}

export async function clearUserSemesterGrades(
  userId: number,
  semesterNumber: number,
  courseIds?: string[]
): Promise<void> {
  const db = loadDatabase();
  const idSet = courseIds ? new Set(courseIds) : new Set<string>();
  db.grades = db.grades.filter((g) => {
    if (g.user_id !== userId) return true;
    if (g.semester_number === semesterNumber) return false;
    if (idSet.has(g.course_id)) return false;
    return true;
  });
  saveDatabase();
}

export async function clearUserSingleCourseGrade(userId: number, courseId: string): Promise<void> {
  const db = loadDatabase();
  db.grades = db.grades.filter(
    (g) => !(g.user_id === userId && g.course_id === courseId)
  );
  saveDatabase();
}
