import { User } from '../types.ts';
import { LogOut, FileJson, GraduationCap, CheckCircle2, RefreshCw } from 'lucide-react';

interface Props {
  user: User;
  onLogout: () => void;
  onOpenJsonModal: () => void;
  isSaving?: boolean;
}

export default function Navbar({ user, onLogout, onOpenJsonModal, isSaving }: Props) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Green TVTC Ribbon */}
      <div className="bg-[#006B3F] text-white text-[11px] py-1 px-4 sm:px-8 flex items-center justify-between border-b border-[#C5A059]">
        <span className="font-semibold">
          المملكة العربية السعودية • المؤسسة العامة للتدريب التقني والمهني
        </span>
        <span className="text-[#E6C673] hidden sm:inline font-bold">
          بوابة المتدرب الإلكترونية - حساب المعدل
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Specialty */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006B3F] text-white flex items-center justify-center shadow-md shadow-emerald-900/20 border border-[#C5A059]">
              <GraduationCap className="w-5 h-5 text-[#E6C673]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                  الكلية التقنية
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#006B3F] border border-emerald-200">
                  بوابة المتدرب
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                دبلوم تقنية شبكات الحاسب • الخطة التدريبية المعتمدة
              </p>
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Auto-save Status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                  <span className="font-semibold text-emerald-800">جارِ الحفظ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden md:inline font-medium">السجل الأكاديمي:</span>
                  <span className="text-[11px] font-bold text-emerald-800">محفوظ</span>
                </>
              )}
            </div>

            {/* Study Plan JSON Button */}
            <button
              id="view-json-plan-btn"
              type="button"
              onClick={onOpenJsonModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
              title="عرض وتنزيل الخطة التدريبية بصيغة JSON"
            >
              <FileJson className="w-4 h-4 text-amber-700" />
              <span className="hidden sm:inline">ملف الخطة JSON</span>
            </button>

            {/* Student Name */}
            <div className="text-left hidden lg:block border-r border-slate-200 pr-3 mr-1">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1 justify-end">
                <span>{user.fullName}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {user.studentId ? `الرقم الأكاديمي: ${user.studentId}` : `@${user.username}`}
              </div>
            </div>

            {/* Logout */}
            <button
              id="user-logout-btn"
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
              title="تسجيل الخروج من البوابة"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
