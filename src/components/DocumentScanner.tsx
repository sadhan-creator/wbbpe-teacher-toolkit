import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';

type ScannerFilter = 'original' | 'bw' | 'magic' | 'grayscale';

interface ScannedPage {
  id: string;
  originalDataUrl: string;
  processedDataUrl: string;
  filter: ScannerFilter;
  rotation: number;
}

export default function DocumentScanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const newPage: ScannedPage = {
      id: Date.now().toString(),
      originalDataUrl: url,
      processedDataUrl: url,
      filter: 'original',
      rotation: 0
    };

    setPages((prev) => [...prev, newPage]);
    setCurrentPageIndex(pages.length);
    e.target.value = ''; // reset input
  };

  useEffect(() => {
    if (currentPageIndex >= 0 && pages[currentPageIndex]) {
      applyProcessing(currentPageIndex);
    }
  }, [pages[currentPageIndex]?.filter, pages[currentPageIndex]?.rotation]);

  const applyProcessing = (index: number) => {
    const page = pages[index];
    if (!page) return;

    setIsProcessing(true);

    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      
      // Auto-scale down huge images to prevent canvas memory crash
      const MAX_DIM = 2000;
      if (w > MAX_DIM || h > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.floor(w * ratio);
        h = Math.floor(h * ratio);
      }

      const isRotated = page.rotation === 90 || page.rotation === 270;
      const canvasW = isRotated ? h : w;
      const canvasH = isRotated ? w : h;

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.save();
      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.rotate((page.rotation * Math.PI) / 180);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();

      if (page.filter !== 'original') {
        const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
        const data = imageData.data;

        if (page.filter === 'bw') {
          for (let i = 0; i < data.length; i += 4) {
            const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            // threshold
            const val = brightness > 130 ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = val;
          }
        } else if (page.filter === 'magic') {
          for (let i = 0; i < data.length; i += 4) {
            // High contrast and remove yellow tint
            let r = data[i], g = data[i + 1], b = data[i + 2];
            const avg = (r + g + b) / 3;
            // enhance contrast
            r = r > 128 ? r + (255 - r) * 0.5 : r * 0.5;
            g = g > 128 ? g + (255 - g) * 0.5 : g * 0.5;
            b = b > 128 ? b + (255 - b) * 0.5 : b * 0.5;
            // auto-white balance (make near-white pure white)
            if (r > 200 && g > 200 && b > 180) {
              r = 255; g = 255; b = 255;
            }
            data[i] = r; data[i + 1] = g; data[i + 2] = b;
          }
        } else if (page.filter === 'grayscale') {
          for (let i = 0; i < data.length; i += 4) {
            const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = data[i + 1] = data[i + 2] = brightness;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      const newDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      setPages(prev => prev.map((p, i) => i === index ? { ...p, processedDataUrl: newDataUrl } : p));
      setIsProcessing(false);
    };
    img.src = page.originalDataUrl;
  };

  const updateCurrentPage = (updates: Partial<ScannedPage>) => {
    if (currentPageIndex < 0) return;
    setPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, ...updates } : p));
  };

  const deletePage = (index: number) => {
    if (window.confirm('Are you sure you want to delete this page?')) {
      const newPages = pages.filter((_, i) => i !== index);
      setPages(newPages);
      if (currentPageIndex >= newPages.length) {
        setCurrentPageIndex(newPages.length - 1);
      }
    }
  };

  const generatePDF = async () => {
    if (pages.length === 0) return;
    setPdfGenerating(true);

    try {
      const doc = new jsPDF({ format: 'a4', unit: 'pt' });
      const pdfW = 595.28;
      const pdfH = 841.89;

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) doc.addPage();
        
        const imgUrl = pages[i].processedDataUrl;
        
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const ratio = Math.min(pdfW / img.width, pdfH / img.height);
            const drawW = img.width * ratio;
            const drawH = img.height * ratio;
            const x = (pdfW - drawW) / 2;
            const y = (pdfH - drawH) / 2;
            doc.addImage(img, 'JPEG', x, y, drawW, drawH);
            resolve();
          };
          img.src = imgUrl;
        });
      }

      const d = new Date();
      const filename = `Scanned_Doc_${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}_${d.getHours()}${d.getMinutes()}.pdf`;
      doc.save(filename);
      
      // Attempt to share
      if (navigator.share) {
        try {
          const pdfBlob = doc.output('blob');
          const file = new File([pdfBlob], filename, { type: 'application/pdf' });
          await navigator.share({
            title: filename,
            files: [file]
          });
        } catch(e) {
          console.log('Share API error or cancelled', e);
        }
      }

    } catch (error) {
      console.error(error);
      alert('Error generating PDF.');
    }

    setPdfGenerating(false);
  };

  const currentPage = pages[currentPageIndex];

  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #ea580c, #c2410c)',
          color: '#ffffff',
          border: 'none',
          padding: '12px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(234, 88, 12, 0.2)',
          cursor: 'pointer'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📄</span> ডকুমেন্ট স্ক্যানার (Doc Scanner)
        </span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#fff7ed', padding: '8px 12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #ffedd5' }}>
            <p style={{ fontSize: '11px', color: '#9a3412', margin: 0, fontWeight: 600 }}>
              📸 Zero-Server Document Scanner. Process multi-page scans entirely on your device with B&W, Grayscale, and Magic Color filters.
            </p>
          </div>

          <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} style={{ display: 'none' }} onChange={handleCapture} />
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleCapture} />

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <button 
              onClick={() => cameraInputRef.current?.click()}
              style={{ padding: '12px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', color: '#334155', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
            >
              <span style={{ fontSize: '24px' }}>📷</span>
              <span style={{ fontSize: '11px' }}>Live Camera</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '12px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', color: '#334155', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
            >
              <span style={{ fontSize: '24px' }}>🖼️</span>
              <span style={{ fontSize: '11px' }}>Gallery Upload</span>
            </button>
          </div>

          {pages.length > 0 && (
            <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '16px' }}>
              
              {/* Page Thumbnails Queue */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px' }}>
                {pages.map((p, idx) => (
                  <div 
                    key={p.id} 
                    onClick={() => setCurrentPageIndex(idx)}
                    style={{ 
                      minWidth: '60px', 
                      height: '80px', 
                      borderRadius: '6px', 
                      border: currentPageIndex === idx ? '3px solid #ea580c' : '1px solid #cbd5e1', 
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      opacity: currentPageIndex === idx ? 1 : 0.6
                    }}
                  >
                    <img src={p.processedDataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', textAlign: 'center', padding: '2px' }}>
                      P.{idx + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Editor Section */}
              {currentPage && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>Page {currentPageIndex + 1} Editor</span>
                    <button onClick={() => deletePage(currentPageIndex)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>🗑️ Delete</button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', background: '#e2e8f0', borderRadius: '8px', padding: '8px', minHeight: '200px' }}>
                    {isProcessing ? (
                      <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Processing...</div>
                    ) : (
                      <img src={currentPage.processedDataUrl} style={{ maxHeight: '300px', maxWidth: '100%', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
                    {['original', 'magic', 'bw', 'grayscale'].map((f) => (
                      <button 
                        key={f}
                        onClick={() => updateCurrentPage({ filter: f as ScannerFilter })}
                        style={{
                          padding: '8px 4px',
                          background: currentPage.filter === f ? '#ea580c' : '#ffffff',
                          color: currentPage.filter === f ? '#ffffff' : '#475569',
                          border: currentPage.filter === f ? 'none' : '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textTransform: 'capitalize'
                        }}
                      >
                        {f === 'bw' ? 'B&W' : f}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => updateCurrentPage({ rotation: (currentPage.rotation + 90) % 360 })}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px', color: '#334155', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <span>🔄</span> Rotate 90° Clockwise
                  </button>
                </div>
              )}

              {/* PDF Action */}
              <button 
                onClick={generatePDF}
                disabled={pdfGenerating}
                style={{
                  width: '100%',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: pdfGenerating ? 'wait' : 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {pdfGenerating ? 'Generating PDF...' : `⬇️ Generate & Download PDF (${pages.length} Pages)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
