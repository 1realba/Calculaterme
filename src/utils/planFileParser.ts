import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch (e) {
    console.warn('PDF.js worker initialization notice:', e);
  }
}

export interface ParsedCourseItem {
  id: string;
  nameAr: string;
  nameEn?: string;
  code: string;
  arabicCode: string;
  creditHours: number;
  contactHours: number;
  semesterNumber: number;
  prerequisite: string;
}

export interface ParsedPlanResult {
  success: boolean;
  majorNameAr: string;
  majorNameEn?: string;
  departmentAr?: string;
  courses: ParsedCourseItem[];
  warnings: string[];
  rawTextPreview?: string;
}

// Arabic words for semester detection
const SEMESTER_KEYWORDS: Record<number, RegExp> = {
  1: /(?:الفصل|المستوى|الترم)\s*(?:التدريبي\s*)?(?:الأول|الاول|1|واحد)|(?:1st\s*Semester)/i,
  2: /(?:الفصل|المستوى|الترم)\s*(?:التدريبي\s*)?(?:الثاني|2|اثنين)|(?:2nd\s*Semester)/i,
  3: /(?:الفصل|المستوى|الترم)\s*(?:التدريبي\s*)?(?:الثالث|3|ثلاثة)|(?:3rd\s*Semester)/i,
  4: /(?:الفصل|المستوى|الترم)\s*(?:التدريبي\s*)?(?:الرابع|4|اربعة)|(?:4th\s*Semester)/i,
  5: /(?:الفصل|المستوى|الترم)\s*(?:التدريبي\s*)?(?:الخامس|5|خمسة)|(?:5th\s*Semester)/i,
  6: /(?:الفصل|المستوى|الترم)\s*(?:التدريبي\s*)?(?:السادس|6|ستة|الصيفي)|(?:Summer|6th\s*Semester)/i,
  7: /(?:الفصل|المستوى|الترم)\s*(?:التدريبي\s*)?(?:السابع|7)|(?:7th\s*Semester)/i,
  8: /(?:الفصل|المستوى|الترم)\s*(?:التدريبي\s*)?(?:الثامن|8)|(?:8th\s*Semester)/i,
};

/**
 * Clean and normalize text extracted from PDF or files
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // invisible zero-width chars
    .trim();
}

/**
 * Clean Arabic typographic anomalies and ligatures common in TVTC PDF exports
 */
export function cleanArabicDisplay(text: string): string {
  if (!text) return '';
  return text
    .replace(/\u0640/g, '') // tatweel
    .replace(/امل/g, 'الم')
    .replace(/املهنية/g, 'المهنية')
    .replace(/السالمة/g, 'السلامة')
    .replace(/االستجابة/g, 'الاستجابة')
    .replace(/االحياء/g, 'الأحياء')
    .replace(/االعمال/g, 'الأعمال')
    .replace(/االسالمية/g, 'الإسلامية')
    .replace(/االمراة/g, 'الأمراض')
    .replace(/االنسان/g, 'الإنسان')
    .replace(/اإلخالء/g, 'الإخلاء')
    .replace(/اإلسعافات/g, 'الإسعافات')
    .replace(/األولي/g, 'الأولية')
    .replace(/األولية/g, 'الأولية')
    .replace(/التدرييب/g, 'التدريبي')
    .replace(/الثاين/g, 'الثاني')
    .replace(/األول/g, 'الأول')
    .replace(/اخلامس/g, 'الخامس')
    .replace(/اجملموع/g, 'المجموع')
    .replace(/املنهي/g, 'المهني')
    .replace(/االلي/g, 'الآلي')
    .replace(/السم وم/g, 'السموم')
    .replace(/سالمة بيئة العمل/g, 'سلامة بيئة العمل')
    .replace(/العوالم البشرية/g, 'العوامل البشرية')
    .replace(/الأوليةة/g, 'الأولية')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize and beautify extracted course titles
 */
function normalizeCourseName(name: string, engCode: string): string {
  let cleaned = cleanArabicDisplay(name);

  // Standardize English course titles (1), (2), (3)
  if (cleaned.includes('لغة إنجليزية') || cleaned.includes('انجليزية')) {
    if (engCode.endsWith('101')) return 'لغة إنجليزية (1)';
    if (engCode.endsWith('102')) return 'لغة إنجليزية (2)';
    if (engCode.endsWith('103')) return 'لغة إنجليزية (3)';
    if (engCode.endsWith('104')) return 'لغة إنجليزية (4)';
  }

  // Cooperative training
  if (engCode.includes('299') || cleaned.includes('التعاوني')) {
    return 'التدريب التعاوني';
  }

  // Remove accidental trailing digits, brackets, or code numbers
  cleaned = cleaned.replace(/[\(\)\-\:\s\d]+$/, '').trim();

  // Project course name fallback
  if (cleaned.length < 2 || cleaned === 'Project') {
    if (engCode.includes('291') || engCode.includes('290')) {
      return 'مشروع التخرج';
    }
  }

  return cleaned;
}

/**
 * Detect Major Name from text, with strict exclusion of page numbers and debug markers
 */
function extractMajorName(text: string, fallbackName: string): string {
  const patterns = [
    /(?:التخصص|تخصص)\s*[:：\-]\s*([^\n\r,،]+)/i,
    /(?:الخطة التدريبية لتخصص|الخطة التدريبية لقسم|خطة دبلوم)\s*[:：\-]?\s*([^\n\r,،]+)/i,
    /(?:دبلوم)\s+([^\n\r,،]+)/i,
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      let cleaned = match[1]
        .replace(/---.*?---/g, '')
        .replace(/صفحة\s*\d+/g, '')
        .replace(/\b14\d{2}\b/g, '')
        .replace(/\b20\d{2}\b/g, '')
        .replace(/المملكة العربية السعودية|المؤسسة العامة للتدريب التقني والمهني|الإدارة العامة للمناهج|القسم/g, '')
        .replace(/[:：\-\_]/g, ' ')
        .trim();

      // Reject invalid or debug titles
      if (
        cleaned.length >= 3 &&
        cleaned.length <= 60 &&
        !cleaned.includes('صفحة') &&
        !cleaned.includes('--') &&
        !/^\d+$/.test(cleaned)
      ) {
        return cleanArabicDisplay(cleaned);
      }
    }
  }

  // Clean fallback from filename
  const cleanFallback = fallbackName
    .replace(/\.(pdf|xlsx|xls|csv|txt|json)$/i, '')
    .replace(/الخطة التفصيلية لتخصص|الخطة التدريبية لتخصص|الخطة التدريبية لـ|دبلوم كليات|دبلوم الكليات|نصفي/g, '')
    .replace(/[-_]/g, ' ')
    .trim();

  return cleanArabicDisplay(cleanFallback) || 'تخصص تدريبي مستورد';
}

/**
 * High-Precision TVTC Official Curriculum Guidebook Parser
 * Extracts courses, credit hours, contact hours, and prerequisites from standard TVTC booklets
 */
async function extractTVTCBookletPlan(
  doc: any,
  fallbackName: string
): Promise<ParsedPlanResult | null> {
  let majorName = '';
  let department = '';
  const totalPages = doc.numPages;

  // 1. Scan initial pages (1 to 6) for official Major Name & Department
  const scanLimit = Math.min(totalPages, 6);
  for (let p = 1; p <= scanLimit; p++) {
    try {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const pageText = tc.items.map((it: any) => ('str' in it ? it.str : '')).join(' ');

      if (!majorName) {
        const mMatch = pageText.match(/التخصص\s*[:\s]+([^\n\r\d]{4,50})/);
        if (mMatch) {
          let raw = mMatch[1]
            .replace(/اململكة|المملكة|القسم|الادارة|الإدارة|لمناهج|للمناهج|العامة|108|صفحة/g, '')
            .trim();
          if (raw.length > 3) majorName = cleanArabicDisplay(raw);
        }
      }

      if (!department) {
        const dMatch = pageText.match(/القسم\s*[:\s]+([^\n\r\d]{4,40})/);
        if (dMatch) {
          let raw = dMatch[1]
            .replace(/اململكة|المملكة|التخصص|الادارة|الإدارة|العربية|السعودية|المؤسسة|العامة|صفحة/g, '')
            .trim();
          if (raw.length > 3) department = cleanArabicDisplay(raw);
        }
      }
    } catch {
      // Continue scanning
    }
  }

  // 2. Locate Curriculum Framework pages (usually pages 6-12 in TVTC booklets)
  const frameworkPages: number[] = [];
  const searchLimit = Math.min(totalPages, 18);
  for (let p = 5; p <= searchLimit; p++) {
    try {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const str = tc.items.map((it: any) => ('str' in it ? it.str : '')).join(' ');
      if (
        str.includes('Curriculum Framework') ||
        str.includes('توزيع الخطة التدريبية') ||
        str.includes('توزيع اخلطة التدريبية') ||
        (str.includes('Semester') && (str.includes('CRH') || str.includes('CTH')))
      ) {
        frameworkPages.push(p);
      }
    } catch {
      // Continue
    }
  }

  // If no framework pages were found, return null to allow other parsers to run
  if (frameworkPages.length === 0) {
    return null;
  }

  const courses: ParsedCourseItem[] = [];
  let currentSemester = 1;

  for (const p of frameworkPages) {
    try {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();

      // Group text items by visual line (Y coordinate with ±4px tolerance)
      const lineMap = new Map<number, Array<{ str: string; x: number; y: number }>>();
      for (const item of tc.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        const x = Math.round(item.transform[4]);

        let foundY: number | null = null;
        for (const existingY of lineMap.keys()) {
          if (Math.abs(existingY - y) <= 4) {
            foundY = existingY;
            break;
          }
        }

        const targetY = foundY !== null ? foundY : y;
        if (!lineMap.has(targetY)) lineMap.set(targetY, []);
        lineMap.get(targetY)!.push({ str: item.str.trim(), x, y });
      }

      // Sort lines top to bottom (PDF Y coordinate descends)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

      for (let lineIdx = 0; lineIdx < sortedYs.length; lineIdx++) {
        const y = sortedYs[lineIdx];
        const items = lineMap.get(y)!;
        items.sort((a, b) => a.x - b.x);
        const lineStr = items.map((it) => it.str).join(' ');

        // Detect end of a semester table: Total Number of Units / المجموع
        if (
          /Total Number of Units|املجموع|المجموع/i.test(lineStr) &&
          !lineStr.includes('Semesters Units') &&
          !lineStr.includes('الكلي')
        ) {
          currentSemester++;
          continue;
        }

        // English Course Code: located at x around 75-145 (e.g. ENGL 101, OSHA 141)
        const engCodeItem = items.find(
          (it) => it.x >= 75 && it.x <= 145 && /^[A-Z]{3,5}\s*\d{3}$/.test(it.str)
        );

        if (engCodeItem) {
          const rawCode = engCodeItem.str;
          const engCode = rawCode.replace(/^([A-Z]+)(\d+)$/, '$1 $2');

          // English Course Name: items at x between 140 and 300
          const engNameItems = items.filter(
            (it) => it.x >= 140 && it.x < 300 && !/^[A-Z]{3,5}\s*\d{3}$/.test(it.str)
          );
          const engName = engNameItems.map((it) => it.str).join(' ');

          // Prerequisite items: check on this line at x between 300 and 358
          let prereqCodes: string[] = [];
          const prereqEngItems = items.filter(
            (it) => it.x >= 300 && it.x < 358 && /[A-Z]{3,5}\s*\d{3}/.test(it.str)
          );
          prereqCodes.push(
            ...prereqEngItems.map((it) => it.str.replace(/^([A-Z]+)(\d+)$/, '$1 $2'))
          );

          // If prereq was not on this line (often multiline in PDF cells), check adjacent ±14px lines
          if (prereqCodes.length === 0) {
            for (const offset of [-1, 1]) {
              const neighborY = sortedYs[lineIdx + offset];
              if (neighborY && Math.abs(neighborY - y) <= 16) {
                const neighborItems = lineMap.get(neighborY) || [];
                // Look for orphan prereq code items at x: 300-358 without their own course code
                const hasCourseCode = neighborItems.some(
                  (it) => it.x >= 75 && it.x <= 145 && /^[A-Z]{3,5}\s*\d{3}$/.test(it.str)
                );
                if (!hasCourseCode) {
                  const orphanPrereqs = neighborItems.filter(
                    (it) => it.x >= 295 && it.x <= 360 && /[A-Z]{3,5}\s*\d{3}/.test(it.str)
                  );
                  prereqCodes.push(
                    ...orphanPrereqs.map((it) => it.str.replace(/^([A-Z]+)(\d+)$/, '$1 $2'))
                  );
                }
              }
            }
          }

          let prereq = prereqCodes.length > 0 ? prereqCodes.join(' / ') : 'لا يوجد';

          // Credit Hours & Contact Hours
          let crh = 3;
          let cth = 3;

          const isCoop =
            engCode.includes('299') ||
            engName.toLowerCase().includes('co - operative') ||
            engName.toLowerCase().includes('cooperative') ||
            lineStr.includes('التدريب التعاوني');

          if (isCoop) {
            crh = 2;
            cth = 280;
            currentSemester = 5;
          } else {
            // CRH is at x: 355-375
            const crhItem = items.find((it) => it.x >= 355 && it.x <= 375 && /^[1-6]$/.test(it.str));
            if (crhItem) crh = Number(crhItem.str);

            // CTH is at x: 475-495
            const cthItem = items.find((it) => it.x >= 475 && it.x <= 495 && /^[1-8]$/.test(it.str));
            if (cthItem) cth = Number(cthItem.str);
            else cth = crh;
          }

          // Arabic Name items: x between 550 and 718
          const arNameItems = items.filter(
            (it) =>
              it.x >= 550 &&
              it.x <= 718 &&
              !/^[أ-ي]{3,5}$/.test(it.str) &&
              !/^\d+$/.test(it.str)
          );
          let arName = arNameItems.map((it) => it.str).join(' ');

          // Arabic Code items: x between 718 and 765
          const arCodeItems = items.filter((it) => it.x >= 718 && it.x <= 765);
          let arCode = arCodeItems.map((it) => it.str).join(' ');
          if (!arCode) arCode = engCode;

          arName = normalizeCourseName(arName || engName, engCode);

          if (!courses.some((c) => c.code === engCode)) {
            courses.push({
              id: `tvtc_${engCode.replace(/\s+/g, '_')}_${courses.length + 1}`,
              nameAr: arName,
              nameEn: engName,
              code: engCode,
              arabicCode: arCode,
              creditHours: crh,
              contactHours: cth,
              semesterNumber: Math.min(Math.max(currentSemester, 1), 5),
              prerequisite: prereq,
            });
          }
        }
      }
    } catch (pageErr) {
      console.warn(`Error scanning TVTC page ${p}:`, pageErr);
    }
  }

  if (courses.length >= 8) {
    const finalMajorName =
      majorName || extractMajorName(fallbackName, 'تقنية السلامة والصحة المهنية');
    return {
      success: true,
      majorNameAr: finalMajorName,
      departmentAr: department || 'الكلية التقنية',
      courses,
      warnings: [],
      rawTextPreview: `تم استخراج ${courses.length} مقرراً تلقائياً من جداول الخطة المعتمدة في الكلية التقنية.`,
    };
  }

  return null;
}

/**
 * Heuristically parse raw text lines into TVTC course structures
 */
export function parseCoursesFromText(
  rawText: string,
  defaultMajorName: string = 'تخصص مستورد'
): ParsedPlanResult {
  const text = cleanText(rawText);
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  const courses: ParsedCourseItem[] = [];
  const warnings: string[] = [];
  let currentSemester = 1;
  const majorName = extractMajorName(text, defaultMajorName);

  // Common course code regex: e.g. "نال 101" or "ENG 102" (excluding dates like 1446, 2024 and page footers like 'من 108')
  const codeRegex = /\b([أ-يA-Za-z]{2,5})\s*[-_]?\s*(\d{3})\b/;
  const reverseCodeRegex = /\b(\d{3})\s*[-_]?\s*([أ-يA-Za-z]{2,5})\b/;

  // Known TVTC course titles to boost matching
  const knownCourseWords = [
    'لغة إنجليزية', 'إنجليزي', 'مقدمة تطبيقات الحاسب', 'حاسب', 'شبكات', 'برمجة', 'قواعد بيانات',
    'نظم تشغيل', 'تراكيب', 'أمن معلومات', 'رياضيات', 'فيزياء', 'إحصاء', 'إدارة',
    'محاسبة', 'تحليل', 'هندسة', 'تصميم', 'دوائر', 'إلكترونيات', 'اتصالات', 'كيمياء',
    'كتابة تقارير', 'الكتابة الفنية', 'ثقافة إسلامية', 'عرب', 'سلم', 'توجيه مهني', 'مشروع',
    'تدريب تعاوني', 'سلامة', 'صحة مهنية', 'بيئة', 'إسعافات', 'مخاطر', 'حرائق'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Filter out page footers and headers
    if (
      line.includes('--- صفحة') ||
      line.match(/^\d+\s*من\s*\d+$/) ||
      line.includes('Total Number of Units') ||
      line.includes('CRH:') ||
      line.includes('Contact Hours')
    ) {
      continue;
    }

    // Check if line indicates a semester header
    for (const [semNum, reg] of Object.entries(SEMESTER_KEYWORDS)) {
      if (reg.test(line)) {
        currentSemester = Number(semNum);
        break;
      }
    }

    // Try finding course code in this line
    const codeMatch = line.match(codeRegex);
    const revMatch = !codeMatch ? line.match(reverseCodeRegex) : null;

    if (codeMatch || revMatch) {
      let prefix = '';
      let num = '';
      let matchedSubstring = '';

      if (codeMatch) {
        prefix = codeMatch[1];
        num = codeMatch[2];
        matchedSubstring = codeMatch[0];
      } else if (revMatch) {
        prefix = revMatch[2];
        num = revMatch[1];
        matchedSubstring = revMatch[0];
      }

      // Reject invalid false positive codes (like 'من 108' or 'هج 1446' or 'فصل 101')
      if (prefix === 'من' || prefix === 'هج' || prefix === 'عام' || prefix === 'صفح') {
        continue;
      }

      const fullCode = `${prefix} ${num}`.toUpperCase();

      // Look for numbers representing credit and contact hours
      const numberMatches = line.match(/\b([1-6])\b/g) || [];
      const hourNumbers = numberMatches.filter((n) => !num.includes(n)).map(Number);

      const isCoop = fullCode.includes('299') || line.includes('تعاوني');
      const creditHours = isCoop ? 2 : hourNumbers[0] || 3;
      const contactHours = isCoop ? 280 : hourNumbers[1] || creditHours;

      // Extract course name
      let courseName = line
        .replace(matchedSubstring, '')
        .replace(/\b[1-9]\b/g, '')
        .replace(/[:|,\t-]/g, ' ')
        .trim();

      courseName = cleanArabicDisplay(courseName);

      if (courseName.length < 3 && i > 0 && lines[i - 1].length > 3 && !lines[i - 1].match(codeRegex)) {
        courseName = lines[i - 1];
      } else if (courseName.length < 3 && i < lines.length - 1 && lines[i + 1].length > 3 && !lines[i + 1].match(codeRegex)) {
        courseName = lines[i + 1];
      }

      courseName = normalizeCourseName(courseName, fullCode);

      if (courseName.length < 2) {
        courseName = `مقرر ${fullCode}`;
      }

      // Prerequisite
      let prereq = 'لا يوجد';
      const prereqMatch = line.match(/(?:متطلب|السابق|متطلب سابق)\s*[:：\-]?\s*([أ-يA-Za-z0-9\s]+)/i);
      if (prereqMatch && prereqMatch[1].trim().length > 1) {
        prereq = prereqMatch[1].trim();
      }

      const existing = courses.find((c) => c.code === fullCode || c.nameAr === courseName);
      if (!existing) {
        courses.push({
          id: `custom_course_${courses.length + 1}_${Date.now() % 10000}`,
          nameAr: courseName,
          code: fullCode,
          arabicCode: fullCode,
          creditHours: Math.min(Math.max(creditHours, 1), 6),
          contactHours: Math.min(Math.max(contactHours, 1), 280),
          semesterNumber: isCoop ? 5 : currentSemester,
          prerequisite: prereq,
        });
      }
    } else {
      // Check known course keywords
      const matchedWord = knownCourseWords.find((w) => line.includes(w));
      if (matchedWord && line.length <= 60 && !line.includes('المؤسسة العامة') && !line.includes('الكلية التقنية')) {
        const generatedCode = `REQ ${100 + courses.length + 1}`;
        const numberMatches = line.match(/\b([1-6])\b/g);
        const creditHours = numberMatches ? Number(numberMatches[0]) : 3;

        const alreadyExists = courses.some((c) => c.nameAr === line);
        if (!alreadyExists) {
          courses.push({
            id: `custom_course_${courses.length + 1}_${Date.now() % 10000}`,
            nameAr: cleanArabicDisplay(line),
            code: generatedCode,
            arabicCode: generatedCode,
            creditHours,
            contactHours: creditHours,
            semesterNumber: currentSemester,
            prerequisite: 'لا يوجد',
          });
        }
      }
    }
  }

  // Fallback: tabular parser
  if (courses.length === 0) {
    const tableLines = lines.filter((l) => l.includes('\t') || l.includes('|') || l.includes(','));
    for (const tLine of tableLines) {
      const parts = tLine.split(/[\t|,]/).map((p) => p.trim()).filter((p) => p.length > 0);
      if (parts.length >= 2) {
        const potentialName = parts.find((p) => isNaN(Number(p)) && p.length > 3) || parts[0];
        const potentialHours = parts.find((p) => !isNaN(Number(p)) && Number(p) >= 1 && Number(p) <= 6);
        const hours = potentialHours ? Number(potentialHours) : 3;
        const code = parts.find((p) => p.match(/[A-Za-z0-9]/) && p.length <= 10) || `CRS ${courses.length + 101}`;

        courses.push({
          id: `custom_course_${courses.length + 1}_${Date.now() % 10000}`,
          nameAr: cleanArabicDisplay(potentialName),
          code: code,
          arabicCode: code,
          creditHours: hours,
          contactHours: hours,
          semesterNumber: currentSemester,
          prerequisite: 'لا يوجد',
        });
      }
    }
  }

  if (courses.length === 0) {
    warnings.push('لم يتم العثور على مقررات واضحة تلقائياً، يمكنك مراجعة وتعديل المقررات يدوياً في النموذج أدناه.');
  }

  return {
    success: courses.length > 0,
    majorNameAr: majorName,
    courses,
    warnings,
    rawTextPreview: text.slice(0, 500),
  };
}

/**
 * Parse client-side PDF file with specialized TVTC Guidebook Engine + Arabic CMap support
 */
export async function parsePdfFile(file: File): Promise<ParsedPlanResult> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  try {
    const doc = await pdfjsLib.getDocument({
      data,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@6.5.438/cmaps/',
      cMapPacked: true,
    }).promise;

    // First attempt: High-Precision TVTC Official Curriculum Guidebook Extractor
    const tvtcResult = await extractTVTCBookletPlan(doc, file.name);
    if (tvtcResult && tvtcResult.courses.length >= 8) {
      return tvtcResult;
    }

    // Second attempt: General visual line-by-line reconstruction across front section
    let reconstructedText = '';
    const totalPages = doc.numPages;
    const pagesToScan = Math.min(totalPages, 20);

    for (let pageNum = 1; pageNum <= pagesToScan; pageNum++) {
      try {
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Group by line using Y-coordinate
        const lineMap = new Map<number, Array<{ str: string; x: number }>>();
        for (const item of textContent.items) {
          if (!('str' in item) || !item.str.trim()) continue;
          const y = Math.round(item.transform[5]);
          const x = Math.round(item.transform[4]);

          let foundY: number | null = null;
          for (const existingY of lineMap.keys()) {
            if (Math.abs(existingY - y) <= 4) {
              foundY = existingY;
              break;
            }
          }
          const targetY = foundY !== null ? foundY : y;
          if (!lineMap.has(targetY)) lineMap.set(targetY, []);
          lineMap.get(targetY)!.push({ str: item.str.trim(), x });
        }

        const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
        for (const y of sortedYs) {
          const items = lineMap.get(y)!;
          items.sort((a, b) => a.x - b.x);
          const lineStr = items.map((it) => it.str).join(' ');
          if (lineStr.trim().length > 0) {
            reconstructedText += lineStr + '\n';
          }
        }
      } catch (pageErr) {
        console.warn(`Could not read page ${pageNum}:`, pageErr);
      }
    }

    const trimmedText = reconstructedText.trim();
    if (trimmedText.length < 30) {
      return {
        success: false,
        majorNameAr: file.name.replace(/\.[^/.]+$/, ''),
        courses: [],
        warnings: [
          'الملف المرفوع عبارة عن صورة ممسوحة ضوئياً (سكانر) ولا يحتوي على نصوص رقمية يمكن قراءتها تلقائياً. يمكنك نسخ جدول المقررات ولصقه كنص، أو رفع ملف إكسل، أو إدخال المقررات يدوياً.',
        ],
        rawTextPreview: '',
      };
    }

    return parseCoursesFromText(reconstructedText, file.name);
  } catch (err: any) {
    console.error('Error reading PDF:', err);
    return {
      success: false,
      majorNameAr: file.name.replace(/\.[^/.]+$/, ''),
      courses: [],
      warnings: [
        'تعذر تحليل ملف PDF تلقائياً (قد يكون الملف مشفراً أو مصمماً بصيغة صور). جرب استخدام خيار لصق جدول الخطة كـ نص أو رفع ملف Excel بدلاً منه.',
      ],
    };
  }
}

/**
 * Parse client-side Excel (.xlsx, .xls) or CSV file
 */
export async function parseExcelOrCsvFile(file: File): Promise<ParsedPlanResult> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let combinedText = '';
    const courses: ParsedCourseItem[] = [];
    const warnings: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      let currentSemester = 1;

      for (const row of rows) {
        if (!row || row.length === 0) continue;
        const rowStr = row.map((cell) => String(cell || '').trim()).join(' | ');
        combinedText += rowStr + '\n';

        for (const [semNum, reg] of Object.entries(SEMESTER_KEYWORDS)) {
          if (reg.test(rowStr)) {
            currentSemester = Number(semNum);
            break;
          }
        }

        const stringCells = row.map((c) => String(c || '').trim()).filter((c) => c.length > 0);
        const codeCell = stringCells.find((c) => c.match(/([أ-يA-Za-z]{2,5})\s*[-_]?\s*(\d{2,4})/));
        const numCells = stringCells.filter((c) => !isNaN(Number(c)) && Number(c) >= 1 && Number(c) <= 10).map(Number);

        if (codeCell) {
          const nameCell = stringCells.find(
            (c) => c !== codeCell && isNaN(Number(c)) && c.length >= 3 && !SEMESTER_KEYWORDS[currentSemester]?.test(c)
          ) || `مقرر ${codeCell}`;

          const isCoop = codeCell.includes('299') || nameCell.includes('تعاوني');
          const credit = isCoop ? 2 : numCells[0] || 3;
          const contact = isCoop ? 280 : numCells[1] || credit;

          const prereq = stringCells.find(
            (c) => c !== codeCell && c !== nameCell && isNaN(Number(c)) && (c.includes('لا يوجد') || c.match(/\d{3}/))
          ) || 'لا يوجد';

          courses.push({
            id: `custom_course_${courses.length + 1}_${Date.now() % 10000}`,
            nameAr: cleanArabicDisplay(nameCell),
            code: codeCell,
            arabicCode: codeCell,
            creditHours: credit,
            contactHours: contact,
            semesterNumber: isCoop ? 5 : currentSemester,
            prerequisite: prereq,
          });
        }
      }
    }

    if (courses.length > 0) {
      return {
        success: true,
        majorNameAr: extractMajorName(combinedText, file.name),
        courses,
        warnings,
      };
    }

    return parseCoursesFromText(combinedText, file.name);
  } catch (err: any) {
    console.error('Error reading Excel/CSV:', err);
    return {
      success: false,
      majorNameAr: file.name.replace(/\.[^/.]+$/, ''),
      courses: [],
      warnings: ['تعذر قراءة ملف الإكسل، يرجى التأكد من أن الملف سليم أو لصق الجدول كنص.'],
    };
  }
}

/**
 * Universal Plan File Parser: routes to appropriate parser based on extension
 */
export async function parseStudyPlanFile(file: File): Promise<ParsedPlanResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') {
    return parsePdfFile(file);
  } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    return parseExcelOrCsvFile(file);
  } else if (ext === 'json') {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json.courses && Array.isArray(json.courses)) {
        return {
          success: true,
          majorNameAr: json.majorNameAr || json.nameAr || file.name.replace('.json', ''),
          courses: json.courses,
          warnings: [],
        };
      }
      return parseCoursesFromText(text, file.name);
    } catch {
      const text = await file.text();
      return parseCoursesFromText(text, file.name);
    }
  } else {
    const text = await file.text();
    return parseCoursesFromText(text, file.name);
  }
}

/**
 * Built-in Demo Plan Files to allow instant testing with 1-click
 */
export const SAMPLE_DEMO_IMPORT_PLANS = [
  {
    title: 'خطة دبلوم تقنية السلامة والصحة المهنية (النموذج المعتمد 67 ساعة)',
    majorName: 'تقنية السلامة والصحة المهنية',
    majorNameEn: 'Occupational Safety and Health Technology',
    department: 'تقنية البيئة',
    rawText: `
المؤسسة العامة للتدريب التقني والمهني
الكلية التقنية - الخطة التدريبية لتخصص: تقنية السلامة والصحة المهنية

الفصل التدريبي الأول
ENGL 101	لغة إنجليزية (1)	3	4	لا يوجد
ICMT 101	مقدمة تطبيقات الحاسب	2	4	لا يوجد
MATH 101	الرياضيات	3	4	لا يوجد
ARAB 101	الكتابة الفنية	2	2	لا يوجد
KCHI 111	كيمياء	3	4	لا يوجد
VENV 111	مدخل الى علم البيئة	2	2	لا يوجد
OSHA 111	مقدمة في السلامة والصحة المهنية	1	1	لا يوجد

الفصل التدريبي الثاني
ENGL 102	لغة إنجليزية (2)	3	4	ENGL 101
ISLM 101	الثقافة الإسلامية والمجتمعية	2	2	لا يوجد
ENTR 101	أساسيات ريادة الأعمال	2	2	لا يوجد
STAT 111	مقدمة في علم الاحصاء	3	3	لا يوجد
BIOS 111	الأحياء الدقيقة والطفيليات	3	4	لا يوجد
OSHA 141	المخاطر في الصناعة	2	4	OSHA 111
OSHA 223	السلامة المرورية	2	2	لا يوجد
OSHA 171	نظام إدارة السلامة والصحة المهنية	2	2	لا يوجد

الفصل التدريبي الثالث
ENGL 103	لغة إنجليزية (3)	3	4	ENGL 102
ENTR 244	ريادة الأعمال في مجال البيئة	2	3	ENTR 101
OSHA 142	المخاطر في الإنشاءات	2	4	لا يوجد
OSHA 272	أنظمة ولوائح السلامة والصحة المهنية	1	1	OSHA 171
OSHA 121	علم السموم	2	4	KCHI 111 / BIOS 111
OSHA 252	الاستجابة للطوارئ	2	4	لا يوجد
OSHA 251	مكافحة الحرائق	2	4	لا يوجد

الفصل التدريبي الرابع
ETHS 201	السلوك الوظيفي والمستقبل المهني	2	2	لا يوجد
VENV 281	تحليل البيانات باستخدام تطبيقات الحاسب الآلي	1	2	STAT 111
OSHA 222	سلامة بيئة العمل	2	2	OSHA 121
OSHA 231	الصحة المهنية	2	2	OSHA 121
OSHA 273	التحقيق في الحوادث	2	2	OSHA 141 / OSHA 171
OSHA 211	العوامل البشرية	1	1	OSHA 142
OSHA 253	الإخلاء والإسعافات الأولية	2	3	OSHA 252
OSHA 274	التفتيش الميداني	2	3	OSHA 272
OSHA 291	مشروع التخرج	2	3	لا يوجد

الفصل التدريبي الخامس
OSHA 299	التدريب التعاوني	2	280	إنهاء جميع المقررات
    `,
  },
  {
    title: 'خطة دبلوم التسويق والتجارة الإلكترونية (نموذج TVTC)',
    majorName: 'التسويق والتجارة الإلكترونية',
    majorNameEn: 'Marketing and E-Commerce',
    department: 'التقنية الإدارية والمالية',
    rawText: `
المؤسسة العامة للتدريب التقني والمهني
الكلية التقنية - الخطة التدريبية لتخصص: التسويق والتجارة الإلكترونية

الفصل التدريبي الأول
تسق 101	مبادئ التسويق	3	3	لا يوجد
حاس 101	مقدمة تطبيقات الحاسب	2	4	لا يوجد
عرب 101	التحرير الكتابي	2	2	لا يوجد
سلم 101	الثقافة الإسلامية 1	2	2	لا يوجد
إنج 101	لغة إنجليزية عامة 1	3	6	لا يوجد

الفصل التدريبي الثاني
تسق 102	سلوك المستهلك	3	3	تسق 101
تجر 110	مبادئ التجارة الإلكترونية	3	3	حاس 101
محس 101	مبادئ المحاسبة المالية	3	4	لا يوجد
إنج 102	لغة إنجليزية عامة 2	3	6	إنج 101
رياد 101	ريادة الأعمال والابتكار	2	2	لا يوجد

الفصل التدريبي الثالث
تسق 201	بحوث التسويق وتحليل البيانات	3	3	تسق 101
تجر 210	تصميم وتطوير المتاجر الإلكترونية	4	5	تجر 110
تسق 203	التسويق الرقمي وشبكات التواصل	3	3	تسق 102
إنج 201	لغة إنجليزية تخصصية	3	4	إنج 102
قنن 101	الأنظمة التجارية السعودية	2	2	لا يوجد

الفصل التدريبي الرابع
تسق 204	إدارة سلاسل الإمداد والتوزيع	3	3	تسق 101
تسق 205	إدارة العلاقات مع العملاء CRM	3	3	تسق 203
تجر 220	استراتيجيات التجارة والتسويق	3	3	تجر 210
مشق 290	مشروع التخرج في التسويق	3	4	تجر 210
سلوك 101	أخلاقيات العمل والمهنة	2	2	لا يوجد

الفصل التدريبي الخامس
تدرب 299	التدريب التعاوني الميداني	6	0	إنهاء جميع المقررات
    `,
  },
  {
    title: 'خطة دبلوم تقنية الميكانيكا - محركات ومركبات (نموذج TVTC)',
    majorName: 'محركات ومركبات',
    majorNameEn: 'Engines and Vehicles Technology',
    department: 'التقنية الميكانيكية',
    rawText: `
المؤسسة العامة للتدريب التقني والمهني
الكلية التقنية - الخطة التدريبية لتخصص: محركات ومركبات

الفصل التدريبي الأول
مكك 101	أساسيات هندسة السيارات	3	4	لا يوجد
رسم 101	الرسم الهندسي الميكانيكي	2	4	لا يوجد
سلم 101	الثقافة الإسلامية 1	2	2	لا يوجد
عرب 101	التحرير الكتابي والتقارير	2	2	لا يوجد
إنج 101	لغة إنجليزية عامة 1	3	6	لا يوجد
ريض 101	رياضيات تطبيقية	3	3	لا يوجد

الفصل التدريبي الثاني
مكك 102	أنظمة محركات الديزل والبنزين	4	6	مكك 101
كهرب 101	كهرباء وإلكترونيات السيارات	3	5	لا يوجد
ورش 101	السلامة المهنية وورش المحركات	2	4	لا يوجد
إنج 102	لغة إنجليزية عامة 2	3	6	إنج 101

الفصل التدريبي الثالث
مكك 201	أنظمة نقل الحركة والشاسيه	4	6	مكك 102
مكك 202	تشخيص أعطال السيارات بالكمبيوتر	3	5	كهرب 101
إنج 201	لغة إنجليزية تخصصية ميكانيكية	3	4	إنج 102
توج 101	التوجيه المهني والتميز	2	2	لا يوجد

الفصل التدريبي الرابع
مكك 203	أنظمة التحكم وحقن الوقود الإلكتروني	4	6	مكك 202
مكك 204	صيانة وتوضيب المحركات المتقدم	4	6	مكك 201
مشق 291	مشروع التقنية الميكانيكية	3	4	مكك 202

الفصل التدريبي الخامس
تدرب 299	التدريب التعاوني الميداني	6	0	إنهاء جميع المقررات
    `,
  },
];
