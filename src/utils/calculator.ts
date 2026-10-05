import { StudyPlanData, CourseGradeState, SemesterCalculation, CumulativeCalculation } from '../types.ts';

// TVTC 5.0 Grading System
export const TVTC_GRADES = [
  { letter: 'A+', nameAr: 'ممتاز مرتفع (أ+)', minScore: 95, maxScore: 100, points: 5.0 },
  { letter: 'A', nameAr: 'ممتاز (أ)', minScore: 90, maxScore: 94, points: 4.75 },
  { letter: 'B+', nameAr: 'جيد جداً مرتفع (ب+)', minScore: 85, maxScore: 89, points: 4.5 },
  { letter: 'B', nameAr: 'جيد جداً (ب)', minScore: 80, maxScore: 84, points: 4.0 },
  { letter: 'C+', nameAr: 'جيد مرتفع (ج+)', minScore: 75, maxScore: 79, points: 3.5 },
  { letter: 'C', nameAr: 'جيد (ج)', minScore: 70, maxScore: 74, points: 3.0 },
  { letter: 'D+', nameAr: 'مقبول مرتفع (د+)', minScore: 65, maxScore: 69, points: 2.5 },
  { letter: 'D', nameAr: 'مقبول (د)', minScore: 60, maxScore: 64, points: 2.0 },
  { letter: 'F', nameAr: 'راسب (هـ)', minScore: 0, maxScore: 59, points: 1.0 },
];

export function getGradeFromScore(score: number) {
  const rounded = Math.round(score);
  if (rounded >= 95) return TVTC_GRADES[0];
  if (rounded >= 90) return TVTC_GRADES[1];
  if (rounded >= 85) return TVTC_GRADES[2];
  if (rounded >= 80) return TVTC_GRADES[3];
  if (rounded >= 75) return TVTC_GRADES[4];
  if (rounded >= 70) return TVTC_GRADES[5];
  if (rounded >= 65) return TVTC_GRADES[6];
  if (rounded >= 60) return TVTC_GRADES[7];
  return TVTC_GRADES[8];
}

export function getGradeByLetter(letter: string) {
  return TVTC_GRADES.find(g => g.letter === letter) || null;
}

export function calculateSemesterGPA(
  semesterNumber: number,
  studyPlan: StudyPlanData,
  gradesMap: Record<string, CourseGradeState>
): SemesterCalculation {
  const semester = studyPlan.semesters.find(s => s.semesterNumber === semesterNumber);
  if (!semester) {
    return {
      semesterNumber,
      nameAr: `الفصل ${semesterNumber}`,
      totalHours: 0,
      registeredHours: 0,
      completedHours: 0,
      totalPoints: 0,
      termGpa: 0,
    };
  }

  let registeredHours = 0;
  let completedHours = 0;
  let totalPoints = 0;

  for (const course of semester.courses) {
    const gradeState = gradesMap[course.id];
    if (gradeState && gradeState.status === 'completed' && gradeState.gradePoints !== undefined && gradeState.gradePoints !== null) {
      const crh = course.creditHours;
      registeredHours += crh;
      if (gradeState.gradePoints >= 2.0) {
        completedHours += crh;
      }
      totalPoints += gradeState.gradePoints * crh;
    } else if (gradeState && gradeState.status === 'in-progress') {
      registeredHours += course.creditHours;
    }
  }

  const termGpa = registeredHours > 0 ? Number((totalPoints / registeredHours).toFixed(2)) : 0;

  return {
    semesterNumber,
    nameAr: semester.nameAr,
    totalHours: semester.totalCreditHours,
    registeredHours,
    completedHours,
    totalPoints: Number(totalPoints.toFixed(2)),
    termGpa,
  };
}

export function calculateCumulativeGPA(
  studyPlan: StudyPlanData,
  gradesMap: Record<string, CourseGradeState>
): CumulativeCalculation {
  const totalDegreeHours = studyPlan.program.totalCreditHours || 71;
  let totalPointsEarned = 0;
  let totalHoursCounted = 0;
  let totalCompletedHours = 0;

  for (const semester of studyPlan.semesters) {
    for (const course of semester.courses) {
      const gradeState = gradesMap[course.id];
      if (gradeState && gradeState.status === 'completed' && gradeState.gradePoints !== undefined && gradeState.gradePoints !== null) {
        const crh = course.creditHours;
        totalHoursCounted += crh;
        totalPointsEarned += gradeState.gradePoints * crh;
        if (gradeState.gradePoints >= 2.0) {
          totalCompletedHours += crh;
        }
      }
    }
  }

  const cumulativeGpa = totalHoursCounted > 0 ? Number((totalPointsEarned / totalHoursCounted).toFixed(2)) : 0;
  const percentage = cumulativeGpa > 0 ? Number(((cumulativeGpa / 5.0) * 100).toFixed(1)) : 0;

  // TVTC Rating
  let ratingAr = 'لم يسجل درجات';
  let honorsDegree: string | null = null;

  if (totalHoursCounted > 0) {
    if (cumulativeGpa >= 4.75) {
      ratingAr = 'ممتاز مرتفع';
      honorsDegree = 'مرتبة الشرف الأولى 🥇';
    } else if (cumulativeGpa >= 4.50) {
      ratingAr = 'ممتاز';
      honorsDegree = 'مرتبة الشرف الثانية 🥈';
    } else if (cumulativeGpa >= 3.75) {
      ratingAr = 'جيد جداً';
    } else if (cumulativeGpa >= 2.75) {
      ratingAr = 'جيد';
    } else if (cumulativeGpa >= 2.00) {
      ratingAr = 'مقبول';
    } else {
      ratingAr = 'راسب / تحت الملاحظة الأكاديمية';
    }
  }

  const completionRate = Math.min(100, Math.round((totalCompletedHours / totalDegreeHours) * 100));

  return {
    totalDegreeHours,
    totalCompletedHours,
    totalPointsEarned: Number(totalPointsEarned.toFixed(2)),
    cumulativeGpa,
    scale: 5.0,
    percentage,
    ratingAr,
    honorsDegree,
    completionRate,
  };
}

export function findCourseSemester(courseId: string, studyPlan: StudyPlanData): number {
  for (const sem of studyPlan.semesters) {
    if (sem.courses.some((c) => c.id === courseId)) {
      return sem.semesterNumber;
    }
  }
  return 1;
}
