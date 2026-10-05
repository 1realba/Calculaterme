import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  findUserByUsername,
  findUserById,
  createUser,
  createSession,
  findSession,
  removeSession,
} from './db.ts';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  criteria: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
    hasNoSpaces: boolean;
    isEnglishOnly: boolean;
  };
}

export function validatePasswordCriteria(password: string): PasswordValidationResult {
  const p = password || '';
  const minLength = p.length >= 8;
  const hasUppercase = /[A-Z]/.test(p);
  const hasLowercase = /[a-z]/.test(p);
  const hasNumber = /[0-9]/.test(p);
  const hasSymbol = /[^A-Za-z0-9\s]/.test(p);
  const hasNoSpaces = p.length > 0 && !/\s/.test(p);
  // Strictly English ASCII letters, digits and symbols, no spaces and no non-English characters
  const isEnglishOnly = p.length > 0 && /^[\x21-\x7E]+$/.test(p) && !/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(p);

  const errors: string[] = [];
  if (!minLength) errors.push('كلمة المرور يجب ألا تقل عن 8 خانات');
  if (!hasUppercase) errors.push('يجب أن تحتوي على حرف كبير إنجليزي على الأقل (Capital Letter A-Z)');
  if (!hasLowercase) errors.push('يجب أن تحتوي على حرف صغير إنجليزي على الأقل (Small Letter a-z)');
  if (!hasNumber) errors.push('يجب أن تحتوي على رقم واحد على الأقل (0-9)');
  if (!hasSymbol) errors.push('يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*...)');
  if (!hasNoSpaces) errors.push('كلمة المرور لا تقبل مسافات نهائياً');
  if (!isEnglishOnly) errors.push('كلمة المرور يجب أن تكون باللغة الإنجليزية فقط ولا تقبل الأحرف العربية أو لغات أخرى');

  const valid =
    minLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSymbol &&
    hasNoSpaces &&
    isEnglishOnly;

  return {
    valid,
    errors,
    criteria: {
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSymbol,
      hasNoSpaces,
      isEnglishOnly,
    },
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerUser(
  username: string,
  fullName: string,
  studentId: string | undefined,
  password: string
) {
  const validation = validatePasswordCriteria(password);
  if (!validation.valid) {
    throw new Error(validation.errors[0] || 'كلمة المرور لا تستوفي الشروط المطلوبة');
  }

  const cleanUsername = (username || '').trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error('اسم المستخدم يجب ألا يقل عن 3 أحرف');
  }

  const cleanFullName = (fullName || '').trim();
  if (!cleanFullName) {
    throw new Error('يرجى إدخال الاسم الكامل للمتدرب');
  }

  // Check if username already exists
  const existing = await findUserByUsername(cleanUsername);
  if (existing) {
    throw new Error('اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر');
  }

  const hashedPassword = await hashPassword(password);
  const user = await createUser(cleanUsername, cleanFullName, studentId, hashedPassword);

  const token = crypto.randomBytes(32).toString('hex');
  await createSession(token, user.id);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      studentId: user.studentId || '',
      createdAt: user.created_at,
    },
  };
}

export async function loginUser(username: string, password: string) {
  const cleanUsername = (username || '').trim().toLowerCase();
  if (!cleanUsername || !password) {
    throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور');
  }

  const user = await findUserByUsername(cleanUsername);
  if (!user) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const match = await comparePassword(password, user.password_hash);
  if (!match) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const token = crypto.randomBytes(32).toString('hex');
  await createSession(token, user.id);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      studentId: user.studentId || '',
      createdAt: user.created_at,
    },
  };
}

export async function authenticateToken(token: string | undefined) {
  if (!token) return null;
  const session = await findSession(token);
  if (!session) return null;

  const user = await findUserById(session.user_id);
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    studentId: user.studentId || '',
    createdAt: user.created_at,
  };
}

export async function deleteSession(token: string) {
  if (!token) return;
  await removeSession(token);
}
