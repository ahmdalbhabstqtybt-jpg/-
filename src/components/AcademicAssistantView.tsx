import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Bot,
  ExternalLink,
  Globe,
  RotateCcw,
  Send,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { MAJOR_LABELS } from '../lib/constants';
import type {
  AssistantChatMessage,
  AssistantRole,
  GroundingSource,
  StudentProfile,
} from '../types/dirasati';

interface AcademicAssistantViewProps {
  profile: StudentProfile;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

const ASSISTANT_ROLES: {
  id: AssistantRole;
  title: string;
  subtitle: string;
  badge: string;
}[] = [
  {
    id: 'advisor',
    title: 'المرشد الأكاديمي وعمادات غزة',
    subtitle: 'استفسارات العمادات، الأقسام، الخطط الدراسية، واللوائح المحدّثة عبر البحث المباشر',
    badge: 'بحث مباشر + إرشاد',
  },
  {
    id: 'tutor',
    title: 'مدرّس شرح المساقات',
    subtitle: 'شرح المفاهيم الجامعية الصعبة، حل أسئلة السنوات، وبناء ملخصات منظمة',
    badge: 'شرح معمّق',
  },
  {
    id: 'fast_reviewer',
    title: 'المراجعة السريعة والاختبارات',
    subtitle: 'إجابات مركزة وسريعة، أسئلة تدريب فورية، وتلخيص نقاط الامتحان الحاسمة',
    badge: 'وضع سريع',
  },
];

export const AcademicAssistantView: React.FC<AcademicAssistantViewProps> = ({
  profile,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [assistantRole, setAssistantRole] = useState<AssistantRole>('advisor');
  const [useSearch, setUseSearch] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: `مرحباً ${profile.name}! أنا المساعد الأكاديمي في منصة دراستي. أعمل حالياً وفق ملفك الجامعي (${profile.university}${
        profile.faculty ? ` · ${profile.faculty}` : ''
      }${profile.department ? ` · ${profile.department}` : ''}). اسألني عن أي مساق، أو خطة مراجعة، أو مستجدات العمادات والجامعات في قطاع غزة.`,
      createdAt: new Date().toISOString(),
      modelUsed: 'gemini-4-hydrogen',
      usedSearch: false,
    },
  ]);

  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setInput(initialPrompt);
      onClearInitialPrompt?.();
    }
  }, [initialPrompt, onClearInitialPrompt]);

  const handleRoleSelect = (nextRole: AssistantRole) => {
    setAssistantRole(nextRole);
    if (nextRole === 'fast_reviewer') {
      setUseSearch(false);
    }
  };

  const quickPrompts = [
    `ما أهم المساقات والمراجع الموصى بها لطلبة ${profile.faculty || MAJOR_LABELS[profile.majorId]} في ${profile.university}؟`,
    `أعدّ لي خطة مراجعة مركزة لأهم موضوعات ${profile.department || MAJOR_LABELS[profile.majorId]} (السنة ${profile.academicYear}).`,
    `ابحث عن أحدث أخبار التقويم الأكاديمي والمنح المتاحة لطلبة جامعات قطاع غزة في 2026.`,
    `اختبرني بـ 3 أسئلة سريعة مع الإجابة النموذجية في تخصص ${MAJOR_LABELS[profile.majorId]}.`,
  ];

  const handleSend = async (customText?: string) => {
    const text = (customText ?? input).trim();
    if (!text || sending) return;

    const userMsg: AssistantChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };

    const historySnapshot = messages
      .filter((m) => m.id !== 'welcome-msg')
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput('');
    setError(null);
    setSending(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historySnapshot,
          assistantRole,
          useSearch,
          context: {
            university: profile.university,
            faculty: profile.faculty,
            department: profile.department,
            majorLabel: MAJOR_LABELS[profile.majorId],
            academicYear: profile.academicYear,
          },
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        modelUsed?: string;
        usedSearch?: boolean;
        sources?: GroundingSource[];
        searchFallbackReason?: string;
        error?: string;
      };

      if (!res.ok || !data.reply) {
        throw new Error(data.error || 'تعذر الحصول على رد من المساعد الأكاديمي.');
      }

      const modelMsg: AssistantChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: data.reply,
        createdAt: new Date().toISOString(),
        modelUsed: data.modelUsed,
        usedSearch: data.usedSearch,
        sources: data.sources,
        searchFallbackReason: data.searchFallbackReason,
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال بالمساعد الأكاديمي.');
    } finally {
      setSending(false);
    }
  };

  const handleResetChat = () => {
    setError(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: `بدأت محادثة جديدة ضمن سياق ${profile.university}${
          profile.faculty ? ` — ${profile.faculty}` : ''
        }. كيف أساعدك الآن؟`,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Active Student Context */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0F172A]">
                المساعد الأكاديمي والبحث الذكي
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                محادثة متعددة الجولات تحفظ سياق النقاش وتدعم البحث المباشر عبر قوقل لمعلومات جامعات وعمادات غزة والمساقات
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setUseSearch((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                useSearch
                  ? 'bg-emerald-50 border-emerald-200 text-[#059669]'
                  : 'bg-[#F8FAFC] border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>البحث المباشر عبر قوقل: {useSearch ? 'مفعّل' : 'متوقف'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetChat}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>محادثة جديدة</span>
            </button>
          </div>
        </div>

        {/* Role Selector Cards (System Instruction Switching) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ASSISTANT_ROLES.map((r) => {
            const active = assistantRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleSelect(r.id)}
                className={`text-right p-4 rounded-xl border transition-all ${
                  active
                    ? 'bg-blue-50/60 border-[#2563EB] ring-1 ring-[#2563EB]'
                    : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold text-[#0F172A]">
                    {r.title}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      active
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    {r.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{r.subtitle}</p>
              </button>
            );
          })}
        </div>

        {/* Active University + Deanship + Department Bar */}
        <div className="px-4 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          <span className="font-semibold text-[#0F172A]">السياق الأكاديمي المفعّل:</span>
          <span>{profile.university}</span>
          {profile.faculty && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#2563EB]">{profile.faculty}</span>
            </>
          )}
          {profile.department && (
            <>
              <span aria-hidden="true">·</span>
              <span>{profile.department}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{MAJOR_LABELS[profile.majorId]}</span>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
          {/* Scrollable Message Thread */}
          <div
            className="p-5 space-y-4 h-[460px] overflow-y-auto bg-[#F8FAFC]/60"
            aria-live="polite"
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isUser
                        ? 'bg-[#2563EB] border-[#2563EB] text-white'
                        : 'bg-white border-slate-200 text-[#0F172A]'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-[#2563EB]" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 border space-y-2.5 ${
                      isUser
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-white text-[#0F172A] border-slate-200'
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</div>

                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#059669]">
                          <Globe className="w-3.5 h-3.5" />
                          <span>مصادر البحث الموثوقة (Google Search):</span>
                        </div>
                        <ul className="space-y-1">
                          {msg.sources.map((src) => (
                            <li key={src.uri}>
                              <a
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] hover:underline underline-offset-2 break-all"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span>{src.title}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!isUser && (msg.usedSearch || msg.modelUsed || msg.searchFallbackReason) && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        {msg.usedSearch && (
                          <span className="inline-flex items-center gap-1 text-[#059669] font-medium">
                            <Globe className="w-3 h-3" />
                            مدعوم ببحث قوقل
                          </span>
                        )}
                        {msg.modelUsed === 'gemini-3.1-flash-lite' && (
                          <span className="inline-flex items-center gap-1 text-[#D97706] font-medium">
                            <Zap className="w-3 h-3" />
                            رد فوري سريع
                          </span>
                        )}
                        {msg.searchFallbackReason && (
                          <span className="text-[11px] text-slate-500">
                            {msg.searchFallbackReason}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#2563EB] animate-pulse" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-500">
                  {useSearch
                    ? 'جارٍ البحث في الويب وصياغة الإجابة الأكاديمية...'
                    : 'جارٍ تجهيز الإجابة...'}
                </div>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {error && (
            <div className="mx-5 mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 bg-white border-t border-slate-200 flex items-end gap-3"
          >
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="اكتب سؤالك عن المساقات، العمادات، أو اطلب شرحاً أو بحثاً محدثاً..."
              className="flex-1 p-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white resize-none"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="h-11 px-5 inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'جارٍ الإرسال...' : 'إرسال'}</span>
            </button>
          </form>
        </div>

        {/* Quick Prompts Sidebar */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#2563EB]" />
            <h2 className="font-display text-base font-bold text-[#0F172A]">
              أسئلة واقتراحات سريعة
            </h2>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            اضغط على أي سؤال لبدء المحادثة مباشرة حسب جامعتك وعمادتك وتخصصك الحالي:
          </p>

          <div className="space-y-2.5">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                disabled={sending}
                onClick={() => handleSend(prompt)}
                className="w-full text-right p-3.5 text-xs font-medium text-[#0F172A] bg-[#F8FAFC] hover:bg-blue-50/60 border border-slate-200 hover:border-[#2563EB] rounded-xl transition-colors leading-relaxed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
};
