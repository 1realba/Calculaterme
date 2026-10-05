import { useState } from 'react';
import { StudyPlanData } from '../types.ts';
import { X, Copy, Download, Check, FileJson, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studyPlan: StudyPlanData;
}

export default function StudyPlanModal({ isOpen, onClose, studyPlan }: Props) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'structured' | 'json'>('structured');

  if (!isOpen) return null;

  const jsonString = JSON.stringify(studyPlan, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study_plan_network_technology.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                ملف الخطة الدراسية (study_plan.json)
              </h3>
              <p className="text-[11px] text-slate-500">
                الخطة الرسمية لدبلوم تقنية شبكات الحاسب - الكليات التقنية 1446هـ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('structured')}
                className={`px-2.5 py-1 rounded-md transition ${
                  viewMode === 'structured'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                معاينة منسقة
              </button>
              <button
                type="button"
                onClick={() => setViewMode('json')}
                className={`px-2.5 py-1 rounded-md transition ${
                  viewMode === 'json'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كود JSON
              </button>
            </div>

            <button
              type="button"
              id="close-json-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'structured' ? (
            <div className="space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-900 space-y-1.5">
                <div className="font-bold text-sm">{studyPlan.program.title} ({studyPlan.program.englishTitle})</div>
                <div className="text-slate-600">
                  {studyPlan.program.institution} • {studyPlan.program.degree} • القسم: {studyPlan.program.department}
                </div>
                <div className="font-mono text-[11px] text-blue-700">
                  SASCED-P: {studyPlan.program.sasced_p} | SASCED-L: {studyPlan.program.sasced_l}
                </div>
                <div className="font-semibold text-slate-800">
                  إجمالي ساعات الخطة: {studyPlan.program.totalCreditHours} ساعة معتمدة ({studyPlan.program.totalContactHours} ساعة تدريبية)
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  الفصول الدراسية والمقررات المعتمدة:
                </h4>
                {studyPlan.semesters.map((sem) => (
                  <div key={sem.semesterNumber} className="border border-slate-200 rounded-lg p-3 bg-white">
                    <div className="font-bold text-slate-800 mb-1.5 flex justify-between">
                      <span>{sem.nameAr} ({sem.nameEn})</span>
                      <span className="text-blue-600">{sem.totalCreditHours} ساعات معتمدة</span>
                    </div>
                    <ul className="space-y-1 text-slate-600">
                      {sem.courses.map((c) => (
                        <li key={c.id} className="flex justify-between py-0.5 border-b border-slate-50 last:border-0">
                          <span>
                            <strong className="font-mono text-slate-700">{c.arabicCode}</strong> - {c.nameAr}
                          </span>
                          <span className="text-slate-400">{c.creditHours} س.م</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative">
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[55vh] selection:bg-emerald-800 selection:text-white" dir="ltr">
                {jsonString}
              </pre>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            ملف الخطة متاح أيضاً في: /public/study_plan.json
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="copy-json-btn"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ' : 'نسخ JSON'}</span>
            </button>
            <button
              type="button"
              id="download-json-file-btn"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل الملف (JSON)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
