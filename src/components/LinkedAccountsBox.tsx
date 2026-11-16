import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Link2, Unlink } from 'lucide-react';
import type { LinkedAccountsMap, SocialProvider } from '../types/dirasati';

interface LinkedAccountsBoxProps {
  linkedAccounts: LinkedAccountsMap;
  onUpdateLink: (provider: SocialProvider, connected: boolean, handle: string) => Promise<void> | void;
  compact?: boolean;
  requireAtLeastOne?: boolean;
}

interface ProviderMeta {
  id: SocialProvider;
  label: string;
  placeholder: string;
  accentBg: string;
  accentBorder: string;
  icon: React.ReactNode;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'google',
    label: 'قوقل (Google)',
    placeholder: 'name@gmail.com',
    accentBg: 'bg-red-50',
    accentBorder: 'border-red-200',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
        />
      </svg>
    ),
  },
  {
    id: 'x',
    label: 'تويتر (X)',
    placeholder: '@username',
    accentBg: 'bg-slate-100',
    accentBorder: 'border-slate-300',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#0F172A]" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'فيسبوك (Facebook)',
    placeholder: 'fb.com/username أو الاسم',
    accentBg: 'bg-blue-50',
    accentBorder: 'border-blue-200',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1877F2]" aria-hidden="true">
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'إنستغرام (Instagram)',
    placeholder: '@instagram_handle',
    accentBg: 'bg-pink-50',
    accentBorder: 'border-pink-200',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <defs>
          <linearGradient id="igGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="url(#igGrad)" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="url(#igGrad)" strokeWidth="2" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="#EC4899" />
      </svg>
    ),
  },
];

export const LinkedAccountsBox: React.FC<LinkedAccountsBoxProps> = ({
  linkedAccounts,
  onUpdateLink,
  compact = false,
  requireAtLeastOne = false,
}) => {
  const [draftHandles, setDraftHandles] = useState<Record<SocialProvider, string>>({
    google: linkedAccounts.google?.handle || '',
    x: linkedAccounts.x?.handle || '',
    facebook: linkedAccounts.facebook?.handle || '',
    instagram: linkedAccounts.instagram?.handle || '',
  });
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null);
  const [errorProvider, setErrorProvider] = useState<{ id: SocialProvider; msg: string } | null>(null);

  const connectedCount = PROVIDERS.filter((p) => linkedAccounts[p.id]?.connected).length;
  const requirementMet = connectedCount >= 1;

  const handleConnect = async (provider: ProviderMeta) => {
    const value = (draftHandles[provider.id] || '').trim();
    if (!value) {
      setErrorProvider({
        id: provider.id,
        msg: `أدخل معرف أو بريد حساب ${provider.label} أولاً.`,
      });
      return;
    }
    setErrorProvider(null);
    setBusyProvider(provider.id);
    try {
      await onUpdateLink(provider.id, true, value);
    } catch (err) {
      setErrorProvider({
        id: provider.id,
        msg: err instanceof Error ? err.message : 'تعذر ربط الحساب.',
      });
    } finally {
      setBusyProvider(null);
    }
  };

  const handleDisconnect = async (providerId: SocialProvider) => {
    if (requireAtLeastOne && connectedCount <= 1) {
      setErrorProvider({
        id: providerId,
        msg: 'يشترط وجود حساب واحد مربوط على الأقل (اربط حساباً آخر قبل فصل هذا الحساب).',
      });
      return;
    }
    setErrorProvider(null);
    setBusyProvider(providerId);
    try {
      await onUpdateLink(providerId, false, '');
      setDraftHandles((prev) => ({ ...prev, [providerId]: '' }));
    } catch (err) {
      setErrorProvider({
        id: providerId,
        msg: err instanceof Error ? err.message : 'تعذر إلغاء ربط الحساب.',
      });
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <div className={compact ? 'space-y-3' : 'bg-white border border-slate-200 rounded-2xl p-6 space-y-5'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB] shrink-0">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-[#0F172A]">
              ربط الحساب بالمنصات الاجتماعية
            </h3>
            <p className="text-xs text-slate-500">
              {requireAtLeastOne
                ? 'يشترط ربط حساب واحد على الأقل من: تويتر X، فيسبوك، قوقل، أو إنستغرام'
                : 'اربط حسابك في دراستي مع تويتر X وفيسبوك وقوقل وإنستغرام'}
            </p>
          </div>
        </div>

        <span
          className={`font-mono-nums text-xs font-semibold px-3 py-1 rounded-lg border whitespace-nowrap shrink-0 self-start sm:self-auto ${
            requirementMet
              ? 'text-[#059669] bg-emerald-50 border-emerald-200'
              : requireAtLeastOne
                ? 'text-[#B45309] bg-amber-50 border-amber-200'
                : 'text-[#2563EB] bg-blue-50 border-blue-200'
          }`}
        >
          {connectedCount} / 4 حسابات مربوطة
        </span>
      </div>

      {requireAtLeastOne && !requirementMet && (
        <div className="px-3.5 py-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-xs text-[#92400E] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
          <span>الشرط: يرجى ربط منصة واحدة على الأقل (قوقل أو تويتر X أو فيسبوك أو إنستغرام).</span>
        </div>
      )}

      <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'md:grid-cols-2'} gap-3`}>
        {PROVIDERS.map((provider) => {
          const state = linkedAccounts[provider.id];
          const isConnected = Boolean(state?.connected);
          const isBusy = busyProvider === provider.id;
          const err = errorProvider?.id === provider.id ? errorProvider.msg : null;

          return (
            <div
              key={provider.id}
              className={`rounded-xl border p-3.5 space-y-2.5 transition-colors ${
                isConnected
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : 'bg-[#F8FAFC] border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${provider.accentBg} ${provider.accentBorder}`}
                  >
                    {provider.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0F172A] truncate">
                      {provider.label}
                    </div>
                    {isConnected ? (
                      <div className="text-xs text-[#059669] font-medium flex items-center gap-1 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span dir="ltr" className="truncate font-mono-nums">
                          {state.handle}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500">غير مربوط حالياً</div>
                    )}
                  </div>
                </div>

                {isConnected && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDisconnect(provider.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Unlink className="w-3 h-3" />
                    <span>إلغاء الربط</span>
                  </button>
                )}
              </div>

              {!isConnected && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draftHandles[provider.id]}
                    onChange={(e) =>
                      setDraftHandles((prev) => ({ ...prev, [provider.id]: e.target.value }))
                    }
                    placeholder={provider.placeholder}
                    dir="ltr"
                    className="flex-1 min-w-0 h-9 px-2.5 text-xs text-left bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleConnect(provider)}
                    className="px-3 h-9 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {isBusy ? '...' : 'ربط الحساب'}
                  </button>
                </div>
              )}

              {err && <p className="text-[11px] text-red-600 font-medium">{err}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
