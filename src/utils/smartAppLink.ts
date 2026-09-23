/**
 * Utilitário de Smart App Link e Detecção de Plataforma para VEND+
 * Permite abrir o app instalado via deep link (vendplus://) ou direcionar
 * inteligentemente para a página oficial /app ou lojas oficiais.
 */

export type DeviceType = 'android' | 'ios' | 'desktop';

export interface SmartAppConfig {
  playStoreUrl: string | null;
  appStoreUrl: string | null;
  customScheme: string;
}

// Configuração oficial - URLs das lojas oficiais só são ativadas após aprovação das lojas
export const APP_CONFIG: SmartAppConfig = {
  playStoreUrl: null, // Ativar quando publicado na Google Play
  appStoreUrl: null,  // Ativar quando publicado na App Store
  customScheme: 'vendplus://app',
};

/**
 * Detecta a plataforma do usuário baseando-se no User Agent
 */
export function detectDevice(): DeviceType {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'desktop';
  }

  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();

  if (/android/i.test(ua)) {
    return 'android';
  }

  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }

  return 'desktop';
}

/**
 * Tenta abrir o aplicativo instalado via Deep Link.
 * Se o app não estiver instalado após o tempo limite, redireciona
 * de forma transparente para a loja oficial (se existir) ou para a central /app.
 */
export function openAppSmartly(onNavigate?: (view: string, param?: string) => void): void {
  if (typeof window === 'undefined') return;

  const device = detectDevice();

  if (device === 'desktop') {
    // No computador, direciona para a central /app com opções e QR Code
    if (onNavigate) {
      onNavigate('app');
    } else {
      window.location.href = '/app';
    }
    return;
  }

  const startTime = Date.now();
  const schemeUrl = APP_CONFIG.customScheme;

  // Tentativa de abertura via custom scheme
  const timer = setTimeout(() => {
    // Se a aba ainda estiver visível após 1500ms, significa que o app nativo não interceptou o link
    if (document.hidden || Date.now() - startTime > 3000) {
      return; // App abriu com sucesso
    }

    if (device === 'android') {
      if (APP_CONFIG.playStoreUrl) {
        window.location.href = APP_CONFIG.playStoreUrl;
      } else if (onNavigate) {
        onNavigate('app', 'android');
      } else {
        window.location.href = '/app?platform=android';
      }
    } else if (device === 'ios') {
      if (APP_CONFIG.appStoreUrl) {
        window.location.href = APP_CONFIG.appStoreUrl;
      } else if (onNavigate) {
        onNavigate('app', 'ios');
      } else {
        window.location.href = '/app?platform=ios';
      }
    }
  }, 1500);

  // Disparo do deep link
  try {
    window.location.href = schemeUrl;
  } catch {
    clearTimeout(timer);
    if (onNavigate) {
      onNavigate('app', device);
    } else {
      window.location.href = `/app?platform=${device}`;
    }
  }
}

/**
 * Trata o clique de download específico (Android ou iOS)
 */
export function downloadAppPlatform(
  platform: 'android' | 'ios',
  onNavigate?: (view: string, param?: string) => void
): void {
  if (platform === 'android') {
    if (APP_CONFIG.playStoreUrl) {
      window.open(APP_CONFIG.playStoreUrl, '_blank');
    } else if (onNavigate) {
      onNavigate('app', 'android');
    } else {
      window.location.href = '/app?platform=android';
    }
  } else if (platform === 'ios') {
    if (APP_CONFIG.appStoreUrl) {
      window.open(APP_CONFIG.appStoreUrl, '_blank');
    } else if (onNavigate) {
      onNavigate('app', 'ios');
    } else {
      window.location.href = '/app?platform=ios';
    }
  }
}
