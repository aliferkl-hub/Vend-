import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

export interface NativePhotoResult {
  file: File;
  previewUrl: string;
}

export const nativeBridge = {
  /**
   * Identifica se a execução está em ambiente nativo Capacitor (Android ou iOS)
   */
  isNative: (): boolean => {
    return Capacitor.isNativePlatform();
  },

  /**
   * Obtém a plataforma atual ('android', 'ios' ou 'web')
   */
  getPlatform: (): string => {
    return Capacitor.getPlatform();
  },

  /**
   * Inicializa barra de status nos dispositivos móveis
   */
  initStatusBar: async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0B192C' });
    } catch (err) {
      console.warn('Não foi possível configurar a StatusBar:', err);
    }
  },

  /**
   * Feedback tátil (vibração suave) em ações como botões, favoritos e checkout
   */
  hapticFeedback: async (style: ImpactStyle = ImpactStyle.Light): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.impact({ style });
    } catch {
      // Silencioso se não suportado
    }
  },

  /**
   * Captura foto utilizando a Câmera nativa do dispositivo
   */
  takePhotoWithCamera: async (): Promise<NativePhotoResult | null> => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      if (!photo.webPath) return null;

      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const filename = `camera_${Date.now()}.${photo.format || 'jpg'}`;
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

      return {
        file,
        previewUrl: photo.webPath,
      };
    } catch (err: any) {
      if (err?.message?.includes('User cancelled') || err?.message?.includes('canceled')) {
        return null;
      }
      console.error('Erro ao capturar foto da câmera:', err);
      throw err;
    }
  },

  /**
   * Seleciona foto diretamente da galeria nativa do dispositivo
   */
  pickPhotoFromGallery: async (): Promise<NativePhotoResult | null> => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      });

      if (!photo.webPath) return null;

      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const filename = `gallery_${Date.now()}.${photo.format || 'jpg'}`;
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

      return {
        file,
        previewUrl: photo.webPath,
      };
    } catch (err: any) {
      if (err?.message?.includes('User cancelled') || err?.message?.includes('canceled')) {
        return null;
      }
      console.error('Erro ao selecionar foto da galeria:', err);
      throw err;
    }
  },

  /**
   * Armazenamento chave-valor unificado (Preferences nativo com fallback transparente para localStorage)
   */
  storage: {
    get: async (key: string): Promise<string | null> => {
      try {
        if (Capacitor.isNativePlatform()) {
          const { value } = await Preferences.get({ key });
          return value;
        }
      } catch (e) {
        console.warn('Erro ao ler do Preferences nativo:', e);
      }
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    },

    set: async (key: string, value: string): Promise<void> => {
      try {
        if (Capacitor.isNativePlatform()) {
          await Preferences.set({ key, value });
        }
      } catch (e) {
        console.warn('Erro ao gravar no Preferences nativo:', e);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    },

    remove: async (key: string): Promise<void> => {
      try {
        if (Capacitor.isNativePlatform()) {
          await Preferences.remove({ key });
        }
      } catch (e) {
        console.warn('Erro ao remover do Preferences nativo:', e);
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    },
  },

  /**
   * Inicialização e registro de Notificações Push nativas
   */
  initPushNotifications: async (
    onTokenReceived?: (token: string) => void,
    onNotificationReceived?: (notification: any) => void,
    onNotificationAction?: (action: any) => void
  ): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Permissão de notificações não concedida pelo usuário.');
        return false;
      }

      await PushNotifications.register();

      // Listeners
      await PushNotifications.addListener('registration', (token) => {
        console.log('Push Registration Token:', token.value);
        nativeBridge.storage.set('vend_push_token', token.value);
        if (onTokenReceived) onTokenReceived(token.value);
      });

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('Erro de registro no Push Notification:', err);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Notificação Push recebida em primeiro plano:', notification);
        if (onNotificationReceived) onNotificationReceived(notification);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Ação de notificação executada:', notification);
        if (onNotificationAction) onNotificationAction(notification);
      });

      return true;
    } catch (err) {
      console.warn('Configuração de Push Notifications não disponível neste ambiente:', err);
      return false;
    }
  },

  /**
   * Obter geolocalização com alta precisão
   */
  getCurrentPosition: async (): Promise<{ lat: number; lng: number } | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Erro ao obter localização:', error.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  },
};

export default nativeBridge;
