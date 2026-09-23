import React, { useState, useRef } from 'react';
import {
  Camera,
  Globe,
  Star,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';
import { ProductImageType } from '../types.ts';
import { uploadImageToStorage, validateImageFile } from '../utils/imageOptimizer.ts';
import { useAuth } from '../context/AuthContext.tsx';
import nativeBridge from '../services/nativeBridge.ts';

export interface LocalProductImageItem {
  id?: number;
  url: string;
  type: ProductImageType;
  position: number;
  isPrimary?: boolean;
}

interface ProductImageUploaderProps {
  images: LocalProductImageItem[];
  onChange: (images: LocalProductImageItem[]) => void;
  maxImages?: number;
}

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  images,
  onChange,
  maxImages = 10,
}) => {
  const { authFetch } = useAuth();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Internet URL option state
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [internetUrl, setInternetUrl] = useState('');

  // Hidden native file input for PC, mobile, and tablet
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Standard product photos
  const standardImages = images.filter(
    (img) => img.type === 'main' || img.type === 'gallery'
  );

  // Set photo as primary
  const handleSetPrimary = (indexToPromote: number) => {
    if (indexToPromote < 0 || indexToPromote >= standardImages.length) return;

    const chosen = standardImages[indexToPromote];
    const remaining = standardImages.filter((_, idx) => idx !== indexToPromote);

    const reordered: LocalProductImageItem[] = [
      { ...chosen, type: 'main', isPrimary: true, position: 0 },
      ...remaining.map((img, idx) => ({
        ...img,
        type: 'gallery' as ProductImageType,
        isPrimary: false,
        position: idx + 1,
      })),
    ];

    const otherImages = images.filter(
      (img) => img.type !== 'main' && img.type !== 'gallery'
    );
    onChange([...reordered, ...otherImages]);
  };

  // Remove photo
  const handleRemoveImage = (indexToRemove: number) => {
    const updated = standardImages.filter((_, idx) => idx !== indexToRemove);

    // If removed photo was primary, make the first remaining photo primary
    if (updated.length > 0) {
      updated[0] = { ...updated[0], type: 'main', isPrimary: true, position: 0 };
      for (let i = 1; i < updated.length; i++) {
        updated[i] = { ...updated[i], type: 'gallery', isPrimary: false, position: i };
      }
    }

    const otherImages = images.filter(
      (img) => img.type !== 'main' && img.type !== 'gallery'
    );
    onChange([...updated, ...otherImages]);
    setErrorMessage(null);
  };

  // Upload handler for files selected from device (mobile, tablet, or PC)
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    if (standardImages.length + files.length > maxImages) {
      setErrorMessage(
        `Limite de até ${maxImages} fotos por anúncio. Você já adicionou ${standardImages.length} foto(s).`
      );
      return;
    }

    // Pre-validate all files
    for (const file of files) {
      const check = validateImageFile(file);
      if (!check.valid) {
        setErrorMessage(check.error || 'Arquivo de imagem inválido. Escolha fotos JPG, JPEG, PNG ou WEBP.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadStatusMessage(`Processando foto(s)...`);

    try {
      const newItems: LocalProductImageItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatusMessage(`Enviando foto (${i + 1}/${files.length})...`);

        const isFirstOverall = standardImages.length === 0 && i === 0;
        const result = await uploadImageToStorage(file, authFetch, {
          type: isFirstOverall ? 'main' : 'gallery',
          position: standardImages.length + i,
        });

        newItems.push({
          url: result.url,
          type: isFirstOverall ? 'main' : 'gallery',
          position: standardImages.length + i,
          isPrimary: isFirstOverall,
        });
      }

      const otherImages = images.filter(
        (img) => img.type !== 'main' && img.type !== 'gallery'
      );
      const updatedStandard = [...standardImages, ...newItems];

      // Ensure the first photo is always marked as primary
      if (updatedStandard.length > 0 && !updatedStandard.some((img) => img.type === 'main')) {
        updatedStandard[0].type = 'main';
        updatedStandard[0].isPrimary = true;
      }

      onChange([...updatedStandard, ...otherImages]);
      setUploadStatusMessage(null);
    } catch (err: any) {
      console.error('Falha no upload da foto:', err);
      setErrorMessage(err.message || 'Erro ao processar foto do dispositivo. Tente novamente.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add image from internet URL
  const handleAddInternetUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUrl = internetUrl.trim();
    if (!cleanUrl) {
      setErrorMessage('Informe a URL da imagem da internet.');
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('/uploads/')) {
      setErrorMessage('URL inválida. O link deve começar com http:// ou https://');
      return;
    }

    if (standardImages.length >= maxImages) {
      setErrorMessage(`Limite de até ${maxImages} fotos atingido.`);
      return;
    }

    const isFirstOverall = standardImages.length === 0;
    const newItem: LocalProductImageItem = {
      url: cleanUrl,
      type: isFirstOverall ? 'main' : 'gallery',
      position: standardImages.length,
      isPrimary: isFirstOverall,
    };

    const otherImages = images.filter(
      (img) => img.type !== 'main' && img.type !== 'gallery'
    );
    const updatedStandard = [...standardImages, newItem];

    onChange([...updatedStandard, ...otherImages]);
    setInternetUrl('');
    setShowUrlInput(false);
  };

  const handleNativeCamera = async () => {
    if (standardImages.length >= maxImages) {
      setErrorMessage(`Limite de até ${maxImages} fotos por anúncio atingido.`);
      return;
    }
    setErrorMessage(null);
    try {
      const res = await nativeBridge.takePhotoWithCamera();
      if (res) {
        nativeBridge.hapticFeedback();
        await handleFilesSelected([res.file]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao capturar foto com a câmera nativa.');
    }
  };

  const handleNativeGallery = async () => {
    if (standardImages.length >= maxImages) {
      setErrorMessage(`Limite de até ${maxImages} fotos por anúncio atingido.`);
      return;
    }
    setErrorMessage(null);
    try {
      const res = await nativeBridge.pickPhotoFromGallery();
      if (res) {
        nativeBridge.hapticFeedback();
        await handleFilesSelected([res.file]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao selecionar foto da galeria nativa.');
    }
  };

  const isNative = nativeBridge.isNative();

  return (
    <div className="space-y-3.5">
      {/* Hidden native file input accepting JPG, JPEG, PNG, WEBP and multiple files */}
      <input
        ref={fileInputRef}
        id="device-photo-file-input"
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesSelected(e.target.files);
          }
        }}
      />

      {/* Header and auxiliary text */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-slate-900">
            Fotos do anúncio <span className="text-rose-500">*</span>
          </label>
          <span className="text-xs font-semibold text-slate-500">
            {standardImages.length} de {maxImages} fotos
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {isNative
            ? 'Tire fotos com a câmera do celular ou selecione da sua galeria.'
            : 'Adicione fotos do seu celular, tablet ou computador. Você também pode usar uma imagem da internet.'}
        </p>
      </div>

      {/* Action buttons: Suporte híbrido Mobile Nativo + Web */}
      <div className="flex flex-wrap items-center gap-2.5">
        {isNative ? (
          <>
            <button
              type="button"
              id="btn-native-camera"
              onClick={handleNativeCamera}
              disabled={isUploading || standardImages.length >= maxImages}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-white" />
              <span>📷 Tirar Foto (Câmera)</span>
            </button>

            <button
              type="button"
              id="btn-native-gallery"
              onClick={handleNativeGallery}
              disabled={isUploading || standardImages.length >= maxImages}
              className="px-4 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-sky-400" />
              <span>🖼️ Escolher da Galeria</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            id="btn-choose-device-photos"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || standardImages.length >= maxImages}
            className="px-4 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>📷 Escolher fotos do dispositivo</span>
          </button>
        )}

        <button
          type="button"
          id="btn-use-internet-photo"
          onClick={() => {
            setShowUrlInput(!showUrlInput);
            setErrorMessage(null);
          }}
          disabled={isUploading || standardImages.length >= maxImages}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition active:scale-[0.99] disabled:opacity-50 cursor-pointer ${
            showUrlInput
              ? 'bg-sky-50 border-sky-300 text-sky-800'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs'
          }`}
        >
          <Globe className="w-4 h-4 text-sky-600" />
          <span>🌐 Usar imagem da internet</span>
        </button>
      </div>

      {/* Internet URL Input Area (Optional, displayed when requested) */}
      {showUrlInput && (
        <form
          onSubmit={handleAddInternetUrl}
          className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150"
        >
          <label className="block text-xs font-bold text-slate-700">
            Cole o link direto da imagem (URL)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="internet-photo-url-input"
              type="url"
              value={internetUrl}
              onChange={(e) => setInternetUrl(e.target.value)}
              placeholder="https://exemplo.com/foto.jpg"
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              id="btn-confirm-internet-photo"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs transition shadow-xs cursor-pointer shrink-0"
            >
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="px-3 py-2 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Uploading Status Progress */}
      {uploadStatusMessage && (
        <div
          id="upload-status-indicator"
          className="flex items-center gap-2 p-3 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs font-semibold"
        >
          <RefreshCw className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
          <span>{uploadStatusMessage}</span>
        </div>
      )}

      {/* Error Feedback */}
      {errorMessage && (
        <div
          id="upload-error-indicator"
          className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 text-xs font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* MINIATURAS DAS FOTOS SELECIONADAS ANTES DA PUBLICAÇÃO */}
      {standardImages.length > 0 && (
        <div className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {standardImages.map((img, index) => {
              const isMain = img.type === 'main' || img.isPrimary || index === 0;

              return (
                <div
                  key={img.url + index}
                  id={`photo-thumbnail-${index}`}
                  className={`relative group bg-white rounded-xl border p-2 shadow-2xs transition flex flex-col justify-between ${
                    isMain ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Photo container with preview */}
                  <div className="relative aspect-square w-full bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={img.url}
                      alt={`Foto do anúncio ${index + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />

                    {/* Botão/remover “×” */}
                    <button
                      type="button"
                      id={`btn-remove-photo-${index}`}
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center text-xs font-bold transition shadow-xs z-10 cursor-pointer"
                      title="Remover foto"
                    >
                      ×
                    </button>

                    {/* Indicação da foto principal */}
                    {isMain && (
                      <div
                        id="primary-photo-badge"
                        className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1 z-10"
                      >
                        <Star className="w-3 h-3 fill-white text-white" />
                        <span>Principal</span>
                      </div>
                    )}
                  </div>

                  {/* Possibilidade de selecionar qual será a foto principal */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                    {isMain ? (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Foto Principal
                      </span>
                    ) : (
                      <button
                        type="button"
                        id={`btn-set-primary-${index}`}
                        onClick={() => handleSetPrimary(index)}
                        className="w-full py-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 hover:border-emerald-300 transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Definir como foto principal do anúncio"
                      >
                        <Star className="w-3.5 h-3.5 text-slate-400" />
                        <span>Definir como principal</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImageUploader;
