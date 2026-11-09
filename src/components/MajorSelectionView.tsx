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
  PlusCircle,
  Trash2,
  BookmarkPlus,
  FileUp,
} from 'lucide-react';

interface Props {
  currentMajorId?: string;
  customMajors?: MajorInfo[];
  onSelectMajor: (major: MajorInfo) => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
  studentName?: string;
  onOpenCreateMajorModal?: () => void;
  onOpenImportFileModal?: () => void;
  onDeleteCustomMajor?: (id: string) => void;
}

export default function MajorSelectionView({
  currentMajorId,
  customMajors = [],
  onSelectMajor,
  onCancel,
  showCancelButton = false,
  studentName,
  onOpenCreateMajorModal,
  onOpenImportFileModal,
  onDeleteCustomMajor,
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
      case 'custom':
        return <BookmarkPlus className="w-6 h-6 text-[#E6C673]" />;
      default:
        return <BookOpen className="w-6 h-6 text-emerald-300" />;
    }
  };

  const allDisplayedMajors = [...customMajors, ...ALL_MAJORS];

  return (
    <div className="min-h-[80vh] py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex flex-col justify-center">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#006B3F] text-xs font-bold mb-3 shadow-xs">
          <GraduationCap className="w-4 h-4 text-[#C5A059]" />
          <span>المؤسسة العامة للتدريب التقني والمهني • الكلية التقنية</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {studentName ? `أهلاً بك يا ${studentName}` : 'بوابة المتدرب الأكاديمية'}
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          اختر تخصصك التدريبي لحساب المعدل التراكمي والفصلي وفق الخطط المعتمدة لعام 1446هـ أو استورد خطتك تلقائياً من ملف
        </p>

        <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
          {onOpenImportFileModal && (
            <button
              type="button"
              id="open-import-plan-file-btn"
              onClick={onOpenImportFileModal}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-[#006B3F] hover:bg-[#005a34] px-4 py-2 rounded-xl shadow-md shadow-emerald-900/20 transition cursor-pointer border border-[#C5A059]"
            >
              <FileUp className="w-4 h-4 text-[#E6C673]" />
              <span>استيراد الخطة من ملف (PDF / Excel)</span>
            </button>
          )}

          {onOpenCreateMajorModal && (
            <button
              type="button"
              id="open-create-custom-major-btn"
              onClick={onOpenCreateMajorModal}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#006B3F] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#006B3F]" />
              <span>إدخال التخصص يدوياً</span>
            </button>
          )}

          {showCancelButton && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3.5 py-2 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة إلى السجل الحالي</span>
            </button>
          )}
        </div>
      </div>

      {/* Majors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Quick File Import Card */}
        {onOpenImportFileModal && (
          <div
            onClick={onOpenImportFileModal}
            className="rounded-2xl p-6 border-2 border-dashed border-[#006B3F] hover:bg-emerald-50/70 bg-emerald-50/40 transition-all cursor-pointer flex flex-col justify-center items-center text-center group min-h-[260px] shadow-xs hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#006B3F] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform border border-[#C5A059] mb-4">
              <FileUp className="w-7 h-7 text-[#E6C673]" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#006B3F] text-white mb-2">
              استيراد تلقائي فوري
            </span>
            <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#006B3F] transition-colors">
              استيراد خطتك من ملف (PDF أو Excel)
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">
              ارفع ملف الخطة أو الصق جدول المواد، وسيقوم النظام باستخراج المقررات وتوزيعها تلقائياً وبشكل مجاني 100%.
            </p>
            <span className="mt-4 px-3 py-1 rounded-xl text-xs font-bold bg-[#006B3F] text-white flex items-center gap-1.5 shadow-xs">
              <FileUp className="w-3.5 h-3.5 text-[#E6C673]" />
              <span>رفع ملف الخطة الآن</span>
            </span>
          </div>
        )}

        {/* "+ إضافة تخصص مخصص يدوياً" Card */}
        {onOpenCreateMajorModal && (
          <div
            onClick={onOpenCreateMajorModal}
            className="rounded-2xl p-6 border-2 border-dashed border-slate-300 hover:border-[#006B3F] bg-white hover:bg-slate-50 transition-all cursor-pointer flex flex-col justify-center items-center text-center group min-h-[260px] shadow-2xs hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform border border-slate-200 mb-4">
              <PlusCircle className="w-7 h-7 text-[#006B3F]" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#006B3F] transition-colors">
              كتابة تخصصك يدوياً
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">
              إدخال اسم التخصص وتفاصيل المقررات يدوياً (ساعات الاتصال، الساعات المعتمدة، الفصول) أو عبر قوالب جاهزة.
            </p>
            <span className="mt-4 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 group-hover:bg-[#006B3F] group-hover:text-white text-slate-700 flex items-center gap-1.5 transition">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>إدخال يدوي</span>
            </span>
          </div>
        )}

        {/* List of default and custom majors */}
        {allDisplayedMajors.map((major) => {
          const isSelected = currentMajorId === major.id;
          const isCustom = major.isCustom || major.id.startsWith('custom-');

          return (
            <div
              key={major.id}
              onClick={() => onSelectMajor(major)}
              className={`rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group shadow-xs hover:shadow-lg ${
                isSelected
                  ? 'bg-gradient-to-br from-[#004e2d] via-[#005a34] to-[#043d26] text-white border-[#C5A059] ring-2 ring-[#C5A059] scale-[1.01]'
                  : 'bg-white hover:border-emerald-700/40 border-slate-200 text-slate-800 hover:-translate-y-0.5'
              }`}
            >
              {/* Top Accent Strip */}
              <div
                className={`absolute top-0 right-0 left-0 h-1.5 ${
                  isSelected
                    ? 'bg-[#C5A059]'
                    : isCustom
                    ? 'bg-amber-500'
                    : 'bg-[#006B3F] opacity-70 group-hover:opacity-100'
                }`}
              />

              <div>
                {/* Header row: Icon + Code Badge + Delete if custom */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${
                      isSelected
                        ? 'bg-white/10 border-white/20'
                        : isCustom
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-[#006B3F]'
                    }`}
                  >
                    {getIcon(major.iconType)}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      {isCustom && onDeleteCustomMajor && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`هل أنت متأكد من حذف التخصص المخصص "${major.nameAr}"؟`)) {
                              onDeleteCustomMajor(major.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="حذف هذا التخصص المخصص"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                          isSelected
                            ? 'bg-white/10 text-[#E6C673] border-white/15'
                            : isCustom
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {major.code}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-semibold ${
                        isSelected ? 'text-emerald-200' : 'text-slate-600'
                      }`}
                    >
                      {major.totalCreditHours} ساعة معتمدة
                    </span>
                  </div>
                </div>

                {/* Major Title & Badges */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3
                    className={`text-base font-extrabold leading-snug ${
                      isSelected ? 'text-white' : 'text-slate-900 group-hover:text-[#006B3F]'
                    }`}
                  >
                    {major.nameAr}
                  </h3>
                  {isCustom && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      تخصص مخصص
                    </span>
                  )}
                </div>

                <span
                  className={`text-xs block font-medium ${
                    isSelected ? 'text-emerald-200/80' : 'text-slate-500'
                  }`}
                >
                  {major.department}
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
                    <span className="text-slate-600">
                      {major.plan?.semesters?.length || 5} فصول تدريبية
                    </span>
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
