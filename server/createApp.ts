import express from 'express';
import {
  registerUser,
  loginUser,
  authenticateToken,
  deleteSession,
  validatePasswordCriteria,
} from './auth.ts';
import {
  getUserGrades,
  saveUserGrades,
  resetUserGrades,
  resetSemesterGrades,
  resetSingleCourseGrade,
  getStudyPlan,
} from './grades.ts';

export function createApp() {
  const app = express();

  app.use(express.json());

  // Support Netlify Functions path prefix stripping if invoked directly
  app.use((req, _res, next) => {
    if (req.url.startsWith('/.netlify/functions/api')) {
      req.url = req.url.replace('/.netlify/functions/api', '/api');
    }
    next();
  });

  // Auth helper middleware
  async function requireAuth(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : (req.query.token as string);

    if (!token) {
      return res.status(401).json({ error: 'غير مصرح، يرجى تسجيل الدخول أولاً' });
    }

    try {
      const user = await authenticateToken(token);
      if (!user) {
        return res.status(401).json({ error: 'جلسة الدخول منتهية، يرجى تسجيل الدخول مرة أخرى' });
      }
      req.user = user;
      req.token = token;
      next();
    } catch (err: any) {
      return res.status(500).json({ error: 'حدث خطأ أثناء التحقق من الجلسة' });
    }
  }

  // --- API Routes ---

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasDbUrl: Boolean(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL),
      time: new Date().toISOString(),
    });
  });

  // Study plan JSON endpoint
  app.get('/api/study-plan', (_req, res) => {
    try {
      const plan = getStudyPlan();
      res.json(plan);
    } catch (err: any) {
      res.status(500).json({ error: 'تعذر تحميل الخطة التدريبية' });
    }
  });

  // Real-time password criteria validation endpoint
  app.post('/api/auth/validate-password', (req, res) => {
    const { password } = req.body;
    const result = validatePasswordCriteria(password || '');
    res.json(result);
  });

  // User Registration
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, fullName, studentId, password } = req.body;
      const result = await registerUser(username, fullName, studentId, password);
      res.json({
        success: true,
        message: 'تم إنشاء الحساب بنجاح',
        token: result.token,
        user: result.user,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'حدث خطأ أثناء إنشاء الحساب' });
    }
  });

  // User Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const result = await loginUser(username, password);
      res.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        token: result.token,
        user: result.user,
      });
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'بيانات الدخول غير صحيحة' });
    }
  });

  // Get current user session profile
  app.get('/api/auth/me', requireAuth, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Logout
  app.post('/api/auth/logout', async (req: any, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (token) {
      await deleteSession(token);
    }
    res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  });

  // Get user's saved grades
  app.get('/api/grades', requireAuth, async (req: any, res) => {
    try {
      const majorId = (req.query.majorId as string) || 'networks';
      const grades = await getUserGrades(req.user.id, majorId);
      res.json({ grades });
    } catch (err: any) {
      res.status(500).json({ error: 'تعذر استرجاع الدرجات من السجل' });
    }
  });

  // Save/Update user's grades
  app.post('/api/grades', requireAuth, async (req: any, res) => {
    try {
      const { grades, majorId } = req.body;
      if (!Array.isArray(grades)) {
        return res.status(400).json({ error: 'تنسيق البيانات غير صحيح' });
      }
      const updatedGrades = await saveUserGrades(req.user.id, grades, majorId || 'networks');
      res.json({
        success: true,
        message: 'تم حفظ الدرجات وتحديث السجل بنجاح',
        grades: updatedGrades,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'حدث خطأ أثناء حفظ الدرجات' });
    }
  });

  // Reset ALL user's grades
  app.post('/api/grades/reset', requireAuth, async (req: any, res) => {
    try {
      const { majorId } = req.body;
      await resetUserGrades(req.user.id, majorId || 'networks');
      res.json({ success: true, message: 'تم تصفير جميع درجات الخطة بنجاح' });
    } catch (err: any) {
      res.status(500).json({ error: 'فشل في تصفير جميع المواد' });
    }
  });

  // Reset semester grades
  app.post('/api/grades/reset-semester', requireAuth, async (req: any, res) => {
    try {
      const { semesterNumber, majorId } = req.body;
      if (typeof semesterNumber !== 'number') {
        return res.status(400).json({ error: 'رقم الفصل مطلوب' });
      }
      const grades = await resetSemesterGrades(req.user.id, semesterNumber, majorId || 'networks');
      res.json({
        success: true,
        message: `تم تصفير مواد الفصل ${semesterNumber} بنجاح`,
        grades,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'فشل في تصفير مواد الفصل' });
    }
  });

  // Reset single course grade
  app.post('/api/grades/reset-course', requireAuth, async (req: any, res) => {
    try {
      const { courseId, majorId } = req.body;
      if (!courseId) {
        return res.status(400).json({ error: 'معرّف المادة مطلوب' });
      }
      const grades = await resetSingleCourseGrade(req.user.id, courseId, majorId || 'networks');
      res.json({
        success: true,
        message: 'تم تصفير المادة بنجاح',
        grades,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'فشل في تصفير المادة' });
    }
  });

  return app;
}
