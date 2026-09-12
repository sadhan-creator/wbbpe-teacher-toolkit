import React, { useState, useRef } from 'react';
import { Download, Minimize } from 'lucide-react';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { downloadBlob, formatBytes } from './utils';

export default function CompressPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState('150'); // DPI approx
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const compressPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const numPages = pdf.numPages;
      
      const doc = new jsPDF({ format: 'a4', unit: 'pt' });
      const targetScale = parseInt(quality, 10) / 72; // Convert DPI to scale multiplier

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: targetScale });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // JPEG compression
          
          if (i > 1) doc.addPage();
          
          // Original pt dimensions for PDF layout
          const ptViewport = page.getViewport({ scale: 1.0 });
          doc.addImage(dataUrl, 'JPEG', 0, 0, ptViewport.width, ptViewport.height);
        }
        setProgress(Math.round((i / numPages) * 100));
      }

      const blob = doc.output('blob');
      downloadBlob(blob, `Compressed_${Date.now()}.pdf`);

    } catch (e) {
      console.error(e);
      alert('Error during compression');
    }
    
    setIsProcessing(false);
    setProgress(0);
  };

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800">4. Compress PDF</h3>
      </div>

      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center mb-4 cursor-pointer hover:bg-slate-50" onClick={() => fileInputRef.current?.click()}>
        <Minimize size={48} className="mx-auto mb-2 text-slate-400" />
        <p className="font-bold text-slate-700">{file ? file.name : 'Click to Upload PDF'}</p>
        {file && <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>}
        <input type="file" accept="application/pdf" ref={fileInputRef} className="hidden" onChange={handleFile} />
      </div>

      {file && (
        <>
          <div className="mb-4">
            <label className="block font-bold text-sm mb-2 text-slate-700">Compression Level</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-slate-50">
                <input type="radio" name="quality" value="300" checked={quality === '300'} onChange={e=>setQuality(e.target.value)} />
                <div>
                  <div className="font-bold text-sm">High Quality (Low Compression)</div>
                  <div className="text-xs text-slate-500">Good for printing (300 DPI)</div>
                </div>
              </label>
              <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-slate-50 bg-blue-50 border-blue-200">
                <input type="radio" name="quality" value="150" checked={quality === '150'} onChange={e=>setQuality(e.target.value)} />
                <div>
                  <div className="font-bold text-sm text-blue-800">Recommended (Balanced)</div>
                  <div className="text-xs text-blue-600">Standard web viewing (150 DPI)</div>
                </div>
              </label>
              <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-slate-50">
                <input type="radio" name="quality" value="72" checked={quality === '72'} onChange={e=>setQuality(e.target.value)} />
                <div>
                  <div className="font-bold text-sm">Maximum Compression</div>
                  <div className="text-xs text-slate-500">Target &lt; 200KB for portal upload (72 DPI)</div>
                </div>
              </label>
            </div>
          </div>

          {isProcessing ? (
            <div className="bg-slate-100 p-4 rounded-lg">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Compressing...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-300 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          ) : (
            <button onClick={compressPdf} className="w-full bg-green-600 text-white p-3 rounded-lg font-bold flex justify-center items-center gap-2">
              <Download size={18} /> Compress & Download
            </button>
          )}
        </>
      )}
    </div>
  );
}
