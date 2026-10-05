import {
  fetchUserGrades,
  upsertUserGrades,
  clearUserGrades,
  clearUserSemesterGrades,
  clearUserSingleCourseGrade,
} from './db.ts';
import fs from 'fs';
import path from 'path';

export async function getUserGrades(userId: number) {
  const records = await fetchUserGrades(userId);
  return records.map((r) => ({
    courseId: r.course_id,
    semesterNumber: r.semester_number,
    gradeLetter: r.grade_letter,
    numericalScore: r.numerical_score,
    gradePoints: r.grade_points,
    status: r.status,
  }));
}

export async function saveUserGrades(
  userId: number,
  gradesList: Array<{
    courseId: string;
    semesterNumber: number;
    gradeLetter?: string;
    numericalScore?: number;
    gradePoints?: number;
    status?: string;
  }>
) {
  await upsertUserGrades(userId, gradesList);
  return getUserGrades(userId);
}

export async function resetUserGrades(userId: number) {
  await clearUserGrades(userId);
  return [];
}

export async function resetSemesterGrades(userId: number, semesterNumber: number) {
  let courseIds: string[] = [];
  try {
    const plan = getStudyPlan();
    const sem = plan.semesters?.find((s: any) => s.semesterNumber === semesterNumber);
    if (sem && Array.isArray(sem.courses)) {
      courseIds = sem.courses.map((c: any) => c.id);
    }
  } catch (err) {
    console.error('Error finding semester courses in plan:', err);
  }
  await clearUserSemesterGrades(userId, semesterNumber, courseIds);
  return getUserGrades(userId);
}

export async function resetSingleCourseGrade(userId: number, courseId: string) {
  await clearUserSingleCourseGrade(userId, courseId);
  return getUserGrades(userId);
}

export function getStudyPlan() {
  const planPath = path.join(process.cwd(), 'src/data/study_plan.json');
  if (fs.existsSync(planPath)) {
    return JSON.parse(fs.readFileSync(planPath, 'utf8'));
  }
  const rootPlan = path.join(process.cwd(), 'study_plan.json');
  return JSON.parse(fs.readFileSync(rootPlan, 'utf8'));
}
