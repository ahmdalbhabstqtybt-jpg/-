import React, { useState } from 'react';
import { LogIn, LogOut, Menu, X } from 'lucide-react';
import { NotificationCenterDropdown } from './NotificationCenterDropdown';
import type {
  CourseRequest,
  ExamNotificationLog,
  MaterialStatusNotification,
  StudyMaterial,
  SupportTicket,
  UserRole,
} from '../types/dirasati';

export type ActiveSection = 'workspace' | 'catalog' | 'assistant' | 'subscriptions' | 'survey' | 'canvas';

interface TopBarProps {
  role: UserRole;
  isAuthenticated: boolean;
  displayName?: string;
  activeSection: ActiveSection;
  materialNotifications: MaterialStatusNotification[];
  examNotifications: ExamNotificationLog[];
  materials: StudyMaterial[];
  supportTickets: SupportTicket[];
  courseRequests: CourseRequest[];
  onNavigate: (section: ActiveSection) => void;
  onPrimaryAction: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onMarkMaterialNotificationRead: (id?: string) => Promise<void>;
  onMarkExamNotificationsRead: () => Promise<void>;
  onSelectMaterialNotification: (notification: MaterialStatusNotification) => void;
  onSelectMaterialById: (materialId: string) => void;
  onNavigateFromNotification: (
    section: 'workspace' | 'catalog' | 'subscriptions' | 'survey',
    courseName?: string,
  ) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  role,
  isAuthenticated,
  displayName,
  activeSection,
  materialNotifications,
  examNotifications,
  materials,
  supportTickets,
  courseRequests,
  onNavigate,
  onPrimaryAction,
  onLoginClick,
  onLogoutClick,
  onMarkMaterialNotificationRead,
  onMarkExamNotificationsRead,
  onSelectMaterialNotification,
  onSelectMaterialById,
  onNavigateFromNotification,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ActiveSection; label: string }[] =
    isAuthenticated && role === 'teacher'
      ? [
          { id: 'workspace', label: 'لوحة المعلم' },
          { id: 'catalog', label: 'المواد الدراسية' },
          { id: 'assistant', label: 'المساعد الدراسي' },
          { id: 'survey', label: 'استبيان المساقات' },
          { id: 'canvas', label: 'نموذج العمل' },
        ]
      : isAuthenticated && role === 'admin'
        ? [
            { id: 'workspace', label: 'لوحة الإدارة' },
            { id: 'catalog', label: 'المواد الدراسية' },
            { id: 'assistant', label: 'المساعد الدراسي' },
            { id: 'survey', label: 'استبيان المساقات' },
            { id: 'canvas', label: 'نموذج العمل' },
          ]
        : [
            { id: 'catalog', label: 'المواد الدراسية' },
            { id: 'assistant', label: 'المساعد الدراسي' },
            { id: 'subscriptions', label: 'الاشتراكات والنقاط' },
            { id: 'survey', label: 'استبيان المساقات' },
            { id: 'canvas', label: 'نموذج العمل' },
          ];

  const primaryLabel =
    isAuthenticated && role === 'teacher'
      ? 'نشر مادة رسمية'
      : isAuthenticated && role === 'admin'
        ? 'لوحة الإدارة'
        : 'ارفع ملخصاً';

  const handleSelect = (id: ActiveSection) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <button
          type="button"
          onClick={() => handleSelect(isAuthenticated && role !== 'student' ? 'workspace' : 'catalog')}
          className="font-display text-2xl font-extrabold tracking-tight text-[#0F172A] hover:text-[#2563EB] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-md px-1"
        >
          دراستي
        </button>

        <nav className="hidden md:flex items-center gap-6" aria-label="التنقل الرئيسي">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded ${
                  isActive
                    ? 'text-[#2563EB] font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-[#2563EB]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <NotificationCenterDropdown
            role={role}
            isAuthenticated={isAuthenticated}
            materialNotifications={materialNotifications}
            examNotifications={examNotifications}
            materials={materials}
            supportTickets={supportTickets}
            courseRequests={courseRequests}
            onMarkMaterialRead={onMarkMaterialNotificationRead}
            onMarkExamsRead={onMarkExamNotificationsRead}
            onSelectMaterialNotification={onSelectMaterialNotification}
            onSelectMaterialById={onSelectMaterialById}
            onNavigateAction={onNavigateFromNotification}
          />

          <button
            type="button"
            onClick={onPrimaryAction}
            className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
          >
            {primaryLabel}
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={onLogoutClick}
              title={displayName ? `تسجيل الخروج (${displayName})` : 'تسجيل الخروج'}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>تسجيل الخروج</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLoginClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-[#0F172A] bg-[#F8FAFC] hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <LogIn className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>تسجيل الدخول</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2563EB]/10 text-[#2563EB] font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onPrimaryAction();
              }}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
            >
              {primaryLabel}
            </button>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogoutClick();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLoginClick();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4 text-[#2563EB]" />
                <span>تسجيل الدخول</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
