import React, { useState, useRef } from 'react';

export type PreviewDocType = 'routine' | 'leave' | 'planner' | 'official' | 'diary';

interface OnScreenPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  docType: PreviewDocType;
  htmlContent: string;
  orientation?: 'portrait' | 'landscape';
  onDownloadPdf?: () => Promise<void> | void;
  isDownloading?: boolean;
}

export const OnScreenPreviewModal: React.FC<OnScreenPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  htmlContent,
  orientation = 'portrait',
  onDownloadPdf,
  isDownloading = false
}) => {
  const [zoomLevel, setZoomLevel] = useState<'fit' | '100' | '80' | '60'>('fit');
  const [copied, setCopied] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    document.body.classList.add('printing-onscreen-preview');
    if (orientation === 'landscape') {
      document.body.classList.add('print-landscape');
      document.body.classList.remove('print-portrait');
    } else {
      document.body.classList.add('print-portrait');
      document.body.classList.remove('print-landscape');
    }

    window.print();

    setTimeout(() => {
      document.body.classList.remove('printing-onscreen-preview', 'print-landscape', 'print-portrait');
    }, 1500);
  };

  const handleCopyText = async () => {
    try {
      if (printAreaRef.current) {
        const text = printAreaRef.current.innerText;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {
      console.error('Clipboard copy failed', e);
    }
  };

  const isLandscape = orientation === 'landscape';

  const getZoomStyle = (): React.CSSProperties => {
    switch (zoomLevel) {
      case '100':
        return { transform: 'scale(1)', transformOrigin: 'top center' };
      case '80':
        return { transform: 'scale(0.8)', transformOrigin: 'top center' };
      case '60':
        return { transform: 'scale(0.6)', transformOrigin: 'top center' };
      case 'fit':
      default:
        return { transform: 'scale(1)', transformOrigin: 'top center', width: '100%' };
    }
  };

  return (
    <div
      id="onScreenPreviewBackdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '12px 10px',
        backdropFilter: 'blur(3px)',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="onScreenPreviewDialog"
        style={{
          background: '#f8fafc',
          borderRadius: '16px',
          width: '100%',
          maxWidth: isLandscape ? '1060px' : '840px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          border: '1px solid #cbd5e1',
          overflow: 'hidden'
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: '#ffffff',
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '18px',
                background: '#eff6ff',
                padding: '6px',
                borderRadius: '8px',
                display: 'inline-flex',
                border: '1px solid #bfdbfe'
              }}
            >
              👁️
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#1e3a8a', fontWeight: 800 }}>
                {title}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span
                  style={{
                    background: isLandscape ? '#fef3c7' : '#e0e7ff',
                    color: isLandscape ? '#92400e' : '#3730a3',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    border: '1px solid currentColor'
                  }}
                >
                  {isLandscape ? 'A4 ল্যান্ডস্কেপ (Landscape)' : 'A4 পোর্ট্রেট (Portrait)'}
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>অন-স্ক্রিন প্রিন্ট প্রিভিউ বক্স</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {/* ZOOM CONTROLS */}
            <div
              style={{
                display: 'flex',
                background: '#f1f5f9',
                borderRadius: '8px',
                padding: '2px',
                border: '1px solid #e2e8f0'
              }}
            >
              <button
                onClick={() => setZoomLevel('fit')}
                style={{
                  border: 'none',
                  background: zoomLevel === 'fit' ? '#ffffff' : 'transparent',
                  fontWeight: zoomLevel === 'fit' ? 700 : 500,
                  color: zoomLevel === 'fit' ? '#1e40af' : '#64748b',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  boxShadow: zoomLevel === 'fit' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                ফিট
              </button>
              <button
                onClick={() => setZoomLevel('100')}
                style={{
                  border: 'none',
                  background: zoomLevel === '100' ? '#ffffff' : 'transparent',
                  fontWeight: zoomLevel === '100' ? 700 : 500,
                  color: zoomLevel === '100' ? '#1e40af' : '#64748b',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  boxShadow: zoomLevel === '100' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                ১০০%
              </button>
              <button
                onClick={() => setZoomLevel('80')}
                style={{
                  border: 'none',
                  background: zoomLevel === '80' ? '#ffffff' : 'transparent',
                  fontWeight: zoomLevel === '80' ? 700 : 500,
                  color: zoomLevel === '80' ? '#1e40af' : '#64748b',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  boxShadow: zoomLevel === '80' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                ৮০%
              </button>
              <button
                onClick={() => setZoomLevel('60')}
                style={{
                  border: 'none',
                  background: zoomLevel === '60' ? '#ffffff' : 'transparent',
                  fontWeight: zoomLevel === '60' ? 700 : 500,
                  color: zoomLevel === '60' ? '#1e40af' : '#64748b',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  boxShadow: zoomLevel === '60' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                ৬০%
              </button>
            </div>

            {/* ACTION BUTTONS */}
            {onDownloadPdf && (
              <button
                onClick={onDownloadPdf}
                disabled={isDownloading}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: isDownloading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 5px rgba(5, 150, 105, 0.3)',
                  opacity: isDownloading ? 0.7 : 1
                }}
              >
                {isDownloading ? '⏳ তৈরি হচ্ছে...' : '📥 PDF ডাউনলোড'}
              </button>
            )}

            <button
              onClick={handlePrint}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 5px rgba(37, 99, 235, 0.25)'
              }}
            >
              🖨️ প্রিন্ট করুন
            </button>

            <button
              onClick={handleCopyText}
              style={{
                background: copied ? '#10b981' : '#f1f5f9',
                color: copied ? '#ffffff' : '#334155',
                border: '1px solid #cbd5e1',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="লেখা কপি করুন"
            >
              {copied ? '✅ কপি হয়েছে' : '📋 কপি'}
            </button>

            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="বন্ধ করুন"
            >
              ✕
            </button>
          </div>
        </div>

        {/* TIPS / IFRAME NOTICE BANNER */}
        <div
          style={{
            background: '#f0f9ff',
            borderBottom: '1px solid #bae6fd',
            padding: '6px 16px',
            fontSize: '10.5px',
            color: '#0369a1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span>
            💡 <b>সহায়তা:</b> অন-স্ক্রিনে আপনি সম্পূর্ণ পেজটির নির্ভুল প্রিন্ট ফরম্যাট দেখতে পাচ্ছেন। প্রয়োজনমতো সরাসরি <b>"📥 PDF ডাউনলোড"</b> করুন অথবা <b>"🖨️ প্রিন্ট করুন"</b> ক্লিক করুন।
          </span>
          <span style={{ fontSize: '9.5px', color: '#0284c7', whiteSpace: 'nowrap' }}>
            (আইফ্রেমে প্রিন্ট আটকে গেলে নতুন ট্যাবে ওপেন করুন)
          </span>
        </div>

        {/* PREVIEW VIEWPORT AREA */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'auto',
            padding: '20px 14px',
            background: '#cbd5e1',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}
        >
          {/* SIMULATED A4 PAPER SHEET */}
          <div
            id="screen-preview-print-container"
            ref={printAreaRef}
            style={{
              background: '#ffffff',
              color: '#0f172a',
              width: isLandscape ? '1000px' : '760px',
              minHeight: isLandscape ? '680px' : '980px',
              maxWidth: '100%',
              padding: isLandscape ? '28px 24px' : '36px 30px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
              borderRadius: '6px',
              boxSizing: 'border-box',
              ...getZoomStyle()
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* FOOTER BAR */}
        <div
          style={{
            background: '#ffffff',
            padding: '10px 16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: '#64748b'
          }}
        >
          <span>WBBPE পশ্চিমবঙ্গ প্রাথমিক শিক্ষা পর্ষদ ডিজিটাল শিক্ষক ডিরেক্টরি ২০২৬</span>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              padding: '5px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            প্রিভিউ বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
