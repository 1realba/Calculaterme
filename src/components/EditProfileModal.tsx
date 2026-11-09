import { useState, FormEvent } from 'react';
import { User } from '../types.ts';
import { UserCheck, Hash, User as UserIcon, X, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onSave: (updated: { fullName: string; studentId?: string }) => void;
}

export default function EditProfileModal({
  isOpen,
  currentUser,
  onClose,
  onSave,
}: Props) {
  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [studentId, setStudentId] = useState(currentUser.studentId || '');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('يرجى إدخال اسم المتدرب');
      return;
    }
    setErrorMsg('');
    onSave({
      fullName: fullName.trim(),
      studentId: studentId.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-right relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#006B3F] border border-emerald-200 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              تعديل بيانات المتدرب
            </h3>
            <p className="text-xs text-slate-500">
              يمكنك تحديث اسمك والرقم التدريبي في أي وقت ليظهر في السجل وكشف الدرجات
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم المتدرب <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: فيصل بن عبدالله القحطاني"
                className="w-full pr-10 pl-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الرقم التدريبي / الأكاديمي <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="مثال: 44410298"
                className="w-full pr-10 pl-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-[#006B3F] hover:bg-[#005a34] text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>حفظ البيانات وتحديث السجل</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
