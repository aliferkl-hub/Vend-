import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Image as ImageIcon,
  Trash2,
  Star,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Tablet,
  Smartphone,
  X,
  Plus,
  Layers,
} from 'lucide-react';
import { ProductImage, ProductImageType } from '../types.ts';
import { uploadImageToStorage } from '../utils/imageOptimizer.ts';
import { useAuth } from '../context/AuthContext.tsx';

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

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeviceOptimization, setShowDeviceOptimization] = useState(false);

  // Lightbox Modal state
  const [previewZoomUrl, setPreviewZoomUrl] = useState<string | null>(null);

  // Hidden inputs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const replaceIndexRef = useRef<number | null>(null);

  // Device-specific hidden inputs
  const desktopInputRef = useRef<HTMLInputElement | null>(null);
  const tabletInputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  // Separate regular gallery/main images from device-specific images
  const standardImages = images.filter(
    (img) => img.type === 'main' || img.type === 'gallery'
  );
  const desktopImage = images.find((img) => img.type === 'desktop');
  const tabletImage = images.find((img) => img.type === 'tablet');
  const mobileImage = images.find((img) => img.type === 'mobile');

  const showStatus = (msg: string) => {
    setUploadStatusMessage(msg);
    setTimeout(() => {
      setUploadStatusMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Upload handler for one or multiple files
  const handleFilesUpload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    if (standardImages.length + files.length > maxImages) {
      setErrorMessage(
        `Limite de até ${maxImages} fotos por produto. Você já tem ${standardImages.length} foto(s).`
      );
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadStatusMessage('Enviando foto...');

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

      // Merge with non-standard images (device-specific ones)
      const otherImages = images.filter(
        (img) => img.type !== 'main' && img.type !== 'gallery'
      );
      const updatedStandard = [...standardImages, ...newItems];

      // Guarantee first image is 'main'
      if (updatedStandard.length > 0 && !updatedStandard.some((img) => img.type === 'main')) {
        updatedStandard[0].type = 'main';
        updatedStandard[0].isPrimary = true;
      }

      onChange([...updatedStandard, ...otherImages]);
      showStatus('Foto adicionada com sucesso.');
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMessage(err.message || 'Erro ao enviar foto. Tente novamente.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  // Set photo as primary
  const handleSetPrimary = (indexToPromote: number) => {
    const item = standardImages[indexToPromote];
    if (!item) return;

    const remaining = standardImages.filter((_, idx) => idx !== indexToPromote);
    const reordered = [
      { ...item, type: 'main' as const, isPrimary: true, position: 0 },
      ...remaining.map((img, idx) => ({
        ...img,
        type: 'gallery' as const,
        isPrimary: false,
        position: idx + 1,
      })),
    ];

    const otherImages = images.filter(
      (img) => img.type !== 'main' && img.type !== 'gallery'
    );
    onChange([...reordered, ...otherImages]);
    showStatus('Foto principal atualizada!');
  };

  // Move left / right
  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= standardImages.length) return;

    const copy = [...standardImages];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    // First one remains or becomes 'main'
    const updated = copy.map((img, idx) => ({
      ...img,
      type: idx === 0 ? ('main' as const) : ('gallery' as const),
      isPrimary: idx === 0,
      position: idx,
    }));

    const otherImages = images.filter(
      (img) => img.type !== 'main' && img.type !== 'gallery'
    );
    onChange([...updated, ...otherImages]);
  };

  // Delete individual image (Non-destructive: deletes photo, keeps product intact)
  const handleDeleteImage = (indexToDelete: number) => {
    const updated = standardImages.filter((_, idx) => idx !== indexToDelete);

    // If we deleted the primary, promote the first remaining
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
    showStatus('Foto removida.');
  };

  // Replace photo at index
  const triggerReplace = (index: number) => {
    replaceIndexRef.current = index;
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const index = replaceIndexRef.current;
    if (!file || index === null || index < 0 || index >= standardImages.length) return;

    setIsUploading(true);
    setErrorMessage(null);
    setUploadStatusMessage('Substituindo foto...');

    try {
      const isMain = index === 0;
      const result = await uploadImageToStorage(file, authFetch, {
        type: isMain ? 'main' : 'gallery',
        position: index,
      });

      const updated = [...standardImages];
      updated[index] = {
        ...updated[index],
        url: result.url,
        type: isMain ? 'main' : 'gallery',
        isPrimary: isMain,
      };

      const otherImages = images.filter(
        (img) => img.type !== 'main' && img.type !== 'gallery'
      );
      onChange([...updated, ...otherImages]);
      showStatus('Foto substituída com sucesso.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao substituir foto.');
    } finally {
      setIsUploading(false);
      replaceIndexRef.current = null;
    }
  };

  // Device-specific image upload handler (Desktop, Tablet, Mobile)
  const handleDeviceImageUpload = async (
    deviceType: 'desktop' | 'tablet' | 'mobile',
    file: File
  ) => {
    setIsUploading(true);
    setErrorMessage(null);
    setUploadStatusMessage(`Enviando foto para ${deviceType}...`);

    try {
      const result = await uploadImageToStorage(file, authFetch, {
        type: deviceType,
        position: 99,
      });

      // Filter out any existing image of this deviceType
      const filtered = images.filter((img) => img.type !== deviceType);
      onChange([
        ...filtered,
        {
          url: result.url,
          type: deviceType,
          position: 99,
          isPrimary: false,
        },
      ]);
      showStatus(`Foto para ${deviceType} salva com sucesso.`);
    } catch (err: any) {
      setErrorMessage(err.message || `Erro ao enviar foto para ${deviceType}.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDeviceImage = (deviceType: 'desktop' | 'tablet' | 'mobile') => {
    const filtered = images.filter((img) => img.type !== deviceType);
    onChange(filtered);
    showStatus(`Foto específica para ${deviceType} removida. Usando foto principal.`);
  };

  return (
    <div id="product-photo-uploader-section" className="space-y-6">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFilesUpload(e.target.files);
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFilesUpload(e.target.files);
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleReplaceFile}
      />

      {/* Hidden device-specific inputs */}
      <input
        ref={desktopInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleDeviceImageUpload('desktop', e.target.files[0]);
        }}
      />
      <input
        ref={tabletInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleDeviceImageUpload('tablet', e.target.files[0]);
        }}
      />
      <input
        ref={mobileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleDeviceImageUpload('mobile', e.target.files[0]);
        }}
      />

      {/* Header section */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-slate-900">
            Fotos do Produto <span className="text-rose-500">*</span>
          </label>
          <span className="text-xs font-semibold text-slate-500">
            {standardImages.length} de {maxImages} fotos
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Adicione fotos reais do seu produto. A primeira foto será a principal exibida na vitrine do marketplace.
        </p>
      </div>

      {/* Status messages */}
      {uploadStatusMessage && (
        <div
          id="upload-status-indicator"
          className="flex items-center gap-2 p-3 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs font-semibold animate-pulse"
        >
          {isUploading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          {uploadStatusMessage}
        </div>
      )}

      {errorMessage && (
        <div
          id="upload-error-indicator"
          className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* DRAG AND DROP / UPLOAD TRIGGER AREA */}
      {standardImages.length < maxImages && (
        <div
          id="photo-upload-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-sky-500 bg-sky-50/70 scale-[1.01]'
              : 'border-slate-300 hover:border-sky-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-sky-600 mb-3 group-hover:scale-110 transition-transform">
              <Camera className="w-7 h-7" />
            </div>

            <h4 className="text-sm font-bold text-slate-900">
              ADICIONAR FOTOS
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              Arraste as imagens aqui ou clique para selecionar do seu dispositivo
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Aceita JPG, JPEG, PNG e WEBP • Até 10 fotos por produto
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                id="btn-add-photos-native"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                + ADICIONAR FOTOS
              </button>

              {/* Mobile direct camera capture button */}
              <button
                type="button"
                id="btn-camera-capture"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                Tirar Foto com Câmera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEWS AND MANAGEMENT */}
      {standardImages.length > 0 && (
        <div className="space-y-4">
          {/* Main Photo Card */}
          <div
            id="main-product-photo-card"
            className="bg-white rounded-2xl border-2 border-emerald-500/40 p-4 shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider border border-emerald-200">
                  <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                  FOTO PRINCIPAL (Vitrine)
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Esta foto aparece primeiro nas buscas e no catálogo
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewZoomUrl(standardImages[0].url)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  title="Visualizar foto ampliada"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => triggerReplace(0)}
                  className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition"
                  title="Substituir foto principal"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteImage(0)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Excluir foto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main photo image display with guaranteed aspect ratio & no distortion */}
            <div className="relative w-full h-64 sm:h-72 bg-slate-900/5 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
              <img
                src={standardImages[0].url}
                alt="Foto principal do produto"
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Additional Photos Grid */}
          {standardImages.length > 1 && (
            <div>
              <h5 className="text-xs font-bold text-slate-800 mb-2.5">
                OUTRAS FOTOS ({standardImages.length - 1})
              </h5>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {standardImages.slice(1).map((img, sliceIdx) => {
                  const actualIdx = sliceIdx + 1;
                  return (
                    <div
                      key={img.url + actualIdx}
                      id={`photo-thumbnail-${actualIdx}`}
                      className="group bg-white rounded-xl border border-slate-200 p-2 shadow-2xs hover:shadow-xs transition relative flex flex-col justify-between"
                    >
                      {/* Photo box */}
                      <div className="relative aspect-square w-full bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                        <img
                          src={img.url}
                          alt={`Foto ${actualIdx + 1}`}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />

                        {/* Order badge */}
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/70 text-white text-[10px] font-bold">
                          Foto {actualIdx + 1}
                        </span>
                      </div>

                      {/* Controls toolbar */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-slate-600">
                        {/* Make primary */}
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(actualIdx)}
                          className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded transition text-[11px] font-semibold flex items-center gap-1"
                          title="Definir como foto principal"
                        >
                          <Star className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-600" />
                          <span className="hidden xs:inline text-[10px]">Principal</span>
                        </button>

                        <div className="flex items-center gap-0.5">
                          {/* Move left */}
                          <button
                            type="button"
                            onClick={() => handleMove(actualIdx, 'left')}
                            className="p-1 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                            title="Mover para esquerda"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          {/* Move right */}
                          <button
                            type="button"
                            disabled={actualIdx === standardImages.length - 1}
                            onClick={() => handleMove(actualIdx, 'right')}
                            className="p-1 hover:text-slate-900 hover:bg-slate-100 rounded transition disabled:opacity-30"
                            title="Mover para direita"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Zoom */}
                          <button
                            type="button"
                            onClick={() => setPreviewZoomUrl(img.url)}
                            className="p-1 hover:text-sky-600 hover:bg-sky-50 rounded transition"
                            title="Visualizar em tamanho maior"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete individual photo */}
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(actualIdx)}
                            className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Excluir foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: DEVICE SPECIFIC OPTIMIZATION (DESKTOP, TABLET, MOBILE) */}
      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
        <button
          type="button"
          onClick={() => setShowDeviceOptimization(!showDeviceOptimization)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-800">
              OTIMIZAÇÃO POR DISPOSITIVO (Opcional)
            </span>
          </div>
          <span className="text-[11px] font-semibold text-sky-600">
            {showDeviceOptimization ? 'Ocultar opções' : 'Configurar fotos por tela'}
          </span>
        </button>

        <p className="text-[11px] text-slate-500">
          Você pode enviar fotos com enquadramento específico para PC, Tablet ou Celular.
          Se nenhuma versão for enviada, o VEND+ utilizará automaticamente a foto principal como fallback perfeito.
        </p>

        {showDeviceOptimization && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* Desktop / PC */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                    PC / Desktop
                  </span>
                  {desktopImage ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">Fallback</span>
                  )}
                </div>

                {desktopImage ? (
                  <div className="relative aspect-video w-full bg-slate-100 rounded-lg overflow-hidden my-2">
                    <img
                      src={desktopImage.url}
                      alt="Desktop"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="h-16 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[11px] text-slate-400 my-2">
                    Usa Foto Principal
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-1.5">
                {desktopImage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => desktopInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                    >
                      Substituir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeviceImage('desktop')}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => desktopInputRef.current?.click()}
                    className="w-full py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                  >
                    + Foto Desktop
                  </button>
                )}
              </div>
            </div>

            {/* Tablet */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Tablet className="w-3.5 h-3.5 text-sky-600" />
                    Tablet
                  </span>
                  {tabletImage ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">Fallback</span>
                  )}
                </div>

                {tabletImage ? (
                  <div className="relative aspect-video w-full bg-slate-100 rounded-lg overflow-hidden my-2">
                    <img
                      src={tabletImage.url}
                      alt="Tablet"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="h-16 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[11px] text-slate-400 my-2">
                    Usa Foto Principal
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-1.5">
                {tabletImage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => tabletInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                    >
                      Substituir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeviceImage('tablet')}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => tabletInputRef.current?.click()}
                    className="w-full py-1.5 text-xs font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition"
                  >
                    + Foto Tablet
                  </button>
                )}
              </div>
            </div>

            {/* Mobile / Celular */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    Celular / Mobile
                  </span>
                  {mobileImage ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">Fallback</span>
                  )}
                </div>

                {mobileImage ? (
                  <div className="relative aspect-video w-full bg-slate-100 rounded-lg overflow-hidden my-2">
                    <img
                      src={mobileImage.url}
                      alt="Mobile"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="h-16 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[11px] text-slate-400 my-2">
                    Usa Foto Principal
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-1.5">
                {mobileImage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => mobileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                    >
                      Substituir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeviceImage('mobile')}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => mobileInputRef.current?.click()}
                    className="w-full py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                  >
                    + Foto Celular
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {previewZoomUrl && (
        <div
          id="photo-lightbox-modal"
          onClick={() => setPreviewZoomUrl(null)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewZoomUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2 rounded-full bg-white/10"
              title="Fechar"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={previewZoomUrl}
              alt="Visualização ampliada"
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
