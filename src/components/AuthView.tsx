import { useState, useId, FormEvent } from 'react';
import { LogIn, UserPlus, Lock, User, Hash, Eye, EyeOff, ShieldCheck, Award, GraduationCap, CheckCircle2 } from 'lucide-react';
import PasswordChecklist, { evaluatePassword } from './PasswordChecklist.tsx';
import { User as UserType } from '../types.ts';
import collegeBg from '../assets/images/college_login_bg_1790582952888.jpg';
import { apiLogin, apiRegister } from '../utils/api.ts';

interface Props {
  onSuccess: (user: UserType, token: string) => void;
}

export default function AuthView({ onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const usernameId = useId();
  const fullNameId = useId();
  const studentNumId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const evalResult = evaluatePassword(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'register') {
      if (!fullName.trim()) {
        setErrorMsg('يرجى كتابة الاسم الكامل للمتدرب');
        return;
      }
      if (!username.trim() || username.trim().length < 3) {
        setErrorMsg('اسم المستخدم يجب ألا يقل عن 3 أحرف');
        return;
      }
      if (evalResult.containsSpaces) {
        setErrorMsg('كلمة المرور لا تقبل أي مسافات نهائياً');
        return;
      }
      if (evalResult.containsArabic) {
        setErrorMsg('كلمة المرور يجب أن تكون باللغة الإنجليزية فقط ولا تقبل أحرفاً عربية');
        return;
      }
      if (!evalResult.isStrong) {
        setErrorMsg('كلمة المرور لا تستوفي الشروط السبعة المعتمدة بالكلية (8 خانات، كبتل، سمول، أرقام، رموز، بدون مسافات، إنجليزي فقط)');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('كلمتا المرور غير متطابقتين');
        return;
      }

      setLoading(true);
      try {
        const { user, token } = await apiRegister({
          username: username.trim(),
          fullName: fullName.trim(),
          studentId: studentId.trim(),
          password,
        });

        setSuccessMsg('تم إنشاء الحساب بنجاح! جارِ الدخول إلى السجل الأكاديمي...');
        setTimeout(() => {
          onSuccess(user, token);
        }, 500);
      } catch (err: any) {
        setErrorMsg(err.message || 'حدث خطأ في الاتصال بالبوابة');
      } finally {
        setLoading(false);
      }
    } else {
      // Login
      if (!username.trim() || !password) {
        setErrorMsg('يرجى إدخال اسم المستخدم وكلمة المرور');
        return;
      }

      setLoading(true);
      try {
        const { user, token } = await apiLogin({
          username: username.trim(),
          password,
        });

        onSuccess(user, token);
      } catch (err: any) {
        setErrorMsg(err.message || 'بيانات الدخول غير صحيحة، يرجى التأكد من اسم المستخدم وكلمة المرور');
      } finally {
        setLoading(false);
      }
    }
  };

  const fillDemoAccount = () => {
    setMode('register');
    setUsername('student_tvtc');
    setFullName('فيصل بن عبدالله القحطاني');
    setStudentId('44410298');
    setPassword('Tvtc#2024Pass!');
    setConfirmPassword('Tvtc#2024Pass!');
    setErrorMsg('');
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${collegeBg})` }}
    >
      {/* Institutional subtle overlay for clarity and depth */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-lg bg-white/98 rounded-3xl shadow-2xl shadow-black/40 border border-slate-200/80 overflow-hidden backdrop-blur-md">
        {/* TVTC Institutional Header */}
        <div className="bg-gradient-to-br from-[#004e2d] via-[#006B3F] to-[#044a2e] text-white p-6 relative border-b-4 border-[#C5A059]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              {/* College Emblem Icon */}
              <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-inner">
                <GraduationCap className="w-7 h-7 text-[#E6C673]" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-200 tracking-wider block">
                  المملكة العربية السعودية • المؤسسة العامة للتدريب التقني والمهني
                </span>
                <h1 className="font-extrabold text-xl leading-tight text-white flex items-center gap-2 mt-0.5">
                  الكلية التقنية
                  <span className="text-xs font-bold text-[#E6C673] bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-[#C5A059]/40">
                    بوابة المتدرب
                  </span>
                </h1>
                <p className="text-xs text-emerald-100/90 mt-0.5">
                  بوابة حساب المعدل الأكاديمي • قسم تقنية الحاسب والمعلومات
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="mt-5 flex bg-black/25 p-1 rounded-xl border border-white/10">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-[#005a34] shadow-md shadow-black/10'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              تسجيل الدخول
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white text-[#005a34] shadow-md shadow-black/10'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              إنشاء حساب متدرب جديد
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          {errorMsg && (
            <div id="auth-error-alert" className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 shadow-xs">
              <span className="font-bold shrink-0 text-rose-900">تنبيه:</span>
              <span className="leading-relaxed font-medium">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div id="auth-success-alert" className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span className="leading-relaxed font-medium">{successMsg}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label htmlFor={fullNameId} className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الرباعي للمتدرب <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  <input
                    id={fullNameId}
                    type="text"
                    required
                    placeholder="مثال: أحمد بن محمد بن صالح القحطاني"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pr-10 pl-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={studentNumId} className="block text-xs font-bold text-slate-700 mb-1">
                  الرقم التدريبي / الأكاديمي (اختياري)
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  <input
                    id={studentNumId}
                    type="text"
                    placeholder="مثال: 44410298"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full pr-10 pl-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white transition"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor={usernameId} className="block text-xs font-bold text-slate-700 mb-1">
              اسم المستخدم <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                id={usernameId}
                type="text"
                required
                placeholder="اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pr-10 pl-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white transition"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={passwordId} className="block text-xs font-bold text-slate-700">
                كلمة المرور <span className="text-rose-600">*</span>
              </label>
              {mode === 'register' && (
                <span className="text-[11px] font-bold text-emerald-800">
                  {evalResult.strengthLabel}
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white transition font-mono"
                dir="ltr"
              />
              <button
                type="button"
                id="toggle-password-visibility-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              {/* College Password Requirements Checklist */}
              <PasswordChecklist password={password} criteria={evalResult.criteria} />

              <div>
                <label htmlFor={confirmPasswordId} className="block text-xs font-bold text-slate-700 mb-1">
                  تأكيد كلمة المرور <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  <input
                    id={confirmPasswordId}
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="أعد إدخال كلمة المرور للتأكيد"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pr-10 pl-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white transition font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            id="auth-submit-btn"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#006B3F] hover:bg-[#005a34] active:bg-[#004729] text-white font-bold rounded-xl transition shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            {loading ? (
              <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                تسجيل الدخول إلى البوابة
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                إنشاء حساب متدرب جديد
              </>
            )}
          </button>

          <div className="pt-2 flex flex-col items-center gap-2 text-xs text-slate-600 text-center">
            {mode === 'login' ? (
              <p>
                متدرب جديد وليس لديك حساب بعد؟{' '}
                <button
                  type="button"
                  id="switch-to-register-btn"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className="text-[#006B3F] hover:text-[#004729] hover:underline font-bold"
                >
                  إنشاء حساب متدرب جديد
                </button>
              </p>
            ) : (
              <p>
                لديك حساب مسجل مسبقاً بالبوابة؟{' '}
                <button
                  type="button"
                  id="switch-to-login-btn"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className="text-[#006B3F] hover:text-[#004729] hover:underline font-bold"
                >
                  تسجيل الدخول من هنا
                </button>
              </p>
            )}

            <button
              type="button"
              id="fill-demo-data-btn"
              onClick={fillDemoAccount}
              className="mt-1 text-[11px] text-slate-400 hover:text-[#006B3F] underline"
            >
              تعبئة بيانات حساب تجريبي سريع للاختبار
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="bg-[#f8faf9] px-6 py-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>الخطة التدريبية المعتمدة 1446هـ</span>
          <span className="text-[#006B3F] font-semibold">بوابة المتدرب الأكاديمية</span>
        </div>
      </div>
    </div>
  );
}
