import { MajorInfo, COMMON_GRADING_SYSTEM } from '../data/all_majors.ts';
import { Course, Semester, StudyPlanData } from '../types.ts';

const CUSTOM_MAJORS_KEY = 'tvtc_custom_majors';

/**
 * Loads all custom majors created by users from localStorage.
 */
export function loadLocalCustomMajors(): MajorInfo[] {
  try {
    const raw = localStorage.getItem(CUSTOM_MAJORS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list;
      }
    }
  } catch (err) {
    console.error('Error loading custom majors from localStorage:', err);
  }
  return [];
}

/**
 * Saves or updates a custom major in localStorage and optionally syncs with backend.
 */
export async function saveCustomMajor(major: MajorInfo, token?: string): Promise<MajorInfo[]> {
  const current = loadLocalCustomMajors();
  const index = current.findIndex((m) => m.id === major.id);

  let updated: MajorInfo[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...major, isCustom: true };
  } else {
    updated = [{ ...major, isCustom: true }, ...current];
  }

  try {
    localStorage.setItem(CUSTOM_MAJORS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save custom majors to localStorage:', err);
  }

  // Try saving to backend database if token is available
  if (token) {
    try {
      await fetch('/api/custom-majors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ major: { ...major, isCustom: true } }),
      });
    } catch {
      // Ignore network errors in local/static mode
    }
  }

  return updated;
}

/**
 * Deletes a custom major by ID.
 */
export async function deleteCustomMajor(id: string, token?: string): Promise<MajorInfo[]> {
  const current = loadLocalCustomMajors();
  const updated = current.filter((m) => m.id !== id);

  try {
    localStorage.setItem(CUSTOM_MAJORS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update custom majors in localStorage:', err);
  }

  if (token) {
    try {
      await fetch(`/api/custom-majors/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore
    }
  }

  return updated;
}

/**
 * Sync custom majors from server database if available.
 */
export async function syncCustomMajorsFromServer(token: string): Promise<MajorInfo[]> {
  try {
    const res = await fetch('/api/custom-majors', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.majors) && data.majors.length > 0) {
        const local = loadLocalCustomMajors();
        const mergedMap = new Map<string, MajorInfo>();
        local.forEach((m) => mergedMap.set(m.id, m));
        data.majors.forEach((m: MajorInfo) => mergedMap.set(m.id, { ...m, isCustom: true }));
        const merged = Array.from(mergedMap.values());
        localStorage.setItem(CUSTOM_MAJORS_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch {
    // Offline or static hosting
  }
  return loadLocalCustomMajors();
}

/**
 * Creates a fully formed MajorInfo object from user input.
 */
export function createCustomMajorObject(params: {
  nameAr: string;
  nameEn?: string;
  department: string;
  code?: string;
  semestersCount?: number;
  courses: Array<{
    id?: string;
    code: string;
    arabicCode: string;
    nameAr: string;
    nameEn?: string;
    creditHours: number;
    contactHours?: number;
    lectureHours?: number;
    practicalHours?: number;
    tutorialHours?: number;
    prerequisite?: string | null;
    semesterNumber: number;
  }>;
}): MajorInfo {
  const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const cleanNameAr = params.nameAr.trim();
  const cleanNameEn = params.nameEn?.trim() || 'Custom Diploma Program';
  const cleanDept = params.department.trim() || 'الكلية التقنية';
  const cleanCode = params.code?.trim().toUpperCase() || 'SPEC';
  const numSemesters = Math.max(1, params.semestersCount || 5);

  const semestersMap: Record<number, Semester> = {};
  const ordinalNames = [
    '',
    'الأول',
    'الثاني',
    'الثالث',
    'الرابع',
    'الخامس',
    'السادس',
    'السابع',
    'الثامن',
  ];

  for (let i = 1; i <= numSemesters; i++) {
    const ord = ordinalNames[i] || `${i}`;
    semestersMap[i] = {
      semesterNumber: i,
      nameAr: `الفصل التدريبي ${ord}`,
      nameEn: `${i}th Semester`,
      totalCreditHours: 0,
      totalContactHours: 0,
      courses: [],
    };
  }

  for (const c of params.courses) {
    const sNum = Math.max(1, c.semesterNumber || 1);
    if (!semestersMap[sNum]) {
      semestersMap[sNum] = {
        semesterNumber: sNum,
        nameAr: `الفصل التدريبي ${sNum}`,
        nameEn: `${sNum}th Semester`,
        totalCreditHours: 0,
        totalContactHours: 0,
        courses: [],
      };
    }

    const crh = Math.max(1, c.creditHours || 3);
    const coh = Math.max(crh, c.contactHours || crh);

    const newCourse: Course = {
      id: c.id || `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code: c.code.trim() || 'CRS',
      arabicCode: c.arabicCode.trim() || c.code.trim(),
      nameAr: c.nameAr.trim(),
      nameEn: c.nameEn?.trim() || c.nameAr.trim(),
      creditHours: crh,
      lectureHours: c.lectureHours ?? crh,
      practicalHours: c.practicalHours ?? (coh - crh),
      tutorialHours: c.tutorialHours ?? 0,
      contactHours: coh,
      prerequisite: c.prerequisite?.trim() || null,
    };

    semestersMap[sNum].courses.push(newCourse);
  }

  const semesters = Object.values(semestersMap).sort(
    (a, b) => a.semesterNumber - b.semesterNumber
  );

  let totalCreditHours = 0;
  let totalContactHours = 0;

  for (const s of semesters) {
    s.totalCreditHours = s.courses.reduce((sum, c) => sum + c.creditHours, 0);
    s.totalContactHours = s.courses.reduce((sum, c) => sum + c.contactHours, 0);
    totalCreditHours += s.totalCreditHours;
    totalContactHours += s.totalContactHours;
  }

  const plan: StudyPlanData = {
    program: {
      title: cleanNameAr,
      englishTitle: cleanNameEn,
      department: cleanDept,
      institution: 'المؤسسة العامة للتدريب التقني والمهني',
      degree: 'دبلوم الكليات التقنية',
      sasced_p: '000000',
      sasced_l: '554',
      totalCreditHours: totalCreditHours || 70,
      totalContactHours: totalContactHours || 1800,
      gradingSystem: COMMON_GRADING_SYSTEM,
    },
    semesters,
  };

  return {
    id,
    nameAr: cleanNameAr,
    nameEn: cleanNameEn,
    department: cleanDept,
    code: cleanCode,
    sascedP: '000000',
    totalCreditHours: totalCreditHours || 70,
    totalContactHours: totalContactHours || 1800,
    badge: 'خطة مخصصة',
    description: `خطة دراسية مخصصة لمتدرب ${cleanNameAr} بالكلية التقنية، تتضمن ${semesters.length} فصول تدريبية و ${totalCreditHours} ساعة معتمدة.`,
    iconType: 'custom',
    gradient: 'from-[#004e2d] via-emerald-800 to-slate-900',
    plan,
    isCustom: true,
  };
}

/**
 * Pre-defined popular TVTC Major Templates for fast creation by students.
 */
export const POPULAR_MAJOR_TEMPLATES = [
  {
    nameAr: 'تقنية الإدارة المكتبية',
    nameEn: 'Office Management Technology',
    department: 'قسم التقنية الإدارية والمالية',
    code: 'OMT',
    coursesCount: 22,
    sampleCourses: [
      { nameAr: 'مقدمة في الأعمال', arabicCode: '101 إدار', code: 'BUS 101', creditHours: 3, semesterNumber: 1, prerequisite: null },
      { nameAr: 'مهارات الاتصال', arabicCode: '101 عرب', code: 'COMM 101', creditHours: 2, semesterNumber: 1, prerequisite: null },
      { nameAr: 'تطبيقات الحاسب المكتبي 1', arabicCode: '101 حاسب', code: 'COMP 101', creditHours: 3, semesterNumber: 1, prerequisite: null },
      { nameAr: 'لغة إنجليزية 1', arabicCode: '101 انجل', code: 'ENG 101', creditHours: 3, semesterNumber: 1, prerequisite: null },
      { nameAr: 'إدارة المكاتب 1', arabicCode: '102 إدار', code: 'OFC 101', creditHours: 3, semesterNumber: 2, prerequisite: '101 إدار' },
      { nameAr: 'لغة إنجليزية 2', arabicCode: '102 انجل', code: 'ENG 102', creditHours: 3, semesterNumber: 2, prerequisite: '101 انجل' },
      { nameAr: 'إدارة المكاتب المتقدمة', arabicCode: '201 إدار', code: 'OFC 201', creditHours: 4, semesterNumber: 3, prerequisite: '102 إدار' },
      { nameAr: 'أتمتة المكاتب', arabicCode: '202 حاسب', code: 'COMP 202', creditHours: 3, semesterNumber: 3, prerequisite: '101 حاسب' },
      { nameAr: 'إدارة السجلات والوثائق', arabicCode: '203 إدار', code: 'DOC 201', creditHours: 3, semesterNumber: 4, prerequisite: '201 إدار' },
      { nameAr: 'مشروع التخرج المكتبي', arabicCode: '299 إدار', code: 'PROJ 299', creditHours: 4, semesterNumber: 5, prerequisite: 'اجتياز 45 ساعة' },
    ],
  },
  {
    nameAr: 'تقنية المحاسبة',
    nameEn: 'Accounting Technology',
    department: 'قسم التقنية الإدارية والمالية',
    code: 'ACCT',
    coursesCount: 24,
    sampleCourses: [
      { nameAr: 'مبادئ المحاسبة المالية 1', arabicCode: '101 حسب', code: 'ACC 101', creditHours: 4, semesterNumber: 1, prerequisite: null },
      { nameAr: 'رياضيات الأعمال', arabicCode: '101 مال', code: 'MATH 101', creditHours: 3, semesterNumber: 1, prerequisite: null },
      { nameAr: 'لغة إنجليزية 1', arabicCode: '101 انجل', code: 'ENG 101', creditHours: 3, semesterNumber: 1, prerequisite: null },
      { nameAr: 'مبادئ المحاسبة المالية 2', arabicCode: '102 حسب', code: 'ACC 102', creditHours: 4, semesterNumber: 2, prerequisite: '101 حسب' },
      { nameAr: 'محاسبة التكاليف', arabicCode: '201 حسب', code: 'ACC 201', creditHours: 4, semesterNumber: 3, prerequisite: '102 حسب' },
      { nameAr: 'المحاسبة الحكومية', arabicCode: '202 حسب', code: 'ACC 202', creditHours: 3, semesterNumber: 3, prerequisite: '102 حسب' },
      { nameAr: 'محاسبة الشركات', arabicCode: '203 حسب', code: 'ACC 203', creditHours: 4, semesterNumber: 4, prerequisite: '201 حسب' },
      { nameAr: 'المراجعة والرقابة المالية', arabicCode: '204 حسب', code: 'AUD 201', creditHours: 3, semesterNumber: 4, prerequisite: '203 حسب' },
      { nameAr: 'الأنظمة المحاسبية المحوسبة', arabicCode: '205 حسب', code: 'ACC 205', creditHours: 3, semesterNumber: 5, prerequisite: '201 حسب' },
    ],
  },
  {
    nameAr: 'تقنية القوى الكهربائية',
    nameEn: 'Electrical Power Technology',
    department: 'قسم التقنية الكهربائية',
    code: 'POWR',
    coursesCount: 23,
    sampleCourses: [
      { nameAr: 'أسس الهندسة الكهربائية', arabicCode: '101 كهرب', code: 'EE 101', creditHours: 4, semesterNumber: 1, prerequisite: null },
      { nameAr: 'السلامة المهنية الكهربائية', arabicCode: '102 كهرب', code: 'SAF 101', creditHours: 2, semesterNumber: 1, prerequisite: null },
      { nameAr: 'دوائر التيار المتردد', arabicCode: '103 كهرب', code: 'EE 102', creditHours: 4, semesterNumber: 2, prerequisite: '101 كهرب' },
      { nameAr: 'آلات التيار المستمر والمحولات', arabicCode: '201 كهرب', code: 'EE 201', creditHours: 4, semesterNumber: 3, prerequisite: '103 كهرب' },
      { nameAr: 'التمديدات الكهربائية الصناعية', arabicCode: '202 كهرب', code: 'EE 202', creditHours: 4, semesterNumber: 3, prerequisite: '103 كهرب' },
      { nameAr: 'توليد ونقل الطاقة الكهربائية', arabicCode: '203 كهرب', code: 'EE 203', creditHours: 3, semesterNumber: 4, prerequisite: '201 كهرب' },
      { nameAr: 'التحكم الآلي والمتحكمات المنطقية', arabicCode: '204 كهرب', code: 'PLC 201', creditHours: 4, semesterNumber: 5, prerequisite: '201 كهرب' },
    ],
  },
];
