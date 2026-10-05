import { CumulativeCalculation, SemesterCalculation } from '../types.ts';
import { Award, BookOpen, CheckCircle2, RotateCcw, Sparkles, Printer, GraduationCap } from 'lucide-react';

interface Props {
  cumulative: CumulativeCalculation;
  currentTermCalc: SemesterCalculation | null;
  onResetGrades: () => void;
  onFillSampleGrades: () => void;
  onPrint: () => void;
}

export default function GpaDashboard({
  cumulative,
  currentTermCalc,
  onResetGrades,
  onFillSampleGrades,
  onPrint,
}: Props) {
  const getGpaBadge = (gpa: number) => {
    if (gpa >= 4.75) return 'text-[#006B3F] bg-emerald-50 border-emerald-300';
    if (gpa >= 4.00) return 'text-emerald-800 bg-emerald-50/70 border-emerald-200';
    if (gpa >= 3.00) return 'text-sky-800 bg-sky-50 border-sky-200';
    if (gpa >= 2.00) return 'text-amber-800 bg-amber-50 border-amber-200';
    if (gpa > 0) return 'text-rose-800 bg-rose-50 border-rose-200';
    return 'text-slate-600 bg-slate-100 border-slate-200';
  };

  return (
    <section id="gpa-summary-dashboard" className="mb-6 space-y-4">
      {/* Top Banner with Key Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cumulative GPA Card */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-900/15 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-[#006B3F]" />
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
            <span>المعدل التراكمي العام (من 5.00)</span>
            <Award className="w-4 h-4 text-[#006B3F]" />
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#006B3F]">
              {cumulative.cumulativeGpa > 0 ? cumulative.cumulativeGpa.toFixed(2) : '0.00'}
            </span>
            <span className="text-xs text-slate-400 font-bold">/ 5.00</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${getGpaBadge(cumulative.cumulativeGpa)}`}>
              {cumulative.ratingAr}
            </span>
            {cumulative.honorsDegree && (
              <span className="text-[11px] font-bold text-[#B8860B] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B]" />
                {cumulative.honorsDegree}
              </span>
            )}
          </div>
        </div>

        {/* Current Term GPA Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-[#C5A059]" />
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
            <span>معدل الفصل المختار</span>
            <BookOpen className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {currentTermCalc && currentTermCalc.termGpa > 0 ? currentTermCalc.termGpa.toFixed(2) : '0.00'}
            </span>
            <span className="text-xs text-slate-400 font-bold">/ 5.00</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
            <span className="font-semibold text-slate-700">{currentTermCalc?.nameAr || 'الفصل التدريبي'}</span>
            <span className="font-bold text-[#006B3F]">
              {currentTermCalc?.completedHours || 0} من {currentTermCalc?.totalHours || 0} س.م
            </span>
          </div>
        </div>

        {/* Completed Credit Hours Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
            <span>الساعات المعتمدة المنجزة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {cumulative.totalCompletedHours}
            </span>
            <span className="text-xs text-slate-400 font-bold">من 71 ساعة تخرج</span>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#006B3F] h-full rounded-full transition-all duration-500"
                style={{ width: `${cumulative.completionRate}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>المتبقي: {Math.max(0, cumulative.totalDegreeHours - cumulative.totalCompletedHours)} ساعة</span>
              <span className="font-bold text-[#006B3F]">{cumulative.completionRate}%</span>
            </div>
          </div>
        </div>

        {/* Actions & Tools Card with TVTC Dark Green styling */}
        <div className="bg-gradient-to-br from-[#004e2d] via-[#005a34] to-[#043d26] text-white rounded-2xl p-5 border border-emerald-900 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-200 font-bold">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#E6C673]" />
              أدوات السجل الأكاديمي
            </span>
            <span className="text-[11px] text-[#E6C673] font-mono">1446هـ</span>
          </div>

          <div className="my-3 flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <button
                id="fill-sample-grades-btn"
                type="button"
                onClick={onFillSampleGrades}
                className="flex-1 py-1.5 px-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer border border-white/10"
                title="تعبئة درجات تفوق تجريبية لاختبار الحساب"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E6C673]" />
                <span>تعبئة تجريبية</span>
              </button>
              <button
                id="print-academic-report-btn"
                type="button"
                onClick={onPrint}
                className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer border border-white/10"
                title="طباعة السجل الأكاديمي الشامل"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-300" />
                <span>طباعة</span>
              </button>
            </div>

            {/* Prominent Reset All Courses Button */}
            <button
              id="reset-all-grades-btn"
              type="button"
              onClick={onResetGrades}
              className="w-full py-1.5 px-2 bg-rose-600/90 hover:bg-rose-600 active:bg-rose-700 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm shadow-black/20"
              title="تصفير جميع المواد في الخطة الدراسية بالكامل"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفير جميع المواد (إعادة الضبط)</span>
            </button>
          </div>

          <div className="text-[11px] text-emerald-200/80 flex items-center justify-between">
            <span>الخطة التدريبية:</span>
            <span className="font-bold text-white">شبكات الحاسب</span>
          </div>
        </div>
      </div>
    </section>
  );
}
