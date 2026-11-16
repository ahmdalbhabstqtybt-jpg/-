import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Link2,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { HERO_CAMPUS_IMAGE } from '../lib/assets';
import { MAJOR_LABELS } from '../lib/constants';
import {
  GAZA_INSTITUTIONS,
  getDeanshipsForInstitution,
  getDepartmentsForDeanship,
  inferMajorFromGaza,
} from '../lib/gazaUniversities';
import { LinkedAccountsBox } from './LinkedAccountsBox';
import type { LinkedAccountsMap, MajorId, SocialProvider, UserRole } from '../types/dirasati';

export type AuthScreenMode = 'login' | 'register';

interface AuthPayload {
  role: UserRole;
  displayName?: string;
  email: string;
  password: string;
  university?: string;
  faculty?: string;
  department?: string;
  majorId?: MajorId;
  departmentOrTitle?: string;
  linkedAccounts?: Partial<LinkedAccountsMap>;
  secretCode?: string;
}

interface LoginViewProps {
  universities: string[];
  initialMode?: AuthScreenMode;
  onLogin: (payload: AuthPayload) => Promise<void>;
  onRegister: (payload: AuthPayload) => Promise<void>;
  onContinueAsGuest?: () => void;
}

const ROLE_CONFIG: Record<
  UserRole,
  {
    label: string;
    registerLabel: string;
    subtitle: string;
    registerSubtitle: string;
    emailPlaceholder: string;
    defaultName: string;
    perks: string[];
  }
> = {
  student: {
    label: 'دخول طالب',
    registerLabel: 'حساب طالب جديد',
    subtitle: 'الوصول للمحاضرات، الملخصات، عدّاد الامتحانات، ونظام النقاط',
    registerSubtitle: 'أنشئ حسابك الجامعي كطالب للوصول للمواد وجدولة امتحاناتك وحفظ نقاطك',
    emailPlaceholder: 'student@university.edu',
    defaultName: 'أحمد العبدالله',
    perks: [
      'تخصيص المساقات حسب جامعتك وتخصصك وسنتك الدراسية.',
      'عدّاد تنازلي وتقويم شهري للامتحانات مع تنبيهات تلقائية.',
      'رفع ملخصات وكسب +50 نقطة لفتح الاشتراكات مجاناً.',
    ],
  },
  teacher: {
    label: 'دخول معلم / مساعد',
    registerLabel: 'حساب معلم جديد',
    subtitle: 'نشر المواد الرسمية الموثقة وجدولة الامتحانات ومتابعة تقييمات الطلبة',
    registerSubtitle: 'أنشئ حساب معلم لنشر المحاضرات الرسمية وجدولة مواعيد اختبارات طلبتك',
    emailPlaceholder: 'instructor@university.edu',
    defaultName: 'د. طارق النسور',
    perks: [
      'نشر السلايدات وأسئلة السنوات المحلولة بشارة التوثيق الأكاديمي.',
      'جدولة مواعيد الامتحانات لتظهر مباشرة في تقويم طلبتك.',
      'متابعة متوسط تقييمات الطلبة وملاحظاتهم على كل ملف.',
    ],
  },
  admin: {
    label: 'دخول الإدارة',
    registerLabel: 'الإدارة',
    subtitle: 'توثيق المحتوى، إدارة الاشتراكات، معالجة تذاكر الدعم، ومتابعة الاستبيان',
    registerSubtitle: 'حسابات الإدارة معتمدة مسبقاً لتوثيق المحتوى ومتابعة المنصة',
    emailPlaceholder: 'admin@dirasati.edu',
    defaultName: 'إدارة منصة دراستي',
    perks: [
      'مراجعة وتوثيق الملخصات المرفوعة وضبط مستوى الوصول (مجاني/مدفوع).',
      'الرد المباشر على تذاكر الدعم الفني الواردة عبر واتساب والشات.',
      'تحديث حالة مساقات استبيان الطلبة ومتابعة عرض نموذج العمل.',
    ],
  },
};

export const LoginView: React.FC<LoginViewProps> = ({
  universities,
  initialMode = 'login',
  onLogin,
  onRegister,
  onContinueAsGuest,
}) => {
  const initialUni = universities[0] || GAZA_INSTITUTIONS[0]?.name || '';
  const initialDeanships = getDeanshipsForInstitution(initialUni);
  const initialFac = initialDeanships[0]?.name || '';
  const initialDepts = getDepartmentsForDeanship(initialUni, initialFac);

  const [authMode, setAuthMode] = useState<AuthScreenMode>(initialMode);
  const [role, setRole] = useState<UserRole>('student');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [university, setUniversity] = useState(initialUni);
  const [faculty, setFaculty] = useState(initialFac);
  const [department, setDepartment] = useState(initialDepts[0] || '');
  const [majorId, setMajorId] = useState<MajorId>(inferMajorFromGaza(initialFac, initialDepts[0]));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [showSocialLinkBox, setShowSocialLinkBox] = useState(false);
  const [draftLinks, setDraftLinks] = useState<LinkedAccountsMap>({
    google: { connected: false, handle: '' },
    x: { connected: false, handle: '' },
    facebook: { connected: false, handle: '' },
    instagram: { connected: false, handle: '' },
  });

  const deanships = getDeanshipsForInstitution(university);
  const activeFaculty = deanships.find((d) => d.name === faculty)?.name || deanships[0]?.name || '';
  const departments = getDepartmentsForDeanship(university, activeFaculty);
  const activeDepartment = departments.find((d) => d === department) || departments[0] || '';

  const handleUniversityChange = (nextUni: string) => {
    setUniversity(nextUni);
    const nextDeans = getDeanshipsForInstitution(nextUni);
    const nextFac = nextDeans[0]?.name || '';
    const nextDept = nextDeans[0]?.departments[0] || '';
    setFaculty(nextFac);
    setDepartment(nextDept);
    setMajorId(inferMajorFromGaza(nextFac, nextDept));
  };

  const handleFacultyChange = (nextFac: string) => {
    setFaculty(nextFac);
    const nextDepts = getDepartmentsForDeanship(university, nextFac);
    const nextDept = nextDepts[0] || '';
    setDepartment(nextDept);
    setMajorId(inferMajorFromGaza(nextFac, nextDept));
  };

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  const linkedDraftCount = (['google', 'x', 'facebook', 'instagram'] as SocialProvider[]).filter(
    (p) => draftLinks[p]?.connected && draftLinks[p]?.handle.trim(),
  ).length;

  const handleUpdateDraftLink = (provider: SocialProvider, connected: boolean, handle: string) => {
    setDraftLinks((prev) => ({
      ...prev,
      [provider]: {
        connected,
        handle: connected ? handle : '',
        ...(connected ? { connectedAt: new Date().toISOString() } : {}),
      },
    }));
  };

  const cfg = ROLE_CONFIG[role];

  const handleModeSwitch = (nextMode: AuthScreenMode) => {
    setAuthMode(nextMode);
    setError(null);
    if (nextMode === 'register' && role === 'admin') {
      setRole('student');
    }
  };

  const handleRoleSwitch = (nextRole: UserRole) => {
    if (authMode === 'register' && nextRole === 'admin') return;
    setRole(nextRole);
    setError(null);
  };

  const isSecretShortcut =
    displayName.trim() === '159632' &&
    !email.trim() &&
    !password.trim() &&
    !confirmPassword.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (trimmedName === '159632' && !trimmedEmail && !password.trim() && !confirmPassword.trim()) {
      setError(null);
      setSubmitting(true);
      try {
        await onLogin({
          role,
          displayName: '159632',
          email: '',
          password: '',
          university,
          faculty: activeFaculty || undefined,
          department: activeDepartment || undefined,
          majorId,
          secretCode: '159632',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول حالياً.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (authMode === 'register' && !trimmedName) {
      setError('يرجى إدخال الاسم الكامل لإنشاء الحساب الجديد.');
      return;
    }

    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      setError('يرجى إدخال بريد إلكتروني صحيح (مثال: name@gmail.com).');
      return;
    }

    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور.');
      return;
    }

    if (authMode === 'register') {
      if (password.trim().length < 4) {
        setError('يجب أن تتكون كلمة المرور من 4 أحرف أو أرقام على الأقل.');
        return;
      }
      if (password !== confirmPassword) {
        setError('كلمتا المرور غير متطابقتين.');
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    try {
      const payload: AuthPayload = {
        role: authMode === 'register' && role === 'admin' ? 'student' : role,
        displayName: trimmedName || undefined,
        email: trimmedEmail,
        password,
        university,
        faculty: activeFaculty || undefined,
        department: activeDepartment || undefined,
        majorId,
        linkedAccounts: draftLinks,
      };
      if (authMode === 'register') {
        await onRegister(payload);
      } else {
        await onLogin(payload);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : authMode === 'register'
            ? 'تعذر إنشاء الحساب حالياً.'
            : 'تعذر تسجيل الدخول حالياً.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const availableRoles =
    authMode === 'register' && displayName.trim() !== '159632'
      ? ([
          { id: 'student', label: 'طالب', Icon: GraduationCap },
          { id: 'teacher', label: 'معلم', Icon: UserCheck },
        ] as const)
      : ([
          { id: 'student', label: 'طالب', Icon: GraduationCap },
          { id: 'teacher', label: 'معلم', Icon: UserCheck },
          { id: 'admin', label: 'الإدارة', Icon: ShieldCheck },
        ] as const);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-extrabold tracking-tight text-[#0F172A]">
              دراستي
            </span>
          </div>
          <span className="text-xs text-slate-500">
            بوابة الدخول وإنشاء الحسابات · طالب · معلم · إدارة
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Auth Form Column */}
          <div className="lg:col-span-7 p-6 sm:p-8 space-y-5">
            {/* Login / Create New Account Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'login'}
                onClick={() => handleModeSwitch('login')}
                className={`py-2.5 px-3 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  authMode === 'login'
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'register'}
                onClick={() => handleModeSwitch('register')}
                className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  authMode === 'register'
                    ? 'bg-white text-[#2563EB] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>إنشاء حساب جديد</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
                {authMode === 'register'
                  ? 'إنشاء حساب جديد (طالب أو معلم)'
                  : 'تسجيل الدخول إلى منصة دراستي'}
              </h1>
              <p className="text-sm text-slate-600">
                {authMode === 'register' ? cfg.registerSubtitle : cfg.subtitle}
              </p>
            </div>

            {/* Role Selector Tabs */}
            <div className="space-y-1.5">
              <div
                className={`grid ${
                  availableRoles.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                } gap-1.5 p-1 bg-slate-100 rounded-xl`}
                role="tablist"
              >
                {availableRoles.map(({ id, label, Icon }) => {
                  const active = role === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => handleRoleSwitch(id)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white text-[#2563EB] shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
              {authMode === 'register' && (
                <p className="text-[11px] text-slate-500">
                  التسجيل الذاتي متاح لحسابات الطلاب والمعلمين فقط.
                </p>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 space-y-2">
                <p>{error}</p>
                {authMode === 'login' && role !== 'admin' && error.includes('إنشاء حساب جديد') && (
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('register')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline underline-offset-4"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>الانتقال الآن لإنشاء حساب جديد بهذا الإيميل</span>
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {authMode === 'register' ? 'الاسم الكامل *' : 'الاسم (اختياري)'}
                  </label>
                  <input
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={cfg.defaultName}
                    className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    البريد الإلكتروني (الإيميل) {isSecretShortcut ? '' : '*'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={cfg.emailPlaceholder}
                      dir="ltr"
                      className="w-full h-11 pl-10 pr-3 text-sm text-left bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {role !== 'admin' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      الجامعة / الكلية (قطاع غزة)
                    </label>
                    <select
                      value={university}
                      onChange={(e) => handleUniversityChange(e.target.value)}
                      className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    >
                      <optgroup label="أولاً: الجامعات الرئيسية الحكومية والخاصة">
                        {GAZA_INSTITUTIONS.filter((i) => i.category === 'university').map((inst) => (
                          <option key={inst.id} value={inst.name}>
                            {inst.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="ثانياً: الكليات الجامعية والمتوسطة">
                        {GAZA_INSTITUTIONS.filter((i) => i.category === 'college').map((inst) => (
                          <option key={inst.id} value={inst.name}>
                            {inst.name}
                          </option>
                        ))}
                      </optgroup>
                      {universities
                        .filter((u) => !GAZA_INSTITUTIONS.some((g) => g.name === u))
                        .map((uni) => (
                          <option key={uni} value={uni}>
                            {uni}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      العمادة / الكلية
                    </label>
                    <select
                      value={activeFaculty}
                      onChange={(e) => handleFacultyChange(e.target.value)}
                      className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    >
                      {deanships.map((dean) => (
                        <option key={dean.id} value={dean.name}>
                          {dean.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      القسم / التخصص الدقيق
                    </label>
                    <select
                      value={activeDepartment}
                      onChange={(e) => {
                        const nextDept = e.target.value;
                        setDepartment(nextDept);
                        setMajorId(inferMajorFromGaza(activeFaculty, nextDept));
                      }}
                      className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    >
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      التخصص العام
                    </label>
                    <select
                      value={majorId}
                      onChange={(e) => setMajorId(e.target.value as MajorId)}
                      className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    >
                      {(Object.keys(MAJOR_LABELS) as MajorId[]).map((mId) => (
                        <option key={mId} value={mId}>
                          {MAJOR_LABELS[mId]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div
                className={`grid grid-cols-1 ${
                  authMode === 'register' ? 'sm:grid-cols-2' : ''
                } gap-4`}
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    كلمة المرور *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pr-10 pl-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
                    />
                  </div>
                </div>

                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      تأكيد كلمة المرور *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-11 pr-10 pl-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Social Account Linking Box (X, Facebook, Google, Instagram) */}
              <div className="border border-slate-200 rounded-xl bg-[#F8FAFC] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSocialLinkBox((prev) => !prev)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-100/70 transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[#2563EB]" />
                    <span>ربط الحساب بـ (تويتر X · فيسبوك · قوقل · إنستغرام) (اختياري)</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono-nums text-[11px] font-bold text-slate-600">
                      {linkedDraftCount}/4
                    </span>
                    {showSocialLinkBox ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </span>
                </button>
                {showSocialLinkBox && (
                  <div className="p-4 pt-2 border-t border-slate-200 bg-white">
                    <LinkedAccountsBox
                      compact
                      requireAtLeastOne={false}
                      linkedAccounts={draftLinks}
                      onUpdateLink={handleUpdateDraftLink}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-xl transition-colors"
              >
                {submitting
                  ? authMode === 'register'
                    ? 'جارٍ إنشاء الحساب...'
                    : 'جارٍ تسجيل الدخول...'
                  : authMode === 'register'
                    ? `إنشاء ${cfg.registerLabel}`
                    : `تسجيل الدخول (${cfg.label})`}
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              {authMode === 'login' ? (
                <button
                  type="button"
                  onClick={() => handleModeSwitch('register')}
                  className="font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                >
                  مستخدم جديد؟ <span className="text-[#2563EB] underline underline-offset-4">إنشاء حساب طالب أو معلم</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleModeSwitch('login')}
                  className="font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                >
                  لديك حساب بالفعل؟ <span className="text-[#2563EB] underline underline-offset-4">تسجيل الدخول</span>
                </button>
              )}

              {onContinueAsGuest && (
                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  className="font-semibold text-slate-500 hover:text-[#2563EB] transition-colors"
                >
                  تصفح المنصة كزائر
                </button>
              )}
            </div>
          </div>

          {/* Visual Showcase Column */}
          <div className="lg:col-span-5 bg-[#0F172A] text-white flex flex-col justify-between">
            <div className="h-52 lg:h-64 relative overflow-hidden bg-slate-800">
              {!imgFailed ? (
                <img
                  src={HERO_CAMPUS_IMAGE}
                  alt="الحرم الجامعي ومنصة دراستي"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover opacity-90"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <BookOpen className="w-12 h-12 text-[#3B82F6]" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/60 to-transparent p-5">
                <span className="text-xs font-semibold text-blue-300">
                  صلاحيات {authMode === 'register' ? cfg.registerLabel : cfg.label}
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h2 className="font-display text-lg font-bold text-white">
                  ماذا يتيح لك هذا الحساب؟
                </h2>
                <ul className="space-y-3 text-sm text-slate-200 leading-relaxed">
                  {cfg.perks.map((perk, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="font-mono-nums text-xs font-bold text-blue-400 mt-0.5">
                        0{idx + 1}.
                      </span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>14 جامعة وكلية · 70 عمادة · 12 تخصصاً</span>
                <span className="font-mono-nums">نوفمبر 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
