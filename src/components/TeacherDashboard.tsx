import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  RotateCcw,
  Star,
  Upload,
} from 'lucide-react';
import { ACCESS_TIER_LABELS, MAJOR_LABELS, MATERIAL_TYPE_LABELS } from '../lib/constants';
import {
  GAZA_INSTITUTIONS,
  getDeanshipsForInstitution,
  getDepartmentsForDeanship,
  inferMajorFromGaza,
} from '../lib/gazaUniversities';
import type {
  AccessTier,
  AuthSession,
  ExamCourse,
  MajorId,
  MaterialType,
  StudyMaterial,
  TeacherEvaluationStatus,
} from '../types/dirasati';

interface TeacherDashboardProps {
  authSession: AuthSession;
  universities: string[];
  materials: StudyMaterial[];
  exams: ExamCourse[];
  onPublishOfficialMaterial: (payload: {
    title: string;
    university: string;
    faculty?: string;
    department?: string;
    majorId: MajorId;
    courseCode: string;
    courseName: string;
    academicYear: number;
    type: MaterialType;
    accessTier: AccessTier;
    authorRole: 'instructor';
    pagesOrDuration: string;
    summaryNotes: string;
    previewText: string;
  }) => Promise<void>;
  onAddExam: (payload: {
    courseCode: string;
    courseName: string;
    majorId: MajorId;
    academicYear: number;
    examTitle: string;
    examDate: string;
    location: string;
  }) => Promise<void>;
  onEvaluateMaterial: (
    id: string,
    payload: {
      status: TeacherEvaluationStatus;
      pointsAwarded: number;
      rating: number;
      evaluationNote: string;
    },
  ) => Promise<void>;
  onSelectMaterial: (mat: StudyMaterial) => void;
}

interface EvaluationDraft {
  pointsAwarded: number;
  rating: number;
  note: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  authSession,
  universities,
  materials,
  exams,
  onPublishOfficialMaterial,
  onAddExam,
  onEvaluateMaterial,
  onSelectMaterial,
}) => {
  const initialUni = universities[0] || GAZA_INSTITUTIONS[0]?.name || '';
  const initialDeanships = getDeanshipsForInstitution(initialUni);
  const initialFaculty = initialDeanships[1]?.name || initialDeanships[0]?.name || '';
  const initialDepts = getDepartmentsForDeanship(initialUni, initialFaculty);

  const [title, setTitle] = useState('');
  const [university, setUniversity] = useState(initialUni);
  const [faculty, setFaculty] = useState(initialFaculty);
  const [department, setDepartment] = useState(initialDepts[2] || initialDepts[0] || '');
  const [majorId, setMajorId] = useState<MajorId>('engineering');
  const [courseCode, setCourseCode] = useState('EE 201');
  const [courseName, setCourseName] = useState('دوائر كهربائية ١');
  const [academicYear, setAcademicYear] = useState(2);
  const [type, setType] = useState<MaterialType>('lecture');
  const [accessTier, setAccessTier] = useState<AccessTier>('free');
  const [pagesOrDuration, setPagesOrDuration] = useState('35 شريحة');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [publishing, setPublishing] = useState(false);

  const mainUniversities = GAZA_INSTITUTIONS.filter((i) => i.category === 'university');
  const collegeInstitutions = GAZA_INSTITUTIONS.filter((i) => i.category === 'college');
  const deanships = getDeanshipsForInstitution(university);
  const activeFaculty = deanships.find((d) => d.name === faculty)?.name || deanships[0]?.name || '';
  const departments = getDepartmentsForDeanship(university, activeFaculty);
  const activeDepartment =
    departments.find((d) => d === department) || departments[0] || '';

  // Schedule exam form
  const [examCode, setExamCode] = useState('');
  const [examCourseName, setExamCourseName] = useState('');
  const [examTitle, setExamTitle] = useState('امتحان منتصف الفصل');
  const [examDate, setExamDate] = useState('2026-11-21T10:00');
  const [examLocation, setExamLocation] = useState('');
  const [savingExam, setSavingExam] = useState(false);

  // Student summary evaluation state
  const [evalFilter, setEvalFilter] = useState<'pending' | 'evaluated' | 'all'>('pending');
  const [evalDrafts, setEvalDrafts] = useState<Record<string, EvaluationDraft>>({});
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const instructorMaterials = materials.filter((m) => m.authorRole === 'instructor');
  const studentMaterials = useMemo(
    () =>
      materials
        .filter((m) => m.authorRole === 'student')
        .sort((a, b) => {
          const rank = (s?: TeacherEvaluationStatus) =>
            s === 'pending' || !s ? 0 : s === 'needs_revision' ? 1 : 2;
          return rank(a.evaluationStatus) - rank(b.evaluationStatus);
        }),
    [materials],
  );
  const pendingCount = studentMaterials.filter(
    (m) => !m.evaluationStatus || m.evaluationStatus === 'pending',
  ).length;
  const evaluatedCount = studentMaterials.filter(
    (m) => m.evaluationStatus === 'evaluated',
  ).length;

  const visibleStudentMaterials = useMemo(() => {
    if (evalFilter === 'pending') {
      return studentMaterials.filter(
        (m) => !m.evaluationStatus || m.evaluationStatus === 'pending' || m.evaluationStatus === 'needs_revision',
      );
    }
    if (evalFilter === 'evaluated') {
      return studentMaterials.filter((m) => m.evaluationStatus === 'evaluated');
    }
    return studentMaterials;
  }, [studentMaterials, evalFilter]);

  const totalDownloads = instructorMaterials.reduce((acc, m) => acc + m.downloadsCount, 0);

  const getDraft = (mat: StudyMaterial): EvaluationDraft => {
    if (evalDrafts[mat.id]) return evalDrafts[mat.id];
    return {
      pointsAwarded: mat.teacherPointsAwarded && mat.teacherPointsAwarded > 0 ? mat.teacherPointsAwarded : 60,
      rating: 5,
      note: mat.teacherEvaluationNote || '',
    };
  };

  const updateDraft = (mat: StudyMaterial, patch: Partial<EvaluationDraft>) => {
    const current = getDraft(mat);
    setEvalDrafts((prev) => ({
      ...prev,
      [mat.id]: { ...current, ...patch },
    }));
  };

  const handleEvaluate = async (mat: StudyMaterial, status: TeacherEvaluationStatus) => {
    const draft = getDraft(mat);
    setEvalError(null);
    if (status === 'evaluated' && (!draft.pointsAwarded || draft.pointsAwarded < 1 || draft.pointsAwarded > 200)) {
      setEvalError('يرجى تحديد عدد النقاط المستحقة بين 1 و 200 نقطة.');
      return;
    }
    setEvaluatingId(mat.id);
    try {
      await onEvaluateMaterial(mat.id, {
        status,
        pointsAwarded: status === 'evaluated' ? draft.pointsAwarded : 0,
        rating: draft.rating,
        evaluationNote: draft.note.trim(),
      });
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'تعذر حفظ تقييم الملخص.');
    } finally {
      setEvaluatingId(null);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseName.trim() || !summaryNotes.trim()) return;
    setPublishing(true);
    try {
      await onPublishOfficialMaterial({
        title: title.trim(),
        university,
        faculty: activeFaculty || undefined,
        department: activeDepartment || undefined,
        majorId,
        courseCode: courseCode.trim() || 'INST 101',
        courseName: courseName.trim(),
        academicYear,
        type,
        accessTier,
        authorRole: 'instructor',
        pagesOrDuration: pagesOrDuration.trim() || '25 صفحة',
        summaryNotes: summaryNotes.trim(),
        previewText: previewText.trim(),
      });
      setTitle('');
      setSummaryNotes('');
      setPreviewText('');
    } finally {
      setPublishing(false);
    }
  };

  const handleScheduleExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCode.trim() || !examCourseName.trim() || !examDate.trim()) return;
    setSavingExam(true);
    try {
      await onAddExam({
        courseCode: examCode.trim().toUpperCase(),
        courseName: examCourseName.trim(),
        majorId,
        academicYear,
        examTitle: examTitle.trim() || 'امتحان رسمي',
        examDate: examDate.length === 16 ? `${examDate}:00` : examDate,
        location: examLocation.trim() || 'المدرج الرئيسي',
      });
      setExamCode('');
      setExamCourseName('');
      setExamLocation('');
    } finally {
      setSavingExam(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Teacher Metrics */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-[#2563EB]">
              لوحة المعلم ومساعد التدريس · {authSession.departmentOrTitle}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] mt-1">
              مرحباً، {authSession.displayName}
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669]">
            <CheckCircle2 className="w-4 h-4" />
            حساب أكاديمي موثق للنشر وتقييم ملخصات الطلبة
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
          <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl">
            <div className="text-xs text-[#92400E]">ملخصات طلبة بانتظار التقييم</div>
            <div className="font-mono-nums text-2xl font-bold text-[#B45309] mt-1">
              {pendingCount}
            </div>
          </div>
          <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl">
            <div className="text-xs text-slate-500">ملخصات طلبة مقيّمة</div>
            <div className="font-mono-nums text-2xl font-bold text-[#059669] mt-1">
              {evaluatedCount}
            </div>
          </div>
          <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl">
            <div className="text-xs text-slate-500">المواد الرسمية المنشورة</div>
            <div className="font-mono-nums text-2xl font-bold text-[#0F172A] mt-1">
              {instructorMaterials.length}
            </div>
          </div>
          <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl">
            <div className="text-xs text-slate-500">تحملات الرسمية · الاختبارات</div>
            <div className="font-mono-nums text-2xl font-bold text-[#2563EB] mt-1">
              {totalDownloads} · {exams.length}
            </div>
          </div>
        </div>
      </div>

      {/* Student Summary Evaluation & Points Awarding Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB] shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F172A]">
                تقييم ملخصات الطلبة ومنح النقاط المستحقة
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                راجع الملخص المرفوع من الطالب وحدد النقاط المناسبة لجودة المحتوى ودقته، ليضاف الرصيد تلقائياً لحساب الطالب.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {[
              { id: 'pending', label: `بانتظار التقييم (${pendingCount})` },
              { id: 'evaluated', label: `تم التقييم (${evaluatedCount})` },
              { id: 'all', label: `الكل (${studentMaterials.length})` },
            ].map((tab) => {
              const active = evalFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEvalFilter(tab.id as 'pending' | 'evaluated' | 'all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
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

        {evalError && (
          <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700">
            {evalError}
          </div>
        )}

        {visibleStudentMaterials.length === 0 ? (
          <div className="p-8 bg-[#F8FAFC] border border-slate-200 rounded-xl text-center text-sm text-slate-500">
            لا توجد ملخصات طلابية ضمن هذا التصنيف حالياً.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleStudentMaterials.map((mat) => {
              const draft = getDraft(mat);
              const isBusy = evaluatingId === mat.id;
              const isEvaluated = mat.evaluationStatus === 'evaluated';
              const needsRevision = mat.evaluationStatus === 'needs_revision';

              return (
                <div
                  key={mat.id}
                  className="p-5 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span className="font-semibold text-[#2563EB]">{MAJOR_LABELS[mat.majorId]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-nums font-semibold text-[#0F172A]">{mat.courseCode}</span>
                        <span aria-hidden="true">·</span>
                        <span>{mat.courseName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{mat.pagesOrDuration}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-nums">{mat.updatedAt}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectMaterial(mat)}
                        className="text-right font-display text-lg font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                      >
                        {mat.title}
                      </button>

                      <p className="text-sm text-slate-600 leading-relaxed">{mat.summaryNotes}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                        <span>
                          مقدم الملخص: <strong className="text-[#0F172A]">{mat.authorName}</strong>
                        </span>
                        {mat.fileName && (
                          <span className="inline-flex items-center gap-1 font-mono-nums text-[#2563EB]">
                            <FileText className="w-3.5 h-3.5" />
                            {mat.fileName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-semibold ${
                          isEvaluated
                            ? 'text-[#059669]'
                            : needsRevision
                              ? 'text-red-600'
                              : 'text-[#D97706]'
                        }`}
                      >
                        {isEvaluated
                          ? `مقيّم (+${mat.teacherPointsAwarded || 0} نقطة)`
                          : needsRevision
                            ? 'أُعيد للتعديل'
                            : 'بانتظار التقييم'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectMaterial(mat)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>معاينة المحتوى</span>
                      </button>
                    </div>
                  </div>

                  {/* Evaluation Controls */}
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                    <div className="lg:col-span-4 space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        النقاط المستحقة للملخص (1–200 نقطة)
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[25, 50, 75, 100].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => updateDraft(mat, { pointsAwarded: preset })}
                            className={`px-2.5 py-1.5 text-xs font-mono-nums font-semibold rounded-lg border transition-colors ${
                              draft.pointsAwarded === preset
                                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            +{preset}
                          </button>
                        ))}
                        <input
                          type="number"
                          min={1}
                          max={200}
                          value={draft.pointsAwarded}
                          onChange={(e) =>
                            updateDraft(mat, { pointsAwarded: Number(e.target.value) || 0 })
                          }
                          aria-label="عدد النقاط المخصصة"
                          className="w-20 h-8 px-2 text-xs font-mono-nums font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        />
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        تقييم الجودة
                      </label>
                      <div className="flex items-center gap-0.5 h-8">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => updateDraft(mat, { rating: star })}
                            aria-label={`${star} نجوم`}
                            className="p-0.5"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                star <= draft.rating
                                  ? 'fill-[#D97706] text-[#D97706]'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-3 space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        ملاحظة معلم المادة للطالب
                      </label>
                      <input
                        type="text"
                        value={draft.note}
                        onChange={(e) => updateDraft(mat, { note: e.target.value })}
                        placeholder="أحسنت في ترتيب القوانين والأمثلة..."
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </div>

                    <div className="lg:col-span-3 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleEvaluate(mat, 'needs_revision')}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>طلب تعديل</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleEvaluate(mat, 'evaluated')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>
                          {isBusy
                            ? 'جارٍ الحفظ...'
                            : isEvaluated
                              ? 'تحديث التقييم والنقاط'
                              : `اعتماد ومنح +${draft.pointsAwarded} نقطة`}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Publish Official Material + Schedule Exam */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handlePublish}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#2563EB]" />
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              نشر محاضرة أو مادة رسمية موثقة
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                عنوان المادة الرسمية *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: محاضرة الأسبوع السابع — نظرية ثيفينين ونورتون (معتمدة)"
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                الجامعة / الكلية (قطاع غزة)
              </label>
              <select
                value={university}
                onChange={(e) => {
                  const nextUni = e.target.value;
                  setUniversity(nextUni);
                  const nextDeans = getDeanshipsForInstitution(nextUni);
                  const nextF = nextDeans[0]?.name || '';
                  const nextD = nextDeans[0]?.departments[0] || '';
                  setFaculty(nextF);
                  setDepartment(nextD);
                  setMajorId(inferMajorFromGaza(nextF, nextD));
                }}
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
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
                  .map((u) => (
                    <option key={u} value={u}>
                      {u}
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
                onChange={(e) => {
                  const nextF = e.target.value;
                  setFaculty(nextF);
                  const nextDepts = getDepartmentsForDeanship(university, nextF);
                  const nextD = nextDepts[0] || '';
                  setDepartment(nextD);
                  setMajorId(inferMajorFromGaza(nextF, nextD));
                }}
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
                  const nextD = e.target.value;
                  setDepartment(nextD);
                  setMajorId(inferMajorFromGaza(activeFaculty, nextD));
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">التخصص العام</label>
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                اسم المساق *
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">رمز المساق</label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full h-11 px-3 text-sm font-mono-nums bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">نوع المادة</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MaterialType)}
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                {(Object.keys(MATERIAL_TYPE_LABELS) as MaterialType[]).map((t) => (
                  <option key={t} value={t}>
                    {MATERIAL_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                مستوى الوصول في الباقات
              </label>
              <select
                value={accessTier}
                onChange={(e) => setAccessTier(e.target.value as AccessTier)}
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                {(Object.keys(ACCESS_TIER_LABELS) as AccessTier[]).map((tier) => (
                  <option key={tier} value={tier}>
                    {ACCESS_TIER_LABELS[tier]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                السنة الدراسية
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(Number(e.target.value))}
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                {[1, 2, 3, 4, 5, 6].map((y) => (
                  <option key={y} value={y}>
                    السنة {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                عدد الصفحات / المدة
              </label>
              <input
                type="text"
                value={pagesOrDuration}
                onChange={(e) => setPagesOrDuration(e.target.value)}
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              وصف المادة وأهم محاورها *
            </label>
            <textarea
              rows={2}
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
              placeholder="اكتب وصفاً واضحاً للمحاضرة أو أسئلة السنوات المنشورة..."
              className="w-full p-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              مقتطف معاينة للطلبة (اختياري)
            </label>
            <textarea
              rows={2}
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="أهم المعادلات أو النقاط التي تظهر في المعاينة..."
              className="w-full p-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={publishing || !title.trim() || !courseName.trim() || !summaryNotes.trim()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-xl transition-colors"
            >
              {publishing ? 'جارٍ النشر...' : 'نشر المادة الرسمية للطلبة'}
            </button>
          </div>
        </form>

        {/* Schedule Exam for Students */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleScheduleExam}
            className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-[#059669]" />
              <h2 className="font-display text-lg font-bold text-[#0F172A]">
                إضافة موعد امتحان لطلبة المساق
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                placeholder="رمز المساق (مثل EE 201) *"
                className="h-10 px-3 text-sm font-mono-nums bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
              <input
                type="text"
                value={examCourseName}
                onChange={(e) => setExamCourseName(e.target.value)}
                placeholder="اسم المساق *"
                className="h-10 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              placeholder="نوع الامتحان (منتصف / نهائي / قصير)"
              className="w-full h-10 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="datetime-local"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="h-10 px-3 text-xs font-mono-nums bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
              <input
                type="text"
                value={examLocation}
                onChange={(e) => setExamLocation(e.target.value)}
                placeholder="القاعة / المدرج"
                className="h-10 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <button
              type="submit"
              disabled={savingExam || !examCode.trim() || !examCourseName.trim()}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#059669] hover:bg-[#047857] disabled:opacity-50 rounded-xl transition-colors"
            >
              {savingExam ? 'جارٍ الحفظ...' : 'إدراج الموعد في تقويم الطلبة'}
            </button>
          </form>

          {/* Published Instructor Materials List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-[#0F172A]">
              المواد الرسمية المنشورة ({instructorMaterials.length})
            </h3>
            <ul className="space-y-3 max-h-80 overflow-y-auto">
              {instructorMaterials.map((mat) => (
                <li
                  key={mat.id}
                  className="p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs text-slate-500">
                      <span className="font-mono-nums font-semibold text-[#2563EB]">
                        {mat.courseCode}
                      </span>{' '}
                      · {MATERIAL_TYPE_LABELS[mat.type]} · {ACCESS_TIER_LABELS[mat.accessTier]}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectMaterial(mat)}
                      className="text-right font-display text-sm font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors block truncate w-full"
                    >
                      {mat.title}
                    </button>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono-nums">
                      <span className="inline-flex items-center gap-1 text-[#D97706] font-semibold">
                        <Star className="w-3.5 h-3.5 fill-[#D97706]" />
                        {mat.ratingAvg.toFixed(1)}
                      </span>
                      <span>{mat.downloadsCount} تحميل</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectMaterial(mat)}
                    className="p-2 text-slate-500 hover:text-[#2563EB] bg-white border border-slate-200 rounded-lg shrink-0"
                    aria-label={`معاينة ${mat.title}`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
