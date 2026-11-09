import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  parseStudyPlanFile,
  parseCoursesFromText,
  ParsedCourseItem,
  ParsedPlanResult,
  SAMPLE_DEMO_IMPORT_PLANS,
} from '../utils/planFileParser.ts';
import { createCustomMajorObject, saveCustomMajor } from '../utils/customMajors.ts';
import { MajorInfo } from '../data/all_majors.ts';
import {
  FileUp,
  FileSpreadsheet,
  FileText,
  File,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  Layers,
  ArrowRight,
  ClipboardPaste,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  token?: string;
  onClose: () => void;
  onPlanImported: (newMajor: MajorInfo) => void;
}

export default function ImportPlanFileModal({
  isOpen,
  token,
  onClose,
  onPlanImported,
}: Props) {
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste' | 'demo'>('upload');
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Parsed / Editable Data
  const [parsedResult, setParsedResult] = useState<ParsedPlanResult | null>(null);
  const [editableMajorName, setEditableMajorName] = useState('');
  const [editableDepartment, setEditableDepartment] = useState('');
  const [editableCourses, setEditableCourses] = useState<ParsedCourseItem[]>([]);

  // Textarea for paste mode
  const [pastedText, setPastedText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setParsedResult(null);
    setEditableMajorName('');
    setEditableDepartment('');
    setEditableCourses([]);
    setErrorMsg(null);
    setPastedText('');
  };

  const processFile = async (file: File) => {
    setIsParsing(true);
    setErrorMsg(null);
    try {
      const res = await parseStudyPlanFile(file);
      if (res.courses.length === 0) {
        const specificWarning =
          res.warnings && res.warnings[0]
            ? res.warnings[0]
            : 'لم نتمكن من استخراج مقررات بشكل تلقائي من هذا الملف.';
        setErrorMsg(specificWarning);

        if (res.rawTextPreview && res.rawTextPreview.trim().length > 30) {
          setPastedText(res.rawTextPreview);
        }
      } else {
        setParsedResult(res);
        setEditableMajorName(res.majorNameAr);
        setEditableDepartment(res.departmentAr || 'الكلية التقنية');
        setEditableCourses(res.courses);
      }
    } catch (err: any) {
      setErrorMsg('حدث خطأ أثناء قراءة الملف. تأكد من أن الملف سليم وغير تالف.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setErrorMsg('يرجى لصق نص الخطة التدريبية أو جدول المواد أولاً');
      return;
    }
    setIsParsing(true);
    setErrorMsg(null);
    try {
      const res = parseCoursesFromText(pastedText, 'تخصص مستورد من جدول نصي');
      if (res.courses.length === 0) {
        setErrorMsg('لم نتمكن من تحديد المقررات في النص المدخل. تأكد من احتواء النص على أسماء المقررات أو رموزها.');
      } else {
        setParsedResult(res);
        setEditableMajorName(res.majorNameAr);
        setEditableDepartment(res.departmentAr || 'الكلية التقنية');
        setEditableCourses(res.courses);
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleLoadDemoPlan = (demo: typeof SAMPLE_DEMO_IMPORT_PLANS[0]) => {
    setIsParsing(true);
    setErrorMsg(null);
    try {
      const res = parseCoursesFromText(demo.rawText, demo.majorName);
      setParsedResult(res);
      setEditableMajorName(demo.majorName);
      setEditableDepartment(demo.department || 'الكلية التقنية');
      setEditableCourses(res.courses);
    } finally {
      setIsParsing(false);
    }
  };

  const handleCourseFieldChange = (
    id: string,
    field: keyof ParsedCourseItem,
    value: any
  ) => {
    setEditableCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleDeleteCourse = (id: string) => {
    setEditableCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddNewCourse = () => {
    const highestSem = Math.max(1, ...editableCourses.map((c) => c.semesterNumber || 1));
    const newCourse: ParsedCourseItem = {
      id: `custom_course_${Date.now()}`,
      nameAr: 'مقرر جديد',
      code: `CRS ${editableCourses.length + 101}`,
      arabicCode: `مقر ${editableCourses.length + 101}`,
      creditHours: 3,
      contactHours: 3,
      semesterNumber: highestSem,
      prerequisite: 'لا يوجد',
    };
    setEditableCourses((prev) => [...prev, newCourse]);
  };

  const totalCalculatedHours = editableCourses.reduce(
    (sum, c) => sum + (Number(c.creditHours) || 0),
    0
  );

  const handleConfirmAndActivate = async () => {
    if (!editableMajorName.trim()) {
      setErrorMsg('يرجى تحديد اسم التخصص');
      return;
    }
    if (editableCourses.length === 0) {
      setErrorMsg('يجب أن تحتوي الخطة على مقرر واحد على الأقل');
      return;
    }

    try {
      const newMajor = createCustomMajorObject({
        nameAr: editableMajorName.trim(),
        nameEn: parsedResult?.majorNameEn || 'Imported Specialization',
        department: editableDepartment.trim() || parsedResult?.departmentAr || 'الكلية التقنية',
        courses: editableCourses.map((c) => ({
          id: c.id,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          code: c.code,
          arabicCode: c.arabicCode || c.code,
          creditHours: Number(c.creditHours) || 3,
          contactHours: Number(c.contactHours) || 3,
          semesterNumber: Number(c.semesterNumber) || 1,
          prerequisite: c.prerequisite || 'لا يوجد',
        })),
      });

      await saveCustomMajor(newMajor, token);
      onPlanImported(newMajor);
      handleReset();
      onClose();
    } catch (err: any) {
      setErrorMsg('حدث خطأ أثناء حفظ الخطة المستوردة');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 text-right relative overflow-hidden">
        {/* Modal Top Header */}
        <div className="bg-[#006B3F] text-white p-5 border-b-2 border-[#C5A059] relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 text-emerald-100 hover:text-white p-1 rounded-xl hover:bg-emerald-800/60 transition cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-[#C5A059]/40 text-[#E6C673]">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                <span>استيراد الخطة الدراسية من ملف</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-[#E6C673] border border-[#C5A059]/40">
                  بدون تكلفة أو ذكاء اصطناعي (مجاني 100%)
                </span>
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                قراءة واستخراج المواد تلقائياً ومحلياً داخل المتصفح (PDF، Excel، جدول نصي)
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300/80 text-slate-800 text-xs space-y-2.5">
              <div className="flex items-start gap-2 text-amber-900 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-amber-200 text-[11px] text-slate-600 space-y-1.5">
                <p className="font-extrabold text-slate-800">💡 الحلول المباشرة والسهلة المتاحة لك:</p>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveInputTab('paste')}
                    className="px-3 py-1.5 bg-[#006B3F] hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-[#E6C673]" />
                    <span>لصق جدول الخطة كـ نص (الحل الأسرع)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#006B3F] border border-emerald-300 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>رفع ملف Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveInputTab('demo')}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>استخدام نموذج جاهز</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* If no file has been parsed yet: Show input options */}
          {!parsedResult ? (
            <div className="space-y-4">
              {/* Tabs for Input Method */}
              <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setActiveInputTab('upload')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    activeInputTab === 'upload'
                      ? 'bg-white text-[#006B3F] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileUp className="w-4 h-4" />
                  <span>رفع ملف (PDF / Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab('paste')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    activeInputTab === 'paste'
                      ? 'bg-white text-[#006B3F] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>لصق جدول الخطة كـ نص</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab('demo')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    activeInputTab === 'demo'
                      ? 'bg-white text-[#006B3F] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                  <span>تجربة نماذج TVTC جاهزة</span>
                </button>
              </div>

              {/* Tab 1: Upload File */}
              {activeInputTab === 'upload' && (
                <div className="space-y-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                      isDragOver
                        ? 'border-[#006B3F] bg-emerald-50/70 scale-[0.99]'
                        : 'border-slate-300 hover:border-[#006B3F] hover:bg-slate-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.xlsx,.xls,.csv,.json"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#006B3F] flex items-center justify-center border border-emerald-200">
                      {isParsing ? (
                        <div className="w-6 h-6 border-3 border-[#006B3F] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FileUp className="w-7 h-7" />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-extrabold text-slate-800">
                        {isParsing ? 'جارِ قراءة واستخراج مقررات الخطة التدريبية...' : 'اضغط لاختيار ملف الخطة أو اسحبه وأفلته هنا'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        يدعم ملفات: PDF (مستند الخطة)، Excel (.xlsx / .xls)، CSV، و JSON
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-600 font-bold bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                      <span className="flex items-center gap-1">
                        <File className="w-3.5 h-3.5 text-rose-500" /> PDF
                      </span>
                      <span className="flex items-center gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-500" /> CSV
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-[11px] text-[#006B3F] flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#006B3F] shrink-0 mt-0.5" />
                    <span>
                      <strong>معالجة محلية وآمنة:</strong> يتم تحليل واستخراج جدول الخطة التدريبية بالكامل داخل متصفحك مباشرة؛ لا يتم رفع الملف لأي خادم ولا تستهلك أي رصيد أو تكلفة.
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 2: Paste Table Text */}
              {activeInputTab === 'paste' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    يمكنك نسخ جدول المقررات من موقع الكلية أو من ملف Word ولصقه هنا مباشرة. وسيقوم النظام بالتعرف على رموز المواد وأسمائها وساعاتها وفصولها تلقائياً:
                  </p>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    rows={8}
                    placeholder={`مثال:\nالفصل الأول\nنال 101\tمقدمة برمجة\t3\tلا يوجد\nحاس 102\tشبكات الحاسب\t3\tلا يوجد\n\nالفصل الثاني\nنال 102\tبرمجة مرئية\t4\tنال 101`}
                    className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs text-slate-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#006B3F] bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={handleParsePastedText}
                    disabled={isParsing || !pastedText.trim()}
                    className="w-full py-2.5 px-4 bg-[#006B3F] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isParsing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 text-[#E6C673]" />
                    )}
                    <span>استخراج المقررات من النص الملصوق</span>
                  </button>
                </div>
              )}

              {/* Tab 3: Demo Plans */}
              {activeInputTab === 'demo' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    اختر أحد النماذج المعتمدة التالية لتجربة عملية الاستيراد التلقائي الفورية بضغطة زر واحدة:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SAMPLE_DEMO_IMPORT_PLANS.map((demo, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleLoadDemoPlan(demo)}
                        className="p-4 rounded-2xl border border-slate-200 hover:border-[#006B3F] bg-white hover:bg-emerald-50/40 transition cursor-pointer flex flex-col justify-between group shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-[#006B3F] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              {demo.department}
                            </span>
                            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-[#006B3F] transition">
                            {demo.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {demo.majorNameEn} • 5 فصول دراسية
                          </span>
                        </div>
                        <button
                          type="button"
                          className="mt-3 w-full py-1.5 px-3 bg-slate-100 group-hover:bg-[#006B3F] group-hover:text-white text-slate-700 text-[11px] font-bold rounded-lg transition"
                        >
                          تجربة استيراد هذا النموذج ➔
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Review & Edit Screen */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#006B3F]" />
                  <div>
                    <h3 className="text-xs font-extrabold text-[#006B3F]">
                      تم استخراج {editableCourses.length} مقرراً بنجاح!
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      راجع التخصص والمقررات وعدّل أي تفاصيل قبل الاعتماد والتفعيل
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition cursor-pointer"
                >
                  استيراد ملف آخر
                </button>
              </div>

              {/* Major Name Input & Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    اسم التخصص التدريبي المستورد
                  </label>
                  <input
                    type="text"
                    value={editableMajorName}
                    onChange={(e) => setEditableMajorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006B3F]"
                    placeholder="مثال: تقنية السلامة والصحة المهنية"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    القسم التدريبي
                  </label>
                  <input
                    type="text"
                    value={editableDepartment}
                    onChange={(e) => setEditableDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006B3F]"
                    placeholder="مثال: تقنية البيئة"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    إجمالي الساعات المعتمدة
                  </label>
                  <div className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-[#006B3F] text-center">
                    {totalCalculatedHours} ساعة تدريبية
                  </div>
                </div>
              </div>

              {/* Extracted Courses Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#006B3F]" />
                    <span>قائمة المقررات المستخرجة ({editableCourses.length})</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleAddNewCourse}
                    className="px-2.5 py-1 text-[11px] font-bold text-[#006B3F] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة مقرر</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">اسم المقرر</th>
                        <th className="py-2.5 px-2">الرمز</th>
                        <th className="py-2.5 px-2 text-center">الفصل</th>
                        <th className="py-2.5 px-2 text-center">س.م</th>
                        <th className="py-2.5 px-2">المتطلب السابق</th>
                        <th className="py-2.5 px-2 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {editableCourses.map((c, idx) => (
                        <tr key={c.id || idx} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={c.nameAr}
                              onChange={(e) => handleCourseFieldChange(c.id, 'nameAr', e.target.value)}
                              className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={c.code}
                              onChange={(e) => handleCourseFieldChange(c.id, 'code', e.target.value)}
                              className="w-24 px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-700"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <select
                              value={c.semesterNumber}
                              onChange={(e) => handleCourseFieldChange(c.id, 'semesterNumber', Number(e.target.value))}
                              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                <option key={s} value={s}>
                                  الفصل {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={c.creditHours}
                              onChange={(e) => handleCourseFieldChange(c.id, 'creditHours', Number(e.target.value))}
                              className="w-12 px-1 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-[#006B3F]"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={c.prerequisite}
                              onChange={(e) => handleCourseFieldChange(c.id, 'prerequisite', e.target.value)}
                              className="w-28 px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-slate-300 rounded-lg text-[11px] text-slate-600"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteCourse(c.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                              title="حذف هذا المقرر"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
          >
            إلغاء
          </button>

          {parsedResult && (
            <button
              type="button"
              onClick={handleConfirmAndActivate}
              className="py-2.5 px-6 bg-[#006B3F] hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-extrabold rounded-xl shadow-md border-b-2 border-[#C5A059] transition cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#E6C673]" />
              <span>اعتماد وتفعيل خطة "{editableMajorName}" الآن</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
