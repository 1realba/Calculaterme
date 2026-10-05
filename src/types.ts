export interface Course {
  id: string;
  code: string;
  arabicCode: string;
  nameAr: string;
  nameEn: string;
  creditHours: number;
  lectureHours: number;
  practicalHours: number;
  tutorialHours: number;
  contactHours: number;
  prerequisite: string | null;
}

export interface Semester {
  semesterNumber: number;
  nameAr: string;
  nameEn: string;
  totalCreditHours: number;
  totalContactHours: number;
  courses: Course[];
}

export interface GradeDefinition {
  letter: string;
  nameAr: string;
  minScore: number;
  maxScore: number;
  points: number;
}

export interface ProgramInfo {
  title: string;
  englishTitle: string;
  department: string;
  institution: string;
  degree: string;
  sasced_p: string;
  sasced_l: string;
  totalCreditHours: number;
  totalContactHours: number;
  gradingSystem: {
    scale: number;
    grades: GradeDefinition[];
  };
}

export interface StudyPlanData {
  program: ProgramInfo;
  semesters: Semester[];
}

export interface CourseGradeState {
  courseId: string;
  semesterNumber: number;
  gradeLetter?: string; // 'A+', 'A', 'B+', etc.
  numericalScore?: number; // 0 - 100
  gradePoints?: number; // 5.0, 4.75, etc.
  status: 'completed' | 'in-progress' | 'not-taken';
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  studentId?: string;
  createdAt?: string;
}

export interface PasswordCriteria {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  hasNoSpaces: boolean;
  isEnglishOnly: boolean;
}

export interface SemesterCalculation {
  semesterNumber: number;
  nameAr: string;
  totalHours: number;
  registeredHours: number;
  completedHours: number;
  totalPoints: number;
  termGpa: number;
}

export interface CumulativeCalculation {
  totalDegreeHours: number;
  totalCompletedHours: number;
  totalPointsEarned: number;
  cumulativeGpa: number;
  scale: number;
  percentage: number;
  ratingAr: string;
  honorsDegree: string | null;
  completionRate: number;
}
