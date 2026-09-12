import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { Download, Droplets } from 'lucide-react';
import { downloadBlob, formatBytes } from './utils';

export default function WatermarkPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState('30');
  const [angle, setAngle] = useState('45');
  const [fontSize, setFontSize] = useState('60');
  const [addPageNum, setAddPageNum] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const processWatermark = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        // Watermark
        if (watermarkText.trim()) {
          const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, parseInt(fontSize));
          const textHeight = helveticaFont.heightAtSize(parseInt(fontSize));
          
          page.drawText(watermarkText, {
            x: width / 2 - textWidth / 2,
            y: height / 2 - textHeight / 2,
            size: parseInt(fontSize),
            font: helveticaFont,
            color: rgb(0.8, 0.2, 0.2), // Red tint default
            opacity: parseInt(opacity) / 100,
            rotate: degrees(parseInt(angle)),
          });
        }

        // Page Number
        if (addPageNum) {
          const pageTxt = `Page ${i + 1} of ${pages.length}`;
          const pWidth = helveticaFont.widthOfTextAtSize(pageTxt, 12);
          page.drawText(pageTxt, {
            x: width / 2 - pWidth / 2,
            y: 20,
            size: 12,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, `Watermarked_${Date.now()}.pdf`);

    } catch (e) {
      console.error(e);
      alert('Error adding watermark');
    }

    setIsProcessing(false);
  };

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800">5. Watermark & Sign</h3>
      </div>

      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center mb-4 cursor-pointer hover:bg-slate-50" onClick={() => fileInputRef.current?.click()}>
        <Droplets size={48} className="mx-auto mb-2 text-slate-400" />
        <p className="font-bold text-slate-700">{file ? file.name : 'Click to Upload PDF'}</p>
        {file && <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>}
        <input type="file" accept="application/pdf" ref={fileInputRef} className="hidden" onChange={handleFile} />
      </div>

      {file && (
        <>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 space-y-4">
            <div>
              <label className="block font-bold text-sm mb-1 text-slate-700">Watermark Text</label>
              <input type="text" value={watermarkText} onChange={e=>setWatermarkText(e.target.value)} className="w-full p-2 border rounded-md" placeholder="e.g. CONFIDENTIAL" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-xs mb-1 text-slate-700">Opacity ({opacity}%)</label>
                <input type="range" min="10" max="90" value={opacity} onChange={e=>setOpacity(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="block font-bold text-xs mb-1 text-slate-700">Angle ({angle}°)</label>
                <input type="range" min="0" max="90" value={angle} onChange={e=>setAngle(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="block font-bold text-xs mb-1 text-slate-700">Font Size ({fontSize}pt)</label>
                <input type="range" min="20" max="150" value={fontSize} onChange={e=>setFontSize(e.target.value)} className="w-full" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
                <input type="checkbox" checked={addPageNum} onChange={e=>setAddPageNum(e.target.checked)} className="w-4 h-4" />
                Add Page Numbers (Bottom Center)
              </label>
            </div>
          </div>

          <button onClick={processWatermark} disabled={isProcessing} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold flex justify-center items-center gap-2 disabled:opacity-50">
            <Download size={18} /> {isProcessing ? 'Processing...' : 'Apply & Download'}
          </button>
        </>
      )}
    </div>
  );
}
