import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  registerUser,
  loginUser,
  authenticateToken,
  deleteSession,
  validatePasswordCriteria,
} from './server/auth.ts';
import {
  getUserGrades,
  saveUserGrades,
  resetUserGrades,
  resetSemesterGrades,
  resetSingleCourseGrade,
  getStudyPlan,
} from './server/grades.ts';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const app = express();

  app.use(express.json());

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
    res.json({ status: 'ok', time: new Date().toISOString() });
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
      const grades = await getUserGrades(req.user.id);
      res.json({ grades });
    } catch (err: any) {
      res.status(500).json({ error: 'تعذر استرجاع الدرجات من السجل' });
    }
  });

  // Save/Update user's grades
  app.post('/api/grades', requireAuth, async (req: any, res) => {
    try {
      const { grades } = req.body;
      if (!Array.isArray(grades)) {
        return res.status(400).json({ error: 'تنسيق البيانات غير صحيح' });
      }
      const updatedGrades = await saveUserGrades(req.user.id, grades);
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
      await resetUserGrades(req.user.id);
      res.json({ success: true, message: 'تم تصفير جميع درجات الخطة بنجاح' });
    } catch (err: any) {
      res.status(500).json({ error: 'فشل في تصفير جميع المواد' });
    }
  });

  // Reset semester grades
  app.post('/api/grades/reset-semester', requireAuth, async (req: any, res) => {
    try {
      const { semesterNumber } = req.body;
      if (typeof semesterNumber !== 'number') {
        return res.status(400).json({ error: 'رقم الفصل مطلوب' });
      }
      const grades = await resetSemesterGrades(req.user.id, semesterNumber);
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
      const { courseId } = req.body;
      if (!courseId) {
        return res.status(400).json({ error: 'معرّف المادة مطلوب' });
      }
      const grades = await resetSingleCourseGrade(req.user.id, courseId);
      res.json({
        success: true,
        message: 'تم تصفير المادة بنجاح',
        grades,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'فشل في تصفير المادة' });
    }
  });

  // --- Vite & Static Handling ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
