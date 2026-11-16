import React, { useState } from 'react';
import {
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { ACCESS_TIER_LABELS, MAJOR_LABELS, MATERIAL_TYPE_LABELS } from '../lib/constants';
import type {
  AccessTier,
  AuthSession,
  CourseRequest,
  StudyMaterial,
  SupportTicket,
} from '../types/dirasati';

interface AdminDashboardProps {
  authSession: AuthSession;
  materials: StudyMaterial[];
  courseRequests: CourseRequest[];
  supportTickets: SupportTicket[];
  onModerateMaterial: (
    id: string,
    patch: { verified?: boolean; accessTier?: AccessTier },
  ) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
  onResolveTicket: (id: string, reply: string) => Promise<void>;
  onToggleRequestStatus: (id: string) => Promise<void>;
  onOpenBusinessModel: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  authSession,
  materials,
  courseRequests,
  supportTickets,
  onModerateMaterial,
  onDeleteMaterial,
  onResolveTicket,
  onToggleRequestStatus,
  onOpenBusinessModel,
}) => {
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const verifiedCount = materials.filter((m) => m.verified).length;
  const openTicketsCount = supportTickets.filter((t) => !t.resolved).length;
  const pendingRequestsCount = courseRequests.filter((r) => r.status !== 'fulfilled').length;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Admin KPIs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-[#2563EB]">
              لوحة الإدارة والتشغيل · {authSession.departmentOrTitle}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] mt-1">
              مرحباً، {authSession.displayName}
            </h1>
          </div>

          <button
            type="button"
            onClick={onOpenBusinessModel}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors self-start sm:self-auto"
          >
            عرض المربعات التسعة وجدول المناقشة
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
          <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl">
            <div className="text-xs text-slate-500">إجمالي الملفات بالمنصة</div>
            <div className="font-mono-nums text-2xl font-bold text-[#0F172A] mt-1">
              {materials.length}
            </div>
          </div>
          <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl">
            <div className="text-xs text-slate-500">الملفات الموثقة والمراجعة</div>
            <div className="font-mono-nums text-2xl font-bold text-[#059669] mt-1">
              {verifiedCount} / {materials.length}
            </div>
          </div>
          <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl">
            <div className="text-xs text-slate-500">طلبات المساقات المعلقة</div>
            <div className="font-mono-nums text-2xl font-bold text-[#2563EB] mt-1">
              {pendingRequestsCount}
            </div>
          </div>
          <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl">
            <div className="text-xs text-slate-500">تذاكر الدعم المفتوحة</div>
            <div className="font-mono-nums text-2xl font-bold text-[#D97706] mt-1">
              {openTicketsCount}
            </div>
          </div>
        </div>
      </div>

      {/* Materials Verification & Tier Control Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              مراجعة وتوثيق المواد الدراسية وصلاحيات الاشتراك
            </h2>
          </div>
          <span className="font-mono-nums text-xs text-slate-500">{materials.length} ملف</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">المادة والمساق</th>
                <th className="py-3 px-4 font-semibold">التخصص والنوع</th>
                <th className="py-3 px-4 font-semibold">الرافع</th>
                <th className="py-3 px-4 font-semibold">مستوى الوصول</th>
                <th className="py-3 px-4 font-semibold">حالة التوثيق</th>
                <th className="py-3 px-4 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materials.map((mat) => (
                <tr key={mat.id} className="hover:bg-[#F8FAFC]/70">
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-[#0F172A] truncate">{mat.title}</div>
                    <div className="text-xs text-slate-500 font-mono-nums">
                      {mat.courseCode} · {mat.courseName}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {MAJOR_LABELS[mat.majorId]} · {MATERIAL_TYPE_LABELS[mat.type]}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {mat.authorName}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      aria-label={`مستوى الوصول لملف ${mat.title}`}
                      value={mat.accessTier}
                      onChange={(e) =>
                        onModerateMaterial(mat.id, { accessTier: e.target.value as AccessTier })
                      }
                      className="h-8 px-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    >
                      {(Object.keys(ACCESS_TIER_LABELS) as AccessTier[]).map((t) => (
                        <option key={t} value={t}>
                          {ACCESS_TIER_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onModerateMaterial(mat.id, { verified: !mat.verified })}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        mat.verified ? 'text-[#059669]' : 'text-[#D97706]'
                      }`}
                    >
                      {mat.verified ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>موثق ومعتمد</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>بانتظار التوثيق</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => onDeleteMaterial(mat.id)}
                      aria-label={`حذف ${mat.title}`}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Support Tickets + Course Requests Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Support Tickets Queue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#2563EB]" />
              <h2 className="font-display text-lg font-bold text-[#0F172A]">
                تذاكر دعم الطلبة (واتساب وشات الموقع)
              </h2>
            </div>
            <span className="font-mono-nums text-xs text-slate-500">
              {supportTickets.length} تذاكر
            </span>
          </div>

          {supportTickets.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">
              لا توجد شكاوى أو تذاكر دعم مفتوحة حالياً.
            </p>
          ) : (
            <ul className="space-y-3">
              {supportTickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-2.5 text-sm"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-[#0F172A]">
                      {ticket.channel === 'whatsapp' ? 'واتساب' : 'شات الموقع'} ·{' '}
                      {ticket.resolved ? 'مغلقة' : 'قيد الانتظار'}
                    </span>
                    <span className="font-mono-nums">{ticket.createdAt.slice(0, 10)}</span>
                  </div>
                  <p className="text-slate-800">{ticket.message}</p>

                  {ticket.resolved ? (
                    <div className="text-xs text-[#059669] font-medium pt-1">
                      {ticket.adminReply ? `الرد: ${ticket.adminReply}` : ticket.status}
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={replyDrafts[ticket.id] || ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                        }
                        placeholder="اكتب رداً سريعاً للطالب..."
                        className="flex-1 h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onResolveTicket(
                            ticket.id,
                            replyDrafts[ticket.id] || 'تمت معالجة طلبك بنجاح.',
                          );
                        }}
                        className="px-3 h-9 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        حل وإغلاق
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Course Requests Fulfillment */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              متابعة طلبات المساقات (استبيان الطلبة)
            </h2>
            <span className="font-mono-nums text-xs text-slate-500">
              {courseRequests.length} مساق مطلوب
            </span>
          </div>

          <ul className="space-y-3">
            {[...courseRequests]
              .sort((a, b) => b.votes - a.votes)
              .map((req) => {
                const isFulfilled = req.status === 'fulfilled';
                return (
                  <li
                    key={req.id}
                    className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-[#2563EB]">
                          {MAJOR_LABELS[req.majorId]}
                        </span>{' '}
                        · <span className="font-mono-nums">{req.votes} صوت</span>
                      </div>
                      <h3 className="font-display text-sm font-bold text-[#0F172A] truncate">
                        {req.courseName}
                      </h3>
                      <p className="text-xs text-slate-600 truncate">{req.notes}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleRequestStatus(req.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        isFulfilled
                          ? 'bg-emerald-50 text-[#059669] border border-emerald-200'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isFulfilled ? 'تم التوفير' : 'تحديد كمُنجز'}
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
    </section>
  );
};
