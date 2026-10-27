import { useState, useId, FormEvent } from 'react';
import {
  LogIn,
  UserPlus,
  Lock,
  User,
  Hash,
  Eye,
  EyeOff,
  GraduationCap,
  CheckCircle2,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import PasswordChecklist, { evaluatePassword } from './PasswordChecklist.tsx';
import { User as UserType } from '../types.ts';
import collegeBg from '../assets/images/college_login_bg_1790582952888.jpg';
import { apiLogin, apiRegister } from '../utils/api.ts';

interface Props {
  onSuccess: (user: UserType, token: string) => void;
}

export default function AuthView({ onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register' | 'guest'>('login');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [guestFullName, setGuestFullName] = useState('');
  const [guestStudentId, setGuestStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const usernameId = useId();
  const fullNameId = useId();
  const studentNumId = useId();
  const guestNameId = useId();
  const guestNumId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const evalResult = evaluatePassword(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'guest') {
      if (!guestFullName.trim()) {
        setErrorMsg('يرجى إدخال اسم المتدرب للدخول كضيف');
        return;
      }

      setLoading(true);
      try {
        const guestUser: UserType = {
          id: Date.now(),
          username: `guest_${Date.now().toString().slice(-4)}`,
          fullName: guestFullName.trim(),
          studentId: guestStudentId.trim() || undefined,
          createdAt: new Date().toISOString(),
        };

        const guestToken = `guest_token_${guestUser.id}`;
        localStorage.setItem('auth_token', guestToken);
        localStorage.setItem('tvtc_current_user', JSON.stringify(guestUser));

        setSuccessMsg(`أهلاً بك يا ${guestUser.fullName}! جارِ الدخول إلى البوابة...`);
        setTimeout(() => {
          onSuccess(guestUser, guestToken);
        }, 400);
      } catch (err: any) {
        setErrorMsg('حدث خطأ أثناء الدخول كضيف');
      } finally {
        setLoading(false);
      }
      return;
    }

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

          {/* Mode Switch Tabs (3 options) */}
          <div className="mt-5 grid grid-cols-3 bg-black/25 p-1 rounded-xl border border-white/10 gap-1 text-center">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 px-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#005a34] shadow-md shadow-black/10'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>تسجيل الدخول</span>
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 px-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#005a34] shadow-md shadow-black/10'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>إنشاء حساب</span>
            </button>
            <button
              id="tab-guest-btn"
              type="button"
              onClick={() => {
                setMode('guest');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 px-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'guest'
                  ? 'bg-[#E6C673] text-[#004e2d] shadow-md shadow-black/10'
                  : 'text-amber-200 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>الدخول كضيف</span>
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

          {/* GUEST MODE FORM */}
          {mode === 'guest' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong className="block font-bold mb-0.5">الدخول السريع كضيف (بدون كلمة مرور)</strong>
                  يمكنك الدخول مباشرة وحساب معدلك الفصلي والتراكمي واختيار تخصصك، مع حفظ درجاتك على هذا المتصفح.
                </div>
              </div>

              <div>
                <label htmlFor={guestNameId} className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المتدرب <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  <input
                    id={guestNameId}
                    type="text"
                    required
                    placeholder="مثال: محمد بن سعد القحطاني"
                    value={guestFullName}
                    onChange={(e) => setGuestFullName(e.target.value)}
                    className="w-full pr-10 pl-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white transition"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label htmlFor={guestNumId} className="block text-xs font-bold text-slate-700 mb-1">
                  الرقم التدريبي / الأكاديمي <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  <input
                    id={guestNumId}
                    type="text"
                    placeholder="مثال: 44410298 (يمكن تركه فارغاً)"
                    value={guestStudentId}
                    onChange={(e) => setGuestStudentId(e.target.value)}
                    className="w-full pr-10 pl-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="guest-submit-btn"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#006B3F] to-[#044a2e] hover:from-[#005a34] hover:to-[#033c25] active:bg-[#004729] text-white font-bold rounded-xl transition shadow-lg shadow-emerald-950/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm cursor-pointer border border-[#C5A059]"
              >
                {loading ? (
                  <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-[#E6C673]" />
                    <span>الدخول كضيف ومتابعة الخطة الدراسية</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* REGISTER MODE FORM */}
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
                  الرقم التدريبي / الأكاديمي <span className="text-slate-400 font-normal">(اختياري)</span>
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
                  <span className="text-[11px] font-bold text-emerald-800">
                    {evalResult.strengthLabel}
                  </span>
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

              <button
                type="submit"
                id="auth-register-submit-btn"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#006B3F] hover:bg-[#005a34] active:bg-[#004729] text-white font-bold rounded-xl transition shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>إنشاء حساب متدرب جديد</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* LOGIN MODE FORM */}
          {mode === 'login' && (
            <>
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

              <button
                type="submit"
                id="auth-login-submit-btn"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#006B3F] hover:bg-[#005a34] active:bg-[#004729] text-white font-bold rounded-xl transition shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول إلى البوابة</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Quick Footer Links / Alternative Mode Toggles */}
          <div className="pt-2 flex flex-col items-center gap-2.5 text-xs text-slate-600 text-center border-t border-slate-100">
            {mode !== 'guest' && (
              <button
                type="button"
                id="quick-guest-entry-btn"
                onClick={() => {
                  setMode('guest');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-amber-700" />
                <span>أو الدخول السريع كضيف (بدون كلمة مرور)</span>
              </button>
            )}

            {mode === 'login' ? (
              <p>
                متدرب جديد وليس لديك حساب بعد؟{' '}
                <button
                  type="button"
                  id="switch-to-register-btn"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-[#006B3F] hover:text-[#004729] hover:underline font-bold cursor-pointer"
                >
                  إنشاء حساب متدرب جديد
                </button>
              </p>
            ) : mode === 'register' ? (
              <p>
                لديك حساب مسجل مسبقاً بالبوابة؟{' '}
                <button
                  type="button"
                  id="switch-to-login-btn"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-[#006B3F] hover:text-[#004729] hover:underline font-bold cursor-pointer"
                >
                  تسجيل الدخول من هنا
                </button>
              </p>
            ) : (
              <p>
                ترغب بتسجيل الدخول بحسابك المحفوظ؟{' '}
                <button
                  type="button"
                  id="guest-switch-login-btn"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-[#006B3F] hover:text-[#004729] hover:underline font-bold cursor-pointer"
                >
                  العودة لتسجيل الدخول
                </button>
              </p>
            )}
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
