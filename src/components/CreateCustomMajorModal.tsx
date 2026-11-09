import { useState, FormEvent } from 'react';
import {
  createCustomMajorObject,
  POPULAR_MAJOR_TEMPLATES,
  saveCustomMajor,
} from '../utils/customMajors.ts';
import { MajorInfo } from '../data/all_majors.ts';
import {
  BookPlus,
  Plus,
  Trash2,
  X,
  Check,
  Sparkles,
  Layers,
  GraduationCap,
  Info,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  token?: string;
  onClose: () => void;
  onMajorCreated: (newMajor: MajorInfo) => void;
}

interface CourseRow {
  id: string;
  nameAr: string;
  code: string;
  arabicCode: string;
  creditHours: number;
  contactHours: number;
  semesterNumber: number;
  prerequisite: string;
}

export default function CreateCustomMajorModal({
  isOpen,
  token,
  onClose,
  onMajorCreated,
}: Props) {
  const [majorNameAr, setMajorNameAr] = useState('');
  const [majorNameEn, setMajorNameEn] = useState('');
  const [department, setDepartment] = useState('قسم التقنية الإدارية والمالية');
  const [majorCode, setMajorCode] = useState('');
  const [semestersCount, setSemestersCount] = useState(5);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Courses list
  const [courses, setCourses] = useState<CourseRow[]>([
    {
      id: 'row-1',
      nameAr: 'مقدمة في التخصص',
      code: 'INTRO 101',
      arabicCode: '101 تقن',
      creditHours: 3,
      contactHours: 4,
      semesterNumber: 1,
      prerequisite: '',
    },
    {
      id: 'row-2',
      nameAr: 'لغة إنجليزية عامة 1',
      code: 'ENG 101',
      arabicCode: '101 انجل',
      creditHours: 3,
      contactHours: 4,
      semesterNumber: 1,
      prerequisite: '',
    },
    {
      id: 'row-3',
      nameAr: 'لغة إنجليزية عامة 2',
      code: 'ENG 102',
      arabicCode: '102 انجل',
      creditHours: 3,
      contactHours: 4,
      semesterNumber: 2,
      prerequisite: '101 انجل (ENG 101)',
    },
  ]);

  if (!isOpen) return null;

  const handleApplyTemplate = (tmpl: typeof POPULAR_MAJOR_TEMPLATES[0]) => {
    setMajorNameAr(tmpl.nameAr);
    setMajorNameEn(tmpl.nameEn);
    setDepartment(tmpl.department);
    setMajorCode(tmpl.code);

    const mappedCourses: CourseRow[] = tmpl.sampleCourses.map((c, i) => ({
      id: `tmpl-${i + 1}`,
      nameAr: c.nameAr,
      code: c.code,
      arabicCode: c.arabicCode,
      creditHours: c.creditHours,
      contactHours: c.creditHours + 1,
      semesterNumber: c.semesterNumber,
      prerequisite: c.prerequisite || '',
    }));

    setCourses(mappedCourses);
    setErrorMsg('');
  };

  const handleAddCourseRow = () => {
    const nextSem = Math.min(semestersCount, courses.length > 0 ? courses[courses.length - 1].semesterNumber : 1);
    setCourses((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nameAr: '',
        code: '',
        arabicCode: '',
        creditHours: 3,
        contactHours: 4,
        semesterNumber: nextSem,
        prerequisite: '',
      },
    ]);
  };

  const handleRemoveCourseRow = (id: string) => {
    if (courses.length <= 1) {
      setErrorMsg('يجب إدخال مقرر واحد على الأقل في الخطة التدريبية');
      return;
    }
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateCourse = (id: string, field: keyof CourseRow, value: any) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const totalCalculatedHours = courses.reduce((sum, c) => sum + (c.creditHours || 0), 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!majorNameAr.trim()) {
      setErrorMsg('يرجى كتابة اسم التخصص التدريبي');
      return;
    }

    const invalidCourse = courses.find((c) => !c.nameAr.trim());
    if (invalidCourse) {
      setErrorMsg('يرجى التأكد من كتابة اسم المقرر لجميع المقررات المدخلة');
      return;
    }

    setIsSubmitting(true);
    try {
      const newMajor = createCustomMajorObject({
        nameAr: majorNameAr.trim(),
        nameEn: majorNameEn.trim(),
        department: department.trim(),
        code: majorCode.trim() || 'SPEC',
        semestersCount,
        courses: courses.map((c) => ({
          code: c.code.trim() || 'CRS',
          arabicCode: c.arabicCode.trim() || c.code.trim() || 'مقرر',
          nameAr: c.nameAr.trim(),
          creditHours: Math.max(1, Number(c.creditHours) || 3),
          contactHours: Math.max(1, Number(c.contactHours) || 4),
          semesterNumber: Math.max(1, Number(c.semesterNumber) || 1),
          prerequisite: c.prerequisite.trim() || null,
        })),
      });

      await saveCustomMajor(newMajor, token);
      onMajorCreated(newMajor);
      onClose();
    } catch (err: any) {
      setErrorMsg('حدث خطأ أثناء حفظ التخصص الجديد');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-right relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-[#006B3F] text-white flex items-center justify-center border border-[#C5A059] shadow-md shadow-emerald-900/10">
            <BookPlus className="w-6 h-6 text-[#E6C673]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900">
                إضافة تخصص جديد غير مدرج
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                خطة مخصصة
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              أدخل بيانات ومقررات تخصصك ليتم حفظها وحساب المعدل الفصلي والتراكمي لها تلقائياً
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* Fast Templates Toolbar */}
        <div className="mb-4 p-3 bg-emerald-50/50 border border-emerald-200/70 rounded-2xl">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>استيراد نموذج تخصص جاهز لتسريع التعبئة:</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              (يمكنك التعديل على المقررات بعد اختيار النموذج)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {POPULAR_MAJOR_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.nameAr}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-800 hover:text-[#006B3F] border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <span>{tmpl.nameAr}</span>
                <span className="text-[10px] font-normal text-slate-400 font-mono">({tmpl.code})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-1 pl-1">
          {/* Section 1: Major Details */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#006B3F]" />
              <span>1. البيانات العامة للتخصص</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  اسم التخصص التدريبي بالعربي <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={majorNameAr}
                  onChange={(e) => setMajorNameAr(e.target.value)}
                  placeholder="مثال: دبلوم تقنية الموارد البشرية"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  القسم التدريبي <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="مثال: التقنية الإدارية والمالية"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  رمز التخصص (اختياري)
                </label>
                <input
                  type="text"
                  value={majorCode}
                  onChange={(e) => setMajorCode(e.target.value)}
                  placeholder="مثال: HR, ACCT, ELEC"
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Courses List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#006B3F]" />
                  <span>2. مقررات الخطة التدريبية ({courses.length} مقرر)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  أدخل المقررات وحدد الفصل التدريبي والساعات والمتطلب السابق لكل مقرر
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-emerald-50 text-[#006B3F] border border-emerald-200 px-2.5 py-1 rounded-lg">
                  إجمالي الساعات: {totalCalculatedHours} س.م
                </span>
                <button
                  type="button"
                  onClick={handleAddCourseRow}
                  className="px-3 py-1.5 bg-[#006B3F] hover:bg-[#005a34] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مقرر</span>
                </button>
              </div>
            </div>

            {/* Courses Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f8faf9] text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">اسم المقرر</th>
                      <th className="py-2.5 px-2">الرمز (عربي)</th>
                      <th className="py-2.5 px-2">الرمز (إنجليزي)</th>
                      <th className="py-2.5 px-2 text-center">الفصل</th>
                      <th className="py-2.5 px-2 text-center">الساعات</th>
                      <th className="py-2.5 px-2">المتطلب السابق</th>
                      <th className="py-2.5 px-2 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courses.map((course, idx) => (
                      <tr key={course.id} className="hover:bg-slate-50/60">
                        {/* Course Name */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            required
                            value={course.nameAr}
                            onChange={(e) => handleUpdateCourse(course.id, 'nameAr', e.target.value)}
                            placeholder={`مقرر ${idx + 1}`}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#006B3F]"
                          />
                        </td>

                        {/* Arabic Code */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={course.arabicCode}
                            onChange={(e) => handleUpdateCourse(course.id, 'arabicCode', e.target.value)}
                            placeholder="101 تقن"
                            className="w-24 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#006B3F]"
                          />
                        </td>

                        {/* English Code */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={course.code}
                            onChange={(e) => handleUpdateCourse(course.id, 'code', e.target.value)}
                            placeholder="CRS 101"
                            dir="ltr"
                            className="w-24 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#006B3F]"
                          />
                        </td>

                        {/* Semester Number */}
                        <td className="py-2 px-2 text-center">
                          <select
                            value={course.semesterNumber}
                            onChange={(e) => handleUpdateCourse(course.id, 'semesterNumber', parseInt(e.target.value, 10))}
                            className="bg-white border border-slate-200 text-xs rounded-lg px-2 py-1.5 font-bold focus:outline-none focus:ring-1 focus:ring-[#006B3F]"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                              <option key={s} value={s}>
                                فصل {s}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Credit Hours */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            max="8"
                            value={course.creditHours}
                            onChange={(e) => handleUpdateCourse(course.id, 'creditHours', parseInt(e.target.value, 10) || 1)}
                            className="w-14 text-center px-1.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#006B3F] font-bold"
                          />
                        </td>

                        {/* Prerequisite */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={course.prerequisite}
                            onChange={(e) => handleUpdateCourse(course.id, 'prerequisite', e.target.value)}
                            placeholder="بدون متطلب"
                            className="w-32 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#006B3F]"
                          />
                        </td>

                        {/* Remove Button */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveCourseRow(course.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="حذف المقرر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Info className="w-4 h-4 text-[#006B3F] shrink-0" />
            <span>
              سيتم حفظ هذا التخصص محلياً في جهازك ومزامنته مع السيرفر إن توفرت قاعدة البيانات، ليعمل معك دائماً مثل التخصصات الأساسية.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-[#006B3F] hover:bg-[#005a34] text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'جارِ حفظ التخصص...' : 'اعتماد التخصص والبدء في حساب المعدل'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
