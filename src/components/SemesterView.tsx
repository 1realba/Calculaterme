import { useState } from 'react';
import { Semester, CourseGradeState, Course } from '../types.ts';
import { TVTC_GRADES, getGradeFromScore, getGradeByLetter } from '../utils/calculator.ts';
import {
  RotateCcw,
  AlertCircle,
  ArrowRightLeft,
  PlusCircle,
  X,
  BookOpen,
  Info,
} from 'lucide-react';

interface Props {
  semester: Semester;
  allSemesters?: Semester[];
  allCoursesList?: Course[];
  originalSemesterMap?: Record<string, number>;
  gradesMap: Record<string, CourseGradeState>;
  hasCustomPlan?: boolean;
  onUpdateCourseGrade: (courseId: string, updates: Partial<CourseGradeState>) => void;
  onResetCourseGrade?: (courseId: string) => void;
  onResetSemesterCourses?: (semesterNumber: number) => void;
  onMoveCourseSemester?: (courseId: string, targetSemester: number) => void;
  onResetCustomPlan?: () => void;
}

export default function SemesterView({
  semester,
  allCoursesList = [],
  originalSemesterMap = {},
  gradesMap,
  hasCustomPlan = false,
  onUpdateCourseGrade,
  onResetCourseGrade,
  onResetSemesterCourses,
  onMoveCourseSemester,
  onResetCustomPlan,
}: Props) {
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

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

  // Courses not currently in this semester
  const availableCoursesToAdd = allCoursesList.filter((c) => {
    const isAlreadyInSem = semester.courses.some((current) => current.id === c.id);
    if (isAlreadyInSem) return false;
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      c.nameAr.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.arabicCode.toLowerCase().includes(q)
    );
  });

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
            إجمالي الساعات المعتمدة: <strong className="text-slate-900 font-bold">{semester.totalCreditHours} ساعة</strong> • ساعات الاتصال: <strong className="text-slate-900 font-bold">{semester.totalContactHours} ساعة</strong> • عدد المقررات: <strong className="text-slate-900 font-bold">{semester.courses.length} مواد</strong>
          </p>
        </div>

        {/* Action Controls: Add Course, Reset Default Layout, Reset Grades */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Button to transfer courses from other semesters */}
          {onMoveCourseSemester && (
            <button
              id={`add-course-to-semester-${semester.semesterNumber}-btn`}
              type="button"
              onClick={() => setIsAddCourseModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#006B3F] border border-emerald-300 text-xs font-bold rounded-lg transition cursor-pointer"
              title="إضافة مادة من فصل دراسي آخر لهذا الفصل"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#006B3F]" />
              <span>إضافة مقرر لهذا الفصل</span>
            </button>
          )}

          {/* Reset custom course distribution if modified */}
          {hasCustomPlan && onResetCustomPlan && (
            <button
              id="reset-plan-layout-btn"
              type="button"
              onClick={onResetCustomPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg transition cursor-pointer"
              title="استعادة توزيع المقررات الافتراضي المعتمد بالخطة"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700" />
              <span>استعادة التوزيع الافتراضي</span>
            </button>
          )}

          {/* Reset Semester Courses Button */}
          <button
            id={`reset-semester-${semester.semesterNumber}-btn`}
            type="button"
            onClick={handleSemesterReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition cursor-pointer"
            title="تصفير جميع درجات هذا الفصل وإعادتها لغير مسجل"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>تصفير المواد</span>
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

      {/* Helper Banner when courses have been rearranged */}
      <div className="bg-emerald-900/5 px-4 py-2 border-b border-emerald-900/10 flex items-center justify-between text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#006B3F] shrink-0" />
          <span>
            يمكنك تخصيص خطتك ونقل أي مقرر لفصل دراسي آخر (مثلاً أخذ إنجليزي 2 في الترم الرابع) من عمود <strong>الفصل / النقل</strong>.
          </span>
        </div>
        <span className="font-semibold text-emerald-800 hidden sm:inline">نظام المقررات المرن</span>
      </div>

      {/* Empty State if all courses were moved */}
      {semester.courses.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-sm">لا توجد مقررات في هذا الفصل حالياً</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            تم نقل جميع المقررات المخصصة لهذا الفصل إلى فصول أخرى. يمكنك إضافة مقررات إلى هذا الفصل بالضغط على الزر أدناه.
          </p>
          <button
            type="button"
            onClick={() => setIsAddCourseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#006B3F] text-white text-xs font-bold rounded-xl shadow transition hover:bg-[#005a34] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة مقررات لهذا الفصل</span>
          </button>
        </div>
      ) : (
        /* Course List Table */
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#f8faf9] text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">المقرر التدريبي</th>
                <th className="py-3 px-2 text-center">الفصل / النقل</th>
                <th className="py-3 px-3 text-center">الساعات</th>
                <th className="py-3 px-3 text-center hidden md:table-cell">توزيع الساعات</th>
                <th className="py-3 px-3">المتطلب السابق</th>
                <th className="py-3 px-3">حالة المقرر</th>
                <th className="py-3 px-3">الدرجة المئوية</th>
                <th className="py-3 px-3">التقدير (النقاط)</th>
                <th className="py-3 px-3 text-center">إجمالي النقاط</th>
                <th className="py-3 px-3 text-center">تصفير</th>
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

                const origSem = originalSemesterMap[course.id];
                const isRelocated = origSem !== undefined && origSem !== semester.semesterNumber;

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
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                        <span>{course.nameAr}</span>
                        {isRelocated && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                            الخطة الأصلية: الفصل {origSem}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono bg-emerald-50 text-[#006B3F] border border-emerald-200/60 px-1.5 py-0.5 rounded font-bold">
                          {course.arabicCode}
                        </span>
                        <span className="text-slate-400">({course.code})</span>
                      </div>
                    </td>

                    {/* Semester Reassignment Dropdown (Allows taking English 2 in Semester 4, etc.) */}
                    <td className="py-3.5 px-2 text-center">
                      {onMoveCourseSemester ? (
                        <select
                          aria-label={`تحديد الفصل التدريبي لمقرر ${course.nameAr}`}
                          value={semester.semesterNumber}
                          onChange={(e) =>
                            onMoveCourseSemester(course.id, parseInt(e.target.value, 10))
                          }
                          className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs rounded-lg px-2 py-1 font-bold focus:ring-2 focus:ring-[#006B3F] focus:outline-none cursor-pointer transition"
                          title="نقل المقرر لفصل دراسي آخر"
                        >
                          {[1, 2, 3, 4, 5].map((sNum) => (
                            <option key={sNum} value={sNum}>
                              فصل {sNum} {sNum === semester.semesterNumber ? '✓' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs font-mono font-bold text-slate-600">
                          فـ{semester.semesterNumber}
                        </span>
                      )}
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
      )}

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

      {/* Modal: Add/Transfer Course to this Semester */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-right relative max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setIsAddCourseModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-xs font-bold text-[#006B3F] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md inline-block">
                تخصيص جدول الفصول الدراسية
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 mt-2">
                نقل مقرر إلى {semester.nameAr}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                اختر أي مقرر ترغب بأخذه ودراسته في {semester.nameAr} من قائمة مقررات التخصص:
              </p>
            </div>

            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="ابحث عن اسم المقرر أو الرمز (مثال: إنجليزي، شبكات، برمجة)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:bg-white"
              />
            </div>

            {/* Courses List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-80">
              {availableCoursesToAdd.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  لا توجد مقررات متطابقة مع البحث أو أن جميع المقررات مضافة بالفعل في هذا الفصل.
                </div>
              ) : (
                availableCoursesToAdd.map((course) => {
                  const currentAssignedSem = originalSemesterMap[course.id] || 1;

                  return (
                    <div
                      key={course.id}
                      className="p-3 hover:bg-emerald-50/40 flex items-center justify-between gap-3 transition"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{course.nameAr}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-[#006B3F]">
                            {course.arabicCode}
                          </span>
                          <span>({course.creditHours} س.م)</span>
                          <span className="text-slate-400">
                            • في الخطة: الفصل {currentAssignedSem}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onMoveCourseSemester) {
                            onMoveCourseSemester(course.id, semester.semesterNumber);
                            setIsAddCourseModalOpen(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-[#006B3F] hover:bg-[#005a34] text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>نقل لهذا الفصل</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>سيتم احتساب ساعات ودرجة المقرر ضمن معدل {semester.nameAr} فورياً.</span>
              <button
                type="button"
                onClick={() => setIsAddCourseModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
