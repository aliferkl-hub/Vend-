import React, { useState } from 'react';
import { Product, ProductImage } from '../types.ts';

interface ResponsiveProductImageProps {
  product?: Product;
  images?: Array<{ url?: string; imageUrl?: string; type?: string; isPrimary?: boolean }>;
  src?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  deviceImages?: {
    desktop?: string;
    tablet?: string;
    mobile?: string;
  };
  objectFit?: 'cover' | 'contain';
  fallbackSrc?: string;
  onClick?: () => void;
}

const DEFAULT_FALLBACK_IMAGE = '/product-image-unavailable.svg';

export const ResponsiveProductImage: React.FC<ResponsiveProductImageProps> = ({
  product,
  images,
  src,
  alt,
  className = '',
  containerClassName = '',
  deviceImages,
  objectFit = 'cover',
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);

  // Combine image sources
  const allImages = images || product?.productImages || product?.images || [];

  // Find device-specific images
  const desktopSource =
    deviceImages?.desktop ||
    allImages.find((img) => img.type === 'desktop')?.url ||
    allImages.find((img) => img.type === 'desktop')?.imageUrl ||
    null;

  const tabletSource =
    deviceImages?.tablet ||
    allImages.find((img) => img.type === 'tablet')?.url ||
    allImages.find((img) => img.type === 'tablet')?.imageUrl ||
    null;

  const mobileSource =
    deviceImages?.mobile ||
    allImages.find((img) => img.type === 'mobile')?.url ||
    allImages.find((img) => img.type === 'mobile')?.imageUrl ||
    null;

  // Primary or main image
  const primarySource =
    product?.imageUrl ||
    src ||
    allImages.find((img) => img.type === 'main' || img.isPrimary)?.url ||
    allImages.find((img) => img.type === 'main' || img.isPrimary)?.imageUrl ||
    allImages[0]?.url ||
    allImages[0]?.imageUrl ||
    fallbackSrc;

  const fitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <div
      className={`relative overflow-hidden ${containerClassName}`}
      onClick={onClick}
    >
      <picture className="w-full h-full block">
        {/* Desktop / Notebook breakpoint: >= 1024px */}
        {desktopSource && (
          <source media="(min-width: 1024px)" srcSet={desktopSource} />
        )}

        {/* Tablet breakpoint: >= 640px */}
        {tabletSource && (
          <source media="(min-width: 640px)" srcSet={tabletSource} />
        )}

        {/* Mobile breakpoint or default fallback */}
        <img
          src={hasError ? fallbackSrc : (mobileSource || primarySource)}
          alt={alt || 'Foto do produto'}
          className={`w-full h-full ${fitClass} object-center transition-transform duration-300 ${className}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (!hasError) setHasError(true);
          }}
        />
      </picture>
    </div>
  );
};
