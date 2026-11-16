import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  BookOpen,
  Calendar,
  CalendarClock,
  Check,
  LayoutGrid,
  MapPin,
  Plus,
  Send,
  X,
} from 'lucide-react';
import { MAJOR_LABELS } from '../lib/constants';
import { ExamCalendarView } from './ExamCalendarView';
import type {
  ExamCourse,
  ExamNotificationLog,
  MajorId,
  StudentProfile,
} from '../types/dirasati';

interface ExamCountdownSectionProps {
  profile: StudentProfile;
  exams: ExamCourse[];
  examNotifications: ExamNotificationLog[];
  onUpdateProfile: (patch: Partial<StudentProfile>) => Promise<void>;
  onAddExam: (payload: {
    courseCode: string;
    courseName: string;
    majorId: MajorId;
    academicYear: number;
    examTitle: string;
    examDate: string;
    location: string;
  }) => Promise<void>;
  onTriggerExamAlert: (
    examId: string,
    channel: ExamNotificationLog['channel'],
    message: string,
  ) => Promise<void>;
  onMarkNotificationsRead: () => Promise<void>;
  onJumpToCourseMaterials: (courseName: string) => void;
}

interface RemainingTime {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalHours: number;
}

function getRemainingTime(isoDate: string, nowMs: number): RemainingTime {
  const targetMs = new Date(isoDate).getTime();
  const totalMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    totalHours: totalMs / (1000 * 60 * 60),
  };
}

const CHANNEL_LABELS: Record<ExamNotificationLog['channel'], string> = {
  in_app: 'تنبيه داخل المنصة',
  whatsapp: 'إشعار واتساب',
  email: 'بريد إلكتروني',
  browser: 'إشعار المتصفح',
};

export const ExamCountdownSection: React.FC<ExamCountdownSectionProps> = ({
  profile,
  exams,
  examNotifications,
  onUpdateProfile,
  onAddExam,
  onTriggerExamAlert,
  onMarkNotificationsRead,
  onJumpToCourseMaterials,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('calendar');
  const [manageOpen, setManageOpen] = useState(false);
  const [addExamOpen, setAddExamOpen] = useState(false);
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported',
  );

  // Add custom exam form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('امتحان منتصف الفصل');
  const [newDate, setNewDate] = useState('2026-11-19T10:00');
  const [newLocation, setNewLocation] = useState('');
  const [savingExam, setSavingExam] = useState(false);

  // Tick every second for accurate exam countdowns
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const enrolledExams = useMemo(() => {
    return exams
      .filter((exam) => profile.enrolledCourses.includes(exam.courseCode))
      .map((exam) => ({
        exam,
        remaining: getRemainingTime(exam.examDate, nowMs),
      }))
      .sort((a, b) => a.remaining.totalMs - b.remaining.totalMs);
  }, [exams, profile.enrolledCourses, nowMs]);

  const imminentExams = useMemo(
    () =>
      enrolledExams.filter(
        ({ remaining }) => remaining.totalMs > 0 && remaining.totalHours <= profile.alertLeadHours,
      ),
    [enrolledExams, profile.alertLeadHours],
  );

  const unreadCount = examNotifications.filter((n) => !n.read).length;

  const handleToggleCourse = async (courseCode: string) => {
    const exists = profile.enrolledCourses.includes(courseCode);
    const updated = exists
      ? profile.enrolledCourses.filter((c) => c !== courseCode)
      : [...profile.enrolledCourses, courseCode];
    await onUpdateProfile({ enrolledCourses: updated });
  };

  const handleEnrollMajorCourses = async () => {
    const majorCodes = exams
      .filter((e) => e.majorId === profile.majorId)
      .map((e) => e.courseCode);
    const merged = Array.from(new Set([...profile.enrolledCourses, ...majorCodes]));
    await onUpdateProfile({ enrolledCourses: merged });
  };

  const handleRequestBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setBrowserPermission(perm);
    if (perm === 'granted' && imminentExams.length > 0) {
      const next = imminentExams[0];
      new Notification(`تنبيه امتحان قريب: ${next.exam.courseName}`, {
        body: `${next.exam.examTitle} — متبقي ${next.remaining.days} يوم و ${next.remaining.hours} ساعة في ${next.exam.location}`,
      });
    }
  };

  const handleSendManualAlert = async (exam: ExamCourse, rem: RemainingTime) => {
    const channel: ExamNotificationLog['channel'] = profile.whatsappAlertsEnabled
      ? 'whatsapp'
      : profile.emailAlertsEnabled
        ? 'email'
        : 'in_app';

    const msg = `تذكير اختبار ${exam.courseName} (${exam.courseCode}): متبقي ${rem.days} يوم و ${rem.hours} ساعة — ${exam.location}`;
    await onTriggerExamAlert(exam.id, channel, msg);

    if (browserPermission === 'granted' && 'Notification' in window) {
      new Notification(`تنبيه امتحان: ${exam.courseName}`, { body: msg });
    }
  };

  const handleAddExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim() || !newDate.trim()) return;
    setSavingExam(true);
    try {
      await onAddExam({
        courseCode: newCode.trim().toUpperCase(),
        courseName: newName.trim(),
        majorId: profile.majorId,
        academicYear: profile.academicYear,
        examTitle: newTitle.trim() || 'امتحان فصلي',
        examDate: newDate.length === 16 ? `${newDate}:00` : newDate,
        location: newLocation.trim() || 'القاعات الجامعية المركزية',
      });
      setNewCode('');
      setNewName('');
      setNewLocation('');
      setAddExamOpen(false);
    } finally {
      setSavingExam(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2 space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
        {/* Section Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#2563EB]">جدول امتحانات ملف الطالب</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-nums">{profile.enrolledCourses.length} مساقات مسجلة</span>
              <span aria-hidden="true">·</span>
              <span>تنبيه تلقائي قبل {profile.alertLeadHours} ساعة</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F172A]">
              العدّاد التنازلي للامتحانات القادمة
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#0F172A] shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>العدّاد التنازلي</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'calendar'
                    ? 'bg-white text-[#0F172A] shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>التقويم الشهري</span>
              </button>
            </div>

            {browserPermission === 'default' && (
              <button
                type="button"
                onClick={handleRequestBrowserNotifications}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB]/15 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>تفعيل تنبيهات المتصفح</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setAlertsDrawerOpen((prev) => !prev);
                if (!alertsDrawerOpen && unreadCount > 0) {
                  onMarkNotificationsRead();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Bell className="w-3.5 h-3.5 text-[#D97706]" />
              <span>سجل التنبيهات</span>
              <span className="font-mono-nums">({examNotifications.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setManageOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>{manageOpen ? 'إخفاء إدارة المساقات' : 'إدارة مساقاتي ومواعيدها'}</span>
            </button>
          </div>
        </div>

        {/* Imminent Exam Alert Strip */}
        {profile.examAlertsEnabled && imminentExams.length > 0 && (
          <div className="px-4 py-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-[#92400E]">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>تنبيه اقتراب موعد اختبار:</strong> لديك{' '}
                <span className="font-mono-nums font-bold">{imminentExams.length}</span> اختبار
                خلال أقل من{' '}
                <span className="font-mono-nums font-bold">{profile.alertLeadHours}</span> ساعة
                (أقربها: <strong>{imminentExams[0].exam.courseName}</strong>).
              </span>
            </div>
            <button
              type="button"
              onClick={() => onJumpToCourseMaterials(imminentExams[0].exam.courseName)}
              className="text-xs font-semibold text-[#B45309] hover:text-[#78350F] underline underline-offset-4 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              فتح ملخصات {imminentExams[0].exam.courseCode}
            </button>
          </div>
        )}

        {/* Manage Enrolled Courses & Alert Threshold Panel */}
        {manageOpen && (
          <div className="p-4 sm:p-5 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-[#0F172A]">
                  تحديد المساقات المسجلة في ملفك وتوقيت التنبيه
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  اختر مساقاتك ليتم احتساب العد التنازلي وإرسال التنبيهات قبل الامتحان تلقائياً
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                  <span>التنبيه قبل:</span>
                  <select
                    value={profile.alertLeadHours}
                    onChange={(e) => onUpdateProfile({ alertLeadHours: Number(e.target.value) })}
                    className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value={24}>24 ساعة</option>
                    <option value={48}>48 ساعة</option>
                    <option value={72}>72 ساعة (3 أيام)</option>
                    <option value={168}>أسبوع كامل</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={handleEnrollMajorCourses}
                  className="px-3 h-9 text-xs font-semibold text-[#2563EB] bg-white border border-slate-200 hover:border-[#2563EB] rounded-lg transition-colors"
                >
                  تسجيل مساقات {MAJOR_LABELS[profile.majorId]}
                </button>

                <button
                  type="button"
                  onClick={() => setAddExamOpen((p) => !p)}
                  className="inline-flex items-center gap-1 px-3 h-9 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة موعد امتحان</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {exams.map((exam) => {
                const enrolled = profile.enrolledCourses.includes(exam.courseCode);
                return (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => handleToggleCourse(exam.courseCode)}
                    className={`text-right px-3.5 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${
                      enrolled
                        ? 'bg-white border-[#2563EB] text-[#0F172A]'
                        : 'bg-white/60 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-mono-nums font-semibold text-[#2563EB]">
                        {exam.courseCode}
                      </span>{' '}
                      <span className="font-medium truncate">{exam.courseName}</span>
                    </div>
                    {enrolled && <Check className="w-4 h-4 text-[#059669] shrink-0" />}
                  </button>
                );
              })}
            </div>

            {addExamOpen && (
              <form
                onSubmit={handleAddExamSubmit}
                className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
              >
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="الرمز (مثل CS 305)"
                  className="h-10 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="اسم المساق *"
                  className="h-10 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="عنوان الامتحان"
                  className="h-10 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
                <input
                  type="datetime-local"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-10 px-3 text-xs font-mono-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="القاعة"
                    className="flex-1 min-w-0 h-10 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <button
                    type="submit"
                    disabled={savingExam || !newCode.trim() || !newName.trim()}
                    className="px-3.5 h-10 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    حفظ
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Sent Notifications Log Panel */}
        {alertsDrawerOpen && (
          <div className="p-4 sm:p-5 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#0F172A]">
                سجل الإشعارات والتنبيهات المرسلة ({examNotifications.length})
              </h3>
              <button
                type="button"
                onClick={() => setAlertsDrawerOpen(false)}
                aria-label="إغلاق سجل التنبيهات"
                className="p-1 text-slate-500 hover:text-slate-900 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {examNotifications.length === 0 ? (
              <p className="text-xs text-slate-500">
                لم يتم إرسال تنبيهات بعد. يتم الإرسال تلقائياً عند اقتراب الاختبار أو عبر زر «إرسال تذكير».
              </p>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {examNotifications.map((notif) => (
                  <li
                    key={notif.id}
                    className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <span className="font-semibold text-[#2563EB]">
                          {CHANNEL_LABELS[notif.channel]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-nums">{notif.courseCode}</span>
                      </div>
                      <p className="text-slate-800">{notif.message}</p>
                    </div>
                    <span className="font-mono-nums text-slate-400 shrink-0">
                      {notif.sentAt.slice(0, 16).replace('T', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* View Content: Monthly Calendar vs Live Countdown Cards */}
        {viewMode === 'calendar' ? (
          <ExamCalendarView
            exams={exams}
            profile={profile}
            nowMs={nowMs}
            onJumpToCourseMaterials={onJumpToCourseMaterials}
            onToggleEnrollCourse={handleToggleCourse}
            onSendExamAlert={(exam) =>
              handleSendManualAlert(exam, getRemainingTime(exam.examDate, nowMs))
            }
            onRequestAddExamOnDate={(isoDatePrefix) => {
              setNewDate(isoDatePrefix);
              setManageOpen(true);
              setAddExamOpen(true);
            }}
          />
        ) : enrolledExams.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl space-y-3">
            <p className="text-sm font-medium text-slate-700">
              لا توجد مساقات مسجلة في ملفك الشخصي حالياً
            </p>
            <button
              type="button"
              onClick={handleEnrollMajorCourses}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
            >
              إضافة مساقات {MAJOR_LABELS[profile.majorId]} تلقائياً
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledExams.map(({ exam, remaining }) => {
              const isImminent =
                remaining.totalMs > 0 && remaining.totalHours <= profile.alertLeadHours;
              const isPassed = remaining.totalMs === 0;

              return (
                <div
                  key={exam.id}
                  className={`rounded-xl p-4 border flex flex-col justify-between gap-4 ${
                    isImminent
                      ? 'bg-[#FFFBEB]/60 border-[#FCD34D]'
                      : 'bg-[#F8FAFC] border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-500">
                        <strong className="font-mono-nums text-[#2563EB]">
                          {exam.courseCode}
                        </strong>{' '}
                        · {MAJOR_LABELS[exam.majorId]}
                      </span>
                      {isImminent ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#B45309]">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                          اقترب الموعد
                        </span>
                      ) : isPassed ? (
                        <span className="text-slate-500 font-medium">انتهى الموعد</span>
                      ) : (
                        <span className="text-[#059669] font-medium">مجدول</span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-display text-base font-bold text-[#0F172A]">
                        {exam.courseName}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">{exam.examTitle}</p>
                    </div>

                    {/* Tabular Live Countdown Display */}
                    <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                      {[
                        { label: 'يوم', val: remaining.days },
                        { label: 'ساعة', val: remaining.hours },
                        { label: 'دقيقة', val: remaining.minutes },
                        { label: 'ثانية', val: remaining.seconds },
                      ].map((unit) => (
                        <div
                          key={unit.label}
                          className="bg-white border border-slate-200 rounded-lg py-2 px-1"
                        >
                          <div className="font-mono-nums text-lg font-bold text-[#0F172A] leading-none">
                            {String(unit.val).padStart(2, '0')}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">{unit.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{exam.location}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onJumpToCourseMaterials(exam.courseName)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline underline-offset-4"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>مراجعة ملخصات المساق</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendManualAlert(exam, remaining)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-[#2563EB] rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      <span>إرسال تذكير</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
