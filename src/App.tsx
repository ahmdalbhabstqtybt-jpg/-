import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Link2, LogIn, LogOut, RefreshCw, UserPlus, X } from 'lucide-react';
import { TopBar, type ActiveSection } from './components/TopBar';
import { HeroSection } from './components/HeroSection';
import { MaterialsCatalog } from './components/MaterialsCatalog';
import { MaterialPreviewModal } from './components/MaterialPreviewModal';
import { SubscriptionsAndPoints } from './components/SubscriptionsAndPoints';
import { UploadMaterialModal } from './components/UploadMaterialModal';
import { CourseSurveySection } from './components/CourseSurveySection';
import { BusinessModelView } from './components/BusinessModelView';
import { ExamCountdownSection } from './components/ExamCountdownSection';
import { OfflineIndicator } from './components/PWAInstallButton';
import { LoginView, type AuthScreenMode } from './components/LoginView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { LinkedAccountsBox } from './components/LinkedAccountsBox';
import { StudentRankBadge } from './components/StudentRankBadge';
import { AcademicAssistantView } from './components/AcademicAssistantView';
import type {
  AccessTier,
  AppState,
  BillingCycle,
  ExamNotificationLog,
  LinkedAccountsMap,
  MajorId,
  MaterialStatusNotification,
  MaterialType,
  PlanId,
  SocialProvider,
  StudentProfile,
  StudyMaterial,
  TeacherEvaluationStatus,
  UserRole,
} from './types/dirasati';

export default function App() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<ActiveSection>('catalog');
  const [selectedMajorFilter, setSelectedMajorFilter] = useState<'all' | 'my_courses' | MajorId>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedUniversityFilter, setSelectedUniversityFilter] = useState<string>('all');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>('all');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string | null>(null);
  const [previewMaterialId, setPreviewMaterialId] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [authScreenMode, setAuthScreenMode] = useState<AuthScreenMode>('login');
  const [linkedAccountsModalOpen, setLinkedAccountsModalOpen] = useState(false);

  const catalogRef = useRef<HTMLDivElement>(null);
  const alertedExamIdsRef = useRef<Set<string>>(new Set());

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  const fetchState = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('تعذر تحميل بيانات المنصة.');
      const data = (await res.json()) as AppState;
      setAppState(data);
      if (data.authSession?.isAuthenticated) {
        setActiveSection(data.authSession.role === 'student' ? 'catalog' : 'workspace');
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع في الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleLogin = async (payload: {
    role: UserRole;
    displayName?: string;
    email?: string;
    password?: string;
    university?: string;
    faculty?: string;
    department?: string;
    majorId?: MajorId;
    departmentOrTitle?: string;
    linkedAccounts?: Partial<LinkedAccountsMap>;
    secretCode?: string;
  }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as AppState & { error?: string };
    if (!res.ok) {
      throw new Error(data.error || 'تعذر تسجيل الدخول.');
    }
    setAppState(data);
    setGuestMode(false);
    setShowLoginScreen(false);
    setActiveSection(data.authSession.role === 'student' ? 'catalog' : 'workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegister = async (payload: {
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
  }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as AppState & { error?: string };
    if (!res.ok) {
      throw new Error(data.error || 'تعذر إنشاء الحساب الجديد.');
    }
    setAppState(data);
    setGuestMode(false);
    setShowLoginScreen(false);
    setActiveSection(data.authSession.role === 'student' ? 'catalog' : 'workspace');
    showToast('تم إنشاء حسابك وتفعيل الجلسة بنجاح.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      const updated = (await res.json()) as AppState;
      setAppState(updated);
      setPreviewMaterialId(null);
      setUploadModalOpen(false);
      setGuestMode(false);
      setShowLoginScreen(true);
      showToast('تم تسجيل الخروج بنجاح.');
    }
  };

  const handlePublishOfficialMaterial = async (payload: {
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
  }) => {
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = (await res.json()) as { state: AppState };
      setAppState(data.state);
      showToast('تم نشر المادة الرسمية الموثقة لطلبة المساق.');
    }
  };

  const handleModerateMaterial = async (
    id: string,
    patch: { verified?: boolean; accessTier?: AccessTier },
  ) => {
    const res = await fetch(`/api/admin/materials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = (await res.json()) as AppState;
      setAppState(updated);
      showToast('تم تحديث حالة توثيق ومستوى وصول الملف.');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    const res = await fetch(`/api/admin/materials/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const updated = (await res.json()) as AppState;
      setAppState(updated);
      showToast('تم حذف الملف من المنصة.');
    }
  };

  const handleResolveTicket = async (id: string, adminReply: string) => {
    const res = await fetch(`/api/admin/support/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminReply }),
    });
    if (res.ok) {
      const updated = (await res.json()) as AppState;
      setAppState(updated);
      showToast('تم إرسال الرد وإغلاق تذكرة الدعم.');
    }
  };

  const handleToggleRequestStatus = async (id: string) => {
    const res = await fetch(`/api/admin/requests/${id}`, { method: 'PATCH' });
    if (res.ok) {
      const updated = (await res.json()) as AppState;
      setAppState(updated);
      showToast('تم تحديث حالة طلب المساق.');
    }
  };

  const handleNavigate = (section: ActiveSection) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExploreMyCourses = () => {
    setActiveSection('catalog');
    setSelectedMajorFilter('my_courses');
    setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleUpdateProfile = async (patch: Partial<StudentProfile>) => {
    let nextPatch = { ...patch };
    if (patch.majorId && !patch.enrolledCourses && appState) {
      const majorCodes = appState.exams
        .filter((e) => e.majorId === patch.majorId)
        .map((e) => e.courseCode);
      if (majorCodes.length > 0) {
        nextPatch.enrolledCourses = Array.from(
          new Set([...majorCodes, ...appState.profile.enrolledCourses]),
        );
      }
    }

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextPatch),
    });
    if (res.ok) {
      const updated = (await res.json()) as AppState;
      setAppState(updated);
      showToast('تم تحديث تفضيلات مساقاتك وحفظها.');
    }
  };

  const handleUpdateLinkedAccount = async (
    provider: SocialProvider,
    connected: boolean,
    handle: string,
  ) => {
    const res = await fetch('/api/profile/linked-accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, connected, handle }),
    });
    const data = (await res.json()) as AppState & { error?: string };
    if (!res.ok) {
      throw new Error(data.error || 'تعذر تحديث ربط الحساب الاجتماعي.');
    }
    setAppState(data);
    showToast(
      connected
        ? 'تم ربط الحساب الاجتماعي بحسابك في دراستي.'
        : 'تم إلغاء ربط الحساب الاجتماعي.',
    );
  };

  const handleAddExam = async (payload: {
    courseCode: string;
    courseName: string;
    majorId: MajorId;
    academicYear: number;
    examTitle: string;
    examDate: string;
    location: string;
  }) => {
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = (await res.json()) as { state: AppState };
      setAppState(data.state);
      showToast(`تمت إضافة موعد امتحان ${payload.courseName} وتسجيل المساق في ملفك.`);
    }
  };

  const handleTriggerExamAlert = useCallback(
    async (examId: string, channel: ExamNotificationLog['channel'], message: string) => {
      const res = await fetch('/api/exams/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, channel, message }),
      });
      if (res.ok) {
        const data = (await res.json()) as { state: AppState };
        setAppState(data.state);
        showToast(message);
      }
    },
    [showToast],
  );

  const handleMarkNotificationsRead = async () => {
    const res = await fetch('/api/exam-notifications/read', { method: 'PATCH' });
    if (res.ok) {
      const updated = (await res.json()) as AppState;
      setAppState(updated);
    }
  };

  const handleMarkMaterialNotificationRead = async (id?: string) => {
    const res = await fetch('/api/material-notifications/read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { id } : {}),
    });
    if (res.ok) {
      const updated = (await res.json()) as AppState;
      setAppState(updated);
    }
  };

  const handleSelectMaterialNotification = (notification: MaterialStatusNotification) => {
    const exists = appState?.materials.some((m) => m.id === notification.materialId);
    if (exists) {
      setPreviewMaterialId(notification.materialId);
    } else {
      handleNavigate('subscriptions');
    }
  };

  const handleJumpToCourseMaterials = (courseName: string) => {
    setActiveSection('catalog');
    setSelectedMajorFilter('all');
    setSelectedCourseFilter(courseName);
    setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleSelectDepartmentFromChart = (department: string, university?: string) => {
    setActiveSection('catalog');
    setSelectedMajorFilter('all');
    setSelectedCourseFilter('all');
    setSelectedFacultyFilter('all');
    if (university) {
      setSelectedUniversityFilter(university);
    } else {
      setSelectedUniversityFilter('all');
    }
    setSelectedDepartmentFilter(department);
    setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleSelectFacultyFromChart = (faculty: string, university?: string) => {
    setActiveSection('catalog');
    setSelectedMajorFilter('all');
    setSelectedCourseFilter('all');
    setSelectedDepartmentFilter('all');
    if (university) {
      setSelectedUniversityFilter(university);
    } else {
      setSelectedUniversityFilter('all');
    }
    setSelectedFacultyFilter(faculty);
    setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  // Automatic alert dispatch when an enrolled course exam falls within alertLeadHours
  useEffect(() => {
    if (!appState || !appState.profile.examAlertsEnabled) return;

    const nowMs = Date.now();
    const leadMs = appState.profile.alertLeadHours * 60 * 60 * 1000;
    const todayKey = new Date().toISOString().slice(0, 10);

    const imminent = appState.exams.find((exam) => {
      if (!appState.profile.enrolledCourses.includes(exam.courseCode)) return false;
      const diff = new Date(exam.examDate).getTime() - nowMs;
      if (diff <= 0 || diff > leadMs) return false;
      if (alertedExamIdsRef.current.has(exam.id)) return false;
      const alreadySentToday = appState.examNotifications.some(
        (n) => n.examId === exam.id && n.sentAt.slice(0, 10) === todayKey,
      );
      return !alreadySentToday;
    });

    if (imminent) {
      alertedExamIdsRef.current.add(imminent.id);
      const hoursLeft = Math.max(
        1,
        Math.round((new Date(imminent.examDate).getTime() - nowMs) / (1000 * 60 * 60)),
      );
      const channel: ExamNotificationLog['channel'] = appState.profile.whatsappAlertsEnabled
        ? 'whatsapp'
        : appState.profile.emailAlertsEnabled
          ? 'email'
          : 'in_app';
      const msg = `تنبيه اقتراب الاختبار: ${imminent.courseName} (${imminent.courseCode}) بعد ${hoursLeft} ساعة — ${imminent.location}`;

      handleTriggerExamAlert(imminent.id, channel, msg);

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification(`تنبيه امتحان قريب: ${imminent.courseName}`, { body: msg });
      }
    }
  }, [appState, handleTriggerExamAlert]);

  const handleSubmitMaterial = async (payload: {
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
  }) => {
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { state?: AppState; error?: string };
    if (!res.ok || !data.state) {
      throw new Error(data.error || 'تعذر رفع المادة.');
    }
    setAppState(data.state);
    setActiveSection('catalog');
    showToast('تم إرسال الملخص إلى معلم المادة للتقييم ومنح النقاط المستحقة.');
  };

  const handleEvaluateMaterial = async (
    id: string,
    payload: {
      status: TeacherEvaluationStatus;
      pointsAwarded: number;
      rating: number;
      evaluationNote: string;
    },
  ) => {
    const res = await fetch(`/api/teacher/materials/${id}/evaluate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { state?: AppState; error?: string };
    if (!res.ok || !data.state) {
      throw new Error(data.error || 'تعذر حفظ تقييم الملخص.');
    }
    setAppState(data.state);
    showToast(
      payload.status === 'evaluated'
        ? `تم اعتماد الملخص ومنح الطالب +${payload.pointsAwarded} نقطة.`
        : 'تم إرسال ملاحظة التعديل للطالب.',
    );
  };

  const handleSubmitReview = async (materialId: string, rating: number, comment: string) => {
    const res = await fetch(`/api/materials/${materialId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, comment }),
    });
    if (res.ok) {
      const data = (await res.json()) as { state: AppState };
      setAppState(data.state);
      showToast('شكراً لك! تم إضافة تقييمك للملف.');
    }
  };

  const handleUpgradePlan = async (
    planId: PlanId,
    billingCycle: BillingCycle,
    usePoints = false,
  ) => {
    const res = await fetch('/api/subscriptions/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, billingCycle, usePoints }),
    });
    const data = (await res.json()) as { state?: AppState; error?: string };
    if (!res.ok || !data.state) {
      showToast(data.error || 'تعذر تحديث الخطة.');
      return;
    }
    setAppState(data.state);
    showToast(
      usePoints
        ? 'تم استبدال 100 نقطة وتفعيل الخطة الكاملة بنجاح.'
        : 'تم تفعيل خطة الاشتراك الجديدة لحسابك.',
    );
  };

  const handleRedeemPoints = async () => {
    await handleUpgradePlan('full', 'monthly', true);
  };

  const handleSubmitCourseRequest = async (payload: {
    courseName: string;
    majorId: MajorId;
    university: string;
    faculty?: string;
    department?: string;
    notes: string;
  }) => {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = (await res.json()) as AppState;
      setAppState(updated);
      showToast('تمت إضافة المساق إلى قائمة التصويت الطلابية.');
    }
  };

  const handleVoteRequest = async (id: string) => {
    const res = await fetch(`/api/requests/${id}/vote`, { method: 'POST' });
    if (res.ok) {
      const updated = (await res.json()) as AppState;
      setAppState(updated);
    }
  };

  const handleSendSupport = async (channel: 'whatsapp' | 'chat', message: string) => {
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, message }),
    });
    if (res.ok) {
      const data = (await res.json()) as { state: AppState };
      setAppState(data.state);
      showToast('تم إرسال رسالتك إلى فريق الدعم بنجاح.');
    }
  };

  const handleToggleLeanWeek = async (week: number) => {
    const res = await fetch(`/api/lean-tasks/${week}`, { method: 'PATCH' });
    if (res.ok) {
      const updated = (await res.json()) as AppState;
      setAppState(updated);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-9 w-32 bg-slate-200 rounded-lg animate-pulse" />
        </div>
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="h-64 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-52 bg-white border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !appState) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0F172A]">
            تعذر الاتصال بخادم منصة دراستي
          </h1>
          <p className="text-sm text-slate-600">{loadError || 'حاول إعادة تحميل البيانات.'}</p>
          <button
            type="button"
            onClick={fetchState}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  if ((!appState.authSession.isAuthenticated && !guestMode) || showLoginScreen) {
    return (
      <>
        <LoginView
          universities={appState.universities}
          initialMode={authScreenMode}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onContinueAsGuest={() => {
            setGuestMode(true);
            setShowLoginScreen(false);
            setActiveSection('catalog');
          }}
        />
        <OfflineIndicator />
      </>
    );
  }

  const activePreviewMaterial: StudyMaterial | null =
    appState.materials.find((m) => m.id === previewMaterialId) || null;

  const isAuthenticated = appState.authSession.isAuthenticated;
  const currentRole = appState.authSession.role;
  const roleLabel =
    currentRole === 'teacher'
      ? 'معلم / مدرّس'
      : currentRole === 'admin'
        ? 'الإدارة'
        : 'طالب';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <TopBar
        role={currentRole}
        isAuthenticated={isAuthenticated}
        displayName={appState.authSession.displayName}
        activeSection={activeSection}
        materialNotifications={appState.materialNotifications || []}
        examNotifications={appState.examNotifications || []}
        materials={appState.materials || []}
        supportTickets={appState.supportTickets || []}
        courseRequests={appState.courseRequests || []}
        onNavigate={handleNavigate}
        onPrimaryAction={() => {
          if (isAuthenticated && currentRole !== 'student') {
            handleNavigate('workspace');
          } else {
            setUploadModalOpen(true);
          }
        }}
        onLoginClick={() => setShowLoginScreen(true)}
        onLogoutClick={handleLogout}
        onMarkMaterialNotificationRead={handleMarkMaterialNotificationRead}
        onMarkExamNotificationsRead={handleMarkNotificationsRead}
        onSelectMaterialNotification={handleSelectMaterialNotification}
        onSelectMaterialById={(materialId) => setPreviewMaterialId(materialId)}
        onNavigateFromNotification={(section, courseName) => {
          if (section === 'catalog' && courseName) {
            handleJumpToCourseMaterials(courseName);
          } else {
            handleNavigate(section);
          }
        }}
      />

      {/* Active Auth Status Bar (Login / Logout Box) */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-2 text-slate-600">
              <span>الحساب النشط:</span>
              <strong className="text-[#0F172A]">{appState.authSession.displayName}</strong>
              <span aria-hidden="true">·</span>
              <span className="font-mono-nums text-slate-700" dir="ltr">
                {appState.authSession.email}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#2563EB]">{roleLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500">{appState.authSession.departmentOrTitle}</span>
              {currentRole === 'student' && (
                <>
                  <span aria-hidden="true">·</span>
                  <StudentRankBadge points={appState.profile.points} compact />
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-slate-600">
              <strong className="text-[#0F172A]">تصفح كزائر</strong>
              <span aria-hidden="true">·</span>
              <StudentRankBadge points={appState.profile.points} compact />
              <span aria-hidden="true">·</span>
              <span>سجّل الدخول لحفظ موادك والوصول لصلاحيات الطالب أو المعلم أو الإدارة.</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => setLinkedAccountsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Link2 className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>
                    ربط الحسابات (
                    <span className="font-mono-nums">
                      {
                        (['google', 'x', 'facebook', 'instagram'] as SocialProvider[]).filter(
                          (p) => appState.profile.linkedAccounts?.[p]?.connected,
                        ).length
                      }
                      /4
                    </span>
                    )
                  </span>
                </button>
                <span aria-hidden="true" className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setShowLoginScreen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline underline-offset-4 whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>تبديل الحساب</span>
                </button>
                <span aria-hidden="true" className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAuthScreenMode('login');
                    setShowLoginScreen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>تسجيل الدخول</span>
                </button>
                <span aria-hidden="true" className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthScreenMode('register');
                    setShowLoginScreen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669] hover:text-[#047857] transition-colors whitespace-nowrap shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>إنشاء حساب جديد (طالب / معلم)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1">
        {activeSection === 'workspace' && currentRole === 'teacher' && (
          <TeacherDashboard
            authSession={appState.authSession}
            universities={appState.universities}
            materials={appState.materials}
            exams={appState.exams}
            onPublishOfficialMaterial={handlePublishOfficialMaterial}
            onAddExam={handleAddExam}
            onEvaluateMaterial={handleEvaluateMaterial}
            onSelectMaterial={(mat) => setPreviewMaterialId(mat.id)}
          />
        )}

        {activeSection === 'workspace' && currentRole === 'admin' && (
          <AdminDashboard
            authSession={appState.authSession}
            materials={appState.materials}
            courseRequests={appState.courseRequests}
            supportTickets={appState.supportTickets}
            onModerateMaterial={handleModerateMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            onResolveTicket={handleResolveTicket}
            onToggleRequestStatus={handleToggleRequestStatus}
            onOpenBusinessModel={() => handleNavigate('canvas')}
          />
        )}

        {activeSection === 'catalog' && (
          <>
            <HeroSection
              profile={appState.profile}
              universities={appState.universities}
              materials={appState.materials}
              totalMaterials={appState.materials.length}
              onUpdateProfile={handleUpdateProfile}
              onExploreMyCourses={handleExploreMyCourses}
              onOpenUpload={() => setUploadModalOpen(true)}
              onGoToSubscriptions={() => handleNavigate('subscriptions')}
              onOpenAssistant={() => handleNavigate('assistant')}
              onSelectDepartmentFromChart={handleSelectDepartmentFromChart}
              onSelectFacultyFromChart={handleSelectFacultyFromChart}
            />
            <ExamCountdownSection
              profile={appState.profile}
              exams={appState.exams}
              examNotifications={appState.examNotifications}
              onUpdateProfile={handleUpdateProfile}
              onAddExam={handleAddExam}
              onTriggerExamAlert={handleTriggerExamAlert}
              onMarkNotificationsRead={handleMarkNotificationsRead}
              onJumpToCourseMaterials={handleJumpToCourseMaterials}
            />
            <div ref={catalogRef}>
              <MaterialsCatalog
                materials={appState.materials}
                profile={appState.profile}
                universities={appState.universities}
                partnerAds={appState.partnerAds}
                selectedMajorFilter={selectedMajorFilter}
                onChangeMajorFilter={setSelectedMajorFilter}
                selectedCourseFilter={selectedCourseFilter}
                onChangeCourseFilter={setSelectedCourseFilter}
                selectedUniversityFilter={selectedUniversityFilter}
                onChangeUniversityFilter={setSelectedUniversityFilter}
                selectedFacultyFilter={selectedFacultyFilter}
                onChangeFacultyFilter={setSelectedFacultyFilter}
                selectedDepartmentFilter={selectedDepartmentFilter}
                onChangeDepartmentFilter={setSelectedDepartmentFilter}
                onSelectMaterial={(mat) => setPreviewMaterialId(mat.id)}
                onOpenUpload={() => setUploadModalOpen(true)}
                onGoToEvaluations={() => handleNavigate('subscriptions')}
              />
            </div>
          </>
        )}

        {activeSection === 'assistant' && (
          <AcademicAssistantView
            profile={appState.profile}
            initialPrompt={assistantInitialPrompt}
            onClearInitialPrompt={() => setAssistantInitialPrompt(null)}
          />
        )}

        {activeSection === 'subscriptions' && (
          <SubscriptionsAndPoints
            profile={appState.profile}
            materials={appState.materials}
            onUpgradePlan={handleUpgradePlan}
            onUpdateProfile={handleUpdateProfile}
            onUpdateLinkedAccount={handleUpdateLinkedAccount}
            onOpenUpload={() => setUploadModalOpen(true)}
            onSelectMaterial={(mat) => setPreviewMaterialId(mat.id)}
          />
        )}

        {activeSection === 'survey' && (
          <CourseSurveySection
            courseRequests={appState.courseRequests}
            universities={appState.universities}
            profile={appState.profile}
            supportTickets={appState.supportTickets}
            onSubmitCourseRequest={handleSubmitCourseRequest}
            onVoteRequest={handleVoteRequest}
            onSendSupport={handleSendSupport}
          />
        )}

        {activeSection === 'canvas' && (
          <BusinessModelView
            canvasBlocks={appState.canvasBlocks}
            leanTasks={appState.leanTasks}
            onToggleLeanWeek={handleToggleLeanWeek}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-slate-600">
          <div className="space-y-1">
            <span className="font-display text-lg font-extrabold text-[#0F172A]">دراستي</span>
            <p className="text-xs text-slate-500">
              منصة تجمع المحاضرات والملخصات وأسئلة السنوات السابقة لطلبة الجامعات في مكان واحد.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-medium">
            <button
              type="button"
              onClick={() => handleNavigate('catalog')}
              className="hover:text-[#2563EB] transition-colors"
            >
              المواد الدراسية
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('assistant')}
              className="hover:text-[#2563EB] transition-colors"
            >
              المساعد الدراسي
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('subscriptions')}
              className="hover:text-[#2563EB] transition-colors"
            >
              الاشتراكات والنقاط
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('survey')}
              className="hover:text-[#2563EB] transition-colors"
            >
              استبيان المساقات
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('canvas')}
              className="hover:text-[#2563EB] transition-colors"
            >
              نموذج العمل (26 نوفمبر 2026)
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <MaterialPreviewModal
        material={activePreviewMaterial}
        profile={appState.profile}
        onClose={() => setPreviewMaterialId(null)}
        onSubmitReview={handleSubmitReview}
        onGoToSubscriptions={() => handleNavigate('subscriptions')}
        onRedeemPoints={handleRedeemPoints}
      />

      <UploadMaterialModal
        open={uploadModalOpen}
        profile={appState.profile}
        universities={appState.universities}
        onClose={() => setUploadModalOpen(false)}
        onSubmitMaterial={handleSubmitMaterial}
      />

      {linkedAccountsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ربط الحساب بالمنصات الاجتماعية"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500">
                إعدادات ربط الحساب ({appState.authSession.email})
              </span>
              <button
                type="button"
                onClick={() => setLinkedAccountsModalOpen(false)}
                aria-label="إغلاق نافذة ربط الحسابات"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <LinkedAccountsBox
              compact
              linkedAccounts={appState.profile.linkedAccounts}
              onUpdateLink={handleUpdateLinkedAccount}
            />
          </div>
        </div>
      )}

      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Action Confirmation Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2.5 max-w-sm"
        >
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
