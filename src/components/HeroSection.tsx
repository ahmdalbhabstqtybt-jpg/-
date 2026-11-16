import React, { useState } from 'react';
import { Bell, BookOpen, CheckCircle2, MessageSquareText, Sparkles, Upload } from 'lucide-react';
import { HERO_CAMPUS_IMAGE } from '../lib/assets';
import { MAJOR_LABELS, PLAN_LABELS } from '../lib/constants';
import {
  GAZA_INSTITUTIONS,
  getDeanshipsForInstitution,
  getDepartmentsForDeanship,
  inferMajorFromGaza,
} from '../lib/gazaUniversities';
import { GazaDepartmentsActivityChart } from './GazaDepartmentsActivityChart';
import { PWAInstallButton } from './PWAInstallButton';
import { StudentRankBadge } from './StudentRankBadge';
import type { MajorId, StudentProfile, StudyMaterial } from '../types/dirasati';

interface HeroSectionProps {
  profile: StudentProfile;
  universities: string[];
  materials: StudyMaterial[];
  totalMaterials: number;
  onUpdateProfile: (patch: Partial<StudentProfile>) => void;
  onExploreMyCourses: () => void;
  onOpenUpload: () => void;
  onGoToSubscriptions: () => void;
  onOpenAssistant?: () => void;
  onSelectDepartmentFromChart?: (department: string, university?: string) => void;
  onSelectFacultyFromChart?: (faculty: string, university?: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  profile,
  universities,
  materials,
  totalMaterials,
  onUpdateProfile,
  onExploreMyCourses,
  onOpenUpload,
  onGoToSubscriptions,
  onOpenAssistant,
  onSelectDepartmentFromChart,
  onSelectFacultyFromChart,
}) => {
  const [imageError, setImageError] = useState(false);

  const mainUniversities = GAZA_INSTITUTIONS.filter((i) => i.category === 'university');
  const collegeInstitutions = GAZA_INSTITUTIONS.filter((i) => i.category === 'college');
  const deanships = getDeanshipsForInstitution(profile.university);
  const activeFaculty =
    deanships.find((d) => d.name === profile.faculty)?.name || deanships[0]?.name || '';
  const departments = getDepartmentsForDeanship(profile.university, activeFaculty);
  const activeDepartment =
    departments.find((d) => d === profile.department) || departments[0] || '';

  const handleUniversityChange = (nextUni: string) => {
    const nextDeanships = getDeanshipsForInstitution(nextUni);
    const nextFaculty = nextDeanships[0]?.name || '';
    const nextDept = nextDeanships[0]?.departments[0] || '';
    onUpdateProfile({
      university: nextUni,
      faculty: nextFaculty,
      department: nextDept,
      majorId: inferMajorFromGaza(nextFaculty, nextDept),
    });
  };

  const handleFacultyChange = (nextFaculty: string) => {
    const nextDepts = getDepartmentsForDeanship(profile.university, nextFaculty);
    const nextDept = nextDepts[0] || '';
    onUpdateProfile({
      faculty: nextFaculty,
      department: nextDept,
      majorId: inferMajorFromGaza(nextFaculty, nextDept),
    });
  };

  return (
    <section className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Exam season notice banner */}
        {profile.examAlertsEnabled && (
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-sm text-[#92400E]">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-[#D97706] shrink-0" />
              <span>
                <strong>تذكير موسم الامتحانات:</strong> تم تحديث أسئلة السنوات السابقة وملخصات المراجعة النهائية لمساقات{' '}
                {activeDepartment || MAJOR_LABELS[profile.majorId]} (السنة{' '}
                <span className="font-mono-nums">{profile.academicYear}</span>).
              </span>
            </div>
            <button
              type="button"
              onClick={onExploreMyCourses}
              className="text-xs font-semibold text-[#B45309] hover:text-[#78350F] underline underline-offset-4 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              عرض مساقاتي الآن
            </button>
          </div>
        )}

        {/* 2-Column Hero Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span>منصة طلابية لجامعات وكليات قطاع غزة</span>
              <span aria-hidden="true">·</span>
              <span>14 جامعة وكلية · 70 عمادة · 350 قسماً</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-nums">{totalMaterials} مادة مراجعة وموثقة</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold leading-[1.2] text-[#0F172A]">
              كل محاضراتك وملخصاتك وأسئلة السنوات في مكان واحد منظم
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              بدلاً من ضياع الملفات في مجموعات واتساب وفيسبوك المبعثرة، تصفّح موادك حسب جامعتك أو كليتك في قطاع غزة والعمادة والقسم بملفات موثقة ومقيّمة من الطلبة والمعلمين.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onExploreMyCourses}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
              >
                <BookOpen className="w-4 h-4" />
                <span>تصفح مواد تخصصي</span>
              </button>

              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm sm:text-base font-semibold text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <Upload className="w-4 h-4 text-[#059669]" />
                <span>ارفع ملخصاً لتقييم المعلم</span>
              </button>

              {onOpenAssistant && (
                <button
                  type="button"
                  onClick={onOpenAssistant}
                  className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  <MessageSquareText className="w-4 h-4" />
                  <span>اسأل المساعد الأكاديمي</span>
                </button>
              )}

              <PWAInstallButton />
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                ملفات مراجعة من الطلبة والمدرّسين
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                <span>
                  خطتك الحالية: <strong className="text-[#0F172A]">{PLAN_LABELS[profile.planId]}</strong>
                </span>
              </span>
              <button
                type="button"
                onClick={onGoToSubscriptions}
                className="text-sm font-semibold text-[#2563EB] hover:underline underline-offset-4"
              >
                رصيدك: <span className="font-mono-nums">{profile.points}</span> نقطة (استبدال أو ترقية)
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative h-64 sm:h-80 lg:h-full min-h-[280px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              {!imageError ? (
                <img
                  src={HERO_CAMPUS_IMAGE}
                  alt="طلاب جامعيون يتعاونون في قاعة الدراسة باستخدام منصة دراستي"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-blue-50 to-emerald-50 text-slate-700">
                  <BookOpen className="w-12 h-12 text-[#2563EB] mb-3" />
                  <p className="font-display font-bold text-lg">بيئة دراسية جامعية متكاملة</p>
                  <p className="text-sm text-slate-500 mt-1">محاضرات · ملخصات · أسئلة سنوات</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent p-5 text-white">
                <p className="text-xs text-slate-200">جامعات وكليات قطاع غزة المعتمدة</p>
                <p className="font-display font-bold text-base mt-0.5">
                  الإسلامية · الأزهر · الأقصى · القدس المفتوحة · فلسطين · UCAS
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Student Profile Rank + Gaza Institution/Deanship/Department Personalization */}
        <div className="mt-8 pt-6 border-t border-slate-200 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-5">
              <h2 className="font-display text-sm sm:text-base font-bold text-[#0F172A]">
                ملف الطالب: {profile.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {profile.university}
                {activeFaculty ? ` · ${activeFaculty}` : ''}
                {activeDepartment ? ` · ${activeDepartment}` : ''}
              </p>
            </div>
            <div className="lg:col-span-7">
              <StudentRankBadge points={profile.points} showProgress />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1.5">
                الجامعة / الكلية (قطاع غزة)
              </span>
              <select
                value={profile.university}
                onChange={(e) => handleUniversityChange(e.target.value)}
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
              >
                <optgroup label="أولاً: الجامعات الرئيسية الحكومية والخاصة">
                  {mainUniversities.map((inst) => (
                    <option key={inst.id} value={inst.name}>
                      {inst.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="ثانياً: الكليات الجامعية والمتوسطة">
                  {collegeInstitutions.map((inst) => (
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
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1.5">
                العمادة / الكلية
              </span>
              <select
                value={activeFaculty}
                onChange={(e) => handleFacultyChange(e.target.value)}
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
              >
                {deanships.map((dean) => (
                  <option key={dean.id} value={dean.name}>
                    {dean.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1.5">
                القسم / التخصص الدقيق
              </span>
              <select
                value={activeDepartment}
                onChange={(e) => {
                  const nextDept = e.target.value;
                  onUpdateProfile({
                    department: nextDept,
                    majorId: inferMajorFromGaza(activeFaculty, nextDept),
                  });
                }}
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1.5">
                التخصص العام
              </span>
              <select
                value={profile.majorId}
                onChange={(e) => onUpdateProfile({ majorId: e.target.value as MajorId })}
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
              >
                {(Object.keys(MAJOR_LABELS) as MajorId[]).map((mId) => (
                  <option key={mId} value={mId}>
                    {MAJOR_LABELS[mId]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1.5">السنة الدراسية</span>
              <select
                value={profile.academicYear}
                onChange={(e) => onUpdateProfile({ academicYear: Number(e.target.value) })}
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
              >
                {[1, 2, 3, 4, 5, 6].map((year) => (
                  <option key={year} value={year}>
                    السنة الدراسية {year}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => onUpdateProfile({ examAlertsEnabled: !profile.examAlertsEnabled })}
                className={`h-11 px-3.5 rounded-lg border text-sm font-medium flex items-center justify-between transition-colors ${
                  profile.examAlertsEnabled
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>إشعارات الامتحانات والمواد</span>
                <span className="text-xs font-semibold">
                  {profile.examAlertsEnabled ? 'مفعّلة' : 'متوقفة'}
                </span>
              </button>
            </div>
          </div>

          {/* Recharts Bar Chart: Uploaded Materials Distribution by Gaza University Departments & Deanships */}
          <GazaDepartmentsActivityChart
            materials={materials}
            studentUniversity={profile.university}
            onSelectDepartment={onSelectDepartmentFromChart}
            onSelectFaculty={onSelectFacultyFromChart}
          />
        </div>
      </div>
    </section>
  );
};
