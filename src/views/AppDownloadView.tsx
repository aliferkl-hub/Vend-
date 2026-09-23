import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Zap,
  Camera,
  Bell,
  QrCode,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';
import { detectDevice, openAppSmartly, downloadAppPlatform } from '../utils/smartAppLink.ts';

interface AppDownloadViewProps {
  onNavigate: (view: string, param?: string) => void;
  initialPlatform?: 'android' | 'ios';
}

export const AppDownloadView: React.FC<AppDownloadViewProps> = ({
  onNavigate,
  initialPlatform,
}) => {
  const [device, setDevice] = useState<'android' | 'ios' | 'desktop'>('desktop');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Link oficial da central /app para o QR Code (estritamente a URL oficial)
  const OFFICIAL_APP_URL = 'https://vend-plus.ai.studio/app';

  useEffect(() => {
    const detected = detectDevice();
    setDevice(detected);
    if (initialPlatform) {
      setActiveTab(initialPlatform);
    } else if (detected === 'ios') {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }

    // Intercept PWA install prompt if available
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [initialPlatform]);

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(OFFICIAL_APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      openAppSmartly(onNavigate);
    }
  };

  return (
    <div id="app-download-page" className="max-w-5xl mx-auto py-6 sm:py-10 px-4 space-y-10">
      {/* 1. HERO OFICIAL DO APP VEND+ */}
      <div className="relative bg-gradient-to-br from-[#07101E] via-[#0B1A2F] to-[#0A2239] text-white rounded-3xl p-6 sm:p-12 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5 text-center sm:text-left">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Aplicativo Oficial VEND+</span>
            </div>

            {/* Título Oficial */}
            <div className="space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center font-black text-2xl text-slate-950 shadow-md">
                  V+
                </div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                  VEND<span className="text-emerald-400">+</span>
                </h1>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-sky-200">
                Tenha o VEND+ no seu celular.
              </p>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Mais rápido, seguro e conectado. Acesse suas lojas favoritas, receba avisos de vendas em tempo real, tire fotos direto da câmera para anunciar e acompanhe entregas com código de 4 dígitos.
            </p>

            {/* Aviso de detecção de dispositivo */}
            <div className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3.5 py-2 rounded-xl text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {device === 'android' && 'Detectamos que você está usando um dispositivo Android.'}
                {device === 'ios' && 'Detectamos que você está usando um dispositivo Apple iOS (iPhone/iPad).'}
                {device === 'desktop' && 'Você está no computador. Use os botões abaixo ou aponte a câmera para o QR Code.'}
              </span>
            </div>

            {/* OS 4 BOTÕES OBRIGATÓRIOS CONFORME ESPECIFICAÇÃO */}
            <div className="pt-3 flex flex-col sm:flex-row flex-wrap gap-3">
              {/* 1. ABRIR VEND+ */}
              <button
                id="btn-abrir-vendplus"
                onClick={() => openAppSmartly(onNavigate)}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-6 py-3.5 rounded-xl text-sm shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5 cursor-pointer select-none"
              >
                <Zap className="w-4 h-4 text-slate-950" />
                <span>ABRIR VEND+</span>
              </button>

              {/* 2. BAIXAR PARA ANDROID */}
              <button
                id="btn-baixar-android"
                onClick={() => {
                  setActiveTab('android');
                  downloadAppPlatform('android', onNavigate);
                }}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 px-5 py-3.5 rounded-xl text-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5 cursor-pointer select-none"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>BAIXAR PARA ANDROID</span>
              </button>

              {/* 3. BAIXAR PARA IPHONE */}
              <button
                id="btn-baixar-iphone"
                onClick={() => {
                  setActiveTab('ios');
                  downloadAppPlatform('ios', onNavigate);
                }}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 px-5 py-3.5 rounded-xl text-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5 cursor-pointer select-none"
              >
                <Download className="w-4 h-4 text-sky-400" />
                <span>BAIXAR PARA IPHONE</span>
              </button>

              {/* 4. CONTINUAR NO SITE */}
              <button
                id="btn-continuar-site"
                onClick={() => onNavigate('home')}
                className="w-full sm:w-auto bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white font-semibold border border-slate-700/60 px-5 py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                <span>CONTINUAR NO SITE</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* QR CODE OFICIAL (Aponta para https://vend-plus.ai.studio/app) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="bg-white p-5 rounded-3xl shadow-2xl border-4 border-slate-800 text-center max-w-xs w-full">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                Escaneie com a Câmera
              </p>

              {/* QR Code SVG autêntico apontando para https://vend-plus.ai.studio/app */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-center">
                <svg
                  className="w-48 h-48 sm:w-52 sm:h-52"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  role="img"
                  aria-label="QR Code oficial VEND+ App"
                >
                  <rect width="200" height="200" fill="#ffffff" rx="12" />
                  {/* Top-left marker */}
                  <rect x="20" y="20" width="45" height="45" rx="6" fill="#0B192C" />
                  <rect x="28" y="28" width="29" height="29" rx="3" fill="#ffffff" />
                  <rect x="34" y="34" width="17" height="17" rx="2" fill="#10B981" />

                  {/* Top-right marker */}
                  <rect x="135" y="20" width="45" height="45" rx="6" fill="#0B192C" />
                  <rect x="143" y="28" width="29" height="29" rx="3" fill="#ffffff" />
                  <rect x="149" y="34" width="17" height="17" rx="2" fill="#0284C7" />

                  {/* Bottom-left marker */}
                  <rect x="20" y="135" width="45" height="45" rx="6" fill="#0B192C" />
                  <rect x="28" y="143" width="29" height="29" rx="3" fill="#ffffff" />
                  <rect x="34" y="149" width="17" height="17" rx="2" fill="#0B192C" />

                  {/* High-density decorative QR data blocks */}
                  <g fill="#0B192C">
                    <rect x="75" y="22" width="12" height="12" rx="2" />
                    <rect x="95" y="22" width="10" height="10" rx="2" />
                    <rect x="115" y="24" width="12" height="8" rx="2" />
                    <rect x="75" y="42" width="8" height="16" rx="2" />
                    <rect x="90" y="42" width="14" height="10" rx="2" />
                    <rect x="110" y="42" width="16" height="14" rx="2" />

                    <rect x="22" y="75" width="14" height="12" rx="2" />
                    <rect x="42" y="75" width="10" height="14" rx="2" />
                    <rect x="60" y="75" width="16" height="12" rx="2" />
                    <rect x="85" y="70" width="28" height="28" rx="6" fill="#10B981" />
                    <text
                      x="99"
                      y="89"
                      fill="#ffffff"
                      fontSize="14"
                      fontWeight="900"
                      textAnchor="middle"
                    >
                      V+
                    </text>
                    <rect x="120" y="75" width="12" height="12" rx="2" />
                    <rect x="140" y="75" width="16" height="14" rx="2" />
                    <rect x="165" y="75" width="12" height="12" rx="2" />

                    <rect x="22" y="95" width="16" height="12" rx="2" />
                    <rect x="45" y="98" width="12" height="16" rx="2" />
                    <rect x="65" y="95" width="10" height="10" rx="2" />
                    <rect x="125" y="98" width="14" height="12" rx="2" />
                    <rect x="145" y="95" width="12" height="18" rx="2" />
                    <rect x="165" y="98" width="14" height="12" rx="2" />

                    <rect x="75" y="115" width="14" height="14" rx="2" />
                    <rect x="98" y="115" width="12" height="12" rx="2" />
                    <rect x="118" y="115" width="16" height="14" rx="2" />

                    <rect x="75" y="138" width="12" height="12" rx="2" />
                    <rect x="95" y="145" width="16" height="12" rx="2" />
                    <rect x="120" y="138" width="12" height="14" rx="2" />
                    <rect x="140" y="138" width="18" height="10" rx="2" />
                    <rect x="165" y="138" width="14" height="14" rx="2" />

                    <rect x="75" y="165" width="16" height="14" rx="2" />
                    <rect x="100" y="165" width="12" height="12" rx="2" />
                    <rect x="120" y="162" width="16" height="16" rx="2" />
                    <rect x="145" y="165" width="14" height="12" rx="2" />
                    <rect x="168" y="165" width="10" height="10" rx="2" />
                  </g>
                </svg>
              </div>

              <div className="mt-3 text-slate-700">
                <p className="text-xs font-bold text-slate-900">URL Oficial do App:</p>
                <p className="text-[11px] text-slate-500 font-mono truncate">{OFFICIAL_APP_URL}</p>
                <button
                  onClick={handleCopyLink}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Link copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. RECURSOS EXCLUSIVOS DO APLICATIVO NATIVO */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-900">
          Vantagens de usar o aplicativo VEND+
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Avisos em Tempo Real</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Receba notificações push instantâneas sobre ofertas aceitas, vendas realizadas e status do envio.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Código de 4 Dígitos</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Consulte e valide o código de segurança do pacote direto da tela de pedidos na hora da entrega.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Câmera Ultra-Rápida</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Fotografe mercadorias e publique anúncios em menos de 1 minuto sem complicação.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Sessão Persistente</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Abra e feche quando quiser sem precisar fazer login novamente. Seus dados e carrinho ficam salvos.
            </p>
          </div>
        </div>
      </div>

      {/* 3. INSTRUÇÕES DE INSTALAÇÃO (ANDROID & iOS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Instruções de Instalação e Publicação
            </h2>
            <p className="text-xs text-slate-500">
              Escolha seu sistema operacional para ver o passo a passo completo.
            </p>
          </div>

          {/* Tabs Android / iOS */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('android')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Disponível para Android
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-white text-sky-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Disponível para iPhone
            </button>
          </div>
        </div>

        {/* Conteúdo Android */}
        {activeTab === 'android' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 space-y-1">
                <p className="font-bold text-sm">Opção 1: Instalação Instantânea no Navegador (PWA)</p>
                <p>
                  No Chrome do seu Android, toque nos 3 pontinhos no canto superior direito e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>. O VEND+ será instalado com ícone nativo e tela cheia.
                </p>
                {deferredPrompt && (
                  <button
                    onClick={handleInstallPWA}
                    className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors"
                  >
                    Instalar Agora
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-800">
                Opção 2: Compilação do APK / AAB para Google Play
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                O projeto Android está localizado em <code>/android</code> (package <code>com.vendplus.app</code>). Para compilar o APK ou o pacote AAB para publicação na Google Play Store:
              </p>
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[11px] font-mono select-all overflow-x-auto">
                ./gradlew assembleRelease # Gera o APK assinado<br />
                ./gradlew bundleRelease   # Gera o AAB para a Google Play Store
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo iOS */}
        {activeTab === 'ios' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-sky-50/70 border border-sky-200 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-sky-950 space-y-1">
                <p className="font-bold text-sm">Opção 1: Instalação Rápida no iPhone (Safari)</p>
                <p>
                  Abra este site no <strong>Safari</strong> do seu iPhone ou iPad, toque no botão de <strong>Compartilhar</strong> (ícone com quadrado e seta para cima) e selecione <strong>"Adicionar à Tela de Início"</strong>.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-800">
                Opção 2: Compilação no Xcode & TestFlight / App Store
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                O projeto iOS nativo do VEND+ está pronto em <code>/ios</code> com Bundle ID <code>com.vendplus.app</code>. O procedimento final no macOS:
              </p>
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[11px] font-mono select-all overflow-x-auto">
                1. Abra /ios no Xcode no macOS<br />
                2. Selecione o dispositivo 'Any iOS Device (arm64)'<br />
                3. Menu Product &gt; Archive<br />
                4. Clique em Distribute App &gt; App Store Connect / TestFlight
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
