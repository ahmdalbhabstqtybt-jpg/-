import React, { useState } from 'react';
import { Check, Copy, Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isInstalled) {
    return null;
  }

  const currentUrl =
    typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyUrl = async () => {
    if (!currentUrl || !navigator.clipboard) return;
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrimaryClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    setModalOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrimaryClick}
        className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#0F172A] bg-white border border-slate-200 hover:border-[#2563EB] rounded-xl transition-colors whitespace-nowrap shrink-0"
      >
        <Smartphone className="w-4 h-4 text-[#2563EB]" />
        <span>تثبيت التطبيق على الهاتف</span>
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="pwa-install-title" className="font-display text-xl font-bold text-[#0F172A]">
                  تثبيت تطبيق «دراستي» على هاتفك
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  يدعم التثبيت المباشر على أندرويد وآيفون، كما يدعم التحويل إلى ملف APK
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="إغلاق نافذة التثبيت"
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              {isInstallable && (
                <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl space-y-2.5">
                  <p className="font-semibold text-[#1E40AF]">
                    التثبيت المباشر جاهز على جهازك:
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await install();
                      if (ok) setModalOpen(false);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>تثبيت الآن كتطبيق مستقل</span>
                  </button>
                </div>
              )}

              <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1.5">
                <h3 className="font-display font-bold text-[#0F172A]">
                  1. التثبيت على أندرويد (Chrome):
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  افتح رابط المنصة في متصفح Chrome على هاتفك، ثم اضغط قائمة النقاط الثلاث (⋮) واختر{' '}
                  <strong>«تثبيت التطبيق» (Install app)</strong> ليظهر بأيقونة مستقلة ويعمل دون شريط متصفح.
                </p>
              </div>

              {isIOS && (
                <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1.5">
                  <h3 className="font-display font-bold text-[#0F172A]">
                    تثبيت على iPhone / iPad (Safari):
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    اضغط على زر <strong>المشاركة</strong> أسفل متصفح Safari، ثم اختر{' '}
                    <strong>«إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</strong>.
                  </p>
                </div>
              )}

              <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-2">
                <h3 className="font-display font-bold text-[#0F172A]">
                  2. استخراج ملف APK قابل للتنزيل (PWABuilder):
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  نظراً لأن بيئة الويب لا تحتوي على محرك Android SDK لتوليد ملف `.apk` مباشرة، قمنا بتجهيز المنصة بملف Manifest وأيقونات وService Worker متكاملة. انسخ رابط المنصة وألصقه في أداة{' '}
                  <span className="font-mono-nums font-semibold text-[#0F172A]">pwabuilder.com</span>{' '}
                  لتنزيل حزمة APK جاهزة لهواتف أندرويد.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 h-9 px-3 text-xs font-mono-nums bg-white border border-slate-200 rounded-lg text-slate-700"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1.5 px-3 h-9 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-[#92400E] px-4 py-2.5 text-xs font-semibold text-white shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>وضع عدم الاتصال — يتم عرض البيانات المحفوظة محلياً</span>
    </div>
  );
};
