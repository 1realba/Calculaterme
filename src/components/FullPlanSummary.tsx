import { StudyPlanData, CourseGradeState, CumulativeCalculation } from '../types.ts';
import { calculateSemesterGPA } from '../utils/calculator.ts';
import { Award, CheckCircle, GraduationCap } from 'lucide-react';

interface Props {
  studyPlan: StudyPlanData;
  gradesMap: Record<string, CourseGradeState>;
  cumulative: CumulativeCalculation;
  studentName?: string;
  studentId?: string;
}

export default function FullPlanSummary({
  studyPlan,
  gradesMap,
  cumulative,
  studentName,
  studentId,
}: Props) {
  return (
    <div id="printable-academic-transcript" className="space-y-6">
      {/* Transcript Header for Print / Display */}
      <div className="bg-white rounded-2xl p-6 border border-emerald-900/15 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#006B3F] text-white flex items-center justify-center shrink-0 border border-[#C5A059]">
              <GraduationCap className="w-6 h-6 text-[#E6C673]" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#006B3F] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                كشف السجل الأكاديمي الشامل للخطة التدريبية
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2">
                {studyPlan.program.title}
              </h2>
              <p className="text-xs text-slate-500">
                {studyPlan.program.institution} • {studyPlan.program.degree}
              </p>
            </div>
          </div>

          <div className="bg-[#f8faf9] p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 min-w-[200px]">
            <div>
              <span className="text-slate-500">اسم المتدرب: </span>
              <strong className="text-slate-900 font-bold">{studentName || 'متدرب الكلية التقنية'}</strong>
            </div>
            {studentId && (
              <div>
                <span className="text-slate-500">الرقم التدريبي: </span>
                <strong className="font-mono text-slate-900 font-bold">{studentId}</strong>
              </div>
            )}
            <div>
              <span className="text-slate-500">المعدل التراكمي العام: </span>
              <strong className="text-[#006B3F] font-black text-sm">
                {cumulative.cumulativeGpa > 0 ? cumulative.cumulativeGpa.toFixed(2) : '0.00'} / 5.00
              </strong>{' '}
              <span className="text-[11px] text-slate-600 font-semibold">({cumulative.ratingAr})</span>
            </div>
          </div>
        </div>

        {/* Semesters Grid */}
        <div className="space-y-6 pt-5">
          {studyPlan.semesters.map((sem) => {
            const semCalc = calculateSemesterGPA(sem.semesterNumber, studyPlan, gradesMap);

            return (
              <div key={sem.semesterNumber} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-[#f8faf9] px-4 py-3 flex items-center justify-between border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm">{sem.nameAr}</h3>
                    <span className="text-xs text-slate-500">({sem.totalCreditHours} ساعة معتمدة)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-600">
                      ساعات مجتازة: <strong className="text-slate-900 font-bold">{semCalc.completedHours}</strong>
                    </span>
                    <span className="bg-emerald-50 text-[#006B3F] border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                      معدل الفصل: {semCalc.termGpa > 0 ? semCalc.termGpa.toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-4">رمز المقرر</th>
                        <th className="py-2.5 px-3">اسم المقرر التدريبي</th>
                        <th className="py-2.5 px-3 text-center">الساعات</th>
                        <th className="py-2.5 px-3">الدرجة</th>
                        <th className="py-2.5 px-3">التقدير</th>
                        <th className="py-2.5 px-3 text-center">النقاط</th>
                        <th className="py-2.5 px-4 text-left">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sem.courses.map((c) => {
                        const gradeState = gradesMap[c.id];
                        const isDone = gradeState?.status === 'completed' && gradeState?.gradeLetter;

                        return (
                          <tr key={c.id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-4 font-mono font-bold text-slate-800">
                              {c.arabicCode}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {c.nameAr}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600">
                              {c.creditHours}
                            </td>
                            <td className="py-2 px-3 font-mono">
                              {gradeState?.numericalScore !== undefined && gradeState?.numericalScore !== null
                                ? `${gradeState.numericalScore}%`
                                : '-'}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {gradeState?.gradeLetter || '-'}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-[#006B3F]">
                              {isDone && gradeState.gradePoints !== undefined
                                ? (gradeState.gradePoints * c.creditHours).toFixed(2)
                                : '-'}
                            </td>
                            <td className="py-2 px-4 text-left">
                              {isDone ? (
                                <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px]">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  مجتاز
                                </span>
                              ) : gradeState?.status === 'in-progress' ? (
                                <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-bold text-[10px]">
                                  قيد الدراسة
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">غير مسجل</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
