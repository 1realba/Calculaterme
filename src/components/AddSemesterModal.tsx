import { useState, FormEvent } from 'react';
import { CalendarPlus, X, Check, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  nextSemesterNumber: number;
  onClose: () => void;
  onAddSemester: (semesterNumber: number, nameAr: string, nameEn: string) => void;
}

export default function AddSemesterModal({
  isOpen,
  nextSemesterNumber,
  onClose,
  onAddSemester,
}: Props) {
  const arabicOrdinalWords: Record<number, string> = {
    6: 'السادس',
    7: 'السابع',
    8: 'الثامن',
    9: 'التاسع',
    10: 'العاشر',
  };

  const defaultOrdinal = arabicOrdinalWords[nextSemesterNumber] || `${nextSemesterNumber}`;

  const [semNumber, setSemNumber] = useState(nextSemesterNumber);
  const [nameAr, setNameAr] = useState(`الفصل التدريبي ${defaultOrdinal}`);
  const [nameEn, setNameEn] = useState(`${nextSemesterNumber}th Semester`);

  if (!isOpen) return null;

  const handleApplyPreset = (type: 'summer' | 'next') => {
    if (type === 'summer') {
      setNameAr('الفصل التدريبي الصيفي');
      setNameEn('Summer Semester');
    } else {
      const ord = arabicOrdinalWords[semNumber] || `${semNumber}`;
      setNameAr(`الفصل التدريبي ${ord}`);
      setNameEn(`${semNumber}th Semester`);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) return;
    onAddSemester(semNumber, nameAr.trim(), nameEn.trim() || `${semNumber}th Semester`);
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
            <CalendarPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              إضافة فصل دراسي إضافي
            </h3>
            <p className="text-xs text-slate-500">
              للمتدربين الذين لديهم فصول ممتدة (فصل 6، 7، أو فصل صيفي)
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500 font-medium">خيارات سريعة:</span>
          <button
            type="button"
            onClick={() => handleApplyPreset('next')}
            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#006B3F] rounded-lg text-xs font-bold border border-emerald-200 cursor-pointer transition"
          >
            فصل تدريبي إضافي ({semNumber})
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('summer')}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 cursor-pointer transition flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>فصل صيفي</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم الفصل الدراسي <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="15"
              required
              value={semNumber}
              onChange={(e) => {
                const num = parseInt(e.target.value, 10) || nextSemesterNumber;
                setSemNumber(num);
                const ord = arabicOrdinalWords[num] || `${num}`;
                setNameAr(`الفصل التدريبي ${ord}`);
                setNameEn(`${num}th Semester`);
              }}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مسمى الفصل بالعربي <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: الفصل التدريبي السادس أو الفصل الصيفي"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مسمى الفصل بالإنجليزي (اختياري)
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="مثال: 6th Semester"
              dir="ltr"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-[#006B3F] hover:bg-[#005a34] text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>إضافة الفصل للخطة التدريبية</span>
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
