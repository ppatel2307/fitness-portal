/**
 * Image placeholder component
 * Displays placeholder for images that can be uploaded later
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon, User, Camera } from 'lucide-react';

interface ImagePlaceholderProps {
  type?: 'banner' | 'profile' | 'progress';
  className?: string;
  aspectRatio?: string;
  imageUrl?: string;
}

export function ImagePlaceholder({
  type = 'banner',
  className,
  aspectRatio,
  imageUrl,
}: ImagePlaceholderProps) {
  const Icon = type === 'profile' ? User : type === 'progress' ? Camera : ImageIcon;

  const defaultAspectRatios = {
    banner: 'aspect-[3/1]',
    profile: 'aspect-square',
    progress: 'aspect-[4/5]',
  };

  if (imageUrl) {
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-surface rounded-lg',
          aspectRatio || defaultAspectRatios[type],
          type === 'profile' && 'rounded-full',
          className
        )}
      >
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface border-2 border-dashed border-border rounded-lg',
        'flex flex-col items-center justify-center',
        aspectRatio || defaultAspectRatios[type],
        type === 'profile' && 'rounded-full',
        className
      )}
    >
      <Icon className="w-8 h-8 text-text-muted mb-2" />
      <span className="text-xs text-text-muted">
        {type === 'banner' && 'Banner image'}
        {type === 'profile' && 'Profile photo'}
        {type === 'progress' && 'Progress photo'}
      </span>
    </div>
  );
}
