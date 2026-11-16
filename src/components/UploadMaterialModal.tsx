import React, { useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { MAJOR_LABELS, MATERIAL_TYPE_LABELS } from '../lib/constants';
import {
  GAZA_INSTITUTIONS,
  getDeanshipsForInstitution,
  getDepartmentsForDeanship,
  inferMajorFromGaza,
} from '../lib/gazaUniversities';
import type { MajorId, MaterialType, StudentProfile } from '../types/dirasati';

interface UploadMaterialModalProps {
  open: boolean;
  profile: StudentProfile;
  universities: string[];
  onClose: () => void;
  onSubmitMaterial: (payload: {
    title: string;
    university: string;
    faculty?: string;
    department?: string;
    majorId: MajorId;
    courseCode: string;
    courseName: string;
    academicYear: number;
    type: MaterialType;
    pagesOrDuration: string;
    fileName?: string;
    summaryNotes: string;
    previewText: string;
  }) => Promise<void>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const UploadMaterialModal: React.FC<UploadMaterialModalProps> = ({
  open,
  profile,
  universities,
  onClose,
  onSubmitMaterial,
}) => {
  const initialDeanships = getDeanshipsForInstitution(profile.university);
  const initialFaculty =
    profile.faculty && initialDeanships.some((d) => d.name === profile.faculty)
      ? profile.faculty
      : initialDeanships[0]?.name || '';
  const initialDepts = getDepartmentsForDeanship(profile.university, initialFaculty);
  const initialDepartment =
    profile.department && initialDepts.includes(profile.department)
      ? profile.department
      : initialDepts[0] || '';

  const [title, setTitle] = useState('');
  const [university, setUniversity] = useState(profile.university);
  const [faculty, setFaculty] = useState(initialFaculty);
  const [department, setDepartment] = useState(initialDepartment);
  const [majorId, setMajorId] = useState<MajorId>(profile.majorId);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [academicYear, setAcademicYear] = useState(profile.academicYear);
  const [type, setType] = useState<MaterialType>('summary');
  const [pagesOrDuration, setPagesOrDuration] = useState('16 صفحة');
  const [fileName, setFileName] = useState('');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const mainUniversities = GAZA_INSTITUTIONS.filter((i) => i.category === 'university');
  const collegeInstitutions = GAZA_INSTITUTIONS.filter((i) => i.category === 'college');
  const deanships = getDeanshipsForInstitution(university);
  const activeFaculty = deanships.find((d) => d.name === faculty)?.name || deanships[0]?.name || '';
  const departments = getDepartmentsForDeanship(university, activeFaculty);
  const activeDepartment =
    departments.find((d) => d === department) || departments[0] || '';

  const handleUniversityChange = (nextUni: string) => {
    setUniversity(nextUni);
    const nextDeanships = getDeanshipsForInstitution(nextUni);
    const nextFaculty = nextDeanships[0]?.name || '';
    const nextDept = nextDeanships[0]?.departments[0] || '';
    setFaculty(nextFaculty);
    setDepartment(nextDept);
    setMajorId(inferMajorFromGaza(nextFaculty, nextDept));
  };

  const handleFacultyChange = (nextFaculty: string) => {
    setFaculty(nextFaculty);
    const nextDepts = getDepartmentsForDeanship(university, nextFaculty);
    const nextDept = nextDepts[0] || '';
    setDepartment(nextDept);
    setMajorId(inferMajorFromGaza(nextFaculty, nextDept));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(`${file.name} (${formatFileSize(file.size)})`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseName.trim() || !summaryNotes.trim()) {
      setError('يرجى تعبئة عنوان الملف، اسم المساق، ووصف المحتوى.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmitMaterial({
        title: title.trim(),
        university,
        faculty: activeFaculty || undefined,
        department: activeDepartment || undefined,
        majorId,
        courseCode: courseCode.trim() || 'UNI 101',
        courseName: courseName.trim(),
        academicYear,
        type,
        pagesOrDuration: pagesOrDuration.trim() || '15 صفحة',
        fileName: fileName.trim() || undefined,
        summaryNotes: summaryNotes.trim(),
        previewText: previewText.trim(),
      });
      setTitle('');
      setCourseCode('');
      setCourseName('');
      setFileName('');
      setSummaryNotes('');
      setPreviewText('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع المادة حالياً.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 id="upload-modal-title" className="font-display text-xl font-bold text-[#0F172A]">
              رفع ملف ملخص لتقييم معلم المادة
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              يراجع معلم المساق الملخص المرفوع ويمنحك النقاط المستحقة حسب جودة المحتوى وتنظيمه
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة الرفع"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              عنوان الملف أو الملخص *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: ملخص شامل لخوارزميات الأشجار والبحث — منتصف 2026"
              className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
            />
          </div>

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
                المسار العام
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                اسم المساق *
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="مثال: هياكل البيانات"
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">رمز المساق</label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="CS 201"
                className="w-full h-11 px-3 text-sm font-mono-nums bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">السنة الدراسية</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">الحجم / المدة</label>
              <input
                type="text"
                value={pagesOrDuration}
                onChange={(e) => setPagesOrDuration(e.target.value)}
                placeholder="16 صفحة"
                className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
              />
            </div>
          </div>

          {/* File Attachment Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              إرفاق ملف الملخص (PDF / Word / PowerPoint / صور)
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#F8FAFC] border border-dashed border-slate-300 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-[#2563EB] shrink-0" />
                {fileName ? (
                  <span className="text-xs font-mono-nums font-medium text-[#0F172A] truncate">
                    {fileName}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    اختر ملفاً من جهازك لإرساله لمعلم المادة (اختياري)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {fileName && (
                  <button
                    type="button"
                    onClick={() => setFileName('')}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    إزالة
                  </button>
                )}
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{fileName ? 'تغيير الملف' : 'اختيار ملف'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              وصف مختصر للمحتوى *
            </label>
            <textarea
              rows={2}
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
              placeholder="اذكر الفصول والموضوعات التي يغطيها الملف ليراجعها معلم المادة..."
              className="w-full p-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              مقتطف نصي للمعاينة (اختياري)
            </label>
            <textarea
              rows={3}
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="أضف أهم النقاط أو المعادلات لتظهر لمعلم المادة والطلبة في المعاينة..."
              className="w-full p-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              تُضاف النقاط إلى رصيدك فور تقييم معلم المادة للملخص.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                <span>{submitting ? 'جارٍ الإرسال...' : 'إرسال الملف لتقييم معلم المادة'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
