import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Circle, FileCheck2 } from 'lucide-react';
import type { CanvasBlock, LeanWeekTask } from '../types/dirasati';

interface BusinessModelViewProps {
  canvasBlocks: CanvasBlock[];
  leanTasks: LeanWeekTask[];
  onToggleLeanWeek: (week: number) => Promise<void>;
}

const DEFENSE_TARGET = new Date('2026-11-26T11:00:00');

function computeCountdown() {
  const now = new Date();
  const diffMs = Math.max(0, DEFENSE_TARGET.getTime() - now.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  return { days, hours, minutes };
}

export const BusinessModelView: React.FC<BusinessModelViewProps> = ({
  canvasBlocks,
  leanTasks,
  onToggleLeanWeek,
}) => {
  const [countdown, setCountdown] = useState(computeCountdown);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(canvasBlocks[3]?.id || 'vp');

  useEffect(() => {
    const timer = setInterval(() => setCountdown(computeCountdown()), 30000);
    return () => clearInterval(timer);
  }, []);

  const completedCount = leanTasks.filter((t) => t.completed).length;
  const activeBlock = canvasBlocks.find((b) => b.id === selectedBlockId) || canvasBlocks[0];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Defense Header & Countdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <span className="text-xs font-semibold text-[#2563EB]">
            ملف المناقشة التنفيذي · المربعات التسعة وخطة البداية الرشيقة
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
            نموذج العمل التجاري لمنصة «دراستي»
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            استعراض متكامل للمربعات التسعة وخطوات التحقق الأسبوعية (Lean Startup) استعداداً لموعد المناقشة الرسمية.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
          <div className="px-5 py-4 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>الخميس 26 نوفمبر 2026 · 11:00 صباحاً</span>
            </div>
            <div className="font-mono-nums text-xl font-bold text-[#0F172A]">
              {countdown.days} يوم · {countdown.hours} ساعة · {countdown.minutes} دقيقة
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#D97706] font-medium">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>تسليم ملف النموذج قبلها بيومين (24 نوفمبر)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 9-Block Business Model Canvas Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h3 className="font-display text-xl font-bold text-[#0F172A]">
              نموذج العمل التجاري الكامل (المربعات التسعة)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              اضغط على أي مربع لقراءة تفاصيله كاملة ومناقشتها مع اللجنة
            </p>
          </div>
          <span className="font-mono-nums text-xs text-slate-500">9 / 9 مكونات مكتملة</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {canvasBlocks.map((block) => {
            const isSelected = block.id === selectedBlockId;
            return (
              <button
                key={block.id}
                type="button"
                onClick={() => setSelectedBlockId(block.id)}
                className={`text-right bg-white rounded-xl p-5 border transition-colors flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-[#2563EB] ring-1 ring-[#2563EB]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-nums text-xs font-semibold text-[#2563EB]">
                      {block.number}.
                    </span>
                    <span className="text-xs text-slate-400 font-mono-nums">
                      {block.points.length} نقاط
                    </span>
                  </div>
                  <h4 className="font-display text-lg font-bold text-[#0F172A]">{block.title}</h4>
                  <p className="text-xs text-slate-500">{block.summary}</p>
                </div>

                <ul className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {block.points.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#2563EB] font-bold" aria-hidden="true">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Focused Inspector Bar for Live Presentation */}
        {activeBlock && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-bold text-[#0F172A]">
                تفاصيل المربع المحدد: {activeBlock.number}. {activeBlock.title}
              </h4>
              <span className="text-xs text-slate-500">{activeBlock.summary}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {activeBlock.points.map((pt, i) => (
                <div key={i} className="p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm text-slate-800">
                  {pt}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4-Week Lean Startup Roadmap */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-xl font-bold text-[#0F172A]">
              خطوات البداية الأسبوعية (Lean Startup — 4 أسابيع)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              مؤشر التقدم التنفيذي من الفكرة إلى المناقشة (اضغط على أي أسبوع لتحديث حالة الإنجاز)
            </p>
          </div>
          <span className="font-mono-nums text-sm font-bold text-[#059669]">
            {completedCount} / {leanTasks.length} أسابيع منجزة
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leanTasks.map((task) => (
            <button
              key={task.week}
              type="button"
              onClick={() => onToggleLeanWeek(task.week)}
              className={`text-right p-5 rounded-xl border transition-colors flex items-start gap-3.5 ${
                task.completed
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : 'bg-[#F8FAFC] border-slate-200 hover:border-[#2563EB]/50'
              }`}
            >
              {task.completed ? (
                <CheckCircle2 className="w-5 h-5 text-[#059669] mt-0.5 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1.5">
                <h4 className="font-display text-base font-bold text-[#0F172A]">{task.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{task.details}</p>
                <p className="text-xs font-semibold text-[#2563EB] pt-1">
                  المخرج المستهدف: {task.targetMetric}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
