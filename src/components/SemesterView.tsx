import { Semester, CourseGradeState } from '../types.ts';
import { TVTC_GRADES, getGradeFromScore, getGradeByLetter } from '../utils/calculator.ts';
import { BookOpen, Check, Clock, AlertCircle, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react';

interface Props {
  semester: Semester;
  gradesMap: Record<string, CourseGradeState>;
  onUpdateCourseGrade: (courseId: string, updates: Partial<CourseGradeState>) => void;
  onResetCourseGrade?: (courseId: string) => void;
  onResetSemesterCourses?: (semesterNumber: number) => void;
}

export default function SemesterView({
  semester,
  gradesMap,
  onUpdateCourseGrade,
  onResetCourseGrade,
  onResetSemesterCourses,
}: Props) {
  const handleGradeLetterChange = (courseId: string, letter: string) => {
    if (!letter) {
      onUpdateCourseGrade(courseId, {
        gradeLetter: undefined,
        gradePoints: undefined,
        numericalScore: undefined,
        status: 'not-taken',
      });
      return;
    }
    const def = getGradeByLetter(letter);
    if (def) {
      onUpdateCourseGrade(courseId, {
        gradeLetter: def.letter,
        gradePoints: def.points,
        numericalScore: def.minScore,
        status: 'completed',
      });
    }
  };

  const handleNumericalScoreChange = (courseId: string, valStr: string) => {
    if (valStr === '') {
      onUpdateCourseGrade(courseId, {
        numericalScore: undefined,
        gradeLetter: undefined,
        gradePoints: undefined,
        status: 'not-taken',
      });
      return;
    }
    const num = Math.min(100, Math.max(0, parseFloat(valStr) || 0));
    const def = getGradeFromScore(num);
    onUpdateCourseGrade(courseId, {
      numericalScore: num,
      gradeLetter: def.letter,
      gradePoints: def.points,
      status: 'completed',
    });
  };

  const handleSingleCourseReset = (courseId: string) => {
    if (onResetCourseGrade) {
      onResetCourseGrade(courseId);
    } else {
      onUpdateCourseGrade(courseId, {
        gradeLetter: undefined,
        gradePoints: undefined,
        numericalScore: undefined,
        status: 'not-taken',
      });
    }
  };

  const handleSemesterReset = () => {
    if (onResetSemesterCourses) {
      onResetSemesterCourses(semester.semesterNumber);
    }
  };

  const setAllCoursesInSemester = (letter: string) => {
    const def = getGradeByLetter(letter);
    if (!def) return;
    for (const c of semester.courses) {
      onUpdateCourseGrade(c.id, {
        gradeLetter: def.letter,
        gradePoints: def.points,
        numericalScore: def.minScore,
        status: 'completed',
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-900/15 shadow-sm overflow-hidden mb-8">
      {/* Semester Header with TVTC College Theme */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/60 via-slate-50 to-white border-b border-emerald-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-[#006B3F] text-base sm:text-lg">
              {semester.nameAr}
            </h2>
            <span className="text-xs text-slate-500 font-medium">({semester.nameEn})</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            إجمالي الساعات المعتمدة: <strong className="text-slate-900 font-bold">{semester.totalCreditHours} ساعة</strong> • ساعات الاتصال: <strong className="text-slate-900 font-bold">{semester.totalContactHours} ساعة</strong>
          </p>
        </div>

        {/* Action Controls: Batch grade setter + Semester Reset Button */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Reset Semester Courses Button */}
          <button
            id={`reset-semester-${semester.semesterNumber}-btn`}
            type="button"
            onClick={handleSemesterReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition cursor-pointer"
            title="تصفير جميع درجات هذا الفصل وإعادتها لغير مسجل"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>تصفير مواد هذا الفصل</span>
          </button>

          {/* Quick Grade Fill */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium px-1 hidden lg:inline">تعيين للفصل:</span>
            {['A+', 'A', 'B+', 'B', 'C+'].map((lettr) => (
              <button
                key={lettr}
                type="button"
                onClick={() => setAllCoursesInSemester(lettr)}
                className="px-2 py-0.5 hover:bg-emerald-50 hover:text-[#006B3F] text-slate-700 text-xs rounded font-bold transition cursor-pointer"
                title={`تعيين تقدير ${lettr} لكافة مواد الفصل`}
              >
                {lettr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Course List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-[#f8faf9] text-slate-700 font-bold border-b border-slate-200">
              <th className="py-3 px-4">المقرر التدريبي</th>
              <th className="py-3 px-3 text-center">الساعات</th>
              <th className="py-3 px-3 text-center hidden md:table-cell">توزيع الساعات</th>
              <th className="py-3 px-3">المتطلب السابق</th>
              <th className="py-3 px-3">حالة المقرر</th>
              <th className="py-3 px-3">الدرجة المئوية</th>
              <th className="py-3 px-3">التقدير (النقاط)</th>
              <th className="py-3 px-3 text-center">إجمالي النقاط</th>
              <th className="py-3 px-3 text-center">تصفير المادة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {semester.courses.map((course) => {
              const state = gradesMap[course.id] || {
                courseId: course.id,
                semesterNumber: semester.semesterNumber,
                status: 'not-taken',
              };

              const hasGrade = state.status === 'completed' && state.gradeLetter;
              const pointsEarned =
                hasGrade && state.gradePoints !== undefined
                  ? Number((state.gradePoints * course.creditHours).toFixed(2))
                  : null;

              return (
                <tr
                  key={course.id}
                  className={`hover:bg-emerald-50/30 transition-colors ${
                    state.status === 'completed'
                      ? 'bg-white'
                      : state.status === 'in-progress'
                      ? 'bg-amber-50/20'
                      : 'bg-slate-50/40 text-slate-600'
                  }`}
                >
                  {/* Course Name & Code */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 text-sm">{course.nameAr}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono bg-emerald-50 text-[#006B3F] border border-emerald-200/60 px-1.5 py-0.5 rounded font-bold">
                        {course.arabicCode}
                      </span>
                      <span className="text-slate-400">({course.code})</span>
                    </div>
                  </td>

                  {/* Credit Hours */}
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md font-bold text-xs">
                      {course.creditHours} س.م
                    </span>
                  </td>

                  {/* Hours Breakdown */}
                  <td className="py-3.5 px-3 text-center hidden md:table-cell text-[11px] text-slate-500 font-mono">
                    <div className="flex items-center justify-center gap-1">
                      <span>مح: {course.lectureHours}</span>
                      <span>•</span>
                      <span>عم: {course.practicalHours}</span>
                      {course.tutorialHours > 0 && (
                        <>
                          <span>•</span>
                          <span>تم: {course.tutorialHours}</span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Prerequisite */}
                  <td className="py-3.5 px-3 text-[11px]">
                    {course.prerequisite ? (
                      <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0 text-amber-600" />
                        {course.prerequisite}
                      </span>
                    ) : (
                      <span className="text-slate-400">بدون متطلب</span>
                    )}
                  </td>

                  {/* Status Toggle */}
                  <td className="py-3.5 px-3">
                    <select
                      value={state.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as any;
                        if (newStatus === 'completed' && !state.gradeLetter) {
                          onUpdateCourseGrade(course.id, {
                            status: newStatus,
                            gradeLetter: 'A+',
                            gradePoints: 5.0,
                            numericalScore: 95,
                          });
                        } else {
                          onUpdateCourseGrade(course.id, { status: newStatus });
                        }
                      }}
                      className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:ring-2 focus:ring-[#006B3F] focus:outline-none"
                    >
                      <option value="completed">مجتاز / مكتمل</option>
                      <option value="in-progress">قيد الدراسة</option>
                      <option value="not-taken">غير مسجل</option>
                    </select>
                  </td>

                  {/* Numerical Score Input */}
                  <td className="py-3.5 px-3">
                    <div className="relative w-20">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0-100"
                        value={state.numericalScore ?? ''}
                        disabled={state.status !== 'completed'}
                        onChange={(e) => handleNumericalScoreChange(course.id, e.target.value)}
                        className="w-full text-center px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3F] disabled:opacity-40 disabled:bg-slate-100 font-bold"
                      />
                    </div>
                  </td>

                  {/* Letter Grade & Points Dropdown */}
                  <td className="py-3.5 px-3">
                    <select
                      value={state.gradeLetter || ''}
                      disabled={state.status !== 'completed'}
                      onChange={(e) => handleGradeLetterChange(course.id, e.target.value)}
                      className="bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 font-bold focus:ring-2 focus:ring-[#006B3F] focus:outline-none disabled:opacity-40"
                    >
                      <option value="">اختر التقدير...</option>
                      {TVTC_GRADES.map((g) => (
                        <option key={g.letter} value={g.letter}>
                          {g.letter} ({g.points.toFixed(2)}) - {g.nameAr}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Points Earned */}
                  <td className="py-3.5 px-3 text-center">
                    {pointsEarned !== null ? (
                      <span className="font-mono font-extrabold text-[#006B3F] text-sm">
                        {pointsEarned.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">-</span>
                    )}
                  </td>

                  {/* Individual Course Reset Button */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      id={`reset-course-${course.id}-btn`}
                      type="button"
                      onClick={() => handleSingleCourseReset(course.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                      title={`تصفير درجات مقرر ${course.nameAr}`}
                    >
                      <RotateCcw className="w-3 h-3 text-slate-400 hover:text-rose-600" />
                      <span>تصفير</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="bg-[#fcfdfd] px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            مجتاز (≥ 2.00)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            راسب (أقل من 60 / هـ)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            قيد الدراسة
          </span>
        </div>
        <span className="text-[11px] font-semibold text-[#006B3F]">
          يتم الحفظ التلقائي للسجل الأكاديمي للمتدرب
        </span>
      </div>
    </div>
  );
}
