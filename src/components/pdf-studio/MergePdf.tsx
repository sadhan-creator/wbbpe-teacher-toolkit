import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Download, Share2, Layers, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { downloadBlob, shareBlob, formatBytes } from './utils';

interface PdfFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pages: number;
}

export default function MergePdf() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = Array.from(e.target.files || []);
    if (!inputFiles.length) return;
    
    setIsProcessing(true);
    const newPdfs: PdfFile[] = [];
    
    for (const file of inputFiles) {
      if (file.type !== 'application/pdf') continue;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        newPdfs.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          size: file.size,
          pages: pdf.getPageCount()
        });
      } catch (err) {
        console.error('Failed to load PDF:', file.name);
      }
    }
    
    setFiles(prev => [...prev, ...newPdfs]);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const moveItem = (index: number, dir: number) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= files.length) return;
    const items = [...files];
    const temp = items[index];
    items[index] = items[newIdx];
    items[newIdx] = temp;
    setFiles(items);
  };

  const deleteItem = (index: number) => {
    const items = [...files];
    items.splice(index, 1);
    setFiles(items);
  };

  const generateMergedPDF = async () => {
    if (files.length < 2) {
      alert('Please add at least 2 PDF files to merge.');
      return null;
    }
    
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const fileItem of files) {
        const arrayBuffer = await fileItem.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }
      
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setIsProcessing(false);
      return blob;
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      alert('Error merging PDFs');
      return null;
    }
  };

  const handleAction = async (action: 'download' | 'share') => {
    const blob = await generateMergedPDF();
    if (!blob) return;
    const d = new Date();
    const filename = `Merged_${d.getTime()}.pdf`;
    if (action === 'download') downloadBlob(blob, filename);
    if (action === 'share') shareBlob(blob, filename, 'Merged PDF');
  };

  const totalPages = files.reduce((acc, curr) => acc + curr.pages, 0);

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800">2. Merge PDFs</h3>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
        >
          <Layers size={16} /> Add PDFs
        </button>
        <input type="file" multiple accept="application/pdf" ref={fileInputRef} className="hidden" onChange={handleFiles} />
      </div>

      {files.length > 0 ? (
        <>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-4">
            {files.map((f, idx) => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 mb-2 rounded-md shadow-sm">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-bold text-sm text-slate-800 truncate">{f.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(f.size)} • {f.pages} pages</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-2 text-slate-500 hover:bg-slate-100 rounded"><ArrowUp size={16}/></button>
                  <button onClick={() => moveItem(idx, 1)} disabled={idx === files.length - 1} className="p-2 text-slate-500 hover:bg-slate-100 rounded"><ArrowDown size={16}/></button>
                  <button onClick={() => deleteItem(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center mb-4 px-2 font-bold text-sm text-slate-700">
            <span>Total Files: {files.length}</span>
            <span>Total Pages: {totalPages}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleAction('download')} disabled={isProcessing || files.length < 2} className="flex-1 bg-green-600 text-white p-3 rounded-lg font-bold flex justify-center items-center gap-2 disabled:opacity-50">
              <Download size={18} /> {isProcessing ? 'Merging...' : 'Merge & Download'}
            </button>
            <button onClick={() => handleAction('share')} disabled={isProcessing || files.length < 2} className="flex-1 bg-indigo-600 text-white p-3 rounded-lg font-bold flex justify-center items-center gap-2 disabled:opacity-50">
              <Share2 size={18} /> Share
            </button>
          </div>
        </>
      ) : (
        <div className="text-center p-12 border-2 border-dashed border-slate-300 rounded-xl text-slate-500">
          <Layers size={48} className="mx-auto mb-2 text-slate-400" />
          <p>No PDFs added yet.</p>
          <p className="text-sm">Click "Add PDFs" to combine multiple files.</p>
        </div>
      )}
    </div>
  );
}
