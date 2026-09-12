import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import { Download, Share2, Printer, Trash2, ArrowLeft, ArrowRight, RotateCw, ImagePlus } from 'lucide-react';
import { downloadBlob, shareBlob, printBlob } from './utils';

interface ImgItem {
  id: string;
  url: string;
  rotation: number;
}

export default function ImagesToPdf() {
  const [images, setImages] = useState<ImgItem[]>([]);
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState<'p'|'l'>('p');
  const [margin, setMargin] = useState('0');
  const [fitMode, setFitMode] = useState<'fit'|'fill'>('fit');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    const newImgs = files.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(f),
      rotation: 0
    }));
    setImages(prev => [...prev, ...newImgs]);
    e.target.value = '';
  };

  const moveItem = (index: number, dir: number) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= images.length) return;
    const items = [...images];
    const temp = items[index];
    items[index] = items[newIdx];
    items[newIdx] = temp;
    setImages(items);
  };

  const rotateItem = (index: number) => {
    const items = [...images];
    items[index].rotation = (items[index].rotation + 90) % 360;
    setImages(items);
  };

  const deleteItem = (index: number) => {
    const items = [...images];
    URL.revokeObjectURL(items[index].url);
    items.splice(index, 1);
    setImages(items);
  };

  const generatePDF = async () => {
    if (!images.length) return null;
    setIsProcessing(true);
    
    try {
      const doc = new jsPDF({ format: pageSize, orientation: orientation, unit: 'pt' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginPt = parseInt(margin, 10);
      
      const drawW = pageWidth - (marginPt * 2);
      const drawH = pageHeight - (marginPt * 2);

      for (let i = 0; i < images.length; i++) {
        if (i > 0) doc.addPage();
        
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const isRotated = images[i].rotation === 90 || images[i].rotation === 270;
            
            canvas.width = isRotated ? img.height : img.width;
            canvas.height = isRotated ? img.width : img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve();
            
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.rotate(images[i].rotation * Math.PI / 180);
            ctx.drawImage(img, -img.width/2, -img.height/2);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            
            let finalW, finalH, x, y;
            
            if (fitMode === 'fit') {
              const ratio = Math.min(drawW / canvas.width, drawH / canvas.height);
              finalW = canvas.width * ratio;
              finalH = canvas.height * ratio;
              x = marginPt + (drawW - finalW) / 2;
              y = marginPt + (drawH - finalH) / 2;
            } else {
              finalW = drawW;
              finalH = drawH;
              x = marginPt;
              y = marginPt;
            }
            
            doc.addImage(dataUrl, 'JPEG', x, y, finalW, finalH);
            resolve();
          };
          img.onerror = reject;
          img.src = images[i].url;
        });
      }
      
      const blob = doc.output('blob');
      setIsProcessing(false);
      return blob;
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      alert('Error generating PDF');
      return null;
    }
  };

  const handleAction = async (action: 'download' | 'share' | 'print') => {
    const blob = await generatePDF();
    if (!blob) return;
    
    const d = new Date();
    const filename = `ImagesToPDF_${d.getTime()}.pdf`;
    
    if (action === 'download') downloadBlob(blob, filename);
    if (action === 'share') shareBlob(blob, filename, 'My PDF Document');
    if (action === 'print') printBlob(blob);
  };

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800">1. Images to PDF</h3>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
        >
          <ImagePlus size={16} /> Add Images
        </button>
        <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFiles} />
      </div>

      {images.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {images.map((img, idx) => (
              <div key={img.id} className="border border-slate-200 rounded-lg p-2 flex flex-col relative bg-slate-50">
                <div className="h-32 mb-2 flex items-center justify-center overflow-hidden rounded bg-slate-200">
                  <img 
                    src={img.url} 
                    style={{ transform: `rotate(${img.rotation}deg)`, maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} 
                  />
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}><ArrowLeft size={16}/></button>
                  <button onClick={() => rotateItem(idx)}><RotateCw size={16}/></button>
                  <button onClick={() => deleteItem(idx)} className="text-red-500"><Trash2 size={16}/></button>
                  <button onClick={() => moveItem(idx, 1)} disabled={idx === images.length - 1}><ArrowRight size={16}/></button>
                </div>
                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded font-bold">{idx + 1}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
            <div>
              <label className="block font-bold mb-1 text-slate-700">Page Size</label>
              <select value={pageSize} onChange={e => setPageSize(e.target.value)} className="w-full p-2 border rounded-md bg-white">
                <option value="a4">A4</option>
                <option value="legal">Legal</option>
                <option value="letter">Letter</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700">Orientation</label>
              <select value={orientation} onChange={e => setOrientation(e.target.value as 'p'|'l')} className="w-full p-2 border rounded-md bg-white">
                <option value="p">Portrait</option>
                <option value="l">Landscape</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700">Margin</label>
              <select value={margin} onChange={e => setMargin(e.target.value)} className="w-full p-2 border rounded-md bg-white">
                <option value="0">No Margin</option>
                <option value="20">Small (20pt)</option>
                <option value="40">Large (40pt)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700">Fit Mode</label>
              <select value={fitMode} onChange={e => setFitMode(e.target.value as 'fit'|'fill')} className="w-full p-2 border rounded-md bg-white">
                <option value="fit">Fit to Page (Keep Aspect Ratio)</option>
                <option value="fill">Fill Page (Stretch)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleAction('download')} disabled={isProcessing} className="flex-1 bg-green-600 text-white p-3 rounded-lg font-bold flex justify-center items-center gap-2">
              <Download size={18} /> {isProcessing ? 'Processing...' : 'Download PDF'}
            </button>
            <button onClick={() => handleAction('share')} disabled={isProcessing} className="flex-1 bg-indigo-600 text-white p-3 rounded-lg font-bold flex justify-center items-center gap-2">
              <Share2 size={18} /> Share
            </button>
            <button onClick={() => handleAction('print')} disabled={isProcessing} className="bg-slate-700 text-white p-3 rounded-lg font-bold flex justify-center items-center gap-2">
              <Printer size={18} /> Print
            </button>
          </div>
        </>
      ) : (
        <div className="text-center p-12 border-2 border-dashed border-slate-300 rounded-xl text-slate-500">
          <ImagePlus size={48} className="mx-auto mb-2 text-slate-400" />
          <p>No images added yet.</p>
          <p className="text-sm">Click "Add Images" to start creating your PDF.</p>
        </div>
      )}
    </div>
  );
}
