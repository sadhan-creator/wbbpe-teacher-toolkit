import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { Download, FileOutput, Scissors, Trash2 } from 'lucide-react';
import { downloadBlob } from './utils';
import * as pdfjsLib from 'pdfjs-dist';

// Use a reliable CDN for the worker to avoid build/bundler issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PageThumb {
  pageIndex: number;
  dataUrl: string;
  selected: boolean;
}

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumb[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rangeInput, setRangeInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setIsProcessing(true);
    setThumbnails([]);
    
    try {
      const arrayBuffer = await f.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      setPdfBytes(bytes);
      
      // Load with pdfjs to generate thumbnails
      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const total = pdf.numPages;
      const thumbs: PageThumb[] = [];
      
      for (let i = 1; i <= total; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 }); // Low res for thumb
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          thumbs.push({
            pageIndex: i - 1, // 0-indexed for pdf-lib
            dataUrl: canvas.toDataURL('image/jpeg', 0.8),
            selected: false
          });
        }
      }
      setThumbnails(thumbs);
    } catch (err) {
      console.error(err);
      alert('Failed to load PDF for thumbnails.');
    }
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const togglePage = (idx: number) => {
    const newThumbs = [...thumbnails];
    newThumbs[idx].selected = !newThumbs[idx].selected;
    setThumbnails(newThumbs);
  };

  const applyRange = () => {
    const newThumbs = thumbnails.map(t => ({ ...t, selected: false }));
    const parts = rangeInput.split(',');
    for (const part of parts) {
      const range = part.trim();
      if (!range) continue;
      if (range.includes('-')) {
        const [start, end] = range.split('-').map(n => parseInt(n, 10));
        if (start && end) {
          for (let i = start; i <= end; i++) {
            if (i > 0 && i <= newThumbs.length) newThumbs[i - 1].selected = true;
          }
        }
      } else {
        const num = parseInt(range, 10);
        if (num > 0 && num <= newThumbs.length) {
          newThumbs[num - 1].selected = true;
        }
      }
    }
    setThumbnails(newThumbs);
  };

  const clearSelection = () => {
    setThumbnails(thumbnails.map(t => ({ ...t, selected: false })));
    setRangeInput('');
  };

  const extractSelected = async () => {
    const selectedIndices = thumbnails.filter(t => t.selected).map(t => t.pageIndex);
    if (!selectedIndices.length || !pdfBytes) {
      alert('No pages selected.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const srcDoc = await PDFDocument.load(pdfBytes);
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, selectedIndices);
      copiedPages.forEach(p => newDoc.addPage(p));
      const bytes = await newDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(blob, `Extracted_${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error extracting pages');
    }
    setIsProcessing(false);
  };

  const splitAllToZip = async () => {
    if (!pdfBytes || !file) return;
    setIsProcessing(true);
    try {
      const srcDoc = await PDFDocument.load(pdfBytes);
      const zip = new JSZip();
      
      for (let i = 0; i < srcDoc.getPageCount(); i++) {
        const newDoc = await PDFDocument.create();
        const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
        newDoc.addPage(copiedPage);
        const bytes = await newDoc.save();
        zip.file(`Page_${i + 1}.pdf`, bytes);
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `${file.name.replace('.pdf', '')}_Split.zip`);
    } catch (e) {
      console.error(e);
      alert('Error splitting to zip');
    }
    setIsProcessing(false);
  };

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800">3. Split & Extract</h3>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
        >
          {file ? 'Change PDF' : 'Select PDF'}
        </button>
        <input type="file" accept="application/pdf" ref={fileInputRef} className="hidden" onChange={handleFile} />
      </div>

      {isProcessing && <div className="text-center p-4 text-blue-600 font-bold">Processing PDF...</div>}

      {file && !isProcessing && (
        <>
          <div className="mb-4">
            <label className="block font-bold text-sm mb-1">Select via Range (e.g., 1-3, 5, 8-10)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={rangeInput} 
                onChange={e => setRangeInput(e.target.value)} 
                placeholder="1-3, 5" 
                className="flex-1 border p-2 rounded-lg"
              />
              <button onClick={applyRange} className="bg-slate-800 text-white px-4 rounded-lg font-bold">Select</button>
              <button onClick={clearSelection} className="bg-slate-200 text-slate-700 px-4 rounded-lg font-bold">Clear</button>
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4 max-h-64 overflow-y-auto p-2 bg-slate-50 border rounded-lg">
            {thumbnails.map((t, idx) => (
              <div 
                key={idx} 
                onClick={() => togglePage(idx)}
                className={`relative cursor-pointer border-2 rounded-md overflow-hidden ${t.selected ? 'border-green-500 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                <img src={t.dataUrl} className="w-full h-auto block" />
                <div className={`absolute top-0 left-0 w-full text-center text-xs font-bold py-0.5 ${t.selected ? 'bg-green-500 text-white' : 'bg-black/50 text-white'}`}>
                  Pg {idx + 1}
                </div>
                {t.selected && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <div className="bg-green-500 text-white rounded-full p-1">✓</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={extractSelected} className="flex-1 bg-green-600 text-white p-3 rounded-lg font-bold flex justify-center items-center gap-2">
              <FileOutput size={18} /> Extract Selected ({thumbnails.filter(t=>t.selected).length})
            </button>
            <button onClick={splitAllToZip} className="flex-1 bg-purple-600 text-white p-3 rounded-lg font-bold flex justify-center items-center gap-2">
              <Scissors size={18} /> Split All to ZIP
            </button>
          </div>
        </>
      )}
    </div>
  );
}
