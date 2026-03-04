"use client";

import { useRef, useState } from "react";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_SIZE_LABEL = "2MB";

interface ImageFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
  label?: string;
}

export function ImageField({ images, onChange, label }: ImageFieldProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setWarning("נא לבחור קובץ תמונה בלבד.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setWarning(`גודל מקסימלי ${MAX_SIZE_LABEL}. הקובץ שנבחר גדול מדי.`);
      return;
    }
    setWarning(null);
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      onChange([...images, data]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const remove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {label && <span className="text-sm text-gray-600 block">{label}</span>}
      {warning && (
        <p className="text-amber-600 text-sm bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
          {warning}
        </p>
      )}
      <p className="text-xs text-gray-500">תמונות נשמרות מקומית (עד {MAX_SIZE_LABEL} לתמונה).</p>
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative group">
            <button
              type="button"
              onClick={() => setPreview(src)}
              className="block w-16 h-16 rounded border border-gray-300 overflow-hidden bg-gray-100"
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-0 left-0 w-6 h-6 bg-red-500 text-white text-xs rounded-br opacity-0 group-hover:opacity-100 transition"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-16 h-16 rounded border border-dashed border-gray-400 flex items-center justify-center text-gray-500 hover:bg-gray-50"
        >
          +
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt="תצוגה מקדימה"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
