// VEND+ Marketing, UTM Attribution, Referrals and Social Sharing Client Service

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  ref?: string;
}

export interface TrackEventOptions {
  eventType:
    | 'page_view'
    | 'signup'
    | 'login'
    | 'store_created'
    | 'product_created'
    | 'product_published'
    | 'checkout_started'
    | 'purchase_completed';
  landingPath?: string;
  storeId?: number;
  productId?: number;
  orderId?: number;
  userId?: number;
  metadata?: Record<string, any>;
}

const SESSION_KEY = 'vend_marketing_session_id';
const UTM_STORAGE_KEY = 'vend_marketing_attribution';
const REF_STORAGE_KEY = 'vend_referral_code';

export const marketingService = {
  // 1. Get or generate persistent session ID
  getSessionId(): string {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch {
      return `sess_${Date.now()}`;
    }
  },

  // 2. Parse UTM parameters and Referral code from current URL
  captureUrlParams(): UtmParams {
    if (typeof window === 'undefined') return {};
    try {
      const url = new URL(window.location.href);
      const params = url.searchParams;

      const utm: UtmParams = {};
      const source = params.get('utm_source');
      const medium = params.get('utm_medium');
      const campaign = params.get('utm_campaign');
      const content = params.get('utm_content');
      const term = params.get('utm_term');
      const ref = params.get('ref') || params.get('indicacao');

      if (source) utm.source = source.toLowerCase();
      if (medium) utm.medium = medium.toLowerCase();
      if (campaign) utm.campaign = campaign.toLowerCase();
      if (content) utm.content = content;
      if (term) utm.term = term;
      if (ref) utm.ref = ref.toUpperCase();

      // If new attribution params found, store them in sessionStorage
      if (source || campaign || medium || content) {
        sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
      }

      // If referral code found, store in localStorage so it survives session for signup
      if (ref) {
        localStorage.setItem(REF_STORAGE_KEY, ref.toUpperCase());
        sessionStorage.setItem(REF_STORAGE_KEY, ref.toUpperCase());
      }

      return utm;
    } catch {
      return {};
    }
  },

  // 3. Get stored attribution for conversions
  getStoredAttribution(): UtmParams {
    try {
      const rawUtm = sessionStorage.getItem(UTM_STORAGE_KEY);
      const storedUtm = rawUtm ? JSON.parse(rawUtm) : {};
      const ref = sessionStorage.getItem(REF_STORAGE_KEY) || localStorage.getItem(REF_STORAGE_KEY);
      if (ref) storedUtm.ref = ref;
      return storedUtm;
    } catch {
      return {};
    }
  },

  getReferralCode(): string | null {
    try {
      return sessionStorage.getItem(REF_STORAGE_KEY) || localStorage.getItem(REF_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  },

  // 4. Track event to server
  async trackEvent(options: TrackEventOptions): Promise<void> {
    try {
      const sessionId = this.getSessionId();
      const currentUtm = this.captureUrlParams();
      const storedUtm = this.getStoredAttribution();

      const source = currentUtm.source || storedUtm.source || undefined;
      const medium = currentUtm.medium || storedUtm.medium || undefined;
      const campaign = currentUtm.campaign || storedUtm.campaign || undefined;
      const content = currentUtm.content || storedUtm.content || undefined;
      const term = currentUtm.term || storedUtm.term || undefined;
      const referralCode = currentUtm.ref || storedUtm.ref || this.getReferralCode() || undefined;

      const landingPath = options.landingPath || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');
      const referrerUrl = typeof document !== 'undefined' ? document.referrer : undefined;

      const payload = {
        sessionId,
        eventType: options.eventType,
        source,
        medium,
        campaign,
        content,
        term,
        landingPath,
        referrerUrl,
        referralCode,
        storeId: options.storeId,
        productId: options.productId,
        orderId: options.orderId,
        userId: options.userId,
        metadata: options.metadata,
      };

      await fetch('/api/marketing/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // Non-blocking: fail quietly on network error
    }
  },

  // 5. Build trackable link
  buildTrackedUrl(destPath: string, source: string, medium: string, campaign: string, content?: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vendmais.com';
    const cleanPath = destPath.startsWith('/') ? destPath : `/${destPath}`;
    const params = new URLSearchParams();
    if (source) params.set('utm_source', source.toLowerCase());
    if (medium) params.set('utm_medium', medium.toLowerCase());
    if (campaign) params.set('utm_campaign', campaign.toLowerCase());
    if (content) params.set('utm_content', content);

    const qs = params.toString();
    return `${origin}${cleanPath}${qs ? `?${qs}` : ''}`;
  },

  // 6. Build product share link with UTM
  buildProductShareUrl(productIdOrSlug: string | number, source = 'whatsapp'): string {
    return this.buildTrackedUrl(
      `/produto/${productIdOrSlug}`,
      source,
      source === 'whatsapp' ? 'share' : 'social',
      `produto_${productIdOrSlug}`
    );
  },

  // 7. Build store share link with UTM
  buildStoreShareUrl(storeSlug: string, source = 'whatsapp'): string {
    return this.buildTrackedUrl(
      `/loja/${storeSlug}`,
      source,
      source === 'whatsapp' ? 'share' : 'social',
      `loja_${storeSlug}`
    );
  },

  // 8. Build referral link with UTM
  buildReferralUrl(refCode: string, source = 'whatsapp'): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vendmais.com';
    const params = new URLSearchParams();
    params.set('ref', refCode);
    params.set('utm_source', source);
    params.set('utm_medium', 'referral');
    params.set('utm_campaign', `ref_${refCode.toLowerCase()}`);
    return `${origin}/?${params.toString()}`;
  },

  // 9. Social sharing actions
  shareOnWhatsApp(text: string, url: string): void {
    const fullMessage = `${text}\n${url}`.trim();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  },

  shareOnFacebook(url: string): void {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  },

  async shareNative(title: string, text: string, url: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn('Native share error:', e);
        }
      }
    }
    return false;
  },

  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  },
};
