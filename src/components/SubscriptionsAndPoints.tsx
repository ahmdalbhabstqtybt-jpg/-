import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { PLAN_LABELS, STUDENT_RANK_TIERS, getStudentRank } from '../lib/constants';
import { LinkedAccountsBox } from './LinkedAccountsBox';
import { StudentRankBadge } from './StudentRankBadge';
import type {
  BillingCycle,
  PlanId,
  SocialProvider,
  StudentProfile,
  StudyMaterial,
} from '../types/dirasati';

interface SubscriptionsAndPointsProps {
  profile: StudentProfile;
  materials: StudyMaterial[];
  onUpgradePlan: (planId: PlanId, billingCycle: BillingCycle, usePoints?: boolean) => Promise<void>;
  onUpdateProfile: (patch: Partial<StudentProfile>) => Promise<void>;
  onUpdateLinkedAccount: (
    provider: SocialProvider,
    connected: boolean,
    handle: string,
  ) => Promise<void>;
  onOpenUpload: () => void;
  onSelectMaterial: (material: StudyMaterial) => void;
}

export const SubscriptionsAndPoints: React.FC<SubscriptionsAndPointsProps> = ({
  profile,
  materials,
  onUpgradePlan,
  onUpdateProfile,
  onUpdateLinkedAccount,
  onOpenUpload,
  onSelectMaterial,
}) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('semester');
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'evaluated' | 'needs_revision'>('all');

  const studentUploads = useMemo(
    () => materials.filter((m) => m.authorRole === 'student'),
    [materials],
  );
  const pendingUploads = useMemo(
    () => studentUploads.filter((m) => !m.evaluationStatus || m.evaluationStatus === 'pending'),
    [studentUploads],
  );
  const evaluatedUploads = useMemo(
    () => studentUploads.filter((m) => m.evaluationStatus === 'evaluated'),
    [studentUploads],
  );
  const revisionUploads = useMemo(
    () => studentUploads.filter((m) => m.evaluationStatus === 'needs_revision'),
    [studentUploads],
  );

  const visibleUploads = useMemo(() => {
    if (statusFilter === 'pending') return pendingUploads;
    if (statusFilter === 'evaluated') return evaluatedUploads;
    if (statusFilter === 'needs_revision') return revisionUploads;
    return studentUploads;
  }, [statusFilter, studentUploads, pendingUploads, evaluatedUploads, revisionUploads]);

  const plans: {
    id: PlanId;
    title: string;
    audience: string;
    monthlyPrice: string;
    semesterPrice: string;
    annualPrice: string;
    limits: string[];
    featured?: boolean;
  }[] = [
    {
      id: 'free',
      title: 'الخطة المجانية المحدودة',
      audience: 'للتجربة والاستكشاف قبل الاشتراك',
      monthlyPrice: '0 د.أ',
      semesterPrice: '0 د.أ',
      annualPrice: '0 د.أ',
      limits: [
        'معاينة وتحميل الملفات المفتوحة مجاناً',
        'معاينة جزئية لباقي الملخصات المميزة',
        'التصويت في استبيان المساقات المطلوبة',
      ],
    },
    {
      id: 'basic',
      title: 'الخطة الأساسية',
      audience: 'للطالب الباحث عن المحاضرات والملخصات',
      monthlyPrice: '3 د.أ / شهر',
      semesterPrice: '10 د.أ / فصل',
      annualPrice: '24 د.أ / سنة',
      limits: [
        'وصول كامل للمحاضرات والملخصات الموثقة',
        'تخصيص صفحة مساقاتك حسب التخصص والسنة',
        'تنبيهات فورية عند رفع ملخص جديد',
      ],
    },
    {
      id: 'full',
      title: 'الخطة الكاملة (شاملة)',
      audience: 'الأوفر مقارنة بشراء الملخصات والكتب من المكتبات',
      monthlyPrice: '5 د.أ / شهر',
      semesterPrice: '16 د.أ / فصل',
      annualPrice: '38 د.أ / سنة',
      featured: true,
      limits: [
        'كل مزايا الأساسية + بنك أسئلة السنوات السابقة المحلولة',
        'الكتب المرجعية المختصرة وفيديوهات الشرح العملي',
        'حساب أولوية في الدعم الفوري عبر واتساب',
      ],
    },
    {
      id: 'instructor',
      title: 'خطة المدرّس والمساعد',
      audience: 'للأكاديميين ومساعدي التدريس',
      monthlyPrice: '9 د.أ / شهر',
      semesterPrice: '28 د.أ / فصل',
      annualPrice: '65 د.أ / سنة',
      limits: [
        'نشر السلايدات والمواد الرسمية بشارة التوثيق الأكاديمي',
        'إحصائيات تفاعل الطلبة وتقييماتهم على المساق',
        'تحديث التنبيهات مباشرة لكل طلبة المساق',
      ],
    },
  ];

  const getPriceLabel = (plan: (typeof plans)[number]) => {
    if (billingCycle === 'monthly') return plan.monthlyPrice;
    if (billingCycle === 'semester') return plan.semesterPrice;
    return plan.annualPrice;
  };

  const handleSelectPlan = async (planId: PlanId, usePoints = false) => {
    setBusyPlan(planId);
    setFeedback(null);
    try {
      const resolvedId: PlanId =
        planId === 'full' && billingCycle === 'annual' ? 'annual' : planId;
      await onUpgradePlan(resolvedId, billingCycle, usePoints);
      setFeedback(
        usePoints
          ? 'تم استبدال 100 نقطة بنجاح وتفعيل الخطة الكاملة لحسابك.'
          : `تم تحديث اشتراكك إلى: ${PLAN_LABELS[resolvedId]}`,
      );
    } finally {
      setBusyPlan(null);
    }
  };

  const pointsProgress = Math.min(100, profile.points);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header + Billing Cycle Toggle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
            نظام الاشتراكات وبرنامج النقاط
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1.5 max-w-2xl">
            اشتراك رمزي أرخص من تكلفة شراء وتصوير الملخصات في المكتبات، مع إمكانية كسب اشتراك مجاني عبر رفع ملخصاتك المميزة.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg self-start">
          {[
            { id: 'monthly', label: 'شهري' },
            { id: 'semester', label: 'فصلي' },
            { id: 'annual', label: 'سنوي (خصم 30%)' },
          ].map((cycle) => {
            const active = billingCycle === cycle.id;
            return (
              <button
                key={cycle.id}
                type="button"
                onClick={() => setBillingCycle(cycle.id as BillingCycle)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cycle.label}
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-900 flex items-center gap-2">
          <Check className="w-4 h-4 text-[#059669] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => {
          const isCurrent =
            profile.planId === plan.id ||
            (profile.planId === 'annual' && plan.id === 'full' && billingCycle === 'annual');
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-6 border flex flex-col justify-between ${
                plan.featured
                  ? 'border-[#2563EB] ring-1 ring-[#2563EB]'
                  : 'border-slate-200'
              }`}
            >
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-bold text-[#0F172A]">{plan.title}</h3>
                    {plan.featured && (
                      <span className="text-xs font-semibold text-[#2563EB]">الأكثر توفيراً</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{plan.audience}</p>
                </div>

                <div className="pt-2 pb-3 border-b border-slate-100">
                  <span className="font-mono-nums text-2xl font-bold text-[#0F172A]">
                    {getPriceLabel(plan)}
                  </span>
                </div>

                <ul className="space-y-2.5 text-sm text-slate-700">
                  {plan.limits.map((lim, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#059669] mt-0.5 shrink-0" />
                      <span>{lim}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  disabled={isCurrent || busyPlan === plan.id}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-2.5 px-4 text-sm font-semibold rounded-xl transition-colors ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-500 cursor-default'
                      : plan.featured
                        ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isCurrent
                    ? 'خطتك الحالية'
                    : busyPlan === plan.id
                      ? 'جارٍ التفعيل...'
                      : 'اختيار هذه الخطة'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Points Reward & Post-Sale Notifications Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Points Program */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669] shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#0F172A]">
                  برنامج النقاط: تقييم معلم المادة لملخصاتك
                </h3>
                <p className="text-xs text-slate-500">
                  يراجع معلم المادة ملخصك المرفوع ويمنحك النقاط المستحقة حسب جودته · 100 نقطة = تفعيل الخطة الكاملة مجاناً
                </p>
                <p className="text-xs font-medium text-slate-600 mt-1">
                  {profile.university}
                  {profile.faculty ? ` · ${profile.faculty}` : ''}
                  {profile.department ? ` · ${profile.department}` : ''}
                </p>
              </div>
            </div>

            <div className="text-right sm:text-left">
              <span className="block text-xs text-slate-500">رصيدك الحالي</span>
              <span className="font-mono-nums text-2xl font-bold text-[#059669]">
                {profile.points} نقطة
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>التقدم نحو مكافأة الاشتراك المجاني (100 نقطة)</span>
              <span className="font-mono-nums font-semibold">{pointsProgress}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#059669] transition-all duration-300"
                style={{ width: `${pointsProgress}%` }}
              />
            </div>
          </div>

          {/* Student Cumulative Points Rank Badge & Ladder */}
          <div className="space-y-3 pt-1">
            <StudentRankBadge points={profile.points} showProgress />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STUDENT_RANK_TIERS.map((tier) => {
                const currentRank = getStudentRank(profile.points).current;
                const isCurrent = currentRank.id === tier.id;
                const isReached = profile.points >= tier.minPoints;
                return (
                  <div
                    key={tier.id}
                    className={`p-2.5 rounded-lg border text-xs transition-colors ${
                      isCurrent
                        ? 'bg-blue-50/70 border-[#2563EB] text-[#0F172A]'
                        : isReached
                          ? 'bg-emerald-50/40 border-emerald-200 text-slate-700'
                          : 'bg-[#F8FAFC] border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="font-bold truncate">{tier.title}</div>
                    <div className="font-mono-nums text-[11px] mt-0.5">
                      {tier.minPoints}+ نقطة
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>رفع ملخص لتقييم المعلم</span>
            </button>

            <button
              type="button"
              disabled={profile.points < 100 || busyPlan === 'redeem'}
              onClick={() => handleSelectPlan('full', true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#059669] hover:bg-[#047857] disabled:bg-slate-200 disabled:text-slate-500 rounded-xl transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {profile.points >= 100
                  ? 'استبدال 100 نقطة باشتراك كامل'
                  : `يتبقى ${100 - profile.points} نقطة للاستبدال`}
              </span>
            </button>
          </div>
        </div>

        {/* Post-Sale Notifications */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-[#D97706]" />
            <h3 className="font-display text-lg font-bold text-[#0F172A]">
              تنبيهات ما بعد البيع وموسم الامتحانات
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            استقبل إشعاراً فورياً عند إضافة محاضرة أو ملخص أو أسئلة سنوات جديدة لمساقات تخصصك.
          </p>

          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl cursor-pointer">
              <span className="text-sm font-medium text-[#0F172A]">إشعارات واتساب لمساقاتي</span>
              <input
                type="checkbox"
                checked={profile.whatsappAlertsEnabled}
                onChange={(e) => onUpdateProfile({ whatsappAlertsEnabled: e.target.checked })}
                className="w-4 h-4 accent-[#2563EB]"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl cursor-pointer">
              <span className="text-sm font-medium text-[#0F172A]">ملخص بريد إلكتروني أسبوعي</span>
              <input
                type="checkbox"
                checked={profile.emailAlertsEnabled}
                onChange={(e) => onUpdateProfile({ emailAlertsEnabled: e.target.checked })}
                className="w-4 h-4 accent-[#2563EB]"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Dedicated Visual Student Uploaded Summaries & Teacher Evaluation Status Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-[#0F172A]">
              حالة تقييم ملفاتك المرفوعة لدى معلم المادة
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              تابع حالة كل ملخص رفعته: هل هو قيد المراجعة، أم تم قبوله ومنحك النقاط، أم يحتاج تعديلاً وفق ملاحظات المعلم.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {[
              { id: 'all', label: `الكل (${studentUploads.length})` },
              { id: 'pending', label: `قيد المراجعة (${pendingUploads.length})` },
              { id: 'evaluated', label: `تم القبول (${evaluatedUploads.length})` },
              { id: 'needs_revision', label: `ملاحظات التعديل (${revisionUploads.length})` },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      tab.id as 'all' | 'pending' | 'evaluated' | 'needs_revision',
                    )
                  }
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 font-mono-nums ${
                    active
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 Visual Summary Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[#92400E]">
              <Clock className="w-4 h-4 text-[#D97706] shrink-0" />
              <span className="text-xs font-semibold">قيد المراجعة</span>
            </div>
            <span className="font-mono-nums text-lg font-bold text-[#B45309]">
              {pendingUploads.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
              <span className="text-xs font-semibold">تم القبول ومنح النقاط</span>
            </div>
            <span className="font-mono-nums text-lg font-bold text-[#059669]">
              {evaluatedUploads.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-red-900">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-xs font-semibold">يحتاج تعديلاً</span>
            </div>
            <span className="font-mono-nums text-lg font-bold text-red-700">
              {revisionUploads.length}
            </span>
          </div>
        </div>

        {visibleUploads.length === 0 ? (
          <div className="p-8 bg-[#F8FAFC] border border-slate-200 rounded-xl text-center space-y-2">
            <p className="text-sm font-semibold text-[#0F172A]">
              لا توجد ملفات مرفوعة ضمن هذا التصنيف حالياً
            </p>
            <p className="text-xs text-slate-500">
              يمكنك رفع ملخص جديد ليقوم معلم المادة بمراجعته ومنحك النقاط المستحقة.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleUploads.map((item) => {
              const status = item.evaluationStatus || 'pending';
              const isApproved = status === 'evaluated';
              const isRevision = status === 'needs_revision';

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-xl border space-y-4 ${
                    isApproved
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : isRevision
                        ? 'bg-red-50/40 border-red-200'
                        : 'bg-[#FFFBEB]/50 border-[#FDE68A]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span className="font-mono-nums font-semibold text-[#2563EB]">
                          {item.courseCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.courseName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-nums">{item.updatedAt}</span>
                        {item.fileName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-mono-nums text-slate-700">
                              <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                              {item.fileName}
                            </span>
                          </>
                        )}
                      </div>

                      <h4 className="font-display text-base sm:text-lg font-bold text-[#0F172A]">
                        {item.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600">{item.summaryNotes}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${
                          isApproved
                            ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900'
                            : isRevision
                              ? 'bg-red-100/80 border-red-300 text-red-900'
                              : 'bg-amber-100/80 border-amber-300 text-amber-900'
                        }`}
                      >
                        {isApproved ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                            <span className="font-mono-nums">
                              تم القبول (+{item.teacherPointsAwarded || 0} نقطة)
                            </span>
                          </>
                        ) : isRevision ? (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span>ملاحظات تعديل</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-[#D97706]" />
                            <span>قيد المراجعة</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visual 3-Step Status Track */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full bg-[#059669]" />
                      <div className="font-semibold text-[#059669]">١. تم رفع الملف</div>
                    </div>
                    <div className="space-y-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          isApproved
                            ? 'bg-[#059669]'
                            : isRevision
                              ? 'bg-red-500'
                              : 'bg-[#D97706]'
                        }`}
                      />
                      <div
                        className={`font-semibold ${
                          isApproved
                            ? 'text-[#059669]'
                            : isRevision
                              ? 'text-red-700'
                              : 'text-[#B45309]'
                        }`}
                      >
                        ٢. مراجعة معلم المادة
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          isApproved
                            ? 'bg-[#059669]'
                            : isRevision
                              ? 'bg-red-500'
                              : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`font-semibold ${
                          isApproved
                            ? 'text-[#059669]'
                            : isRevision
                              ? 'text-red-700'
                              : 'text-slate-400'
                        }`}
                      >
                        {isRevision ? '٣. بانتظار التعديل' : '٣. القبول ومنح النقاط'}
                      </div>
                    </div>
                  </div>

                  {/* Teacher Note / Feedback Callout */}
                  <div
                    className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isApproved
                        ? 'bg-white border-emerald-200 text-emerald-950'
                        : isRevision
                          ? 'bg-white border-red-200 text-red-950'
                          : 'bg-white border-amber-200 text-amber-950'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold">
                        {isApproved
                          ? `تقييم معلم المادة (${item.evaluatedBy || 'معلم المساق'})${item.evaluatedAt ? ` · ${item.evaluatedAt}` : ''}:`
                          : isRevision
                            ? `ملاحظة التعديل من معلم المادة (${item.evaluatedBy || 'معلم المساق'})${item.evaluatedAt ? ` · ${item.evaluatedAt}` : ''}:`
                            : 'بانتظار مراجعة معلم المادة:'}
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {item.teacherEvaluationNote ||
                          (isApproved
                            ? 'تم قبول الملخص وإضافة النقاط المستحقة إلى رصيدك.'
                            : isRevision
                              ? 'يرجى مراجعة الملخص واستكمال الملاحظات وإعادة رفعه للتقييم.'
                              : 'سيتم إشعارك وإضافة النقاط فور انتهاء معلم المادة من تقييم الملف.')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectMaterial(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>معاينة الملف</span>
                      </button>

                      {isRevision && (
                        <button
                          type="button"
                          onClick={onOpenUpload}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>رفع نسخة معدّلة</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Linked Social Accounts Box (X, Facebook, Google, Instagram) */}
      <LinkedAccountsBox
        linkedAccounts={profile.linkedAccounts}
        onUpdateLink={onUpdateLinkedAccount}
      />
    </section>
  );
};
