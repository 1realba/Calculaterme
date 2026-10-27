import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

export interface UserRecord {
  id: number;
  username: string;
  fullName: string;
  studentId?: string;
  major_id?: string;
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
  major_id?: string;
  course_id: string;
  semester_number: number;
  grade_letter: string | null;
  numerical_score: number | null;
  grade_points: number | null;
  status: string;
  updated_at: string;
}

// Check for Postgres connection string (Netlify Database, Neon, Supabase, Cloud SQL, etc.)
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  '';

let pgPool: pg.Pool | null = null;
let pgInitPromise: Promise<void> | null = null;

if (DATABASE_URL) {
  try {
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool:', err);
    pgPool = null;
  }
}

async function ensurePostgresTables() {
  if (!pgPool) return;
  if (pgInitPromise) return pgInitPromise;

  pgInitPromise = (async () => {
    try {
      const client = await pgPool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            student_id VARCHAR(50),
            major_id VARCHAR(50),
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS sessions (
            token VARCHAR(255) PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS grades (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            major_id VARCHAR(50) DEFAULT 'networks',
            course_id VARCHAR(100) NOT NULL,
            semester_number INTEGER NOT NULL,
            grade_letter VARCHAR(10),
            numerical_score NUMERIC(5,2),
            grade_points NUMERIC(5,2),
            status VARCHAR(50) DEFAULT 'completed',
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT unique_user_major_course UNIQUE (user_id, major_id, course_id)
          );
        `);

        // Check if demo user exists
        const demoRes = await client.query(
          'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
          ['student_tvtc']
        );
        if (demoRes.rowCount === 0) {
          await client.query(
            `INSERT INTO users (username, full_name, student_id, password_hash)
             VALUES ($1, $2, $3, $4)`,
            [
              'student_tvtc',
              'فيصل بن عبدالله القحطاني',
              '44410298',
              '$2b$10$vjKh6S1xvYfmuKtI/5BFku6ctAxqmqOa7z6iK3A03nO3GPOtx79XC',
            ]
          );
        }
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Error running PostgreSQL table migrations:', err);
    }
  })();

  return pgInitPromise;
}

// --- In-Memory / Local JSON Fallback (for local dev without DATABASE_URL) ---
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

function loadLocalDatabase(): DatabaseSchema {
  if (inMemoryData) return inMemoryData;

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      // ignore
    }
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
        saveLocalDatabase();
      }
      return inMemoryData;
    } catch {
      // ignore
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

  saveLocalDatabase();
  return inMemoryData;
}

function saveLocalDatabase() {
  if (!inMemoryData) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryData, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

// ==================== User Operations ====================

export async function findUserByUsername(username: string): Promise<UserRecord | undefined> {
  const clean = username.trim().toLowerCase();

  if (pgPool) {
    await ensurePostgresTables();
    const res = await pgPool.query(
      `SELECT id, username, full_name AS "fullName", student_id AS "studentId", major_id, password_hash, created_at
       FROM users WHERE LOWER(username) = $1`,
      [clean]
    );
    if (res.rows.length > 0) {
      const r = res.rows[0];
      return {
        id: r.id,
        username: r.username,
        fullName: r.fullName,
        studentId: r.studentId || undefined,
        major_id: r.major_id || undefined,
        password_hash: r.password_hash,
        created_at: r.created_at,
      };
    }
    return undefined;
  }

  const db = loadLocalDatabase();
  return db.users.find((u) => u.username.toLowerCase() === clean);
}

export async function findUserById(id: number): Promise<UserRecord | undefined> {
  if (pgPool) {
    await ensurePostgresTables();
    const res = await pgPool.query(
      `SELECT id, username, full_name AS "fullName", student_id AS "studentId", major_id, password_hash, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (res.rows.length > 0) {
      const r = res.rows[0];
      return {
        id: r.id,
        username: r.username,
        fullName: r.fullName,
        studentId: r.studentId || undefined,
        major_id: r.major_id || undefined,
        password_hash: r.password_hash,
        created_at: r.created_at,
      };
    }
    return undefined;
  }

  const db = loadLocalDatabase();
  return db.users.find((u) => u.id === id);
}

export async function createUser(
  username: string,
  fullName: string,
  studentId: string | undefined,
  password_hash: string
): Promise<UserRecord> {
  const clean = username.trim().toLowerCase();
  const cleanName = fullName.trim();
  const cleanId = studentId?.trim() || null;

  if (pgPool) {
    await ensurePostgresTables();
    const res = await pgPool.query(
      `INSERT INTO users (username, full_name, student_id, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, full_name AS "fullName", student_id AS "studentId", major_id, password_hash, created_at`,
      [clean, cleanName, cleanId, password_hash]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      username: r.username,
      fullName: r.fullName,
      studentId: r.studentId || undefined,
      major_id: r.major_id || undefined,
      password_hash: r.password_hash,
      created_at: r.created_at,
    };
  }

  const db = loadLocalDatabase();
  const newUser: UserRecord = {
    id: db.nextUserId++,
    username: clean,
    fullName: cleanName,
    studentId: cleanId || undefined,
    password_hash,
    created_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveLocalDatabase();
  return newUser;
}

export async function updateUserMajor(userId: number, majorId: string): Promise<UserRecord | undefined> {
  if (pgPool) {
    await ensurePostgresTables();
    const res = await pgPool.query(
      `UPDATE users SET major_id = $2 WHERE id = $1
       RETURNING id, username, full_name AS "fullName", student_id AS "studentId", major_id, password_hash, created_at`,
      [userId, majorId]
    );
    if (res.rows.length > 0) {
      const r = res.rows[0];
      return {
        id: r.id,
        username: r.username,
        fullName: r.fullName,
        studentId: r.studentId || undefined,
        major_id: r.major_id || undefined,
        password_hash: r.password_hash,
        created_at: r.created_at,
      };
    }
    return undefined;
  }

  const db = loadLocalDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (user) {
    user.major_id = majorId;
    saveLocalDatabase();
  }
  return user;
}

// ==================== Session Operations ====================

export async function createSession(token: string, userId: number): Promise<void> {
  if (pgPool) {
    await ensurePostgresTables();
    await pgPool.query(
      `INSERT INTO sessions (token, user_id)
       VALUES ($1, $2)
       ON CONFLICT (token) DO UPDATE SET user_id = $2, created_at = NOW()`,
      [token, userId]
    );
    return;
  }

  const db = loadLocalDatabase();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  db.sessions.push({
    token,
    user_id: userId,
    created_at: new Date().toISOString(),
  });
  saveLocalDatabase();
}

export async function findSession(token: string): Promise<SessionRecord | undefined> {
  if (pgPool) {
    await ensurePostgresTables();
    const res = await pgPool.query(
      'SELECT token, user_id, created_at FROM sessions WHERE token = $1',
      [token]
    );
    return res.rows[0];
  }

  const db = loadLocalDatabase();
  return db.sessions.find((s) => s.token === token);
}

export async function removeSession(token: string): Promise<void> {
  if (pgPool) {
    await ensurePostgresTables();
    await pgPool.query('DELETE FROM sessions WHERE token = $1', [token]);
    return;
  }

  const db = loadLocalDatabase();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  saveLocalDatabase();
}

// ==================== Grades Operations ====================

export async function fetchUserGrades(userId: number, majorId?: string): Promise<UserGradeRecord[]> {
  if (pgPool) {
    await ensurePostgresTables();
    let query = 'SELECT id, user_id, major_id, course_id, semester_number, grade_letter, numerical_score, grade_points, status, updated_at FROM grades WHERE user_id = $1';
    const params: any[] = [userId];

    if (majorId) {
      query += ' AND (major_id = $2 OR (major_id IS NULL AND $2 = \'networks\'))';
      params.push(majorId);
    }

    const res = await pgPool.query(query, params);
    return res.rows.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      major_id: r.major_id,
      course_id: r.course_id,
      semester_number: r.semester_number,
      grade_letter: r.grade_letter,
      numerical_score: r.numerical_score !== null ? parseFloat(r.numerical_score) : null,
      grade_points: r.grade_points !== null ? parseFloat(r.grade_points) : null,
      status: r.status,
      updated_at: r.updated_at,
    }));
  }

  const db = loadLocalDatabase();
  return db.grades.filter((g) => {
    if (g.user_id !== userId) return false;
    if (majorId) {
      return g.major_id === majorId || (!g.major_id && majorId === 'networks');
    }
    return true;
  });
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
  }>,
  majorId: string = 'networks'
): Promise<UserGradeRecord[]> {
  if (pgPool) {
    await ensurePostgresTables();
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing records for this user and major
      await client.query(
        'DELETE FROM grades WHERE user_id = $1 AND (major_id = $2 OR (major_id IS NULL AND $2 = \'networks\'))',
        [userId, majorId]
      );

      for (const item of gradesList) {
        const hasData =
          (item.gradeLetter && item.gradeLetter.trim().length > 0) ||
          (item.numericalScore !== null && item.numericalScore !== undefined) ||
          item.status === 'in-progress';

        if (hasData) {
          await client.query(
            `INSERT INTO grades (user_id, major_id, course_id, semester_number, grade_letter, numerical_score, grade_points, status, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              userId,
              majorId,
              item.courseId,
              item.semesterNumber,
              item.gradeLetter !== undefined ? item.gradeLetter : null,
              item.numericalScore !== undefined ? item.numericalScore : null,
              item.gradePoints !== undefined ? item.gradePoints : null,
              item.status || 'completed',
            ]
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return fetchUserGrades(userId, majorId);
  }

  const db = loadLocalDatabase();
  const keptGrades = db.grades.filter((g) => {
    if (g.user_id !== userId) return true;
    const gMajor = g.major_id || 'networks';
    return gMajor !== majorId;
  });

  const newRecords: UserGradeRecord[] = [];
  for (const item of gradesList) {
    const hasData =
      (item.gradeLetter && item.gradeLetter.trim().length > 0) ||
      (item.numericalScore !== null && item.numericalScore !== undefined) ||
      item.status === 'in-progress';

    if (hasData) {
      newRecords.push({
        id: db.nextGradeId++,
        user_id: userId,
        major_id: majorId,
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

  db.grades = [...keptGrades, ...newRecords];
  saveLocalDatabase();
  return fetchUserGrades(userId, majorId);
}

export async function clearUserGrades(userId: number, majorId?: string): Promise<void> {
  if (pgPool) {
    await ensurePostgresTables();
    if (majorId) {
      await pgPool.query(
        'DELETE FROM grades WHERE user_id = $1 AND (major_id = $2 OR (major_id IS NULL AND $2 = \'networks\'))',
        [userId, majorId]
      );
    } else {
      await pgPool.query('DELETE FROM grades WHERE user_id = $1', [userId]);
    }
    return;
  }

  const db = loadLocalDatabase();
  db.grades = db.grades.filter((g) => {
    if (g.user_id !== userId) return true;
    if (majorId) {
      const gMajor = g.major_id || 'networks';
      return gMajor !== majorId;
    }
    return false;
  });
  saveLocalDatabase();
}

export async function clearUserSemesterGrades(
  userId: number,
  semesterNumber: number,
  courseIds?: string[],
  majorId?: string
): Promise<void> {
  if (pgPool) {
    await ensurePostgresTables();
    const idList = courseIds && courseIds.length > 0 ? courseIds : null;

    let query = 'DELETE FROM grades WHERE user_id = $1 AND (semester_number = $2';
    const params: any[] = [userId, semesterNumber];

    if (idList) {
      params.push(idList);
      query += ` OR course_id = ANY($${params.length})`;
    }
    query += ')';

    if (majorId) {
      params.push(majorId);
      query += ` AND (major_id = $${params.length} OR (major_id IS NULL AND $${params.length} = 'networks'))`;
    }

    await pgPool.query(query, params);
    return;
  }

  const db = loadLocalDatabase();
  const idSet = courseIds ? new Set(courseIds) : new Set<string>();
  db.grades = db.grades.filter((g) => {
    if (g.user_id !== userId) return true;
    if (majorId) {
      const gMajor = g.major_id || 'networks';
      if (gMajor !== majorId) return true;
    }
    if (g.semester_number === semesterNumber) return false;
    if (idSet.has(g.course_id)) return false;
    return true;
  });
  saveLocalDatabase();
}

export async function clearUserSingleCourseGrade(
  userId: number,
  courseId: string,
  majorId?: string
): Promise<void> {
  if (pgPool) {
    await ensurePostgresTables();
    if (majorId) {
      await pgPool.query(
        `DELETE FROM grades
         WHERE user_id = $1 AND course_id = $2
         AND (major_id = $3 OR (major_id IS NULL AND $3 = 'networks'))`,
        [userId, courseId, majorId]
      );
    } else {
      await pgPool.query(
        'DELETE FROM grades WHERE user_id = $1 AND course_id = $2',
        [userId, courseId]
      );
    }
    return;
  }

  const db = loadLocalDatabase();
  db.grades = db.grades.filter((g) => {
    if (g.user_id !== userId) return true;
    if (majorId) {
      const gMajor = g.major_id || 'networks';
      if (gMajor !== majorId) return true;
    }
    return g.course_id !== courseId;
  });
  saveLocalDatabase();
}
