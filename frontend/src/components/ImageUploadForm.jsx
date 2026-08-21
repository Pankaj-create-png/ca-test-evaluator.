import React, { useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, Plus, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ImageUploadForm({
  questionImages,
  onQuestionImagesChange,
  answerImages,
  onAnswerImagesChange,
  isLoading
}) {
  const qInputRef = useRef(null);
  const aInputRef = useRef(null);

  const processFiles = async (files, setImagesState) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const newItems = await Promise.all(
      fileList.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              mimeType: file.type || 'image/jpeg',
              data: e.target.result
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    setImagesState((prev) => [...prev, ...newItems]);
  };

  const handleQFileChange = (e) => {
    if (e.target.files) {
      processFiles(e.target.files, onQuestionImagesChange);
      e.target.value = '';
    }
  };

  const handleAFileChange = (e) => {
    if (e.target.files) {
      processFiles(e.target.files, onAnswerImagesChange);
      e.target.value = '';
    }
  };

  const handleDrop = (e, setImagesState) => {
    e.preventDefault();
    if (isLoading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files, setImagesState);
    }
  };

  const handleRemoveQImage = (id) => {
    onQuestionImagesChange((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRemoveAImage = (id) => {
    onAnswerImagesChange((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Question Paper Image Upload */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Question Paper Image(s)
            </h3>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
              Optional if text typed below
            </span>
          </div>
          {questionImages.length > 0 && (
            <button
              type="button"
              onClick={() => onQuestionImagesChange([])}
              disabled={isLoading}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
            >
              Clear All ({questionImages.length})
            </button>
          )}
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, onQuestionImagesChange)}
          onClick={() => !isLoading && qInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white rounded-xl p-4 text-center cursor-pointer transition-all hover:shadow-sm group"
        >
          <input
            ref={qInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleQFileChange}
            disabled={isLoading}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-1.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 group-hover:scale-110 rounded-xl transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              Click or drag question paper image(s) here
            </p>
            <p className="text-[11px] text-slate-400">
              Supports JPEG, PNG, WEBP (Multiple pages supported)
            </p>
          </div>
        </div>

        {/* Previews List */}
        {questionImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {questionImages.map((img, index) => (
              <div key={img.id} className="relative group bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <img
                  src={img.data}
                  alt={`Question Page ${index + 1}`}
                  className="w-full h-24 object-cover"
                />
                <div className="absolute top-1 left-1 bg-slate-900/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                  Q-Page {index + 1}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveQImage(img.id);
                  }}
                  disabled={isLoading}
                  className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-md opacity-90 group-hover:opacity-100 transition-opacity hover:bg-rose-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Handwritten Answer Sheet Upload */}
      <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
              Student Handwritten Answer Sheet Image(s) *
            </h3>
            <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
              Required
            </span>
          </div>
          {answerImages.length > 0 && (
            <button
              type="button"
              onClick={() => onAnswerImagesChange([])}
              disabled={isLoading}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
            >
              Clear All ({answerImages.length})
            </button>
          )}
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, onAnswerImagesChange)}
          onClick={() => !isLoading && aInputRef.current?.click()}
          className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white rounded-xl p-5 text-center cursor-pointer transition-all hover:shadow-md group"
        >
          <input
            ref={aInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleAFileChange}
            disabled={isLoading}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 bg-indigo-100 text-indigo-700 group-hover:scale-110 rounded-2xl transition-transform">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">
                Click or drag handwritten answer sheet pages here
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload images in page order (Page 1, Page 2...). Multimodal Gemini will evaluate handwriting.
              </p>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" />
              <span>Browse Images / Photos</span>
            </div>
          </div>
        </div>

        {/* Answer Sheet Previews */}
        {answerImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {answerImages.map((img, index) => (
              <div key={img.id} className="relative group bg-white border border-indigo-200 rounded-xl overflow-hidden shadow-sm">
                <img
                  src={img.data}
                  alt={`Answer Sheet Page ${index + 1}`}
                  className="w-full h-28 object-cover"
                />
                <div className="absolute top-1.5 left-1.5 bg-indigo-950/90 text-amber-300 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md shadow-xs flex items-center space-x-1">
                  <span>Page {index + 1}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAImage(img.id);
                  }}
                  disabled={isLoading}
                  className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg opacity-90 group-hover:opacity-100 transition-opacity hover:bg-rose-700 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Upload at least 1 image of the student's handwritten answer to proceed.</span>
          </div>
        )}
      </div>

    </div>
  );
}
