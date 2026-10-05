/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from './components/Navbar.tsx';
import AuthView from './components/AuthView.tsx';
import GpaDashboard from './components/GpaDashboard.tsx';
import SemesterView from './components/SemesterView.tsx';
import FullPlanSummary from './components/FullPlanSummary.tsx';
import StudyPlanModal from './components/StudyPlanModal.tsx';
import defaultStudyPlan from './data/study_plan.json';
import { User, CourseGradeState, StudyPlanData } from './types.ts';
import { calculateCumulativeGPA, calculateSemesterGPA, findCourseSemester } from './utils/calculator.ts';
import { Layers, CheckCircle2, Bookmark, GraduationCap, AlertTriangle, RotateCcw, X } from 'lucide-react';
import {
  apiGetMe,
  apiGetGrades,
  apiSaveGrades,
  apiResetAllGrades,
  apiResetSemesterGrades,
  apiResetCourseGrade,
  apiLogout,
} from './utils/api.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [studyPlan] = useState<StudyPlanData>(defaultStudyPlan as unknown as StudyPlanData);
  const [activeTab, setActiveTab] = useState<number | 'full'>(1);
  const [gradesMap, setGradesMap] = useState<Record<string, CourseGradeState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [confirmResetModal, setConfirmResetModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // Check auth session on startup
  useEffect(() => {
    apiGetMe()
      .then((user) => {
        setCurrentUser(user);
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setIsAuthLoading(false);
      });
  }, []);

  // Fetch saved grades when user logs in
  useEffect(() => {
    if (!currentUser) return;

    apiGetGrades(currentUser)
      .then((grades) => {
        if (grades && Array.isArray(grades)) {
          const map: Record<string, CourseGradeState> = {};
          for (const g of grades) {
            map[g.courseId] = g;
          }
          setGradesMap(map);
        }
      })
      .catch((err) => {
        console.error('Error fetching grades:', err);
      });
  }, [currentUser]);

  // Show toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Save grades to persistent store
  const saveGradesToDb = useCallback(
    async (updatedMap: Record<string, CourseGradeState>) => {
      if (!currentUser) return;

      setIsSaving(true);
      try {
        const gradesList = Object.values(updatedMap);
        await apiSaveGrades(currentUser, gradesList);
      } catch (err) {
        console.error('Failed to auto-save grades:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [currentUser]
  );

  // Update a course grade
  const handleUpdateCourseGrade = (courseId: string, updates: Partial<CourseGradeState>) => {
    const semNum = findCourseSemester(courseId, studyPlan);
    setGradesMap((prev) => {
      const existing = prev[courseId] || {
        courseId,
        semesterNumber: semNum,
        status: 'completed',
      };
      const nextState = { ...existing, ...updates, semesterNumber: semNum };
      const updatedMap = { ...prev, [courseId]: nextState };

      // Trigger debounced save
      saveGradesToDb(updatedMap);
      return updatedMap;
    });
  };

  // Reset ALL grades in the entire plan (opens modal)
  const handleResetGrades = () => {
    setConfirmResetModal({
      isOpen: true,
      title: 'تأكيد تصفير جميع درجات الخطة التدريبية',
      description: 'هل أنت متأكد من تصفير كافة درجات الخطة التدريبية بالكامل؟ سيتم إعادة ضبط السجل الأكاديمي وإرجاع المعدل التراكمي إلى 0.00 فوراً.',
      onConfirm: async () => {
        // 1. Instantly reset client state
        setGradesMap({});
        setConfirmResetModal(null);

        // 2. Clear via api layer
        if (currentUser) {
          await apiResetAllGrades(currentUser);
        }
        showToast('تم تصفير جميع مواد الخطة التدريبية بنجاح وإعادة ضبط المعدل التراكمي إلى 0.00');
      },
    });
  };

  // Reset grades for a specific semester (opens modal)
  const handleResetSemesterCourses = (semesterNumber: number) => {
    const targetSemester = studyPlan.semesters.find((s) => s.semesterNumber === semesterNumber);
    const semName = targetSemester?.nameAr || `الفصل ${semesterNumber}`;

    setConfirmResetModal({
      isOpen: true,
      title: `تأكيد تصفير مواد "${semName}"`,
      description: `هل أنت متأكد من تصفير درجات مواد "${semName}"؟ سيتم حذف درجات المقررات وإعادتها لحالة غير مسجل وتحديث المعدل الفصلي والتراكمي فوراً.`,
      onConfirm: async () => {
        const next = { ...gradesMap };
        const courseIds: string[] = [];
        if (targetSemester) {
          for (const c of targetSemester.courses) {
            delete next[c.id];
            courseIds.push(c.id);
          }
        }
        setGradesMap(next);
        setConfirmResetModal(null);

        if (currentUser) {
          await apiResetSemesterGrades(currentUser, semesterNumber, courseIds);
        }
        showToast(`تم تصفير مواد ${semName} بنجاح وإعادة احتساب المعدل`);
      },
    });
  };

  // Reset a single course grade immediately
  const handleResetCourseGrade = async (courseId: string) => {
    setGradesMap((prev) => {
      const next = { ...prev };
      delete next[courseId];
      return next;
    });

    if (currentUser) {
      await apiResetCourseGrade(currentUser, courseId);
    }
    showToast('تم تصفير المادة بنجاح');
  };

  // Fill sample grades for demo testing
  const handleFillSampleGrades = () => {
    const sampleGrades: Record<string, CourseGradeState> = {};
    const samplePool = [
      { letter: 'A+', points: 5.0, score: 98 },
      { letter: 'A', points: 4.75, score: 92 },
      { letter: 'B+', points: 4.5, score: 88 },
      { letter: 'B', points: 4.0, score: 83 },
      { letter: 'A+', points: 5.0, score: 96 },
    ];

    let idx = 0;
    for (const semester of studyPlan.semesters) {
      for (const course of semester.courses) {
        const sample = samplePool[idx % samplePool.length];
        sampleGrades[course.id] = {
          courseId: course.id,
          semesterNumber: semester.semesterNumber,
          gradeLetter: sample.letter,
          gradePoints: sample.points,
          numericalScore: sample.score,
          status: 'completed',
        };
        idx++;
      }
    }

    setGradesMap(sampleGrades);
    saveGradesToDb(sampleGrades);
    showToast('تمت تعبئة درجات تفوق تجريبية وحفظها في السجل الأكاديمي');
  };

  // Handle Logout
  const handleLogout = async () => {
    await apiLogout();
    setCurrentUser(null);
    setGradesMap({});
  };

  // Calculations
  const cumulativeCalc = useMemo(() => {
    return calculateCumulativeGPA(studyPlan, gradesMap);
  }, [studyPlan, gradesMap]);

  const currentTermCalc = useMemo(() => {
    if (activeTab === 'full') return null;
    return calculateSemesterGPA(activeTab, studyPlan, gradesMap);
  }, [activeTab, studyPlan, gradesMap]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#006B3F] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#006B3F]">جارِ التحقق من جلسة المتدرب والسجل الأكاديمي...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex flex-col justify-between">
        <AuthView
          onSuccess={(user) => {
            setCurrentUser(user);
            showToast(`أهلاً بك يا ${user.fullName} في بوابة الكلية التقنية`);
          }}
        />
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          المملكة العربية السعودية • المؤسسة العامة للتدريب التقني والمهني (TVTC)
        </footer>
      </div>
    );
  }

  const currentSemesterObj =
    activeTab !== 'full'
      ? studyPlan.semesters.find((s) => s.semesterNumber === activeTab)
      : null;

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col text-slate-800">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onOpenJsonModal={() => setIsJsonModalOpen(true)}
        isSaving={isSaving}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#004e2d] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#C5A059] flex items-center gap-2 text-xs font-bold animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-[#E6C673]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* GPA Summary Cards */}
        <GpaDashboard
          cumulative={cumulativeCalc}
          currentTermCalc={currentTermCalc}
          onResetGrades={handleResetGrades}
          onFillSampleGrades={handleFillSampleGrades}
          onPrint={() => window.print()}
        />

        {/* Semester Tabs Navigation with TVTC theme */}
        <div className="bg-white p-2 rounded-2xl border border-emerald-900/15 shadow-2xs mb-6 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {studyPlan.semesters.map((sem) => {
              const semCalc = calculateSemesterGPA(sem.semesterNumber, studyPlan, gradesMap);
              const isSelected = activeTab === sem.semesterNumber;

              return (
                <button
                  key={sem.semesterNumber}
                  id={`tab-semester-${sem.semesterNumber}`}
                  type="button"
                  onClick={() => setActiveTab(sem.semesterNumber)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#006B3F] text-white shadow-md shadow-emerald-950/20 border-b-2 border-[#C5A059]'
                      : 'text-slate-600 hover:bg-emerald-50/60 hover:text-[#006B3F]'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isSelected ? 'text-[#E6C673]' : 'text-slate-400'}`} />
                  <span>{sem.nameAr}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      isSelected ? 'bg-emerald-900/70 text-emerald-100' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {semCalc.termGpa > 0 ? `${semCalc.termGpa.toFixed(2)}` : `${sem.totalCreditHours} س.م`}
                  </span>
                </button>
              );
            })}

            <button
              id="tab-full-plan-summary"
              type="button"
              onClick={() => setActiveTab('full')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'full'
                  ? 'bg-[#006B3F] text-white shadow-md shadow-emerald-950/20 border-b-2 border-[#C5A059]'
                  : 'text-slate-600 hover:bg-emerald-50/60 hover:text-[#006B3F]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>الكشف الشامل للخطة (5 فصول)</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab !== 'full' && currentSemesterObj && (
          <SemesterView
            semester={currentSemesterObj}
            gradesMap={gradesMap}
            onUpdateCourseGrade={handleUpdateCourseGrade}
            onResetCourseGrade={handleResetCourseGrade}
            onResetSemesterCourses={handleResetSemesterCourses}
          />
        )}

        {activeTab === 'full' && (
          <FullPlanSummary
            studyPlan={studyPlan}
            gradesMap={gradesMap}
            cumulative={cumulativeCalc}
            studentName={currentUser.fullName}
            studentId={currentUser.studentId}
          />
        )}
      </main>

      {/* TVTC Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#006B3F]" />
            <span className="font-bold text-slate-800">
              المملكة العربية السعودية • المؤسسة العامة للتدريب التقني والمهني (TVTC)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            بوابة المتدربين الإلكترونية • الكلية التقنية • قسم تقنية الحاسب والمعلومات
          </span>
        </div>
      </footer>

      {/* In-App Reset Confirmation Modal (Avoids iframe window.confirm blocking) */}
      {confirmResetModal && confirmResetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right relative">
            <button
              type="button"
              onClick={() => setConfirmResetModal(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>

            <h3 className="text-base font-extrabold text-slate-900 text-center mb-2">
              {confirmResetModal.title}
            </h3>

            <p className="text-xs text-slate-600 text-center leading-relaxed mb-6">
              {confirmResetModal.description}
            </p>

            <div className="flex items-center gap-3">
              <button
                id="modal-confirm-reset-btn"
                type="button"
                onClick={confirmResetModal.onConfirm}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>نعم، تصفير الآن</span>
              </button>
              <button
                id="modal-cancel-reset-btn"
                type="button"
                onClick={() => setConfirmResetModal(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Study Plan JSON Modal */}
      <StudyPlanModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        studyPlan={studyPlan}
      />
    </div>
  );
}
