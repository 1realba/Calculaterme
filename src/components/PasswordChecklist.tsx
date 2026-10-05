import { Check, X, ShieldAlert, ShieldCheck, AlertCircle } from 'lucide-react';
import { PasswordCriteria } from '../types.ts';

interface Props {
  password: string;
  criteria: PasswordCriteria;
}

export function evaluatePassword(password: string): {
  criteria: PasswordCriteria;
  score: number;
  strengthLabel: string;
  strengthColor: string;
  isStrong: boolean;
  containsArabic: boolean;
  containsSpaces: boolean;
} {
  const p = password || '';
  const containsArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(p);
  const containsSpaces = /\s/.test(p);

  const criteria: PasswordCriteria = {
    minLength: p.length >= 8,
    hasUppercase: /[A-Z]/.test(p),
    hasLowercase: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSymbol: /[^A-Za-z0-9\s]/.test(p),
    hasNoSpaces: p.length > 0 && !containsSpaces,
    isEnglishOnly: p.length > 0 && /^[\x21-\x7E]+$/.test(p) && !containsArabic,
  };

  const count = Object.values(criteria).filter(Boolean).length;
  const isStrong = count === 7;

  let strengthLabel = 'غير مستوفية للشروط';
  let strengthColor = 'bg-rose-500';

  if (count === 7) {
    strengthLabel = 'كلمة مرور قوية ومطابقة لكافة الشروط';
    strengthColor = 'bg-emerald-600';
  } else if (count >= 5) {
    strengthLabel = 'مقبولة - تنقصها بعض الشروط';
    strengthColor = 'bg-amber-500';
  } else if (p.length > 0) {
    strengthLabel = 'ضعيفة جداً';
    strengthColor = 'bg-rose-500';
  } else {
    strengthLabel = 'يرجى إدخال كلمة المرور';
    strengthColor = 'bg-slate-300';
  }

  return {
    criteria,
    score: count,
    strengthLabel,
    strengthColor,
    isStrong,
    containsArabic,
    containsSpaces,
  };
}

export default function PasswordChecklist({ password, criteria }: Props) {
  const containsArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(password || '');
  const containsSpaces = /\s/.test(password || '');

  const items = [
    {
      id: 'rule-min-length',
      label: 'لا تقل عن 8 خانات',
      detail: '8 أحرف أو أكثر',
      valid: criteria.minLength,
    },
    {
      id: 'rule-no-spaces',
      label: 'لا تحتوي على مسافات',
      detail: 'مسافات ممنوعة تماماً',
      valid: criteria.hasNoSpaces,
      alert: containsSpaces ? 'تم اكتشاف مسافة! يرجى حذفها' : undefined,
    },
    {
      id: 'rule-english-only',
      label: 'لغة إنجليزية فقط',
      detail: 'لا تقبل أحرف عربية أو لغات أخرى',
      valid: criteria.isEnglishOnly,
      alert: containsArabic ? 'تم اكتشاف أحرف عربية! اكتب بالإنجليزية فقط' : undefined,
    },
    {
      id: 'rule-has-uppercase',
      label: 'حروف كبيرة كبتل (Capital)',
      detail: 'حرف واحد على الأقل (A-Z)',
      valid: criteria.hasUppercase,
    },
    {
      id: 'rule-has-lowercase',
      label: 'حروف صغيرة سمول (Small)',
      detail: 'حرف واحد على الأقل (a-z)',
      valid: criteria.hasLowercase,
    },
    {
      id: 'rule-has-number',
      label: 'أرقام (0-9)',
      detail: 'رقم واحد على الأقل',
      valid: criteria.hasNumber,
    },
    {
      id: 'rule-has-symbol',
      label: 'رموز خاصة (!@#$%)',
      detail: 'رمز خاص واحد على الأقل',
      valid: criteria.hasSymbol,
    },
  ];

  const metCount = items.filter((i) => i.valid).length;
  const allMet = metCount === 7;

  return (
    <div id="password-requirements-card" className="bg-[#fcfdfd] border border-emerald-900/15 rounded-xl p-3.5 space-y-2.5 text-xs shadow-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-emerald-950 flex items-center gap-1.5">
          {allMet ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          )}
          شروط كلمة المرور المعتمدة بالكلية:
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
            allMet
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-amber-100 text-amber-900 border border-amber-200'
          }`}
        >
          {metCount} من 7 مكتملة
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            allMet
              ? 'bg-emerald-600 w-full'
              : metCount >= 4
              ? 'bg-amber-500'
              : 'bg-rose-500'
          }`}
          style={{ width: `${(metCount / 7) * 100}%` }}
        />
      </div>

      {/* Immediate Warnings */}
      {(containsArabic || containsSpaces) && (
        <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] flex items-center gap-1.5 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          <span>
            {containsArabic && containsSpaces
              ? 'تنبيه: كلمة المرور تحتوي على مسافات وأحرف عربية. المسموح إنجليزي فقط بدون مسافات.'
              : containsArabic
              ? 'تنبيه: لا تقبل كلمة المرور أحرفاً عربية. يرجى التحويل للغة الإنجليزية.'
              : 'تنبيه: كلمة المرور لا تقبل أي مسافات.'}
          </span>
        </div>
      )}

      {/* Checklist items */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {items.map((item) => (
          <li
            key={item.id}
            id={item.id}
            className={`flex items-center gap-2 p-1.5 rounded-lg border transition-colors ${
              item.valid
                ? 'text-emerald-800 bg-emerald-50/80 border-emerald-200/80'
                : 'text-slate-600 bg-white border-slate-200'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                item.valid
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              {item.valid ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold block leading-tight">{item.label}</span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                {item.alert ? (
                  <strong className="text-rose-600">{item.alert}</strong>
                ) : (
                  item.detail
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
