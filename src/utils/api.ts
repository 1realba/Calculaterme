import { User, CourseGradeState } from '../types.ts';
import { evaluatePassword } from '../components/PasswordChecklist.tsx';

interface LocalUserRecord extends User {
  passwordHash?: string;
  passwordPlain?: string;
}

const LOCAL_USERS_KEY = 'tvtc_registered_users';
const CURRENT_USER_KEY = 'tvtc_current_user';
const TOKEN_KEY = 'auth_token';

// Seed default demo user if not present
function initializeLocalUsers(): LocalUserRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading local users:', e);
  }

  const defaultUser: LocalUserRecord = {
    id: 1,
    username: 'student_tvtc',
    fullName: 'فيصل بن عبدالله القحطاني',
    studentId: '44410298',
    passwordPlain: 'Tvtc#2024Pass!',
    createdAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify([defaultUser]));
  } catch (e) {
    console.error(e);
  }
  return [defaultUser];
}

function getLocalUsers(): LocalUserRecord[] {
  return initializeLocalUsers();
}

function saveLocalUsers(users: LocalUserRecord[]) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving local users:', e);
  }
}

function getLocalGrades(userId: number): CourseGradeState[] {
  try {
    const raw = localStorage.getItem(`tvtc_grades_${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

function saveLocalGrades(userId: number, grades: CourseGradeState[]) {
  try {
    localStorage.setItem(`tvtc_grades_${userId}`, JSON.stringify(grades));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Safely parse JSON response from server.
 * Returns null if the response is HTML (which happens on static hosts like Vercel, Netlify, GitHub Pages, cPanel).
 */
async function parseJsonResponse(res: Response): Promise<any | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiRegister(params: {
  username: string;
  fullName: string;
  studentId?: string;
  password: string;
}): Promise<{ user: User; token: string }> {
  const cleanUsername = params.username.trim().toLowerCase();

  // Try server first
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanUsername,
        fullName: params.fullName.trim(),
        studentId: params.studentId?.trim() || undefined,
        password: params.password,
      }),
    });

    const data = await parseJsonResponse(res);
    if (data !== null) {
      if (!res.ok) {
        throw new Error(data.error || 'فشل إنشاء الحساب');
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      return { user: data.user, token: data.token };
    }
  } catch (err: any) {
    // If it's a genuine server error with a known message (not HTML syntax error), rethrow
    if (err.message && !err.message.includes('<!DOCTYPE') && !err.message.includes('Unexpected token')) {
      throw err;
    }
  }

  // Fallback to resilient client-side storage (works on static hosting, Vercel, Netlify, cPanel, etc.)
  const evalResult = evaluatePassword(params.password);
  if (!evalResult.isStrong) {
    throw new Error('كلمة المرور لا تستوفي الشروط (8 خانات، كبتل، سمول، أرقام، رموز، بدون مسافات، إنجليزي فقط)');
  }

  const users = getLocalUsers();
  const existing = users.find((u) => u.username.toLowerCase() === cleanUsername);
  if (existing) {
    throw new Error('اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر');
  }

  const newUser: LocalUserRecord = {
    id: Date.now(),
    username: cleanUsername,
    fullName: params.fullName.trim(),
    studentId: params.studentId?.trim() || undefined,
    passwordPlain: params.password,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveLocalUsers(users);

  const token = `local_token_${newUser.id}_${Date.now()}`;
  const publicUser: User = {
    id: newUser.id,
    username: newUser.username,
    fullName: newUser.fullName,
    studentId: newUser.studentId,
    createdAt: newUser.createdAt,
  };

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));
  return { user: publicUser, token };
}

export async function apiLogin(params: {
  username: string;
  password: string;
}): Promise<{ user: User; token: string }> {
  const cleanUsername = params.username.trim().toLowerCase();

  // Try server first
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanUsername,
        password: params.password,
      }),
    });

    const data = await parseJsonResponse(res);
    if (data !== null) {
      if (!res.ok) {
        throw new Error(data.error || 'بيانات الدخول غير صحيحة');
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      return { user: data.user, token: data.token };
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('<!DOCTYPE') && !err.message.includes('Unexpected token')) {
      throw err;
    }
  }

  // Fallback to client-side storage
  const users = getLocalUsers();
  const user = users.find((u) => u.username.toLowerCase() === cleanUsername);

  if (!user || user.passwordPlain !== params.password) {
    throw new Error('بيانات الدخول غير صحيحة، يرجى التأكد من اسم المستخدم وكلمة المرور');
  }

  const token = `local_token_${user.id}_${Date.now()}`;
  const publicUser: User = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    studentId: user.studentId,
    createdAt: user.createdAt,
  };

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));
  return { user: publicUser, token };
}

export async function apiGetMe(): Promise<User | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  // Try server first
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (data && data.user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      return data.user;
    }
  } catch {
    // ignore network errors
  }

  // Fallback to locally stored session
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    return null;
  }
  return null;
}

export async function apiLogout(): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}

export async function apiGetGrades(user: User): Promise<CourseGradeState[]> {
  const token = localStorage.getItem(TOKEN_KEY);

  // Try server
  if (token) {
    try {
      const res = await fetch('/api/grades', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseJsonResponse(res);
      if (data && Array.isArray(data.grades)) {
        saveLocalGrades(user.id, data.grades);
        return data.grades;
      }
    } catch {
      // ignore
    }
  }

  // Fallback
  return getLocalGrades(user.id);
}

export async function apiSaveGrades(user: User, gradesList: CourseGradeState[]): Promise<void> {
  saveLocalGrades(user.id, gradesList);

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      await fetch('/api/grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ grades: gradesList }),
      });
    } catch {
      // ignore server failure in static mode
    }
  }
}

export async function apiResetAllGrades(user: User): Promise<void> {
  saveLocalGrades(user.id, []);

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      await fetch('/api/grades/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  }
}

export async function apiResetSemesterGrades(
  user: User,
  semesterNumber: number,
  courseIds: string[]
): Promise<void> {
  const current = getLocalGrades(user.id);
  const idSet = new Set(courseIds);
  const filtered = current.filter(
    (g) => !(g.semesterNumber === semesterNumber || idSet.has(g.courseId))
  );
  saveLocalGrades(user.id, filtered);

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      await fetch('/api/grades/reset-semester', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ semesterNumber }),
      });
    } catch {
      // ignore
    }
  }
}

export async function apiResetCourseGrade(user: User, courseId: string): Promise<void> {
  const current = getLocalGrades(user.id);
  const filtered = current.filter((g) => g.courseId !== courseId);
  saveLocalGrades(user.id, filtered);

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      await fetch('/api/grades/reset-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId }),
      });
    } catch {
      // ignore
    }
  }
}
