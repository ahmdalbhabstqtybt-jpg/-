import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  LifeBuoy,
  X,
} from 'lucide-react';
import type {
  CourseRequest,
  ExamNotificationLog,
  MaterialStatusNotification,
  StudyMaterial,
  SupportTicket,
  UserRole,
} from '../types/dirasati';

export type NotificationFilterTab = 'all' | 'materials' | 'exams' | 'operations';

interface UnifiedNotificationItem {
  id: string;
  category: Exclude<NotificationFilterTab, 'all'>;
  kind: 'material_status' | 'pending_review' | 'exam_alert' | 'course_request' | 'support_ticket';
  title: string;
  subtitle: string;
  timestamp: string;
  timestampMs: number;
  read: boolean;
  statusVariant: 'success' | 'warning' | 'danger' | 'neutral';
  statusLabel: string;
  extraMeta?: string;
  rawMaterialNotif?: MaterialStatusNotification;
  rawExamCourseName?: string;
  rawMaterialId?: string;
}

interface NotificationCenterDropdownProps {
  role: UserRole;
  isAuthenticated: boolean;
  materialNotifications: MaterialStatusNotification[];
  examNotifications: ExamNotificationLog[];
  materials: StudyMaterial[];
  supportTickets: SupportTicket[];
  courseRequests: CourseRequest[];
  onMarkMaterialRead: (id?: string) => Promise<void>;
  onMarkExamsRead: () => Promise<void>;
  onSelectMaterialNotification: (notification: MaterialStatusNotification) => void;
  onSelectMaterialById: (materialId: string) => void;
  onNavigateAction: (
    section: 'workspace' | 'catalog' | 'subscriptions' | 'survey',
    courseName?: string,
  ) => void;
}

function parseTimestampMs(raw: string): number {
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatShortTime(raw: string): string {
  try {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
    return date.toLocaleDateString('ar-JO', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw.slice(0, 10);
  }
}

function formatExamChannel(channel: ExamNotificationLog['channel']): string {
  switch (channel) {
    case 'whatsapp':
      return 'واتساب';
    case 'email':
      return 'بريد إلكتروني';
    case 'browser':
      return 'تنبيه المتصفح';
    default:
      return 'داخل المنصة';
  }
}

export const NotificationCenterDropdown: React.FC<NotificationCenterDropdownProps> = ({
  role,
  isAuthenticated,
  materialNotifications,
  examNotifications,
  materials,
  supportTickets,
  courseRequests,
  onMarkMaterialRead,
  onMarkExamsRead,
  onSelectMaterialNotification,
  onSelectMaterialById,
  onNavigateAction,
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationFilterTab>('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [acknowledgedOpsIds, setAcknowledgedOpsIds] = useState<Set<string>>(() => {
    try {
      const saved = window.localStorage.getItem('dirasati_ack_ops_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set<string>(parsed);
      }
    } catch {
      // Ignore storage errors
    }
    return new Set<string>();
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const persistAckOps = (next: Set<string>) => {
    setAcknowledgedOpsIds(next);
    try {
      window.localStorage.setItem(
        'dirasati_ack_ops_notifications',
        JSON.stringify(Array.from(next).slice(-100)),
      );
    } catch {
      // Ignore storage errors
    }
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const unifiedItems = useMemo<UnifiedNotificationItem[]>(() => {
    const items: UnifiedNotificationItem[] = [];

    // 1. Material evaluation notifications (relevant to students & all viewers)
    for (const notif of materialNotifications) {
      const statusVariant: UnifiedNotificationItem['statusVariant'] =
        notif.status === 'evaluated'
          ? 'success'
          : notif.status === 'needs_revision'
            ? 'danger'
            : 'warning';
      const statusLabel =
        notif.status === 'evaluated'
          ? 'تم الاعتماد'
          : notif.status === 'needs_revision'
            ? 'يتطلب تعديلاً'
            : 'قيد المراجعة';

      items.push({
        id: `mat-${notif.id}`,
        category: 'materials',
        kind: 'material_status',
        title: notif.message,
        subtitle: `${notif.courseCode} · ${notif.materialTitle}`,
        timestamp: notif.createdAt,
        timestampMs: parseTimestampMs(notif.createdAt),
        read: notif.read,
        statusVariant,
        statusLabel,
        extraMeta: [
          notif.evaluatedBy ? `المقيّم: ${notif.evaluatedBy}` : null,
          notif.status === 'evaluated' && notif.pointsAwarded ? `+${notif.pointsAwarded} نقطة` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        rawMaterialNotif: notif,
      });
    }

    // 2. Pending student materials awaiting teacher/admin evaluation
    const pendingStudentMaterials = materials.filter(
      (m) => m.authorRole === 'student' && (!m.evaluationStatus || m.evaluationStatus === 'pending'),
    );
    for (const mat of pendingStudentMaterials) {
      const opsId = `pending-mat-${mat.id}`;
      items.push({
        id: opsId,
        category: 'materials',
        kind: 'pending_review',
        title:
          isAuthenticated && (role === 'teacher' || role === 'admin')
            ? `ملخص جديد بانتظار التقييم: ${mat.title}`
            : `ملخص مرفوع قيد المراجعة: ${mat.title}`,
        subtitle: `${mat.courseCode} · ${mat.authorName} · ${mat.university}`,
        timestamp: mat.updatedAt,
        timestampMs: parseTimestampMs(mat.updatedAt),
        read: acknowledgedOpsIds.has(opsId),
        statusVariant: 'warning',
        statusLabel: 'بانتظار التقييم',
        extraMeta: mat.department || mat.faculty || undefined,
        rawMaterialId: mat.id,
      });
    }

    // 3. Exam countdown alerts
    for (const examNotif of examNotifications) {
      items.push({
        id: `exam-${examNotif.id}`,
        category: 'exams',
        kind: 'exam_alert',
        title: examNotif.message,
        subtitle: `${examNotif.courseCode} · ${examNotif.courseName}`,
        timestamp: examNotif.sentAt,
        timestampMs: parseTimestampMs(examNotif.sentAt),
        read: examNotif.read,
        statusVariant: 'neutral',
        statusLabel: 'تنبيه امتحان',
        extraMeta: `القناة: ${formatExamChannel(examNotif.channel)}`,
        rawExamCourseName: examNotif.courseName,
      });
    }

    // 4. Open support tickets
    const openTickets = supportTickets.filter((t) => !t.resolved);
    for (const ticket of openTickets) {
      const opsId = `ticket-${ticket.id}`;
      items.push({
        id: opsId,
        category: 'operations',
        kind: 'support_ticket',
        title:
          isAuthenticated && role === 'admin'
            ? `تذكرة دعم مفتوحة: ${ticket.message}`
            : `طلب دعم فني (${ticket.status}): ${ticket.message}`,
        subtitle: ticket.channel === 'whatsapp' ? 'قناة واتساب' : 'محادثة فورية',
        timestamp: ticket.createdAt,
        timestampMs: parseTimestampMs(ticket.createdAt),
        read: acknowledgedOpsIds.has(opsId),
        statusVariant: 'warning',
        statusLabel: 'دعم فني',
        extraMeta: ticket.status,
      });
    }

    // 5. Pending course survey requests
    const pendingRequests = courseRequests.filter((r) => r.status !== 'fulfilled');
    for (const req of pendingRequests) {
      const opsId = `req-${req.id}`;
      items.push({
        id: opsId,
        category: 'operations',
        kind: 'course_request',
        title: `طلب توفير مساق: ${req.courseName}`,
        subtitle: `${req.university}${req.department ? ` · ${req.department}` : ''}`,
        timestamp: req.createdAt,
        timestampMs: parseTimestampMs(req.createdAt),
        read: acknowledgedOpsIds.has(opsId),
        statusVariant: 'neutral',
        statusLabel: 'طلب مساق',
        extraMeta: `${req.votes} صوت طلابي`,
      });
    }

    // Sort: unread first, then newest timestamp descending
    return items.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.timestampMs - a.timestampMs;
    });
  }, [
    acknowledgedOpsIds,
    courseRequests,
    examNotifications,
    isAuthenticated,
    materialNotifications,
    materials,
    role,
    supportTickets,
  ]);

  const counts = useMemo(() => {
    const byTab: Record<NotificationFilterTab, number> = {
      all: unifiedItems.length,
      materials: 0,
      exams: 0,
      operations: 0,
    };
    let unread = 0;

    for (const item of unifiedItems) {
      byTab[item.category] += 1;
      if (!item.read) unread += 1;
    }

    return { byTab, unread };
  }, [unifiedItems]);

  const visibleItems = useMemo(() => {
    if (activeTab === 'all') return unifiedItems;
    return unifiedItems.filter((item) => item.category === activeTab);
  }, [activeTab, unifiedItems]);

  const unreadBackendMaterials = materialNotifications.some((n) => !n.read);
  const unreadBackendExams = examNotifications.some((n) => !n.read);

  const handleMarkAll = async () => {
    if (counts.unread === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      const opsIds = unifiedItems
        .filter(
          (i) =>
            i.kind === 'pending_review' ||
            i.kind === 'support_ticket' ||
            i.kind === 'course_request',
        )
        .map((i) => i.id);
      if (opsIds.length > 0) {
        const next = new Set(acknowledgedOpsIds);
        opsIds.forEach((id) => next.add(id));
        persistAckOps(next);
      }

      const tasks: Promise<void>[] = [];
      if (unreadBackendMaterials) tasks.push(onMarkMaterialRead());
      if (unreadBackendExams) tasks.push(onMarkExamsRead());
      await Promise.all(tasks);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = async (item: UnifiedNotificationItem) => {
    if (item.kind === 'material_status' && item.rawMaterialNotif) {
      if (!item.rawMaterialNotif.read) {
        await onMarkMaterialRead(item.rawMaterialNotif.id);
      }
      setOpen(false);
      onSelectMaterialNotification(item.rawMaterialNotif);
      return;
    }

    if (item.kind === 'exam_alert') {
      if (!item.read && unreadBackendExams) {
        await onMarkExamsRead();
      }
      setOpen(false);
      onNavigateAction('catalog', item.rawExamCourseName);
      return;
    }

    // Operational items: mark acknowledged locally
    if (!acknowledgedOpsIds.has(item.id)) {
      const next = new Set(acknowledgedOpsIds);
      next.add(item.id);
      persistAckOps(next);
    }
    setOpen(false);

    if (item.kind === 'pending_review') {
      if (isAuthenticated && (role === 'teacher' || role === 'admin')) {
        onNavigateAction('workspace');
      } else if (item.rawMaterialId) {
        onSelectMaterialById(item.rawMaterialId);
      } else {
        onNavigateAction('catalog');
      }
      return;
    }

    if (item.kind === 'support_ticket') {
      onNavigateAction(isAuthenticated && role === 'admin' ? 'workspace' : 'survey');
      return;
    }

    if (item.kind === 'course_request') {
      onNavigateAction(isAuthenticated && role === 'admin' ? 'workspace' : 'survey');
    }
  };

  const renderIcon = (item: UnifiedNotificationItem) => {
    const base = 'mt-0.5 w-8 h-8 rounded-lg border flex items-center justify-center shrink-0';
    if (item.kind === 'exam_alert') {
      return (
        <div className={`${base} bg-slate-50 border-slate-200 text-slate-700`}>
          <CalendarClock className="w-4 h-4" />
        </div>
      );
    }
    if (item.kind === 'support_ticket') {
      return (
        <div className={`${base} bg-amber-50/70 border-amber-200 text-amber-700`}>
          <LifeBuoy className="w-4 h-4" />
        </div>
      );
    }
    if (item.kind === 'course_request') {
      return (
        <div className={`${base} bg-slate-50 border-slate-200 text-slate-700`}>
          <BookOpen className="w-4 h-4" />
        </div>
      );
    }
    if (item.kind === 'pending_review') {
      return (
        <div className={`${base} bg-amber-50/70 border-amber-200 text-amber-700`}>
          <FileCheck2 className="w-4 h-4" />
        </div>
      );
    }
    if (item.statusVariant === 'success') {
      return (
        <div className={`${base} bg-emerald-50/70 border-emerald-200 text-emerald-700`}>
          <CheckCircle2 className="w-4 h-4" />
        </div>
      );
    }
    if (item.statusVariant === 'danger') {
      return (
        <div className={`${base} bg-red-50/70 border-red-200 text-red-700`}>
          <AlertCircle className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className={`${base} bg-slate-50 border-slate-200 text-slate-700`}>
        <Clock className="w-4 h-4" />
      </div>
    );
  };

  const tabs: { id: NotificationFilterTab; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'materials', label: 'الملخصات' },
    { id: 'exams', label: 'الامتحانات' },
    { id: 'operations', label: 'الطلبات والدعم' },
  ];

  const footerLabel =
    isAuthenticated && (role === 'teacher' || role === 'admin')
      ? 'الانتقال إلى لوحة المراجعة والإدارة'
      : 'متابعة حالة كل الملفات والطلبات';

  const footerTarget: 'workspace' | 'subscriptions' =
    isAuthenticated && (role === 'teacher' || role === 'admin') ? 'workspace' : 'subscriptions';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`لوحة الإشعارات الشاملة${counts.unread > 0 ? ` (${counts.unread} غير مقروء)` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
          open
            ? 'bg-slate-900 border-slate-900 text-white'
            : counts.unread > 0
              ? 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-50'
              : 'bg-[#F8FAFC] border-slate-200 text-slate-600 hover:text-[#0F172A] hover:bg-slate-100'
        }`}
      >
        <Bell className="w-4 h-4" />
        {counts.unread > 0 && (
          <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-slate-900 text-white text-[10px] font-mono-nums font-bold flex items-center justify-center border-2 border-white">
            {counts.unread > 99 ? '99+' : counts.unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile & compact-landscape backdrop */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-slate-900/25 backdrop-blur-[1px] z-40 sm:hidden [@media(max-height:540px)]:block"
          />

          <div
            role="dialog"
            aria-label="مركز الإشعارات الموحد"
            className="fixed inset-x-3 top-[4.5rem] max-h-[calc(100dvh-5.25rem)] sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[27rem] sm:max-h-[min(78dvh,36rem)] [@media(max-height:540px)]:fixed [@media(max-height:540px)]:inset-x-4 [@media(max-height:540px)]:top-3 [@media(max-height:540px)]:bottom-3 [@media(max-height:540px)]:left-auto [@media(max-height:540px)]:mt-0 [@media(max-height:540px)]:w-auto [@media(max-height:540px)]:max-w-xl [@media(max-height:540px)]:mx-auto [@media(max-height:540px)]:max-h-[calc(100dvh-1.5rem)] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-[#F8FAFC]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-display text-sm font-bold text-[#0F172A] truncate">
                  مركز الإشعارات
                </span>
                {counts.unread > 0 && (
                  <span className="font-mono-nums text-xs font-semibold text-slate-600 whitespace-nowrap shrink-0">
                    ({counts.unread} غير مقروء)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {counts.unread > 0 && (
                  <button
                    type="button"
                    disabled={markingAll}
                    onClick={handleMarkAll}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 hover:text-[#0F172A] hover:bg-slate-200/60 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>تحديد الكل كمقروء</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="إغلاق لوحة الإشعارات"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-[#0F172A] hover:bg-slate-200/70 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Filter Tabs (Neutral Segmented Control, Horizontal Scroll Safe) */}
            <div className="shrink-0 px-3 py-2 border-b border-slate-200 bg-white overflow-x-auto">
              <div
                role="tablist"
                aria-label="تصفية الإشعارات حسب النوع"
                className="inline-flex sm:flex w-full min-w-max sm:min-w-0 items-center gap-1 p-1 bg-slate-100 rounded-lg"
              >
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const count = counts.byTab[tab.id];
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-white text-[#0F172A] font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-[#0F172A]'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="font-mono-nums text-[11px] text-slate-400">
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Notifications Body */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {visibleItems.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Bell className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-[#0F172A]">
                    لا توجد إشعارات ضمن هذا التصنيف حالياً
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                    تظهر هنا جميع تنبيهات الملخصات، مواعيد الامتحانات، طلبات المساقات، وتذاكر الدعم فور توفرها.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {visibleItems.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleItemClick(item)}
                        className={`w-full text-right px-4 py-3 transition-colors flex items-start gap-3 ${
                          item.read
                            ? 'bg-white hover:bg-slate-50'
                            : 'bg-slate-50/90 hover:bg-slate-100/80'
                        }`}
                      >
                        {renderIcon(item)}

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-xs leading-snug ${
                                item.read
                                  ? 'font-medium text-slate-700'
                                  : 'font-bold text-[#0F172A]'
                              }`}
                            >
                              {item.title}
                            </p>
                            {!item.read && (
                              <span className="text-[10px] font-bold text-[#0F172A] shrink-0 pt-0.5">
                                جديد
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 truncate">
                            {item.subtitle}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                            <span>{item.statusLabel}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-nums">
                              {formatShortTime(item.timestamp)}
                            </span>
                            {item.extraMeta && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-slate-600 font-medium">
                                  {item.extraMeta}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-4 py-2.5 border-t border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onNavigateAction(footerTarget);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0F172A] hover:text-slate-700 py-1 whitespace-nowrap"
              >
                <span>{footerLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
