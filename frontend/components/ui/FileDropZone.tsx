'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/LanguageContext';

interface FileDropZoneProps {
  onFileLoad: (data: unknown, fileName: string) => void;
  accept?: string;
  label?: string;
  description?: string;
}

export default function FileDropZone({
  onFileLoad,
  accept = '.json',
  label,
  description,
}: FileDropZoneProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      setFileName(file.name);

      if (!file.name.endsWith('.json')) {
        setError(t('fileDropZone.errors.selectJson'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          onFileLoad(data, file.name);
        } catch {
          setError(t('fileDropZone.errors.invalidJson'));
          setFileName(null);
        }
      };
      reader.onerror = () => {
        setError(t('fileDropZone.errors.readFailed'));
        setFileName(null);
      };
      reader.readAsText(file);
    },
    [onFileLoad, t]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
        ${error ? 'border-red-300 bg-red-50' : ''}
        ${fileName && !error ? 'border-green-300 bg-green-50' : ''}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="text-4xl mb-3">
        {error ? '!' : fileName ? '.' : '.'}
      </div>

      {fileName && !error ? (
        <div>
          <p className="font-medium text-green-700">{fileName}</p>
          <p className="text-sm text-green-600 mt-1">{t('fileDropZone.success')}</p>
        </div>
      ) : error ? (
        <div>
          <p className="font-medium text-red-700">{error}</p>
          <p className="text-sm text-red-600 mt-1">{t('fileDropZone.retry')}</p>
        </div>
      ) : (
        <div>
          <p className="font-medium text-gray-700">{label || t('fileDropZone.defaultLabel')}</p>
          <p className="text-sm text-gray-500 mt-1">{description || t('fileDropZone.defaultDescription')}</p>
        </div>
      )}
    </div>
  );
}
