import React, { useState } from 'react';
import { CheckCircle2, MessageCircle, Send, ThumbsUp } from 'lucide-react';
import { MAJOR_LABELS } from '../lib/constants';
import {
  GAZA_INSTITUTIONS,
  getDeanshipsForInstitution,
  getDepartmentsForDeanship,
  inferMajorFromGaza,
} from '../lib/gazaUniversities';
import type { CourseRequest, MajorId, StudentProfile, SupportTicket } from '../types/dirasati';

interface CourseSurveySectionProps {
  courseRequests: CourseRequest[];
  universities: string[];
  profile: StudentProfile;
  supportTickets: SupportTicket[];
  onSubmitCourseRequest: (payload: {
    courseName: string;
    majorId: MajorId;
    university: string;
    faculty?: string;
    department?: string;
    notes: string;
  }) => Promise<void>;
  onVoteRequest: (id: string) => Promise<void>;
  onSendSupport: (channel: 'whatsapp' | 'chat', message: string) => Promise<void>;
}

export const CourseSurveySection: React.FC<CourseSurveySectionProps> = ({
  courseRequests,
  universities,
  profile,
  supportTickets,
  onSubmitCourseRequest,
  onVoteRequest,
  onSendSupport,
}) => {
  const initialDeanships = getDeanshipsForInstitution(profile.university);
  const initialFac =
    profile.faculty && initialDeanships.some((d) => d.name === profile.faculty)
      ? profile.faculty
      : initialDeanships[0]?.name || '';
  const initialDepts = getDepartmentsForDeanship(profile.university, initialFac);
  const initialDept =
    profile.department && initialDepts.includes(profile.department)
      ? profile.department
      : initialDepts[0] || '';

  const [courseName, setCourseName] = useState('');
  const [majorId, setMajorId] = useState<MajorId>(profile.majorId);
  const [university, setUniversity] = useState(profile.university);
  const [faculty, setFaculty] = useState(initialFac);
  const [department, setDepartment] = useState(initialDept);
  const [notes, setNotes] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);

  const [supportChannel, setSupportChannel] = useState<'whatsapp' | 'chat'>('whatsapp');
  const [supportMsg, setSupportMsg] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);

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

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    setSubmittingReq(true);
    try {
      await onSubmitCourseRequest({
        courseName: courseName.trim(),
        majorId,
        university,
        faculty: activeFaculty || undefined,
        department: activeDepartment || undefined,
        notes: notes.trim(),
      });
      setCourseName('');
      setNotes('');
      setReqSuccess(true);
      setTimeout(() => setReqSuccess(false), 3500);
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMsg.trim()) return;
    setSendingSupport(true);
    try {
      await onSendSupport(supportChannel, supportMsg.trim());
      setSupportMsg('');
    } finally {
      setSendingSupport(false);
    }
  };

  const sortedRequests = [...courseRequests].sort((a, b) => b.votes - a.votes);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lean Startup Course Request Survey */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <span className="text-xs font-semibold text-[#2563EB]">استبيان البداية الرشيقة (Lean Startup)</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] mt-1">
              شو المساقات اللي بدك موادها؟
            </h2>
            <p className="text-sm text-slate-600 mt-1.5">
              صوّت للمساقات التي تحتاج ملخصاتها وأسئلة سنواتها قبل الامتحانات، أو أضف مساقاً جديداً لتكون له الأولوية في الرفع والمراجعة.
            </p>
          </div>

          <form
            onSubmit={handleRequestSubmit}
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4"
          >
            {reqSuccess && (
              <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                <span>تم تسجيل طلبك وإضافته لقائمة الأولويات الطلابية بنجاح.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  اسم المساق المطلوب *
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="مثال: معمارية الحاسوب (CS 240)"
                  className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">التخصص</label>
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
                  نوع المواد المطلوبة (اختياري)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملخص منتصف، أسئلة سنوات، فيديو شرح..."
                  className="w-full h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingReq || !courseName.trim()}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-xl transition-colors"
              >
                {submittingReq ? 'جارٍ الإرسال...' : 'إرسال طلب المساق'}
              </button>
            </div>
          </form>

          {/* Community Votes List */}
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
            <div className="px-5 py-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#0F172A]">
                المساقات الأكثر طلباً من الطلبة
              </h3>
              <span className="font-mono-nums text-xs text-slate-500">
                {sortedRequests.length} طلبات نشطة
              </span>
            </div>

            {sortedRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-[#2563EB]">{MAJOR_LABELS[req.majorId]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{req.university}</span>
                    {req.faculty && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{req.faculty}</span>
                      </>
                    )}
                    {req.department && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{req.department}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-nums">{req.createdAt}</span>
                  </div>
                  <h4 className="font-display text-base font-bold text-[#0F172A]">{req.courseName}</h4>
                  <p className="text-sm text-slate-600">{req.notes}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onVoteRequest(req.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 self-start sm:self-center ${
                    req.votedByUser
                      ? 'bg-[#2563EB] border-[#2563EB] text-white'
                      : 'bg-[#F8FAFC] border-slate-200 text-[#0F172A] hover:border-[#2563EB]'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>أحتاج هذا المساق</span>
                  <span className="font-mono-nums">({req.votes})</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* During-Use Customer Support (WhatsApp / Live Chat) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB] shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-[#0F172A]">
                الدعم السريع عبر واتساب وشات المنصة
              </h3>
              <p className="text-xs text-slate-500">
                تواصل مباشر لحل شكاوى الاشتراك أو الإبلاغ عن ملف ناقص
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSupportChannel('whatsapp')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                supportChannel === 'whatsapp'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              دعم واتساب الطلابي
            </button>
            <button
              type="button"
              onClick={() => setSupportChannel('chat')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                supportChannel === 'chat'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              محادثة فورية بالموقع
            </button>
          </div>

          <form onSubmit={handleSupportSubmit} className="space-y-3">
            <textarea
              rows={3}
              value={supportMsg}
              onChange={(e) => setSupportMsg(e.target.value)}
              placeholder={
                supportChannel === 'whatsapp'
                  ? 'اكتب استفسارك لإرساله لفريق دعم دراستي على واتساب...'
                  : 'اكتب رسالتك للدعم الفني المباشر داخل المنصة...'
              }
              className="w-full p-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
            />
            <button
              type="submit"
              disabled={sendingSupport || !supportMsg.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{sendingSupport ? 'جارٍ الإرسال...' : 'إرسال رسالة الدعم'}</span>
            </button>
          </form>

          {supportTickets.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-500">سجل تذاكر الدعم الأخيرة</h4>
              <ul className="space-y-2">
                {supportTickets.slice(0, 3).map((t) => (
                  <li key={t.id} className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-semibold text-[#0F172A]">
                        {t.channel === 'whatsapp' ? 'واتساب' : 'شات الموقع'}
                      </span>
                      <span className="font-mono-nums">{t.createdAt.slice(0, 10)}</span>
                    </div>
                    <p className="text-slate-700">{t.message}</p>
                    <p className="text-[#059669] font-medium">{t.status}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
