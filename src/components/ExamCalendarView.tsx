import React, { useMemo, useState } from 'react';
import { DayPicker, type DayButtonProps } from 'react-day-picker';
import { ar } from 'react-day-picker/locale';
import { format } from 'date-fns';
import {
  AlertTriangle,
  BookOpen,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Send,
} from 'lucide-react';
import { ALL_MAJOR_IDS, MAJOR_LABELS } from '../lib/constants';
import type { ExamCourse, MajorId, StudentProfile } from '../types/dirasati';

interface ExamCalendarViewProps {
  exams: ExamCourse[];
  profile: StudentProfile;
  nowMs: number;
  onJumpToCourseMaterials: (courseName: string) => void;
  onToggleEnrollCourse: (courseCode: string) => Promise<void>;
  onSendExamAlert: (exam: ExamCourse) => Promise<void>;
  onRequestAddExamOnDate: (isoDatePrefix: string) => void;
}

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const WEEKDAYS_SHORT = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const WEEKDAYS_FULL = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

interface MajorColorStyle {
  dot: string;
  cell: string;
  selectedCell: string;
  chip: string;
  accentText: string;
}

const BLUE_STYLE: MajorColorStyle = {
  dot: 'bg-[#2563EB]',
  cell: 'bg-[#EFF6FF] border-[#93C5FD] hover:border-[#2563EB]',
  selectedCell: 'bg-[#DBEAFE] border-[#2563EB] ring-2 ring-[#2563EB]/40',
  chip: 'bg-[#DBEAFE] text-[#1E40AF]',
  accentText: 'text-[#1D4ED8]',
};

const EMERALD_STYLE: MajorColorStyle = {
  dot: 'bg-[#059669]',
  cell: 'bg-[#ECFDF5] border-[#6EE7B7] hover:border-[#059669]',
  selectedCell: 'bg-[#D1FAE5] border-[#059669] ring-2 ring-[#059669]/40',
  chip: 'bg-[#D1FAE5] text-[#065F46]',
  accentText: 'text-[#047857]',
};

const AMBER_STYLE: MajorColorStyle = {
  dot: 'bg-[#D97706]',
  cell: 'bg-[#FFFBEB] border-[#FCD34D] hover:border-[#D97706]',
  selectedCell: 'bg-[#FEF3C7] border-[#D97706] ring-2 ring-[#D97706]/40',
  chip: 'bg-[#FEF3C7] text-[#92400E]',
  accentText: 'text-[#B45309]',
};

const VIOLET_STYLE: MajorColorStyle = {
  dot: 'bg-[#7C3AED]',
  cell: 'bg-[#F5F3FF] border-[#C4B5FD] hover:border-[#7C3AED]',
  selectedCell: 'bg-[#EDE9FE] border-[#7C3AED] ring-2 ring-[#7C3AED]/40',
  chip: 'bg-[#EDE9FE] text-[#5B21B6]',
  accentText: 'text-[#6D28D9]',
};

const MAJOR_COLOR_MAP: Record<MajorId, MajorColorStyle> = {
  engineering: BLUE_STYLE,
  sciences: BLUE_STYLE,
  arts: BLUE_STYLE,
  medicine: EMERALD_STYLE,
  pharmacy: EMERALD_STYLE,
  sports: EMERALD_STYLE,
  business: AMBER_STYLE,
  law: AMBER_STYLE,
  humanities: AMBER_STYLE,
  it: VIOLET_STYLE,
  education: VIOLET_STYLE,
  media: VIOLET_STYLE,
};

function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export const ExamCalendarView: React.FC<ExamCalendarViewProps> = ({
  exams,
  profile,
  nowMs,
  onJumpToCourseMaterials,
  onToggleEnrollCourse,
  onSendExamAlert,
  onRequestAddExamOnDate,
}) => {
  const [scope, setScope] = useState<'all' | 'enrolled'>('all');
  const [majorFilter, setMajorFilter] = useState<'all' | MajorId>('all');

  const todayDate = useMemo(() => new Date(nowMs), [nowMs]);
  const todayKey = useMemo(() => toDateKey(todayDate), [todayDate]);

  const initialSelectedDate = useMemo(() => {
    const sorted = [...exams].sort(
      (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime(),
    );
    const upcomingEnrolled = sorted.find((e) => profile.enrolledCourses.includes(e.courseCode));
    const target = upcomingEnrolled || sorted[0];
    return target ? parseDateKey(target.examDate.slice(0, 10)) : new Date(nowMs);
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(initialSelectedDate);
  const [displayMonth, setDisplayMonth] = useState<Date>(
    () => new Date(initialSelectedDate.getFullYear(), initialSelectedDate.getMonth(), 1),
  );

  const visibleExams = useMemo(() => {
    return exams.filter((exam) => {
      if (scope === 'enrolled' && !profile.enrolledCourses.includes(exam.courseCode)) {
        return false;
      }
      if (majorFilter !== 'all' && exam.majorId !== majorFilter) {
        return false;
      }
      return true;
    });
  }, [exams, scope, majorFilter, profile.enrolledCourses]);

  const examsByDate = useMemo(() => {
    const map: Record<string, ExamCourse[]> = {};
    for (const exam of visibleExams) {
      const key = exam.examDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(exam);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.examDate.localeCompare(b.examDate));
    }
    return map;
  }, [visibleExams]);

  const majorDateSets = useMemo(() => {
    const sets = {} as Record<MajorId, Date[]>;
    const seenPerMajor = {} as Record<MajorId, Set<string>>;
    for (const mId of ALL_MAJOR_IDS) {
      sets[mId] = [];
      seenPerMajor[mId] = new Set();
    }
    const allDates: Date[] = [];
    const seenAll = new Set<string>();

    for (const exam of visibleExams) {
      const key = exam.examDate.slice(0, 10);
      const parsed = parseDateKey(key);
      if (!seenPerMajor[exam.majorId].has(key)) {
        seenPerMajor[exam.majorId].add(key);
        sets[exam.majorId].push(parsed);
      }
      if (!seenAll.has(key)) {
        seenAll.add(key);
        allDates.push(parsed);
      }
    }
    return { ...sets, hasExam: allDates };
  }, [visibleExams]);

  const selectedDateKey = toDateKey(selectedDate);
  const selectedExams = examsByDate[selectedDateKey] || [];

  const selectedDateFormatted = useMemo(() => {
    const d = selectedDate.getDate();
    const m = selectedDate.getMonth();
    const y = selectedDate.getFullYear();
    return `${WEEKDAYS_FULL[selectedDate.getDay()]}، ${d} ${ARABIC_MONTHS[m]} ${y}`;
  }, [selectedDate]);

  const monthlyExamCount = useMemo(() => {
    const prefix = format(displayMonth, 'yyyy-MM');
    return visibleExams.filter((e) => e.examDate.startsWith(prefix)).length;
  }, [visibleExams, displayMonth]);

  const handleGoToday = () => {
    const now = new Date(nowMs);
    setDisplayMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const CustomDayButton = (props: DayButtonProps) => {
    const { day, modifiers, className, children, ...buttonProps } = props;
    const key = toDateKey(day.date);
    const dayExams = examsByDate[key] || [];
    const distinctMajors = Array.from(new Set(dayExams.map((e) => e.majorId)));
    const isToday = key === todayKey;
    const isSelected = Boolean(modifiers.selected);

    const hasImminent = dayExams.some((e) => {
      const diffHours = (new Date(e.examDate).getTime() - nowMs) / (1000 * 60 * 60);
      return (
        profile.enrolledCourses.includes(e.courseCode) &&
        diffHours > 0 &&
        diffHours <= profile.alertLeadHours
      );
    });

    let surfaceClass = 'bg-white border-slate-200 hover:bg-slate-50';
    if (distinctMajors.length === 1) {
      const majorStyle = MAJOR_COLOR_MAP[distinctMajors[0]];
      surfaceClass = isSelected ? majorStyle.selectedCell : majorStyle.cell;
    } else if (distinctMajors.length > 1) {
      surfaceClass = isSelected
        ? 'bg-slate-100 border-[#2563EB] ring-2 ring-[#2563EB]/35'
        : 'bg-slate-50 border-slate-300 hover:border-[#2563EB]/60';
    } else if (isSelected) {
      surfaceClass = 'bg-[#2563EB]/5 border-[#2563EB] ring-2 ring-[#2563EB]/30';
    }

    return (
      <button
        {...buttonProps}
        type="button"
        className={`w-full min-h-[78px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-xl border text-right flex flex-col justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${surfaceClass}`}
      >
        {/* Top Row: Day number + Today/Imminent marker */}
        <div className="flex items-center justify-between w-full gap-1">
          <span
            className={`font-mono-nums text-xs sm:text-sm font-bold ${
              isToday ? 'text-[#2563EB] underline underline-offset-4' : 'text-[#0F172A]'
            }`}
          >
            {day.date.getDate()}
          </span>

          <div className="flex items-center gap-1">
            {hasImminent && <AlertTriangle className="w-3 h-3 text-[#D97706] shrink-0" />}
            {isToday && <span className="text-[10px] font-semibold text-[#2563EB]">اليوم</span>}
          </div>
        </div>

        {/* Multi-major color bar when 2+ majors fall on the same date */}
        {distinctMajors.length > 1 && (
          <div className="flex h-1 w-full rounded-full overflow-hidden my-1">
            {distinctMajors.map((maj) => (
              <span key={maj} className={`flex-1 ${MAJOR_COLOR_MAP[maj].dot}`} />
            ))}
          </div>
        )}

        {/* Course Codes Colored by Major */}
        {dayExams.length > 0 && (
          <div className="space-y-1 w-full mt-1">
            {dayExams.slice(0, 2).map((exam) => (
              <div
                key={exam.id}
                className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono-nums font-semibold truncate flex items-center gap-1 ${
                  MAJOR_COLOR_MAP[exam.majorId].chip
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${MAJOR_COLOR_MAP[exam.majorId].dot}`}
                />
                <span className="truncate">{exam.courseCode}</span>
              </div>
            ))}
            {dayExams.length > 2 && (
              <div className="text-[10px] font-mono-nums text-slate-500 px-1">
                +{dayExams.length - 2} أخرى
              </div>
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {/* Scope & Major Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMajorFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              majorFilter === 'all'
                ? 'bg-[#0F172A] text-white border-[#0F172A]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            كل التخصصات ({exams.length})
          </button>

          {ALL_MAJOR_IDS.filter((maj) => exams.some((e) => e.majorId === maj)).map((maj) => {
            const count = exams.filter((e) => e.majorId === maj).length;
            const active = majorFilter === maj;
            return (
              <button
                key={maj}
                type="button"
                onClick={() => setMajorFilter(active ? 'all' : maj)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  active
                    ? `${MAJOR_COLOR_MAP[maj].chip} border-current`
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${MAJOR_COLOR_MAP[maj].dot}`} />
                <span>{MAJOR_LABELS[maj]}</span>
                <span className="font-mono-nums opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleGoToday}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            اليوم
          </button>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                scope === 'all'
                  ? 'bg-white text-[#0F172A] shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كل امتحانات الكليات
            </button>
            <button
              type="button"
              onClick={() => setScope('enrolled')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                scope === 'enrolled'
                  ? 'bg-white text-[#0F172A] shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مساقاتي المسجلة
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Library Grid + Selected Day Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* react-day-picker Calendar */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-slate-500 font-mono-nums">
              {monthlyExamCount} امتحانات مجدولة في شهر {ARABIC_MONTHS[displayMonth.getMonth()]}{' '}
              {displayMonth.getFullYear()}
            </p>
            <span className="text-xs text-slate-400">اضغط على أي يوم لعرض التفاصيل</span>
          </div>

          <DayPicker
            dir="rtl"
            locale={ar}
            mode="single"
            selected={selectedDate}
            onSelect={(day) => {
              if (day) setSelectedDate(day);
            }}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            showOutsideDays
            navLayout="after"
            modifiers={{
              hasExam: majorDateSets.hasExam,
              engineering: majorDateSets.engineering,
              medicine: majorDateSets.medicine,
              business: majorDateSets.business,
              it: majorDateSets.it,
            }}
            formatters={{
              formatCaption: (date) =>
                `${ARABIC_MONTHS[date.getMonth()]} ${date.getFullYear()}`,
              formatWeekdayName: (date) => WEEKDAYS_SHORT[date.getDay()],
            }}
            components={{
              DayButton: CustomDayButton,
              Chevron: ({ orientation }) =>
                orientation === 'left' ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                ),
            }}
            classNames={{
              root: 'w-full',
              months: 'w-full',
              month: 'w-full space-y-3',
              month_caption: 'flex items-center justify-between px-1 pb-2',
              caption_label: 'font-display text-base sm:text-lg font-bold text-[#0F172A]',
              nav: 'flex items-center gap-1.5',
              button_previous:
                'p-2 text-slate-700 bg-[#F8FAFC] hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer',
              button_next:
                'p-2 text-slate-700 bg-[#F8FAFC] hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer',
              month_grid: 'w-full table-fixed border-separate border-spacing-1.5',
              weekdays: '',
              weekday: 'py-2 text-center text-xs font-semibold text-slate-500',
              weeks: '',
              week: '',
              day: 'p-0 align-top',
              day_button: 'w-full',
              outside: 'opacity-40',
            }}
          />

          {/* Major Color Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs text-slate-600">
            {(['engineering', 'medicine', 'business', 'it'] as MajorId[]).map((maj) => (
              <span key={maj} className="inline-flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded ${MAJOR_COLOR_MAP[maj].dot} inline-block`} />
                <span>{MAJOR_LABELS[maj]}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
              <span>اختبار مسجل قريب (ضمن نافذة التنبيه)</span>
            </span>
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="lg:col-span-4 bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarIcon className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>تفاصيل اليوم المحدد</span>
              </div>
              <h4 className="font-display text-base font-bold text-[#0F172A] mt-1">
                {selectedDateFormatted}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => onRequestAddExamOnDate(`${selectedDateKey}T10:00`)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#2563EB] bg-white border border-slate-200 hover:border-[#2563EB] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة موعد</span>
            </button>
          </div>

          {selectedExams.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700">
                لا توجد امتحانات مجدولة في هذا اليوم
              </p>
              <p className="text-xs text-slate-500">
                اختر أي يوم ملون حسب التخصص من التقويم لعرض مواعيد الاختبارات، أو أضف موعداً جديداً.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedExams.map((exam) => {
                const isEnrolled = profile.enrolledCourses.includes(exam.courseCode);
                const diffHours = (new Date(exam.examDate).getTime() - nowMs) / (1000 * 60 * 60);
                const isImminent =
                  isEnrolled && diffHours > 0 && diffHours <= profile.alertLeadHours;
                const timeStr = exam.examDate.slice(11, 16);
                const majorStyle = MAJOR_COLOR_MAP[exam.majorId];

                return (
                  <div
                    key={exam.id}
                    className={`p-4 rounded-xl border bg-white space-y-3 ${
                      isImminent ? 'border-[#FCD34D]' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <span className={`w-2.5 h-2.5 rounded-full ${majorStyle.dot}`} />
                        <strong className={`font-mono-nums ${majorStyle.accentText}`}>
                          {exam.courseCode}
                        </strong>
                        <span aria-hidden="true">·</span>
                        <span>{MAJOR_LABELS[exam.majorId]}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono-nums font-semibold text-[#0F172A]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {timeStr}
                      </span>
                    </div>

                    <div>
                      <h5 className="font-display text-sm font-bold text-[#0F172A]">
                        {exam.courseName}
                      </h5>
                      <p className="text-xs text-slate-600 mt-0.5">{exam.examTitle}</p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{exam.location}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onJumpToCourseMaterials(exam.courseName)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline underline-offset-4"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>ملخصات المساق</span>
                      </button>

                      {isEnrolled ? (
                        <button
                          type="button"
                          onClick={() => onSendExamAlert(exam)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>إرسال تذكير</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onToggleEnrollCourse(exam.courseCode)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] rounded-lg transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          <span>تسجيل بملفي</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
