import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { Eye, EyeOff, Download, ChevronLeft, ChevronRight, Layers, FileImage } from 'lucide-react';

/**
 * AnnotatedImageCanvas
 * Renders an uploaded answer sheet image onto an HTML Canvas.
 * Overlays red ellipses/circles around mistake regions with question number markers.
 */
const AnnotatedImageCanvas = forwardRef(function AnnotatedImageCanvas(
  {
    answerImages = [],
    evaluations = [],
    activeQuestionIndex = 0
  },
  ref
) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // Gather regions for current page (1-based index matching currentPageIndex + 1)
  const regionsForPage = React.useMemo(() => {
    if (!evaluations || evaluations.length === 0) return [];

    const list = [];
    evaluations.forEach((qEval, qIdx) => {
      const qNum = qEval.question_number || `Q${qIdx + 1}`;
      if (Array.isArray(qEval.regions)) {
        qEval.regions.forEach((r, rIdx) => {
          // If region page matches current selected page (1-based)
          const targetPage = r.page ? parseInt(r.page, 10) : 1;
          if (targetPage === currentPageIndex + 1) {
            list.push({
              ...r,
              questionNumber: qNum,
              questionIndex: qIdx,
              regionIndex: rIdx
            });
          }
        });
      }
    });

    return list;
  }, [evaluations, currentPageIndex]);

  const currentImage = answerImages[currentPageIndex] || null;

  // Main Draw Function
  const renderCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage || !currentImage.data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentImage.data;

    img.onload = () => {
      // Set canvas size to natural image size for crisp rendering & export
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 1000;
      setNaturalSize({ width: canvas.width, height: canvas.height });
      setImageLoaded(true);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Original Image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // If annotations are toggled OFF, stop here
      if (!showAnnotations) return;

      // 2. Draw Red Circle Annotations & Question Number Badges
      regionsForPage.forEach((r) => {
        // Safe check coordinates
        const x = parseFloat(r.x);
        const y = parseFloat(r.y);
        const w = parseFloat(r.width);
        const h = parseFloat(r.height);

        if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) {
          return; // Skip invalid coordinates safely
        }

        // Convert normalized [0, 1] ratios to canvas pixel coordinates
        const rectX = x * canvas.width;
        const rectY = y * canvas.height;
        const rectW = Math.max(w * canvas.width, 24);
        const rectH = Math.max(h * canvas.height, 24);

        const centerX = rectX + rectW / 2;
        const centerY = rectY + rectH / 2;
        const radiusX = Math.max(rectW / 2, 20);
        const radiusY = Math.max(rectH / 2, 20);

        ctx.save();

        // Semi-transparent red highlight fill inside circle
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(225, 29, 72, 0.15)';
        ctx.fill();

        // Solid Red Ellipse Stroke Outline
        ctx.lineWidth = Math.max(3, Math.round(canvas.width / 350));
        ctx.strokeStyle = '#e11d48'; // Rose-600 red
        ctx.setLineDash([]);
        ctx.stroke();

        // 3. Red Marker Number Badge (Question Number / Item Label)
        const badgeLabel = String(r.questionNumber || 'Q1');
        const badgeFontScale = Math.max(14, Math.round(canvas.width / 45));
        ctx.font = `bold ${badgeFontScale}px sans-serif, system-ui`;

        const textMetrics = ctx.measureText(badgeLabel);
        const paddingX = Math.round(badgeFontScale * 0.4);
        const paddingY = Math.round(badgeFontScale * 0.3);
        const badgeW = textMetrics.width + paddingX * 2;
        const badgeH = badgeFontScale + paddingY;

        // Position badge near top-left of ellipse
        let badgeX = centerX - radiusX;
        let badgeY = centerY - radiusY - badgeH * 0.5;

        // Constrain within canvas boundaries
        badgeX = Math.max(5, Math.min(canvas.width - badgeW - 5, badgeX));
        badgeY = Math.max(5, Math.min(canvas.height - badgeH - 5, badgeY));

        // Draw Badge Background Pill
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fillStyle = '#e11d48';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Badge Text (White)
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeLabel, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);

        ctx.restore();
      });
    };
  }, [currentImage, showAnnotations, regionsForPage]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle Download Image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `evaluated_answer_page_${currentPageIndex + 1}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download annotated canvas image:', err);
    }
  };

  if (!answerImages || answerImages.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 text-white overflow-hidden shadow-xl space-y-0">
      {/* Viewer Header / Toolbar */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        
        {/* Title & Page Info */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <FileImage className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Annotated Answer Sheet View
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                {regionsForPage.length} Highlighted Mistakes
              </span>
            </div>
            {answerImages.length > 1 && (
              <p className="text-[11px] text-slate-400">
                Page {currentPageIndex + 1} of {answerImages.length}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          
          {/* Show/Hide Annotations Toggle */}
          <button
            type="button"
            onClick={() => setShowAnnotations((prev) => !prev)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              showAnnotations
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Toggle red circle mistake overlays"
          >
            {showAnnotations ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>{showAnnotations ? 'Hide Annotations' : 'Show Annotations'}</span>
          </button>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all border border-indigo-400/30"
            title="Export annotated image as PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Annotated Sheet</span>
          </button>

        </div>
      </div>

      {/* Pagination Controls if multi-page */}
      {answerImages.length > 1 && (
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            {answerImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentPageIndex(idx)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                  currentPageIndex === idx
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Page {idx + 1}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              disabled={currentPageIndex === 0}
              onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPageIndex === answerImages.length - 1}
              onClick={() => setCurrentPageIndex((prev) => Math.min(answerImages.length - 1, prev + 1))}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Canvas Image Render Container */}
      <div
        ref={containerRef}
        className="p-4 flex flex-col items-center justify-center bg-slate-950/80 min-h-[300px] overflow-x-auto relative"
      >
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto rounded-lg border border-slate-800 shadow-2xl transition-opacity duration-200"
          style={{ maxHeight: '75vh' }}
        />

        {/* Regions Legend Below Canvas */}
        {showAnnotations && regionsForPage.length > 0 && (
          <div className="mt-4 w-full max-w-2xl bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-rose-400">
              <Layers className="w-3.5 h-3.5" />
              <span>Mistakes Circled on Page {currentPageIndex + 1}</span>
            </div>
            <div className="space-y-1.5">
              {regionsForPage.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2 text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-300"
                >
                  <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono font-bold text-[10px] shrink-0 mt-0.5">
                    {r.questionNumber}
                  </span>
                  <div className="flex-1">
                    <span className="font-semibold text-rose-300 mr-1.5 capitalize font-mono text-[11px]">
                      [{r.type}]:
                    </span>
                    <span className="text-slate-200">{r.note || 'Identified mistake location'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
});

export default AnnotatedImageCanvas;
