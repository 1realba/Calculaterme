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
import MajorSelectionView from './components/MajorSelectionView.tsx';
import EditProfileModal from './components/EditProfileModal.tsx';
import AddSemesterModal from './components/AddSemesterModal.tsx';
import CreateCustomMajorModal from './components/CreateCustomMajorModal.tsx';
import ImportPlanFileModal from './components/ImportPlanFileModal.tsx';
import { ALL_MAJORS, MajorInfo, getMajorById } from './data/all_majors.ts';
import { User, CourseGradeState, StudyPlanData } from './types.ts';
import { calculateCumulativeGPA, calculateSemesterGPA, findCourseSemester } from './utils/calculator.ts';
import {
  loadCourseSemesterOverrides,
  saveCourseSemesterOverrides,
  clearCourseSemesterOverrides,
  buildEffectiveStudyPlan,
  loadExtraSemesters,
  saveExtraSemesters,
  cascadeCourseSemesterChange,
  ExtraSemesterDef,
} from './utils/planCustomizer.ts';
import {
  loadLocalCustomMajors,
  syncCustomMajorsFromServer,
  deleteCustomMajor,
} from './utils/customMajors.ts';
import {
  Layers,
  CheckCircle2,
  Bookmark,
  GraduationCap,
  AlertTriangle,
  RotateCcw,
  X,
  PlusCircle,
  CalendarPlus,
  BookPlus,
} from 'lucide-react';
import {
  apiGetMe,
  apiGetGrades,
  apiSaveGrades,
  apiResetAllGrades,
  apiResetSemesterGrades,
  apiResetCourseGrade,
  apiSaveUserMajor,
  apiLogout,
} from './utils/api.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Custom User-Created Majors list (stored locally & in DB)
  const [customMajors, setCustomMajors] = useState<MajorInfo[]>(() => loadLocalCustomMajors());

  // Selected Major state
  const [selectedMajor, setSelectedMajor] = useState<MajorInfo | null>(() => {
    const savedMajorId = localStorage.getItem('tvtc_active_major_id');
    const customs = loadLocalCustomMajors();
    return savedMajorId ? getMajorById(savedMajorId, customs) : null;
  });
  const [isChangingMajor, setIsChangingMajor] = useState(false);

  // Custom Course Semester Overrides (e.g. Taking English 2 in Semester 4)
  const [courseOverrides, setCourseOverrides] = useState<Record<string, number>>({});

  // Extra Semesters (e.g. Semester 6, 7, Summer Semester)
  const [extraSemesters, setExtraSemesters] = useState<ExtraSemesterDef[]>([]);

  const [activeTab, setActiveTab] = useState<number | 'full'>(1);
  const [gradesMap, setGradesMap] = useState<Record<string, CourseGradeState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddSemesterOpen, setIsAddSemesterOpen] = useState(false);
  const [isCreateMajorOpen, setIsCreateMajorOpen] = useState(false);
  const [isImportFileOpen, setIsImportFileOpen] = useState(false);

  const [confirmResetModal, setConfirmResetModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // Build Effective Study Plan with flexible course relocation and dynamic extra semesters
  const { effectivePlan, originalSemesterMap, allCoursesList, hasOverrides } = useMemo(() => {
    const basePlan = selectedMajor ? selectedMajor.plan : ALL_MAJORS[0].plan;
    return buildEffectiveStudyPlan(basePlan, courseOverrides, extraSemesters);
  }, [selectedMajor, courseOverrides, extraSemesters]);

  const studyPlan: StudyPlanData = effectivePlan;

  // Show toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Check auth session & sync custom majors on startup
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || undefined;

    // Sync custom majors from server if database is configured
    syncCustomMajorsFromServer(token).then((serverMajors) => {
      if (serverMajors.length > 0) {
        setCustomMajors(serverMajors);
      }
    });

    apiGetMe()
      .then((user) => {
        if (user) {
          setCurrentUser(user);
          if (user.majorId) {
            const customs = loadLocalCustomMajors();
            const major = getMajorById(user.majorId, customs);
            setSelectedMajor(major);
            localStorage.setItem('tvtc_active_major_id', major.id);
          }
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setIsAuthLoading(false);
      });
  }, []);

  // Fetch saved grades, custom plan overrides, and extra semesters when user logs in or switches major
  useEffect(() => {
    if (!currentUser || !selectedMajor) return;

    // Load custom course semester overrides
    const overrides = loadCourseSemesterOverrides(currentUser.id, selectedMajor.id);
    setCourseOverrides(overrides);

    // Load extra semesters
    const extras = loadExtraSemesters(currentUser.id, selectedMajor.id);
    setExtraSemesters(extras);

    apiGetGrades(currentUser, selectedMajor.id)
      .then((grades) => {
        if (grades && Array.isArray(grades)) {
          const map: Record<string, CourseGradeState> = {};
          for (const g of grades) {
            map[g.courseId] = g;
          }
          setGradesMap(map);
        } else {
          setGradesMap({});
        }
      })
      .catch((err) => {
        console.error('Error fetching grades for major:', err);
      });
  }, [currentUser, selectedMajor]);

  // Handle Major Selection
  const handleSelectMajor = (major: MajorInfo) => {
    setSelectedMajor(major);
    setIsChangingMajor(false);
    setActiveTab(1);
    localStorage.setItem('tvtc_active_major_id', major.id);

    if (currentUser) {
      const updated = apiSaveUserMajor(currentUser, major.id);
      setCurrentUser(updated);

      const overrides = loadCourseSemesterOverrides(currentUser.id, major.id);
      setCourseOverrides(overrides);

      const extras = loadExtraSemesters(currentUser.id, major.id);
      setExtraSemesters(extras);

      // Load grades for the newly selected major
      apiGetGrades(updated, major.id).then((grades) => {
        const map: Record<string, CourseGradeState> = {};
        if (grades && Array.isArray(grades)) {
          for (const g of grades) {
            map[g.courseId] = g;
          }
        }
        setGradesMap(map);
      });
    }

    showToast(`تم اختيار تخصص: ${major.nameAr}`);
  };

  // Handle Newly Created Custom Major
  const handleMajorCreated = (newMajor: MajorInfo) => {
    setCustomMajors((prev) => [newMajor, ...prev.filter((m) => m.id !== newMajor.id)]);
    setSelectedMajor(newMajor);
    setIsChangingMajor(false);
    setActiveTab(1);
    localStorage.setItem('tvtc_active_major_id', newMajor.id);

    if (currentUser) {
      const updated = apiSaveUserMajor(currentUser, newMajor.id);
      setCurrentUser(updated);
      setCourseOverrides({});
      setExtraSemesters([]);
      setGradesMap({});
    }

    showToast(`تم حفظ وتفعيل التخصص الجديد: "${newMajor.nameAr}" بنجاح!`);
  };

  // Handle Deleting a Custom Major
  const handleDeleteCustomMajor = async (majorId: string) => {
    const token = localStorage.getItem('auth_token') || undefined;
    await deleteCustomMajor(majorId, token);
    setCustomMajors((prev) => prev.filter((m) => m.id !== majorId));

    if (selectedMajor?.id === majorId) {
      const fallback = ALL_MAJORS[0];
      setSelectedMajor(fallback);
      localStorage.setItem('tvtc_active_major_id', fallback.id);
      if (currentUser) {
        const updated = apiSaveUserMajor(currentUser, fallback.id);
        setCurrentUser(updated);
      }
    }
    showToast('تم حذف التخصص المخصص بنجاح');
  };

  // Save grades to persistent store (Instantly on every change)
  const saveGradesToDb = useCallback(
    async (updatedMap: Record<string, CourseGradeState>) => {
      if (!currentUser || !selectedMajor) return;

      setIsSaving(true);
      try {
        const gradesList = Object.values(updatedMap);
        await apiSaveGrades(currentUser, gradesList, selectedMajor.id);
      } catch (err) {
        console.error('Failed to auto-save grades:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [currentUser, selectedMajor]
  );

  // Update a course grade (Real-time single course entry)
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

      // Trigger instant save
      saveGradesToDb(updatedMap);
      return updatedMap;
    });
  };

  // Reset ALL grades in the entire plan (opens modal)
  const handleResetGrades = () => {
    if (!selectedMajor) return;
    setConfirmResetModal({
      isOpen: true,
      title: `تأكيد تصفير درجات خطة "${selectedMajor.nameAr}"`,
      description: 'هل أنت متأكد من تصفير كافة درجات الخطة التدريبية بالكامل؟ سيتم إعادة ضبط السجل الأكاديمي وإرجاع المعدل التراكمي إلى 0.00 فوراً.',
      onConfirm: async () => {
        // 1. Instantly reset client state
        setGradesMap({});
        setConfirmResetModal(null);

        // 2. Clear via api layer
        if (currentUser) {
          await apiResetAllGrades(currentUser, selectedMajor.id);
        }
        showToast('تم تصفير جميع مواد الخطة التدريبية بنجاح وإعادة ضبط المعدل التراكمي إلى 0.00');
      },
    });
  };

  // Reset grades for a specific semester (opens modal)
  const handleResetSemesterCourses = (semesterNumber: number) => {
    if (!selectedMajor) return;
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
          await apiResetSemesterGrades(currentUser, semesterNumber, courseIds, selectedMajor.id);
        }
        showToast(`تم تصفير مواد ${semName} بنجاح وإعادة احتساب المعدل`);
      },
    });
  };

  // Reset a single course grade immediately
  const handleResetCourseGrade = async (courseId: string) => {
    if (!selectedMajor) return;
    setGradesMap((prev) => {
      const next = { ...prev };
      delete next[courseId];
      return next;
    });

    if (currentUser) {
      await apiResetCourseGrade(currentUser, courseId, selectedMajor.id);
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

  // Move a course to a different semester WITH AUTOMATIC PREREQUISITE CASCADE
  const handleMoveCourseSemester = (courseId: string, targetSemester: number) => {
    // 1. Run prerequisite verification and downstream cascade
    const cascade = cascadeCourseSemesterChange(
      courseId,
      targetSemester,
      allCoursesList,
      courseOverrides,
      originalSemesterMap
    );

    if (!cascade.success) {
      showToast(cascade.errorMessage || 'لا يمكن نقل المقرر لمخالفته شروط المتطلب السابق');
      return;
    }

    // 2. Save next overrides
    setCourseOverrides(cascade.nextOverrides);

    if (currentUser && selectedMajor) {
      saveCourseSemesterOverrides(currentUser.id, selectedMajor.id, cascade.nextOverrides);
    }

    // 3. Update semester numbers in gradesMap for any moved or cascaded courses
    setGradesMap((prev) => {
      let hasChanges = false;
      const next = { ...prev };
      for (const cid in cascade.nextOverrides) {
        if (next[cid] && next[cid].semesterNumber !== cascade.nextOverrides[cid]) {
          next[cid] = { ...next[cid], semesterNumber: cascade.nextOverrides[cid] };
          hasChanges = true;
        }
      }
      if (hasChanges) {
        saveGradesToDb(next);
        return next;
      }
      return prev;
    });

    // 4. Construct clear, helpful user feedback
    const targetCourse = allCoursesList.find((c) => c.id === courseId);
    const courseName = targetCourse?.nameAr || 'المقرر';

    if (cascade.shiftedCourses.length > 0) {
      const shiftedDescriptions = cascade.shiftedCourses
        .map((s) => `${s.course.nameAr} ➔ الفصل ${s.toSem}`)
        .join('، ');
      showToast(
        `تم نقل (${courseName}) للفصل ${targetSemester}، وتم ترحيل المتطلبات التالية تلقائياً: (${shiftedDescriptions}) للحفاظ على التسلسل الأكاديمي المعتمد`
      );
    } else {
      showToast(`تم نقل مقرر (${courseName}) إلى الفصل ${targetSemester} بنجاح`);
    }
  };

  // Add an Extra Semester
  const handleAddSemester = (semNum: number, nameAr: string, nameEn: string) => {
    if (!currentUser || !selectedMajor) return;

    const newDef: ExtraSemesterDef = {
      semesterNumber: semNum,
      nameAr,
      nameEn,
    };

    const nextExtras = [...extraSemesters.filter((e) => e.semesterNumber !== semNum), newDef].sort(
      (a, b) => a.semesterNumber - b.semesterNumber
    );

    setExtraSemesters(nextExtras);
    saveExtraSemesters(currentUser.id, selectedMajor.id, nextExtras);
    setActiveTab(semNum);
    showToast(`تم إضافة (${nameAr}) بنجاح! يمكنك الآن نقل وتوزيع المقررات فيه`);
  };

  // Delete an Extra Semester
  const handleDeleteSemester = (semNum: number) => {
    if (!currentUser || !selectedMajor) return;

    // Check if courses are assigned to this semester
    const coursesInSem = studyPlan.semesters.find((s) => s.semesterNumber === semNum)?.courses || [];
    if (coursesInSem.length > 0) {
      showToast('يرجى أولاً نقل المقررات الموجودة في هذا الفصل إلى فصل آخر قبل حذفه');
      return;
    }

    const nextExtras = extraSemesters.filter((e) => e.semesterNumber !== semNum);
    setExtraSemesters(nextExtras);
    saveExtraSemesters(currentUser.id, selectedMajor.id, nextExtras);

    // Switch to first semester
    setActiveTab(1);
    showToast('تم حذف الفصل الدراسي الإضافي بنجاح');
  };

  // Reset custom course semester distribution back to official TVTC default plan
  const handleResetCustomPlan = () => {
    setConfirmResetModal({
      isOpen: true,
      title: 'تأكيد استعادة التوزيع الافتراضي للخطة',
      description:
        'هل ترغب بإعادة جميع المقررات الدراسية المنقولة إلى فصولها التدريبية الأصلية المعتمدة بالكلية؟ لن تُحذف أي من درجاتك المدخلة.',
      onConfirm: () => {
        setCourseOverrides({});
        if (currentUser && selectedMajor) {
          clearCourseSemesterOverrides(currentUser.id, selectedMajor.id);
        }
        setGradesMap((prev) => {
          const next = { ...prev };
          for (const cid in next) {
            const orig = originalSemesterMap[cid];
            if (orig) {
              next[cid] = { ...next[cid], semesterNumber: orig };
            }
          }
          saveGradesToDb(next);
          return next;
        });
        setConfirmResetModal(null);
        showToast('تمت استعادة التوزيع الافتراضي المعتمد لمقررات الخطة بنجاح');
      },
    });
  };

  // Update Trainee Profile (Name / Student ID)
  const handleSaveProfile = (updated: { fullName: string; studentId?: string }) => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      fullName: updated.fullName,
      studentId: updated.studentId,
    };
    setCurrentUser(updatedUser);

    // If guest, update local guest profile
    if (currentUser.username === 'guest' || !currentUser.studentId || currentUser.username.startsWith('guest_')) {
      try {
        const existingGuest = localStorage.getItem('tvtc_guest_profile');
        const guestData = existingGuest ? JSON.parse(existingGuest) : {};
        localStorage.setItem(
          'tvtc_guest_profile',
          JSON.stringify({
            ...guestData,
            fullName: updated.fullName,
            studentId: updated.studentId,
          })
        );
      } catch (e) {
        console.error('Error saving guest profile:', e);
      }
    }

    // Save session in local storage
    try {
      localStorage.setItem('tvtc_current_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.error(e);
    }

    showToast('تم تحديث بيانات المتدرب بنجاح');
  };

  // Handle Logout
  const handleLogout = async () => {
    await apiLogout();
    setCurrentUser(null);
    setSelectedMajor(null);
    setIsChangingMajor(false);
    setCourseOverrides({});
    setExtraSemesters([]);
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

  // Determine next semester number for the Add Semester modal
  const nextSemesterNumber = useMemo(() => {
    const existing = studyPlan.semesters.map((s) => s.semesterNumber);
    return Math.max(5, ...existing) + 1;
  }, [studyPlan]);

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

  // Not logged in: Show Auth (Login / Register / Guest) View
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex flex-col justify-between">
        <AuthView
          onSuccess={(user) => {
            setCurrentUser(user);
            const customs = loadLocalCustomMajors();
            if (user.majorId) {
              const major = getMajorById(user.majorId, customs);
              setSelectedMajor(major);
              localStorage.setItem('tvtc_active_major_id', major.id);
            } else {
              setSelectedMajor(null); // Triggers Major Selection screen
            }
            showToast(`أهلاً بك يا ${user.fullName} في بوابة الكلية التقنية`);
          }}
        />
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          المملكة العربية السعودية • المؤسسة العامة للتدريب التقني والمهني (TVTC)
        </footer>
      </div>
    );
  }

  // Logged in, but has not selected major OR clicked "تغيير التخصص"
  if (!selectedMajor || isChangingMajor) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex flex-col justify-between">
        {/* Top Minimal Header */}
        <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-8 shadow-xs">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#006B3F] text-white flex items-center justify-center border border-[#C5A059]">
                <GraduationCap className="w-5 h-5 text-[#E6C673]" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-sm block">الكلية التقنية</span>
                <span className="text-[11px] text-slate-500">المؤسسة العامة للتدريب التقني والمهني</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-800 block">{currentUser.fullName}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentUser.studentId ? `الرقم التدريبي: ${currentUser.studentId}` : `@${currentUser.username}`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
              >
                تعديل البيانات
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </header>

        {/* Major Selection Grid */}
        <main className="flex-1">
          <MajorSelectionView
            studentName={currentUser.fullName}
            currentMajorId={selectedMajor?.id}
            customMajors={customMajors}
            showCancelButton={!!selectedMajor}
            onCancel={() => setIsChangingMajor(false)}
            onSelectMajor={handleSelectMajor}
            onOpenCreateMajorModal={() => setIsCreateMajorOpen(true)}
            onOpenImportFileModal={() => setIsImportFileOpen(true)}
            onDeleteCustomMajor={handleDeleteCustomMajor}
          />
        </main>

        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          المملكة العربية السعودية • المؤسسة العامة للتدريب التقني والمهني (TVTC)
        </footer>

        {/* Edit Profile Modal */}
        <EditProfileModal
          isOpen={isEditProfileOpen}
          currentUser={currentUser}
          onClose={() => setIsEditProfileOpen(false)}
          onSave={handleSaveProfile}
        />

        {/* Create Custom Major Modal */}
        <CreateCustomMajorModal
          isOpen={isCreateMajorOpen}
          token={localStorage.getItem('auth_token') || undefined}
          onClose={() => setIsCreateMajorOpen(false)}
          onMajorCreated={handleMajorCreated}
        />

        {/* Import Plan File Modal */}
        <ImportPlanFileModal
          isOpen={isImportFileOpen}
          token={localStorage.getItem('auth_token') || undefined}
          onClose={() => setIsImportFileOpen(false)}
          onPlanImported={handleMajorCreated}
        />
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
        majorTitle={selectedMajor.nameAr}
        onLogout={handleLogout}
        onOpenJsonModal={() => setIsJsonModalOpen(true)}
        onChangeMajor={() => setIsChangingMajor(true)}
        onOpenImportPlan={() => setIsImportFileOpen(true)}
        onEditProfile={() => setIsEditProfileOpen(true)}
        isSaving={isSaving}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#004e2d] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#C5A059] flex items-center gap-2 text-xs font-bold animate-bounce max-w-md">
            <CheckCircle2 className="w-4 h-4 text-[#E6C673] shrink-0" />
            <span className="leading-snug">{toastMessage}</span>
          </div>
        )}

        {/* GPA Summary Cards */}
        <GpaDashboard
          cumulative={cumulativeCalc}
          currentTermCalc={currentTermCalc}
          majorTitle={selectedMajor.nameAr}
          onResetGrades={handleResetGrades}
          onFillSampleGrades={handleFillSampleGrades}
          onPrint={() => window.print()}
          onChangeMajor={() => setIsChangingMajor(true)}
        />

        {/* Semester Tabs Navigation with TVTC theme + Extra Semester Action */}
        <div className="bg-white p-2 rounded-2xl border border-emerald-900/15 shadow-2xs mb-6 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {studyPlan.semesters.map((sem) => {
              const semCalc = calculateSemesterGPA(sem.semesterNumber, studyPlan, gradesMap);
              const isSelected = activeTab === sem.semesterNumber;
              const isExtra = extraSemesters.some((e) => e.semesterNumber === sem.semesterNumber);

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
                  {isExtra && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-200 border border-amber-400/40">
                      إضافي
                    </span>
                  )}
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

            {/* Add Extra Semester Button */}
            <button
              id="btn-add-extra-semester"
              type="button"
              onClick={() => setIsAddSemesterOpen(true)}
              className="py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-emerald-50 text-[#006B3F] hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
              title="إضافة فصل دراسي سادس أو صيفي لتوزيع المقررات"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-[#006B3F]" />
              <span>+ إضافة فصل دراسي</span>
            </button>

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
              <span>الكشف الشامل للخطة ({studyPlan.semesters.length} فصول)</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab !== 'full' && currentSemesterObj && (
          <SemesterView
            semester={currentSemesterObj}
            allSemesters={studyPlan.semesters}
            allCoursesList={allCoursesList}
            originalSemesterMap={originalSemesterMap}
            courseOverrides={courseOverrides}
            gradesMap={gradesMap}
            hasCustomPlan={hasOverrides}
            onUpdateCourseGrade={handleUpdateCourseGrade}
            onResetCourseGrade={handleResetCourseGrade}
            onResetSemesterCourses={handleResetSemesterCourses}
            onMoveCourseSemester={handleMoveCourseSemester}
            onResetCustomPlan={handleResetCustomPlan}
            onDeleteSemester={
              extraSemesters.some((e) => e.semesterNumber === currentSemesterObj.semesterNumber)
                ? () => handleDeleteSemester(currentSemesterObj.semesterNumber)
                : undefined
            }
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
            بوابة المتدربين الإلكترونية • الكلية التقنية • قسم التدريب والخطط الدراسية
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

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        currentUser={currentUser}
        onClose={() => setIsEditProfileOpen(false)}
        onSave={handleSaveProfile}
      />

      {/* Add Extra Semester Modal */}
      <AddSemesterModal
        isOpen={isAddSemesterOpen}
        nextSemesterNumber={nextSemesterNumber}
        onClose={() => setIsAddSemesterOpen(false)}
        onAddSemester={handleAddSemester}
      />

      {/* Create Custom Major Modal */}
      <CreateCustomMajorModal
        isOpen={isCreateMajorOpen}
        token={localStorage.getItem('auth_token') || undefined}
        onClose={() => setIsCreateMajorOpen(false)}
        onMajorCreated={handleMajorCreated}
      />

      {/* Import Plan File Modal */}
      <ImportPlanFileModal
        isOpen={isImportFileOpen}
        token={localStorage.getItem('auth_token') || undefined}
        onClose={() => setIsImportFileOpen(false)}
        onPlanImported={handleMajorCreated}
      />

      {/* Study Plan JSON Modal */}
      <StudyPlanModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        studyPlan={studyPlan}
      />
    </div>
  );
}
