import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import adminApi from '../lib/adminApi';

type AnySettings = { [k: string]: any };

type SettingsContextType = {
  settings: AnySettings;
  loading: boolean;
  reload: () => Promise<void>;
};

const defaultCtx: SettingsContextType = {
  settings: {},
  loading: false,
  reload: async () => {},
};

const SiteSettingsContext = createContext<SettingsContextType>(defaultCtx);

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

function isPlainObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * PUBLIC_DEFAULTS
 * - Defaults used only on the public site to ensure there is always a friendly fallback
 */
const PUBLIC_DEFAULTS: AnySettings = {
  siteTitle: 'Prepare for exams faster with AI',
  siteDescription: 'Practice smarter, get instant explanations, and improve your scores with AI-powered tests.',
  footerHtml: '<p>&copy; Your Company. All rights reserved.</p>',
  logoDataUrl: '/images/default-logo.png',
  brandColor: '#861f41',
  accentColor: '#f6b024',
  announcement: { enabled: false, html: '' },
  support: { email: '', phone: '', url: '' },
  maintenance: { enabled: false, message: 'Site is under maintenance. Please check back later.' },
};

// Public-side limit: don't accept enormous data: URIs into public cache (bytes)
const PUBLIC_DATA_URL_MAX_BYTES = 200 * 1024;

function estimateDataUrlBytes(dataUrl: string): number {
  try {
    const parts = dataUrl.split(',');
    if (parts.length !== 2) return 0;
    const b64 = parts[1].replace(/\s+/g, '');
    const len = b64.length;
    return Math.ceil((len * 3) / 4);
  } catch {
    return 0;
  }
}

/**
 * sanitizeSettingsPublic
 * - Avoid applying obviously-invalid / dangerous values into public display fields.
 * - Rejects admin-path/http URLs for titles; for logoDataUrl: allow reasonable remote/data urls,
 *   but drop very large data: URIs so public cache/localStorage doesn't blow up and the browser doesn't render a huge base64.
 */
function sanitizeSettingsPublic(incoming: AnySettings) {
  const out = { ...(incoming || {}) } as AnySettings;

  function looksLikeUrlOrAdmin(value: any) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (/^https?:\/\//i.test(trimmed) && (trimmed.includes('/admin') || (trimmed.includes('localhost') && trimmed.includes(':')))) return true;
    if (trimmed.includes('/admin')) return true;
    if (trimmed.includes('localhost') && trimmed.includes(':')) return true;
    return false;
  }

  if ('siteTitle' in out) {
    if (looksLikeUrlOrAdmin(out.siteTitle)) out.siteTitle = '';
    else if (typeof out.siteTitle === 'string') out.siteTitle = out.siteTitle.trim();
    else out.siteTitle = '';
  }

  if ('siteDescription' in out) {
    if (looksLikeUrlOrAdmin(out.siteDescription)) out.siteDescription = '';
    else if (typeof out.siteDescription === 'string') out.siteDescription = out.siteDescription.trim();
    else out.siteDescription = '';
  }

  if ('logoDataUrl' in out) {
    if (typeof out.logoDataUrl === 'string') {
      const trimmed = out.logoDataUrl.trim();
      if (trimmed.startsWith('data:')) {
        const bytes = estimateDataUrlBytes(trimmed);
        // Drop too-large data: URIs for the public site; admin UI still keeps preview
        if (bytes > PUBLIC_DATA_URL_MAX_BYTES) {
          out.logoDataUrl = null;
        } else {
          out.logoDataUrl = trimmed;
        }
      } else {
        // remote URLs okay (but still guard against obvious admin/localhost urls)
        if (/^https?:\/\//i.test(trimmed) && (trimmed.includes('/admin') || (trimmed.includes('localhost') && trimmed.includes(':')))) {
          out.logoDataUrl = null;
        } else {
          out.logoDataUrl = trimmed;
        }
      }
    } else {
      out.logoDataUrl = null;
    }
  }

  return out;
}

function deepMerge(target: AnySettings, source: AnySettings) {
  if (!isPlainObject(target)) return (source as any) ?? target;
  if (!isPlainObject(source)) return (source as any) ?? target;
  const out: any = { ...(target as any) };
  for (const key of Object.keys(source as any)) {
    const sVal = (source as any)[key];
    const tVal = (target as any)[key];
    if (isPlainObject(tVal) && isPlainObject(sVal)) out[key] = deepMerge(tVal, sVal);
    else out[key] = sVal;
  }
  return out;
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AnySettings>({});
  const [loading, setLoading] = useState<boolean>(true);

  const settingsJsonRef = useRef<string>(JSON.stringify(settings || {}));
  useEffect(() => {
    settingsJsonRef.current = JSON.stringify(settings || {});
  }, [settings]);

  function shouldPreferLocalAfterReset(): boolean {
    try {
      const raw = localStorage.getItem('ADMIN_SETTINGS_FORCE_LOCAL_UNTIL');
      if (!raw) return false;
      const until = Number(raw) || 0;
      return Date.now() < until;
    } catch {
      return false;
    }
  }

  async function fetchSettings() {
    setLoading(true);
    try {
      const resp = await adminApi.get('/settings');
      const data = (resp as any)?.data ?? null;
      const s = data?.settings ?? data?.saved ?? data ?? {};
      if (!s || typeof s !== 'object') {
        setLoading(false);
        return;
      }

      const sanitized = sanitizeSettingsPublic(s);
      const mergedPublic = deepMerge(PUBLIC_DEFAULTS, sanitized);
      const newJson = JSON.stringify(mergedPublic);

      if (newJson !== settingsJsonRef.current) {
        if (shouldPreferLocalAfterReset()) {
          setLoading(false);
          return;
        }
        setSettings(mergedPublic);
        settingsJsonRef.current = newJson;
        try {
          localStorage.setItem('publicSiteSettings', newJson);
        } catch {
          // ignore localStorage write errors
        }
      }
    } catch (err) {
      // fetch failed — keep cached settings
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('publicSiteSettings') : null;
          if (raw) {
            const trimmed = raw.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object') {
                const sanitized = sanitizeSettingsPublic(parsed);
                const merged = deepMerge(PUBLIC_DEFAULTS, sanitized);
                setSettings(merged);
                settingsJsonRef.current = JSON.stringify(merged);
              }
            }
          }
        } catch {
          // ignore parse/localStorage errors
        }

        await fetchSettings();
        if (cancelled) return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      try {
        if (!e.key) return;
        if (e.key === 'ADMIN_SETTINGS_FORCE_LOCAL_UNTIL') return;
        if (e.key === 'publicSiteSettings') {
          if (shouldPreferLocalAfterReset()) return;
          if (!e.newValue) return;
          const parsed = JSON.parse(e.newValue);
          const sanitized = sanitizeSettingsPublic(parsed);
          const merged = deepMerge(PUBLIC_DEFAULTS, sanitized);
          const newJson = JSON.stringify(merged);
          if (newJson !== settingsJsonRef.current) {
            setSettings(merged);
            settingsJsonRef.current = newJson;
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, reload: fetchSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}