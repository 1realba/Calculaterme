import { StudyPlanData, Course } from '../types.ts';

const CUSTOM_PLAN_PREFIX = 'tvtc_custom_plan_';

export function getCustomPlanKey(userId: number, majorId: string): string {
  return `${CUSTOM_PLAN_PREFIX}${userId}_${majorId}`;
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

export interface EffectivePlanResult {
  effectivePlan: StudyPlanData;
  originalSemesterMap: Record<string, number>;
  allCoursesList: Course[];
  hasOverrides: boolean;
}

export function buildEffectiveStudyPlan(
  basePlan: StudyPlanData,
  overrides: Record<string, number>
): EffectivePlanResult {
  const originalSemesterMap: Record<string, number> = {};
  const allCoursesList: Course[] = [];

  for (const sem of basePlan.semesters) {
    for (const course of sem.courses) {
      originalSemesterMap[course.id] = sem.semesterNumber;
      allCoursesList.push(course);
    }
  }

  const hasOverrides = Object.keys(overrides).length > 0;

  if (!hasOverrides) {
    return {
      effectivePlan: basePlan,
      originalSemesterMap,
      allCoursesList,
      hasOverrides: false,
    };
  }

  // Group courses by overridden or original semester (1..5)
  const semesterCourses: Record<number, Course[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  };

  for (const course of allCoursesList) {
    const origSem = originalSemesterMap[course.id] || 1;
    const assignedSem = overrides[course.id] || origSem;
    const target = Math.max(1, Math.min(5, assignedSem));
    semesterCourses[target].push(course);
  }

  const updatedSemesters = basePlan.semesters.map((sem) => {
    const courses = semesterCourses[sem.semesterNumber] || [];
    const totalCreditHours = courses.reduce((sum, c) => sum + c.creditHours, 0);
    const totalContactHours = courses.reduce((sum, c) => sum + c.contactHours, 0);

    return {
      ...sem,
      courses,
      totalCreditHours,
      totalContactHours,
    };
  });

  return {
    effectivePlan: {
      ...basePlan,
      semesters: updatedSemesters,
    },
    originalSemesterMap,
    allCoursesList,
    hasOverrides: true,
  };
}
