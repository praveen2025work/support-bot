"use client";

import { useState, useRef, type DragEvent, type ReactNode } from "react";
import { Upload } from "lucide-react";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".pdf", ".docx", ".doc"];
const MAX_SIZE_MB = 10;

interface FileDropZoneProps {
  onFileDrop: (file: File) => void;
  disabled?: boolean;
  children: ReactNode;
}

export function FileDropZone({
  onFileDrop,
  disabled,
  children,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const isAccepted = (file: File): boolean => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    return (
      ACCEPTED_EXTENSIONS.includes(ext) &&
      file.size <= MAX_SIZE_MB * 1024 * 1024
    );
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    if (file && isAccepted(file)) {
      onFileDrop(file);
    }
  };

  return (
    <div
      className="relative h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && !disabled && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-50/90 border-2 border-dashed border-blue-400 rounded-xl backdrop-blur-sm">
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto text-blue-500 mb-3" />
            <p className="text-lg font-semibold text-blue-700">
              Drop file to analyze
            </p>
            <p className="text-sm text-blue-500 mt-1">
              CSV, Excel, PDF, or Word — up to {MAX_SIZE_MB}MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
