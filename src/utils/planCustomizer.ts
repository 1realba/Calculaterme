import { StudyPlanData, Course, Semester } from '../types.ts';

const CUSTOM_PLAN_PREFIX = 'tvtc_custom_plan_';
const EXTRA_SEMESTERS_PREFIX = 'tvtc_extra_semesters_';

export function getCustomPlanKey(userId: number, majorId: string): string {
  return `${CUSTOM_PLAN_PREFIX}${userId}_${majorId}`;
}

export function getExtraSemestersKey(userId: number, majorId: string): string {
  return `${EXTRA_SEMESTERS_PREFIX}${userId}_${majorId}`;
}

export function loadCourseSemesterOverrides(userId: number, majorId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(getCustomPlanKey(userId, majorId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading custom plan overrides:', err);
  }
  return {};
}

export function saveCourseSemesterOverrides(
  userId: number,
  majorId: string,
  overrides: Record<string, number>
): void {
  try {
    localStorage.setItem(getCustomPlanKey(userId, majorId), JSON.stringify(overrides));
  } catch (err) {
    console.error('Error saving custom plan overrides:', err);
  }
}

export function clearCourseSemesterOverrides(userId: number, majorId: string): void {
  try {
    localStorage.removeItem(getCustomPlanKey(userId, majorId));
  } catch (err) {
    console.error('Error clearing custom plan overrides:', err);
  }
}

export interface ExtraSemesterDef {
  semesterNumber: number;
  nameAr: string;
  nameEn: string;
}

export function loadExtraSemesters(userId: number, majorId: string): ExtraSemesterDef[] {
  try {
    const raw = localStorage.getItem(getExtraSemestersKey(userId, majorId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading extra semesters:', err);
  }
  return [];
}

export function saveExtraSemesters(
  userId: number,
  majorId: string,
  extraSemesters: ExtraSemesterDef[]
): void {
  try {
    localStorage.setItem(getExtraSemestersKey(userId, majorId), JSON.stringify(extraSemesters));
  } catch (err) {
    console.error('Error saving extra semesters:', err);
  }
}

export function clearExtraSemesters(userId: number, majorId: string): void {
  try {
    localStorage.removeItem(getExtraSemestersKey(userId, majorId));
  } catch (err) {
    console.error('Error clearing extra semesters:', err);
  }
}

// -------------------------------------------------------------
// Prerequisite Matching & Dependency Analysis
// -------------------------------------------------------------

function cleanString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[()\-_\s،,.]/g, '')
    .trim();
}

/**
 * Finds the prerequisite course object for a given course within a list of all courses.
 */
export function findPrerequisiteCourse(course: Course, allCourses: Course[]): Course | null {
  if (!course.prerequisite) return null;
  const prereqRaw = course.prerequisite.trim();
  if (
    prereqRaw === '' ||
    prereqRaw.toLowerCase() === 'null' ||
    prereqRaw.includes('بدون') ||
    prereqRaw.includes('اجتياز')
  ) {
    return null;
  }

  const cleanPrereq = cleanString(prereqRaw);

  // 1. Direct ID match
  const byId = allCourses.find((c) => c.id === prereqRaw);
  if (byId) return byId;

  // 2. Exact match on arabicCode, code, or nameAr
  for (const c of allCourses) {
    if (c.id === course.id) continue;
    const cleanArCode = cleanString(c.arabicCode);
    const cleanEnCode = cleanString(c.code);
    const cleanNameAr = cleanString(c.nameAr);

    if (
      cleanPrereq === cleanArCode ||
      cleanPrereq === cleanEnCode ||
      cleanPrereq.includes(cleanArCode) ||
      cleanPrereq.includes(cleanEnCode) ||
      cleanNameAr === cleanPrereq
    ) {
      return c;
    }
  }

  // 3. Fallback for language sequences like English 1, 2, 3
  const isEnglish2 = course.code.includes('102') || course.nameAr.includes('-2') || course.nameAr.includes(' 2');
  const isEnglish3 = course.code.includes('103') || course.nameAr.includes('-3') || course.nameAr.includes(' 3');

  if (isEnglish2) {
    const eng1 = allCourses.find(
      (c) =>
        c.id !== course.id &&
        (c.code.includes('101') || c.nameAr.includes('-1') || c.nameAr.includes(' 1')) &&
        (c.nameAr.includes('إنجليز') || c.code.toLowerCase().includes('eng'))
    );
    if (eng1) return eng1;
  }

  if (isEnglish3) {
    const eng2 = allCourses.find(
      (c) =>
        c.id !== course.id &&
        (c.code.includes('102') || c.nameAr.includes('-2') || c.nameAr.includes(' 2')) &&
        (c.nameAr.includes('إنجليز') || c.code.toLowerCase().includes('eng'))
    );
    if (eng2) return eng2;
  }

  return null;
}

/**
 * Finds all courses that directly list `course` as their prerequisite.
 */
export function findDependentCourses(course: Course, allCourses: Course[]): Course[] {
  return allCourses.filter((c) => {
    if (c.id === course.id) return false;
    const prereqCourse = findPrerequisiteCourse(c, allCourses);
    return prereqCourse && prereqCourse.id === course.id;
  });
}

/**
 * Returns minimum allowed semester for `course`.
 * If it has a prerequisite in semester S_p, this course must be in >= S_p + 1.
 */
export function getMinAllowedSemester(
  course: Course,
  allCourses: Course[],
  currentOverrides: Record<string, number>,
  originalSemMap: Record<string, number>
): { minSemester: number; prerequisiteCourse: Course | null } {
  const prereq = findPrerequisiteCourse(course, allCourses);
  if (!prereq) {
    return { minSemester: 1, prerequisiteCourse: null };
  }

  const prereqSemester = currentOverrides[prereq.id] || originalSemMap[prereq.id] || 1;
  return {
    minSemester: prereqSemester + 1,
    prerequisiteCourse: prereq,
  };
}

/**
 * Intelligently changes a course's semester while enforcing prerequisites and
 * automatically shifting downstream courses if needed (Cascade Shifting).
 *
 * Example: Moving English 1 from Sem 1 to Sem 2 automatically moves
 * English 2 to Sem 3, and English 3 to Sem 4.
 */
export interface CascadeResult {
  success: boolean;
  nextOverrides: Record<string, number>;
  errorMessage?: string;
  shiftedCourses: { course: Course; fromSem: number; toSem: number }[];
  highestSemester: number;
}

export function cascadeCourseSemesterChange(
  courseId: string,
  targetSemester: number,
  allCourses: Course[],
  currentOverrides: Record<string, number>,
  originalSemMap: Record<string, number>
): CascadeResult {
  const targetCourse = allCourses.find((c) => c.id === courseId);
  if (!targetCourse) {
    return {
      success: false,
      nextOverrides: currentOverrides,
      errorMessage: 'المقرر غير موجود',
      shiftedCourses: [],
      highestSemester: 5,
    };
  }

  // 1. Check if moving targetCourse violates its own prerequisite
  const { minSemester, prerequisiteCourse } = getMinAllowedSemester(
    targetCourse,
    allCourses,
    currentOverrides,
    originalSemMap
  );

  if (targetSemester < minSemester && prerequisiteCourse) {
    const prereqSem = currentOverrides[prerequisiteCourse.id] || originalSemMap[prerequisiteCourse.id] || 1;
    return {
      success: false,
      nextOverrides: currentOverrides,
      errorMessage: `لا يمكن نقل مقرر (${targetCourse.nameAr}) إلى الفصل ${targetSemester}؛ لأن متطلبه السابق (${prerequisiteCourse.nameAr}) موجود في الفصل ${prereqSem}. يجب أن يكون في الفصل ${prereqSem + 1} أو بعده.`,
      shiftedCourses: [],
      highestSemester: 5,
    };
  }

  // 2. Apply change and cascade downstream to dependent courses
  const nextOverrides = { ...currentOverrides, [courseId]: targetSemester };
  const shiftedCourses: { course: Course; fromSem: number; toSem: number }[] = [];

  function cascadeDownstream(currentCourse: Course, currentSem: number) {
    const dependents = findDependentCourses(currentCourse, allCourses);
    for (const dep of dependents) {
      const depCurrentSem = nextOverrides[dep.id] || originalSemMap[dep.id] || 1;
      const minRequired = currentSem + 1;

      if (depCurrentSem < minRequired) {
        shiftedCourses.push({
          course: dep,
          fromSem: depCurrentSem,
          toSem: minRequired,
        });
        nextOverrides[dep.id] = minRequired;
        // Recurse for courses that depend on this one
        cascadeDownstream(dep, minRequired);
      }
    }
  }

  cascadeDownstream(targetCourse, targetSemester);

  let highestSemester = targetSemester;
  for (const cid in nextOverrides) {
    if (nextOverrides[cid] > highestSemester) {
      highestSemester = nextOverrides[cid];
    }
  }

  return {
    success: true,
    nextOverrides,
    shiftedCourses,
    highestSemester,
  };
}

// -------------------------------------------------------------
// Effective Study Plan Builder
// -------------------------------------------------------------

export interface EffectivePlanResult {
  effectivePlan: StudyPlanData;
  originalSemesterMap: Record<string, number>;
  allCoursesList: Course[];
  hasOverrides: boolean;
  totalSemestersCount: number;
}

export function buildEffectiveStudyPlan(
  basePlan: StudyPlanData,
  overrides: Record<string, number>,
  extraSemesters: ExtraSemesterDef[] = []
): EffectivePlanResult {
  const originalSemesterMap: Record<string, number> = {};
  const allCoursesList: Course[] = [];

  for (const sem of basePlan.semesters) {
    for (const course of sem.courses) {
      originalSemesterMap[course.id] = sem.semesterNumber;
      allCoursesList.push(course);
    }
  }

  // Determine highest semester needed
  let highestSemester = Math.max(5, ...basePlan.semesters.map((s) => s.semesterNumber));
  for (const cid in overrides) {
    if (overrides[cid] > highestSemester) {
      highestSemester = overrides[cid];
    }
  }
  for (const extra of extraSemesters) {
    if (extra.semesterNumber > highestSemester) {
      highestSemester = extra.semesterNumber;
    }
  }

  // Create full semesters list up to highestSemester
  const semesterMap: Record<number, Semester> = {};

  // 1. Populate base semesters
  for (const sem of basePlan.semesters) {
    semesterMap[sem.semesterNumber] = {
      ...sem,
      courses: [],
    };
  }

  // 2. Populate extra configured semesters
  for (const extra of extraSemesters) {
    if (!semesterMap[extra.semesterNumber]) {
      semesterMap[extra.semesterNumber] = {
        semesterNumber: extra.semesterNumber,
        nameAr: extra.nameAr,
        nameEn: extra.nameEn,
        totalCreditHours: 0,
        totalContactHours: 0,
        courses: [],
      };
    }
  }

  // 3. Ensure any gap semesters exist
  const arabicOrdinalWords = [
    '',
    'الأول',
    'الثاني',
    'الثالث',
    'الرابع',
    'الخامس',
    'السادس',
    'السابع',
    'الثامن',
    'التاسع',
    'العاشر',
  ];

  for (let s = 1; s <= highestSemester; s++) {
    if (!semesterMap[s]) {
      const ordinal = arabicOrdinalWords[s] || `رقم ${s}`;
      semesterMap[s] = {
        semesterNumber: s,
        nameAr: `الفصل التدريبي ${ordinal}`,
        nameEn: `${s}th Semester`,
        totalCreditHours: 0,
        totalContactHours: 0,
        courses: [],
      };
    }
  }

  // 4. Distribute courses into semesters
  for (const course of allCoursesList) {
    const origSem = originalSemesterMap[course.id] || 1;
    const assignedSem = overrides[course.id] || origSem;
    const target = Math.max(1, assignedSem);

    if (!semesterMap[target]) {
      semesterMap[target] = {
        semesterNumber: target,
        nameAr: `الفصل التدريبي ${target}`,
        nameEn: `${target}th Semester`,
        totalCreditHours: 0,
        totalContactHours: 0,
        courses: [],
      };
    }

    semesterMap[target].courses.push(course);
  }

  // 5. Compute totals for each semester
  const sortedSemesters = Object.values(semesterMap)
    .sort((a, b) => a.semesterNumber - b.semesterNumber)
    .map((sem) => {
      const totalCreditHours = sem.courses.reduce((sum, c) => sum + c.creditHours, 0);
      const totalContactHours = sem.courses.reduce((sum, c) => sum + c.contactHours, 0);
      return {
        ...sem,
        totalCreditHours,
        totalContactHours,
      };
    });

  const hasOverrides = Object.keys(overrides).length > 0 || extraSemesters.length > 0;

  return {
    effectivePlan: {
      ...basePlan,
      semesters: sortedSemesters,
    },
    originalSemesterMap,
    allCoursesList,
    hasOverrides,
    totalSemestersCount: sortedSemesters.length,
  };
}
