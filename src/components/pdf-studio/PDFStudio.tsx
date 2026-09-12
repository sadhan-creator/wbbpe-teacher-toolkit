import React, { useState } from 'react';
import ImagesToPdf from './ImagesToPdf';
import MergePdf from './MergePdf';
import SplitPdf from './SplitPdf';
import CompressPdf from './CompressPdf';
import WatermarkPdf from './WatermarkPdf';
import { FileImage, Layers, Scissors, Minimize, Droplets } from 'lucide-react';

export default function PDFStudio() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(1);

  const tabs = [
    { id: 1, name: 'Images to PDF', icon: <FileImage size={16} /> },
    { id: 2, name: 'Merge PDF', icon: <Layers size={16} /> },
    { id: 3, name: 'Split / Extract', icon: <Scissors size={16} /> },
    { id: 4, name: 'Compress', icon: <Minimize size={16} /> },
    { id: 5, name: 'Watermark', icon: <Droplets size={16} /> },
  ];

  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
          color: '#ffffff',
          border: 'none',
          padding: '12px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)',
          cursor: 'pointer'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🛠️</span> পিডিএফ স্টুডিও (PDF Studio)
        </span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#f5f3ff', padding: '8px 12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #ede9fe' }}>
            <p style={{ fontSize: '11px', color: '#5b21b6', margin: 0, fontWeight: 600 }}>
              🔒 100% Secure & Private. All processing is done locally on your device. Zero server uploads.
            </p>
          </div>

          <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', marginBottom: '16px', paddingBottom: '8px' }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: activeTab === t.id ? '#7c3aed' : '#f1f5f9',
                  color: activeTab === t.id ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {t.icon} {t.name}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {activeTab === 1 && <ImagesToPdf />}
            {activeTab === 2 && <MergePdf />}
            {activeTab === 3 && <SplitPdf />}
            {activeTab === 4 && <CompressPdf />}
            {activeTab === 5 && <WatermarkPdf />}
          </div>
        </div>
      )}
    </div>
  );
}
