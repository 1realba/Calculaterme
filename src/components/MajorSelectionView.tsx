import { ALL_MAJORS, MajorInfo } from '../data/all_majors.ts';
import {
  Code2,
  Network,
  Server,
  Wrench,
  Palette,
  GraduationCap,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface Props {
  currentMajorId?: string;
  onSelectMajor: (major: MajorInfo) => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
  studentName?: string;
}

export default function MajorSelectionView({
  currentMajorId,
  onSelectMajor,
  onCancel,
  showCancelButton = false,
  studentName,
}: Props) {
  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'code':
        return <Code2 className="w-6 h-6 text-emerald-400" />;
      case 'network':
        return <Network className="w-6 h-6 text-emerald-300" />;
      case 'server':
        return <Server className="w-6 h-6 text-teal-300" />;
      case 'support':
        return <Wrench className="w-6 h-6 text-amber-300" />;
      case 'media':
        return <Palette className="w-6 h-6 text-violet-300" />;
      default:
        return <BookOpen className="w-6 h-6 text-emerald-300" />;
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex flex-col justify-center">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#006B3F] text-xs font-bold mb-3 shadow-xs">
          <GraduationCap className="w-4 h-4 text-[#C5A059]" />
          <span>الكلية التقنية • قسم الحاسب وتقنية المعلومات</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {studentName ? `أهلاً بك يا ${studentName}` : 'بوابة المتدرب الأكاديمية'}
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          اختر تخصصك التدريبي المعتمد لحساب المعدل التراكمي والفصلي وفق أحدث خطة تدريبية لعام 1446هـ
        </p>

        {showCancelButton && onCancel && (
          <div className="mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-300 px-3.5 py-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة إلى السجل الحالي</span>
            </button>
          </div>
        )}
      </div>

      {/* Majors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ALL_MAJORS.map((major) => {
          const isSelected = currentMajorId === major.id;

          return (
            <div
              key={major.id}
              onClick={() => onSelectMajor(major)}
              className={`rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group shadow-xs hover:shadow-lg ${
                isSelected
                  ? 'bg-gradient-to-br from-[#004e2d] via-[#005a34] to-[#043d26] text-white border-[#C5A059] ring-2 ring-[#C5A059] scale-[1.02]'
                  : 'bg-white hover:border-emerald-700/40 border-slate-200 text-slate-800 hover:-translate-y-0.5'
              }`}
            >
              {/* Top Accent Strip */}
              <div
                className={`absolute top-0 right-0 left-0 h-1.5 ${
                  isSelected ? 'bg-[#C5A059]' : 'bg-[#006B3F] opacity-70 group-hover:opacity-100'
                }`}
              />

              <div>
                {/* Header row: Icon + Code Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${
                      isSelected
                        ? 'bg-white/10 border-white/20'
                        : 'bg-emerald-50 border-emerald-200 text-[#006B3F]'
                    }`}
                  >
                    {getIcon(major.iconType)}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                        isSelected
                          ? 'bg-white/10 text-[#E6C673] border-white/15'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {major.code}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        isSelected ? 'text-emerald-200' : 'text-slate-600'
                      }`}
                    >
                      {major.totalCreditHours} ساعة معتمدة
                    </span>
                  </div>
                </div>

                {/* Major Title */}
                <h3
                  className={`text-base font-extrabold leading-snug ${
                    isSelected ? 'text-white' : 'text-slate-900 group-hover:text-[#006B3F]'
                  }`}
                >
                  {major.nameAr}
                </h3>
                <span
                  className={`text-xs block mt-0.5 font-medium ${
                    isSelected ? 'text-emerald-200/80' : 'text-slate-600'
                  }`}
                >
                  {major.nameEn}
                </span>

                {/* Description */}
                <p
                  className={`mt-3 text-xs leading-relaxed line-clamp-3 ${
                    isSelected ? 'text-emerald-100/90' : 'text-slate-600'
                  }`}
                >
                  {major.description}
                </p>
              </div>

              {/* Bottom Details & Action */}
              <div className="mt-5 pt-3 border-t border-slate-100/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  {isSelected ? (
                    <span className="text-[#E6C673] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      تخصصك الحالي
                    </span>
                  ) : (
                    <span className="text-slate-600">5 فصول تدريبية</span>
                  )}
                </div>

                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-[#C5A059] text-slate-950 hover:bg-[#d8b56d] shadow-sm'
                      : 'bg-[#006B3F] text-white hover:bg-[#005a34] shadow-xs'
                  }`}
                >
                  <span>{isSelected ? 'متابعة الحساب' : 'اختيار التخصص'}</span>
                  <Sparkles className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
