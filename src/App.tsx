import { useState, useEffect } from 'react';
import { bindToWindow, initApp, getSchoolName, saveSchoolName, SafeStorage, getLocalDateString, toBengaliNum } from './app-engine';
import { holidays } from './data/holidays';
import { formatBengaliDate } from './pdf-helper';
import {
  downloadHolidayPlannerPDF,
  downloadMasterRoutinePDF,
  downloadLeaveTrackerPDF,
  PlannerPdfMode,
  buildMasterRoutineHtml,
  buildLeaveTrackerHtml,
  buildHolidayPlannerHtml,
  buildOfficialHolidaysHtml,
  buildLessonDiaryHtml,
  downloadLessonDiaryPDF
} from './pdf-helper';
import { OnScreenPreviewModal, PreviewDocType } from './components/OnScreenPreviewModal';
import {
  getReminderSettings,
  saveReminderSettings,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  triggerTestNotification,
  startReminderScheduler,
  ReminderSettings,
  ReminderPayload
} from './notification-helper';
import {
  subscribeSpeechState,
  getSpeechState,
  setSpeechRate,
  speakDailyHolidayUpdate,
  speakDaySignificance,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  getAutoSpeakSetting,
  setAutoSpeakSetting,
  SpeechState,
  getDayUpdateInfo
} from './speech-service';



import LeaveApplicationGenerator from './components/LeaveApplicationGenerator';
import PhotoSignatureResizer from './components/PhotoSignatureResizer';
import DocumentScanner from './components/DocumentScanner';
import PDFStudio from './components/pdf-studio/PDFStudio';

export default function App() {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfModalType, setPdfModalType] = useState<'planner' | 'routine' | 'leave'>('planner');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfStatusMsg, setPdfStatusMsg] = useState<string | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<{ url: string; filename: string } | null>(null);
  const [customSchool, setCustomSchool] = useState<string>('');
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [logoAlignment, setLogoAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [logoScale, setLogoScale] = useState<number>(50);
  const [logoGrayscale, setLogoGrayscale] = useState<boolean>(false);
  const [pdfWatermark, setPdfWatermark] = useState<string>('');
  const [pdfDateLang, setPdfDateLang] = useState<'bn' | 'en'>('bn');
  const [currentHolidayFilter, setCurrentHolidayFilter] = useState<'all' | 'holiday' | 'observation'>('all');

  // Notice Board State
  const [notices, setNotices] = useState<any[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [noticeSearch, setNoticeSearch] = useState('');
  const [useFallbackReader, setUseFallbackReader] = useState(true);

  const fetchNotices = async () => {
    setNoticesLoading(true);
    try {
      const response = await fetch('/api/notices');
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const entries = Array.from(doc.querySelectorAll('.flip-entry'));
      
      if (entries.length > 0) {
        const parsedNotices = entries.map(el => {
          const titleEl = el.querySelector('.flip-entry-title');
          const title = titleEl?.textContent || 'Unknown Notice';
          const cleanTitle = title.replace(/[_-]/g, ' ').replace(/\.pdf$/i, '');
          return {
            id: Math.random().toString(36).substring(7), // Fallback ID extraction
            title: cleanTitle,
            date: new Date().toLocaleDateString()
          };
        });
        setNotices(parsedNotices);
        SafeStorage.setItem('wbbpe_notices_cache', JSON.stringify(parsedNotices));
        setUseFallbackReader(false);
      } else {
        setUseFallbackReader(true);
        const cached = SafeStorage.getItem('wbbpe_notices_cache');
        if (cached) {
          setNotices(JSON.parse(cached));
        }
      }
    } catch (error) {
      console.error('Drive fetch error:', error);
      setUseFallbackReader(true);
      const cached = SafeStorage.getItem('wbbpe_notices_cache');
      if (cached) {
        setNotices(JSON.parse(cached));
      }
    }
    setNoticesLoading(false);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleApplyFilter = (mode: 'all' | 'holiday' | 'observation') => {
    setCurrentHolidayFilter(mode);
    (window as any).holidayFilter = mode;
    if (typeof (window as any).setHolidayFilter === 'function') {
      (window as any).setHolidayFilter(mode);
    } else if (typeof (window as any).renderList === 'function') {
      (window as any).renderList();
    }
  };

  // On-Screen Print Preview Modal State
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    docType: PreviewDocType;
    htmlContent: string;
    orientation: 'portrait' | 'landscape';
    downloadHandler?: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    docType: 'routine',
    htmlContent: '',
    orientation: 'portrait'
  });

  // Notification & Reminder States
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(getReminderSettings());
  const [notifPermission, setNotifPermission] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [inAppToast, setInAppToast] = useState<ReminderPayload | null>(null);
  const [reminderStatusMsg, setReminderStatusMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  // Speech Synthesis & Accessibility States
  const [speechState, setSpeechState] = useState<SpeechState>(getSpeechState());
  const [showTranscript, setShowTranscript] = useState(false);
  const [autoSpeakDaily, setAutoSpeakDailyState] = useState<boolean>(getAutoSpeakSetting());
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const handleDownloadPdf = async (mode: PlannerPdfMode = 'both') => {
    const schoolNameInput = document.getElementById('schoolNameInput') as HTMLInputElement | null;
    const name = schoolNameInput?.value || customSchool || getSchoolName();
    if (name) {
      saveSchoolName(name);
      setCustomSchool(name);
    }
    
    setPdfModalType('planner');
    setIsPdfModalOpen(true);
    setIsPdfLoading(true);
    setDownloadBlob(null);
    setPdfStatusMsg('ছুটির প্ল্যানার PDF প্রস্তুত করা হচ্ছে... অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন');
    try {
      const res = await downloadHolidayPlannerPDF(mode, name);
      setDownloadBlob({ url: res.blobUrl, filename: res.filename });
      setPdfStatusMsg('✅ ছুটির প্ল্যানার PDF সফলভাবে তৈরি হয়েছে এবং ডাউনলোড শুরু হয়েছে!');
    } catch (err) {
      console.error('Holiday planner PDF error:', err);
      setPdfStatusMsg('❌ PDF ডাউনলোডে সমস্যা হয়েছে। প্রিন্ট অপশন বা সরাসরি ট্রাই করুন।');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleDownloadRoutinePdf = async () => {
    const schoolNameInput = document.getElementById('schoolNameInput') as HTMLInputElement | null;
    const name = schoolNameInput?.value || customSchool || getSchoolName();
    if (name) {
      saveSchoolName(name);
      setCustomSchool(name);
    }

    setPdfModalType('routine');
    setIsPdfModalOpen(true);
    setIsPdfLoading(true);
    setDownloadBlob(null);
    setPdfStatusMsg('মাস্টার ক্লাস রুটিন PDF প্রস্তুত করা হচ্ছে... অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন');
    try {
      const res = await downloadMasterRoutinePDF(name);
      setDownloadBlob({ url: res.blobUrl, filename: res.filename });
      setPdfStatusMsg('✅ মাস্টার ক্লাস রুটিন PDF সফলভাবে তৈরি হয়েছে এবং ডাউনলোড শুরু হয়েছে!');
    } catch (err) {
      console.error('Master routine PDF error:', err);
      setPdfStatusMsg('❌ PDF ডাউনলোডে কোনো সমস্যা হলে নিচের প্রিন্ট প্রিভিউ বাটনে ক্লিক করে "Save as PDF" বেছে নিন।');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const openPlannerPdfModal = (mode?: PlannerPdfMode) => {
    setPdfModalType('planner');
    setIsPdfModalOpen(true);
    setDownloadBlob(null);
    if (mode) {
      handleDownloadPdf(mode);
    } else {
      setPdfStatusMsg(null);
    }
  };

  const openRoutinePdfModal = (autoDownload = false) => {
    const schoolNameInput = document.getElementById('schoolNameInput') as HTMLInputElement | null;
    const name = schoolNameInput?.value || customSchool || getSchoolName();
    if (name) {
      saveSchoolName(name);
      setCustomSchool(name);
    }

    setPdfModalType('routine');
    setIsPdfModalOpen(true);
    setDownloadBlob(null);
    if (autoDownload) {
      handleDownloadRoutinePdf();
    } else {
      setPdfStatusMsg(null);
    }
  };

  const handleDownloadLeavePdf = async () => {
    const schoolNameInput = document.getElementById('schoolNameInput') as HTMLInputElement | null;
    const name = schoolNameInput?.value || customSchool || getSchoolName();
    if (name) {
      saveSchoolName(name);
      setCustomSchool(name);
    }

    setPdfModalType('leave');
    setIsPdfModalOpen(true);
    setIsPdfLoading(true);
    setDownloadBlob(null);
    setPdfStatusMsg('ব্যক্তিগত ছুটির খাতা PDF প্রস্তুত করা হচ্ছে... অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন');
    try {
      const res = await downloadLeaveTrackerPDF(name);
      setDownloadBlob({ url: res.blobUrl, filename: res.filename });
      setPdfStatusMsg('✅ ব্যক্তিগত ছুটির খাতা PDF সফলভাবে তৈরি হয়েছে এবং ডাউনলোড শুরু হয়েছে!');
    } catch (err) {
      console.error('Leave register PDF error:', err);
      setPdfStatusMsg('❌ PDF ডাউনলোডে সমস্যা হলে নিচের প্রিন্ট বাটনে ক্লিক করে "Save as PDF" বেছে নিন।');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const openLeavePdfModal = (autoDownload = false) => {
    const schoolNameInput = document.getElementById('schoolNameInput') as HTMLInputElement | null;
    const name = schoolNameInput?.value || customSchool || getSchoolName();
    if (name) {
      saveSchoolName(name);
      setCustomSchool(name);
    }

    setPdfModalType('leave');
    setIsPdfModalOpen(true);
    setDownloadBlob(null);
    if (autoDownload) {
      handleDownloadLeavePdf();
    } else {
      setPdfStatusMsg(null);
    }
  };

  const openScreenPreview = (type: PreviewDocType, subMode?: PlannerPdfMode) => {
    const schoolNameInput = document.getElementById('schoolNameInput') as HTMLInputElement | null;
    const name = (schoolNameInput?.value || customSchool || getSchoolName()).trim();
    if (name) {
      saveSchoolName(name);
      setCustomSchool(name);
    }

    if (type === 'routine') {
      const html = buildMasterRoutineHtml(name);
      setPreviewModal({
        isOpen: true,
        title: 'মাস্টার ক্লাস রুটিন ২০২৬',
        docType: 'routine',
        htmlContent: html,
        orientation: 'landscape',
        downloadHandler: handleDownloadRoutinePdf
      });
    } else if (type === 'leave') {
      const html = buildLeaveTrackerHtml(name);
      setPreviewModal({
        isOpen: true,
        title: 'ব্যক্তিগত ছুটির খাতা ও রেজিস্টার ২০২৬',
        docType: 'leave',
        htmlContent: html,
        orientation: 'portrait',
        downloadHandler: handleDownloadLeavePdf
      });
    } else if (type === 'planner') {
      const html = buildHolidayPlannerHtml(subMode || 'both');
      setPreviewModal({
        isOpen: true,
        title: subMode === 'plans'
          ? 'ব্যক্তিগত ছুটির পরিকল্পনা তালিকা ২০২৬'
          : (subMode === 'official' ? 'WBBPE ৬৫ দিনের সরকারি ছুটির তালিকা ২০২৬' : 'ছুটির প্ল্যানার ও বার্ষিক দিনপঞ্জিকা ২০২৬'),
        docType: 'planner',
        htmlContent: html,
        orientation: 'portrait',
        downloadHandler: () => handleDownloadPdf(subMode || 'both')
      });
    } else if (type === 'official') {
      const html = buildOfficialHolidaysHtml();
      setPreviewModal({
        isOpen: true,
        title: 'WBBPE ৬৫ দিনের অফিশিয়াল ছুটির তালিকা ২০২৬',
        docType: 'official',
        htmlContent: html,
        orientation: 'portrait',
        downloadHandler: () => handleDownloadPdf('official')
      });
    } else if (type === 'diary') {
      const html = buildLessonDiaryHtml(name);
      setPreviewModal({
        isOpen: true,
        title: 'দৈনিক পাঠ পরিকল্পনা (Lesson Diary) ২০২৬',
        docType: 'diary',
        htmlContent: html,
        orientation: 'portrait',
        downloadHandler: async () => {
          setIsPdfLoading(true);
          try {
            await downloadLessonDiaryPDF(name);
          } catch (e) {
            console.error('Lesson diary pdf error:', e);
          } finally {
            setIsPdfLoading(false);
          }
        }
      });
    }
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      setReminderStatusMsg({ type: 'success', text: '✅ ব্রাউজার নোটিফিকেশন সফলভাবে সক্রিয় করা হয়েছে!' });
    } else if (result === 'denied') {
      setReminderStatusMsg({ type: 'error', text: '⚠️ ব্রাউজারে নোটিফিকেশন ব্লক করা রয়েছে। ব্রাউজার সেটিংসে গিয়ে পারমিশন Allow করুন।' });
    } else {
      setReminderStatusMsg({ type: 'info', text: 'ℹ️ নোটিফিকেশন পারমিশন মুলতুবি রয়েছে।' });
    }
  };

  const handleSaveReminder = () => {
    const updated = saveReminderSettings(reminderSettings);
    setReminderSettings(updated);
    setReminderStatusMsg({
      type: 'success',
      text: `✅ রিমাইন্ডার সফলভাবে সেভ করা হয়েছে (${updated.enabled ? `সকাল ${updated.time} টায় চালু` : 'বন্ধ'})!`
    });
    setTimeout(() => {
      setReminderStatusMsg(null);
    }, 4000);
  };

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    try {
      const res = await triggerTestNotification();
      setNotifPermission(getNotificationPermissionStatus());
      setReminderStatusMsg({
        type: res.browserFired ? 'success' : 'info',
        text: res.message
      });
    } catch (e) {
      console.error('Test notification error:', e);
      setReminderStatusMsg({ type: 'error', text: '❌ নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।' });
    } finally {
      setIsTestingNotif(false);
    }
  };

  useEffect(() => {
    bindToWindow();
    initApp();
    setCustomSchool(getSchoolName());
    setSchoolLogo(SafeStorage.getItem('school_custom_logo') || '');
    setLogoAlignment((SafeStorage.getItem('school_custom_logo_align') as any) || 'center');
    
    const savedScale = SafeStorage.getItem('school_custom_logo_scale');
    setLogoScale(savedScale ? parseInt(savedScale, 10) : 50);
    const savedGrayscale = SafeStorage.getItem('school_custom_logo_grayscale');
    setLogoGrayscale(savedGrayscale === 'true');
    setPdfWatermark(SafeStorage.getItem('pdf_watermark') || '');
    setPdfDateLang((SafeStorage.getItem('pdf_date_lang') as 'bn' | 'en') || 'bn');

    // Initialize notification settings & status
    setNotifPermission(getNotificationPermissionStatus());
    const initialSettings = getReminderSettings();
    setReminderSettings(initialSettings);
    startReminderScheduler();

    const unsubSpeech = subscribeSpeechState(setSpeechState);

    const handleInAppNotif = (e: any) => {
      if (e.detail) {
        setInAppToast(e.detail);
      }
    };
    window.addEventListener('wbbpe-inapp-notification', handleInAppNotif);

    const w = window as any;
    w.downloadHolidayPlannerPDF = (mode: PlannerPdfMode) => handleDownloadPdf(mode);
    w.downloadOfficialHolidayPdf = () => handleDownloadPdf('official');
    w.downloadMasterRoutinePDF = () => handleDownloadRoutinePdf();
    w.downloadLeaveTrackerPDF = () => handleDownloadLeavePdf();
    w.openPlannerPdfModal = (mode?: PlannerPdfMode) => openPlannerPdfModal(mode);
    w.openRoutinePdfModal = (autoDownload?: boolean) => openRoutinePdfModal(autoDownload);
    w.openLeavePdfModal = (autoDownload?: boolean) => openLeavePdfModal(autoDownload);
    w.openScreenPreview = (type: PreviewDocType, subMode?: PlannerPdfMode) => openScreenPreview(type, subMode);
    w.exportMasterRoutinePDF = () => openScreenPreview('routine');
    w.printLeaveRegister = () => openScreenPreview('leave');
    w.printHolidayPlanList = () => openScreenPreview('planner', 'plans');
    w.printOfficialHolidays = () => openScreenPreview('official');
    w.printLessonDiary = () => openScreenPreview('diary');
    w.speakDailyHolidayUpdate = () => speakDailyHolidayUpdate();
    w.speakDaySignificance = (iso: string) => speakDaySignificance(iso);
    w.stopSpeech = () => stopSpeech();

    // Initialize assembly player
    setTimeout(() => {
      w.renderAssemblyStudio?.();
    }, 50);

    return () => {
      unsubSpeech();
      window.removeEventListener('wbbpe-inapp-notification', handleInAppNotif);
    };
  }, []);

  return (
    <div className="w-full" style={{ paddingBottom: '85px' }}>
      {/* FLOATING IN-APP NOTIFICATION BANNER */}
      {inAppToast && (
        <div
          id="inAppToast"
          className="no-print"
          style={{
            position: 'fixed',
            top: '10px',
            left: '12px',
            right: '12px',
            maxWidth: '430px',
            margin: '0 auto',
            zIndex: 99999,
            background: '#ffffff',
            borderRadius: '14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.22), 0 0 0 1.5px #3b82f6',
            padding: '12px 14px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>🔔</span>
              <b style={{ fontSize: '12.5px', color: '#1e3a8a' }}>{inAppToast.title}</b>
            </div>
            <button
              onClick={() => setInAppToast(null)}
              style={{
                border: 'none',
                background: '#f1f5f9',
                color: '#64748b',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {inAppToast.sections.map((sec, idx) => (
              <div
                key={idx}
                style={{
                  background: '#f8fafc',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#1e293b' }}>
                  <span>{sec.icon}</span>
                  <div>
                    <span style={{ fontWeight: 700, color: '#0369a1', marginRight: '4px' }}>{sec.label}:</span>
                    <span>{sec.text}</span>
                  </div>
                </div>
                {sec.tabTarget && (
                  <button
                    onClick={() => {
                      (window as any).tab(sec.tabTarget);
                      setInAppToast(null);
                    }}
                    style={{
                      background: '#dbeafe',
                      color: '#1e40af',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '3px 7px',
                      fontSize: '9.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    দেখুন ➔
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              onClick={() => setInAppToast(null)}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '10.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: Calendar */}
      <div id="p1">
      {/* HEADER */}
      <div 
        style={{ 
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', 
          borderRadius: '16px', 
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', 
          padding: '16px',
          margin: '0 12px 12px 12px' 
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>🏫 WBBPE Teacher Calendar</h2>
        <p style={{ margin: '4px 0 12px', fontSize: '11px', color: '#bfdbfe', opacity: 0.95 }}>অফিশিয়াল ছুটির তালিকা | Routine + Leave Pro</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.1fr', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px', color: '#fff' }}>
            <small style={{ fontSize: '9.5px', color: '#bfdbfe', fontWeight: 600 }}>আজ</small>
            <h4 id="todayTxt" style={{ margin: '4px 0', fontSize: '12.5px', fontWeight: 700 }}></h4>
            <span id="todayStatus" style={{ fontSize: '10px', fontWeight: 600, color: '#e0f2fe' }}></span>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px', color: '#fff' }}>
            <small style={{ fontSize: '9.5px', color: '#bfdbfe', fontWeight: 600 }}>পরবর্তী ছুটি</small>
            <h4 id="nextTxt" style={{ margin: '4px 0', fontSize: '12.5px', fontWeight: 700, lineHeight: 1.2 }}>--</h4>
            <span id="nextDate" style={{ fontSize: '10px', fontWeight: 600, color: '#e0f2fe' }}></span>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px', color: '#fff' }}>
            <small style={{ fontSize: '9.5px', color: '#bfdbfe', fontWeight: 600 }}>বাকি ছুটি</small>
            <h4 id="remHolidayTxt" style={{ margin: '4px 0', fontSize: '12.5px', fontWeight: 700 }}>--</h4>
            <span style={{ fontSize: '9px', fontWeight: 600, color: '#10b981', background: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '8px', display: 'inline-block', marginTop: '2px' }}>
              CL বাকি: ১৪
            </span>
          </div>
        </div>

        {/* DAILY VOICE BULLETIN & ACCESSIBILITY CONTROLS */}
        <div style={{ marginTop: '12px' }}>
          {!speechState.isSpeaking ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '24px', padding: '6px 12px' }}>
              <button
                id="dailyVoiceUpdateBtn"
                onClick={() => speakDailyHolidayUpdate()}
                aria-label="আজকের ছুটির আপডেট শুনুন"
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '2px 0'
                }}
              >
                <span style={{ fontSize: '15px' }}>🔊</span>
                <span>অডিও আপডেট</span>
              </button>
              
              <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '8px', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '8px' }}>
                {[0.8, 1.0, 1.2].map(r => (
                  <button
                    key={r}
                    onClick={() => setSpeechRate(r)}
                    style={{ border: 'none', background: speechState.rate === r ? '#ffffff' : 'transparent', color: speechState.rate === r ? '#1e40af' : '#ffffff', padding: '2px 6px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {r === 0.8 ? '০.৮x' : (r === 1.0 ? '১.০x' : '১.২x')}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowTranscript(v => !v)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '14px', cursor: 'pointer', padding: '2px' }}
                title="টেক্সট ট্রান্সক্রিপ্ট"
              >
                📝
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#ffffff', borderRadius: '24px', padding: '6px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div className="sound-wave-bars" style={{ color: '#059669' }}>
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#065f46', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {speechState.isPaused ? '⏸️ পজ রয়েছে' : '🔊 আপডেট পড়া হচ্ছে...'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => speechState.isPaused ? resumeSpeech() : pauseSpeech()}
                  style={{ background: '#d1fae5', border: 'none', color: '#065f46', borderRadius: '12px', padding: '4px 10px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {speechState.isPaused ? '▶️ চালু' : '⏸️ বিরতি'}
                </button>
                <button
                  onClick={() => stopSpeech()}
                  style={{ background: '#fee2e2', border: 'none', color: '#991b1b', borderRadius: '12px', padding: '4px 10px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                >
                  ⏹️ থামান
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ACCESSIBLE SPOKEN TRANSCRIPT CARD */}
      {showTranscript && (
        <div
          id="speechTranscriptCard"
          className="card"
          style={{
            margin: '8px 12px 0',
            background: '#f8fafc',
            border: '1.5px solid #93c5fd',
            borderRadius: '12px',
            padding: '12px'
          }}
          aria-live="polite"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px' }}>📜</span>
              <b style={{ fontSize: '12px', color: '#1e40af' }}>আজকের দিনপঞ্জিকা ও ছুটির সম্পূর্ণ বিবরণ (Transcript)</b>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => {
                  const info = getDayUpdateInfo();
                  navigator.clipboard.writeText(info.fullSpeechScript);
                  setCopiedTranscript(true);
                  setTimeout(() => setCopiedTranscript(false), 2500);
                }}
                style={{
                  background: copiedTranscript ? '#dcfce7' : '#e0e7ff',
                  color: copiedTranscript ? '#15803d' : '#3730a3',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '3px 7px',
                  fontSize: '9.5px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {copiedTranscript ? '✓ কপি হয়েছে' : '📋 কপি'}
              </button>
              <button
                onClick={() => setShowTranscript(false)}
                style={{
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '3px 7px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ fontSize: '11px', lineHeight: 1.6, color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(() => {
              const info = getDayUpdateInfo();
              return (
                <>
                  <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700, color: '#0369a1' }}>📅 তারিখ ও দিন: </span>
                    <span>{info.bengaliDateStr} ({info.dayOfWeek})</span>
                  </div>
                  <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700, color: '#059669' }}>🏫 বিদ্যালয় স্থিতি: </span>
                    <span>{info.schoolStatus}</span>
                  </div>
                  <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700, color: '#d97706' }}>🌟 দিবসের তাৎপর্য ও গুরুত্ব: </span>
                    <span>{info.importance}</span>
                  </div>
                  <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700, color: '#7c3aed' }}>⏳ পরবর্তী ছুটি: </span>
                    <span>{info.nextHolidayInfo}</span>
                  </div>
                  <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700, color: '#db2777' }}>📝 ছুটির স্থিতি: </span>
                    <span>{info.leaveBalanceInfo}</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

        {/* MORNING ASSEMBLY QUICK AUDIO LAUNCHER */}
        <div
          className="card"
          id="morningAssemblyQuickCard"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '10px 14px',
            margin: '0 12px 12px 12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>🇮🇳</span>
              <b style={{ fontSize: '13px', color: '#1e293b' }}>প্রার্থনাসভা</b>
            </div>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => (window as any).jumpToAssemblyAndPlay?.('anthem')}
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '20px',
                  color: '#166534',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>▶️</span>
                <span>জাতীয় সঙ্গীত</span>
              </button>
              <button
                onClick={() => (window as any).jumpToAssemblyAndPlay?.('vande')}
                style={{
                  background: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: '20px',
                  color: '#6b21a8',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>🌸</span>
                <span>বন্দে মাতরম্</span>
              </button>
            </div>
          </div>
        </div>

        <div className="card" id="calCard">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '13px' }}>📅 ক্যালেন্ডার</h4>
            <div>
              <button onClick={() => (window as any).move(-1)} style={{ border: 'none', background: '#dbeafe', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}>&#8249;</button>
              <span id="mon" style={{ fontWeight: 700, margin: '0 6px', fontSize: '12px' }}></span>
              <button onClick={() => (window as any).move(1)} style={{ border: 'none', background: '#dbeafe', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}>&#8250;</button>
            </div>
          </div>

          {/* CALENDAR MODE SELECTOR (DAY DETAIL vs RANGE & WORKING DAYS) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '6px', marginTop: '8px' }}>
            <button
              id="calModeDayBtn"
              onClick={() => (window as any).setCalSelectionMode('day')}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: '1px solid #2563eb',
                borderRadius: '8px',
                padding: '6px 4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>🔘</span> দিন বিবরণ
            </button>
            <button
              id="calModeRangeBtn"
              onClick={() => (window as any).setCalSelectionMode('range')}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>📊</span> রেঞ্জ ও কার্যদিবস গণক
            </button>
          </div>

          {/* RANGE SELECTOR HELPER PANEL */}
          <div
            id="calRangePanel"
            style={{
              display: 'none',
              background: '#f8fafc',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              padding: '8px',
              marginTop: '8px'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ fontSize: '9.5px', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '2px' }}>শুরুর তারিখ:</label>
                <input
                  type="date"
                  id="rangeFromInput"
                  style={{ width: '100%', padding: '4px 6px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  onChange={(e) => {
                    const toVal = (document.getElementById('rangeToInput') as HTMLInputElement)?.value;
                    if (e.target.value) {
                      (window as any).setDateRange(e.target.value, toVal || e.target.value);
                    }
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9.5px', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '2px' }}>শেষের তারিখ:</label>
                <input
                  type="date"
                  id="rangeToInput"
                  style={{ width: '100%', padding: '4px 6px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  onChange={(e) => {
                    const fromVal = (document.getElementById('rangeFromInput') as HTMLInputElement)?.value;
                    if (e.target.value && fromVal) {
                      (window as any).setDateRange(fromVal, e.target.value);
                    }
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '6px' }}>
              <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>⚡ দ্রুত রেঞ্জ বাছুন:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                <button onClick={() => (window as any).quickSelectRange('this_month')} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}>📅 এই মাস</button>
                <button onClick={() => (window as any).quickSelectRange('summer')} style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '6px', padding: '3px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}>☀️ গ্রীষ্মাবকাশ</button>
                <button onClick={() => (window as any).quickSelectRange('puja')} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', padding: '3px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}>🪔 পূজাবকাশ</button>
                <button onClick={() => (window as any).quickSelectRange('next_7')} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}>⏩ ৭ দিন</button>
                <button onClick={() => (window as any).quickSelectRange('next_30')} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}>⏩ ৩০ দিন</button>
                <button onClick={() => (window as any).clearDateRange()} style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', padding: '3px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 700 }}>✕ রিসেট</button>
              </div>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#2563eb', fontWeight: 600 }}>
              💡 ক্যালেন্ডারের যেকোনো দুটি দিনে স্পর্শ করে সরাসরি শুরু ও সমাপ্তি নির্বাচন করুন।
            </p>
          </div>

          <p style={{ fontSize: '10px', color: '#64748b', margin: '6px 0 0 0', textAlign: 'right' }}>👈 সোয়াইপ করে মাস পরিবর্তন করুন 👉</p>
          <div className="cal" style={{ margin: '8px 0', fontWeight: 700, color: '#475569', fontSize: '10px' }}>
            <div style={{ color: '#ef4444' }}>রবি</div><div>সোম</div><div>মঙ্গল</div><div>বুধ</div><div>বৃহ</div><div>শুক্র</div><div>শনি</div>
          </div>
          <div className="cal" id="cal"></div>
        </div>

        {/* AUTOMATIC DATE RANGE & WORKING DAYS ANALYSIS CONTAINER */}
        <div id="rangeAnalysisArea"></div>

        <div className="card">
          <h4 style={{ margin: 0, fontSize: '13px' }}>🎉 এই মাসের ছুটির তালিকা</h4>
          <div id="monthList" style={{ fontSize: '12px', marginTop: '6px' }}></div>
        </div>
      </div>

      {/* TAB 2: 65 Days List */}
      <div id="p2" style={{ display: 'none' }}>
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e3a8a' }}>📋 WBBPE সরকারি ছুটির দিনপঞ্জিকা ২০২৬</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>৬৫ দিনের তালিকা</span>
            <span style={{ background: '#fce7f3', color: '#be185d', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>পালনীয় দিবস</span>
            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>অফিশিয়াল PDF</span>
            <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>স্মার্ট সার্চ</span>
          </div>
        </div>
        <div className="card">
          <h4 style={{ margin: '0 0 6px 0', fontSize: '13px' }}>📋 অফিশিয়াল ছুটির তালিকা (২০২৬)</h4>
          <input id="search" placeholder="ছুটি খুঁজুন..." onInput={() => (window as any).renderList()} />
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            <button 
              className="btn" 
              style={{ 
                background: currentHolidayFilter === 'holiday' ? '#b91c1c' : '#ef4444', 
                padding: '6px',
                border: currentHolidayFilter === 'holiday' ? '2px solid #7f1d1d' : 'none',
                fontWeight: currentHolidayFilter === 'holiday' ? 800 : 500
              }} 
              onClick={() => handleApplyFilter('holiday')}
            >
              ছুটি
            </button>
            <button 
              className="btn" 
              style={{ 
                background: currentHolidayFilter === 'observation' ? '#4338ca' : '#6366f1', 
                padding: '6px',
                border: currentHolidayFilter === 'observation' ? '2px solid #312e81' : 'none',
                fontWeight: currentHolidayFilter === 'observation' ? 800 : 500
              }} 
              onClick={() => handleApplyFilter('observation')}
            >
              পালনীয়
            </button>
            <button 
              className="btn b" 
              style={{ 
                padding: '6px',
                background: currentHolidayFilter === 'all' ? '#1e3a8a' : '#2563eb',
                border: currentHolidayFilter === 'all' ? '2px solid #1e40af' : 'none',
                fontWeight: currentHolidayFilter === 'all' ? 800 : 500
              }} 
              onClick={() => handleApplyFilter('all')}
            >
              সব
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', marginTop: '8px' }}>
            <button
              className="btn b"
              style={{ padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              onClick={() => handleDownloadPdf('official')}
            >
              📥 ৬৫ দিনের তালিকা PDF
            </button>
            <button
              className="btn"
              style={{ background: '#2563eb', color: '#fff', padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: 'none', borderRadius: '8px', fontWeight: 700 }}
              onClick={() => openScreenPreview('official')}
            >
              👁️ প্রিভিউ ও প্রিন্ট
            </button>
          </div>
          <div id="fullList" style={{ marginTop: '8px', maxHeight: '520px', overflow: 'auto' }}></div>
        </div>
      </div>

      {/* TAB 3: Holiday Planner */}
      <div id="p3" style={{ display: 'none' }}>
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e3a8a' }}>✈️ ছুটির প্ল্যানার ও ভ্রমণ সহায়িকা</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>মাল্টি-ডেট সিলেকশন</span>
            <span style={{ background: '#fce7f3', color: '#be185d', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>ট্যুর নোটস</span>
            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>বাজেট ও অ্যালার্ট</span>
            <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>ব্যক্তিগত প্ল্যান প্রিন্ট</span>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#1e40af', fontSize: '13px' }}>✈️ ছুটির দিনের প্ল্যানার ও ট্রাভেল নোট</h4>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => openPlannerPdfModal()}
                style={{ background: '#1e40af', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10.5px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                📥 PDF
              </button>
              <button
                onClick={() => openScreenPreview('planner', 'both')}
                style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10.5px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                👁️ প্রিভিউ
              </button>
            </div>
          </div>
          <p style={{ fontSize: '10px', color: '#64748b', margin: '3px 0 6px' }}>ক্যালেন্ডারে ইচ্ছামতো একাধিক দিন স্পর্শ করে সিলেক্ট করুন</p>

          <div className="card" id="planCalCard" style={{ background: '#f8fafc', padding: '8px', borderRadius: '12px', border: '1px solid #cbd5e1', margin: '0 0 8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>📅 ছুটির ক্যালেন্ডার (একাধিক দিন বাছুন):</span>
              <div>
                <button onClick={() => (window as any).movePlanCal(-1)} style={{ border: 'none', background: '#e2e8f0', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>&#8249;</button>
                <span id="planCalMon" style={{ fontWeight: 700, fontSize: '11px', margin: '0 4px' }}></span>
                <button onClick={() => (window as any).movePlanCal(1)} style={{ border: 'none', background: '#e2e8f0', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>&#8250;</button>
              </div>
            </div>
            <p style={{ fontSize: '9px', color: '#64748b', margin: '0 0 4px 0', textAlign: 'right' }}>👈 সোয়াইপ করুন 👉</p>
            <div className="cal" style={{ margin: '4px 0', fontWeight: 700, fontSize: '9px', color: '#475569' }}>
              <div style={{ color: '#ef4444' }}>রবি</div><div>সোম</div><div>মঙ্গল</div><div>বুধ</div><div>বৃহ</div><div>শুক্র</div><div>শনি</div>
            </div>
            <div className="cal" id="planCalGrid"></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '10.5px' }}>
              <span>সিলেক্টেড দিন: <b id="planSelectedCountTxt" style={{ color: '#2563eb' }}>০ দিন</b></span>
              <button onClick={() => (window as any).resetPlanDates()} style={{ border: 'none', background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}>সব ক্লিয়ার করুন</button>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 700 }}>পরিকল্পনার ধরন:</label>
                <select id="planCategory" onChange={(e) => (window as any).toggleCustomCategory(e.target.value)}>
                  <option value="সরকারি ছুটির ট্যুর">সরকারি ছুটির ট্যুর</option>
                  <option value="CL নিয়ে লম্বা ভ্রমণ">CL নিয়ে লম্বা ভ্রমণ</option>
                  <option value="উইকেন্ড / রবিবার প্ল্যান">উইকেন্ড / রবিবার প্ল্যান</option>
                  <option value="পুজো পরিক্রমা">পুজো পরিক্রমা</option>
                  <option value="পারিবারিক অনুষ্ঠান">পারিবারিক অনুষ্ঠান</option>
                  <option value="তীর্থযাত্রা">তীর্থযাত্রা</option>
                  <option value="পড়াশোনা / প্রস্তুতি">পড়াশোনা / প্রস্তুতি</option>
                  <option value="CUSTOM">অন্যান্য (নিজে লিখুন)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 700 }}>মোট দিন:</label>
                <input type="text" id="planDaysCount" defaultValue="০ দিন" readOnly style={{ background: '#e2e8f0', fontWeight: 700, textAlign: 'center' }} />
              </div>
            </div>

            <div id="customCatBox" style={{ display: 'none', marginTop: '4px' }}>
              <input type="text" id="customCatInput" placeholder="পরিকল্পনার নিজস্ব ধরন লিখুন..." />
            </div>

            <input type="text" id="planTitle" placeholder="পরিকল্পনার শিরোনাম (যেমন: দিঘা সফর / দার্জিলিং ট্যুর)" style={{ marginTop: '6px' }} />
            <textarea id="planDetails" rows={2} placeholder="হোটেল বুকিং, ট্রেনের সময়, বাজেট বা কেনাকাটার নোট..."></textarea>
            <button className="btn b" onClick={() => (window as any).saveHolidayPlan()} style={{ marginTop: '8px', padding: '9px' }}>➕ প্ল্যান সেভ করুন</button>
          </div>

          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h5 style={{ margin: 0, fontSize: '12px' }}>সংরক্ষিত প্ল্যান তালিকা:</h5>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => openPlannerPdfModal()}
                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10.5px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  📥 PDF
                </button>
                <button
                  onClick={() => openScreenPreview('planner', 'plans')}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10.5px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  👁️ প্রিভিউ ও প্রিন্ট
                </button>
              </div>
            </div>
            <div id="holidayPlanListArea" style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}></div>
          </div>
        </div>
      </div>

      {/* TAB 4: Class Routine */}
      <div id="p4" style={{ display: 'none' }}>
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e3a8a' }}>📚 সাপ্তাহিক মাস্টার ক্লাস রুটিন নির্মাতা</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>WBBPE সময়সূচি</span>
            <span style={{ background: '#fce7f3', color: '#be185d', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>সোম-শুক্র ও শনিবারের ক্লাস</span>
            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>শিক্ষক বণ্টন</span>
            <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>A4 ল্যান্ডস্কেপ প্রিন্ট</span>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '13px' }}>📚 কাস্টম ক্লাস রুটিন নির্মাতা</h4>
            <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
              WBBPE ২০২৬
            </span>
          </div>
          <p id="routineSubTxt" style={{ fontSize: '10px', color: '#64748b', margin: '2px 0' }}>WBBPE নিয়মানুযায়ী সময়সূচি (৩:৩০ পর্যন্ত ক্লাস)</p>

          {/* PDF Customization Accordion */}
          <details style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px', marginTop: '10px' }}>
            <summary style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e3a8a', cursor: 'pointer', outline: 'none', userSelect: 'none' }}>
              ⚙️ বিদ্যালয় লোগো, জলছাপ ও PDF সেটিংস (ট্যাপ করে খুলুন/লুকান) ▼
            </summary>
            
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* School Name and Logo input */}
              <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#1e3a8a' }}>🏫 বিদ্যালয়ের নাম ও লোগো:</label>
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  <input
                    type="text"
                    id="schoolNameInput"
                    placeholder="যেমন: পশ্চিমবঙ্গ প্রাথমিক বিদ্যালয়"
                    value={customSchool}
                    onChange={(e) => {
                      setCustomSchool(e.target.value);
                      saveSchoolName(e.target.value);
                    }}
                    style={{ margin: 0, flex: 1 }}
                  />
                  <button
                    className="btn b"
                    onClick={() => {
                      saveSchoolName(customSchool);
                      alert('বিদ্যালয়ের নাম সংরক্ষিত হয়েছে!');
                    }}
                    style={{ width: '70px', padding: '6px' }}
                  >
                    সেভ
                  </button>
                </div>
                 <div style={{ display: 'flex', gap: '4px', marginTop: '6px', alignItems: 'center' }}>
                   <input
                     type="file"
                     accept="image/*"
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         const reader = new FileReader();
                         reader.onload = (ev) => {
                           const base64 = ev.target?.result as string;
                           SafeStorage.setItem('school_custom_logo', base64);
                           setSchoolLogo(base64);
                           alert('লোগো সফলভাবে আপলোড ও সংরক্ষিত হয়েছে!');
                         };
                         reader.readAsDataURL(file);
                       }
                     }}
                     style={{ fontSize: '10px', padding: '4px' }}
                   />
                   <button
                     className="btn"
                     onClick={() => {
                       SafeStorage.setItem('school_custom_logo', '');
                       setSchoolLogo('');
                       alert('লোগো মুছে ফেলা হয়েছে!');
                     }}
                     style={{ background: '#ef4444', color: 'white', padding: '4px 8px', fontSize: '10px' }}
                   >
                     মুছুন
                   </button>
                </div>
                {schoolLogo && (
                  <div style={{ marginTop: '8px', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>লোগো প্রিভিউ:</div>
                    <div style={{ textAlign: logoAlignment as any }}>
                      <img src={schoolLogo} alt="School Logo Preview" style={{ maxHeight: `${logoScale}px`, maxWidth: '100%', objectFit: 'contain', filter: logoGrayscale ? 'grayscale(100%)' : 'none' }} />
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input type="radio" name="logoAlign" checked={logoAlignment === 'left'} onChange={() => { setLogoAlignment('left'); SafeStorage.setItem('school_custom_logo_align', 'left'); }} />
                        বাম (Left)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input type="radio" name="logoAlign" checked={logoAlignment === 'center'} onChange={() => { setLogoAlignment('center'); SafeStorage.setItem('school_custom_logo_align', 'center'); }} />
                        মাঝখানে (Center)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input type="radio" name="logoAlign" checked={logoAlignment === 'right'} onChange={() => { setLogoAlignment('right'); SafeStorage.setItem('school_custom_logo_align', 'right'); }} />
                        ডান (Right)
                      </label>
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '10px' }}>
                      <label style={{ color: '#475569', fontWeight: 600 }}>লোগো সাইজ:</label>
                      <input 
                        type="range" 
                        min="20" 
                        max="150" 
                        value={logoScale} 
                        onChange={(e) => { 
                          const val = parseInt(e.target.value, 10);
                          setLogoScale(val); 
                          SafeStorage.setItem('school_custom_logo_scale', val.toString()); 
                        }} 
                        style={{ width: '100px' }}
                      />
                      <span style={{ color: '#64748b', width: '30px' }}>{logoScale}px</span>
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#475569', fontWeight: 600 }}>
                        <input type="checkbox" checked={logoGrayscale} onChange={(e) => { setLogoGrayscale(e.target.checked); SafeStorage.setItem('school_custom_logo_grayscale', e.target.checked ? 'true' : 'false'); }} />
                        সাদা-কালো (Grayscale)
                      </label>
                    </div>
                  </div>
                )}
              </div>
    
              <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>PDF জলছাপ (Watermark):</label>
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  <input
                    type="text"
                    placeholder="e.g. Draft, School Copy"
                    value={pdfWatermark}
                    onChange={(e) => {
                      setPdfWatermark(e.target.value);
                      SafeStorage.setItem('pdf_watermark', e.target.value);
                    }}
                    style={{ margin: 0, flex: 1 }}
                  />
                </div>
                <p style={{ fontSize: '9px', color: '#94a3b8', margin: '4px 0 0 0' }}>পিডিএফ পেজের আড়াআড়িভাবে এই লেখাটি দেখা যাবে।</p>
              </div>
    
              <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>PDF-এ তারিখের ভাষা:</label>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="pdfDateLang"
                      checked={pdfDateLang === 'bn'}
                      onChange={() => {
                        setPdfDateLang('bn');
                        SafeStorage.setItem('pdf_date_lang', 'bn');
                      }}
                    />
                    বাংলা (Bengali)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="pdfDateLang"
                      checked={pdfDateLang === 'en'}
                      onChange={() => {
                        setPdfDateLang('en');
                        SafeStorage.setItem('pdf_date_lang', 'en');
                      }}
                    />
                    ইংরেজি (English)
                  </label>
                </div>
              </div>
            </div>
          </details>

          <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>বিদ্যালয়ের শিক্ষকদের তালিকা (কমা দিয়ে লিখুন):</label>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              <input type="text" id="teacherListInput" placeholder="যেমন: শিক্ষক ১, শিক্ষক ২, শিক্ষক ৩" style={{ margin: 0 }} />
              <button className="btn b" onClick={() => (window as any).saveTeacherList()} style={{ width: '70px', padding: '6px' }}>সেভ</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            <select id="classSelect" onChange={() => (window as any).renderRoutine()}>
              <option value="shishu">প্রাক-প্রাথমিক</option>
              <option value="class1">প্রথম শ্রেণি</option>
              <option value="class2">দ্বিতীয় শ্রেণি</option>
              <option value="class3">তৃতীয় শ্রেণি</option>
              <option value="class4">চতুর্থ শ্রেণি</option>
              <option value="class5">পঞ্চম শ্রেণি</option>
            </select>
            <select id="daySelect" onChange={() => (window as any).renderRoutine()}>
              <option value="weekday">সোম–শুক্র (পূর্ণ দিবস)</option>
              <option value="sat">শনিবার (অর্ধ দিবস)</option>
            </select>
          </div>
          <div id="routineArea"></div>

          {/* ACTIONS */}
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px' }}>
              <button
                className="btn g"
                onClick={() => openRoutinePdfModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  padding: '10px 8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
                }}
              >
                📥 মাস্টার শিট PDF
              </button>
              <button
                className="btn b"
                onClick={() => openScreenPreview('routine')}
                style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                👁️ অন-স্ক্রিন প্রিভিউ ও প্রিন্ট
              </button>
            </div>
            <button className="btn o" onClick={() => (window as any).shareRoutineWA()} style={{ padding: '8px', fontSize: '11px' }}>
              💬 রুটিন হোয়াটসঅ্যাপে শেয়ার
            </button>
          </div>
        </div>
      </div>

      {/* TAB 5: Personal Leave Tracker */}
      <div id="p5" style={{ display: 'none' }}>
        <LeaveApplicationGenerator />
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e3a8a' }}>📝 শিক্ষক ছুটির রেজিস্টার ও খাতা</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>১৪টি CL হিসাব</span>
            <span style={{ background: '#fce7f3', color: '#be185d', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>মেডিকেল লিভ লগ</span>
            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>অটো ব্যালেন্স সতর্কতা</span>
            <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>অফিশিয়াল সিল ও স্বাক্ষর শিট</span>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#1e40af', fontSize: '13px' }}>📝 ব্যক্তিগত ছুটির খাতা</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="badge" style={{ background: '#2563eb', fontSize: '10.5px' }}>CL বাকি: <b id="clRemaining">14</b>/14</span>
              <button
                onClick={() => openLeavePdfModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '3px 7px',
                  borderRadius: '6px',
                  fontSize: '10.5px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                }}
                title="ছুটির খাতা PDF ডাউনলোড করুন"
              >
                📥 PDF
              </button>
              <button
                onClick={() => openScreenPreview('leave')}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '3px 7px',
                  borderRadius: '6px',
                  fontSize: '10.5px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
                title="ছুটির খাতা অন-স্ক্রিন প্রিভিউ ও প্রিন্ট"
              >
                👁️ প্রিভিউ
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', margin: '12px 0', textAlign: 'center' }}>
            <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <small style={{ fontSize: '10px', color: '#1e40af' }}>ব্যবহৃত CL</small>
              <h3 id="clUsed" style={{ margin: '2px 0', color: '#1d4ed8' }}>0</h3>
            </div>
            <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '10px', border: '1px solid #fecaca' }}>
              <small style={{ fontSize: '10px', color: '#991b1b' }}>Medical Leave</small>
              <h3 id="medUsed" style={{ margin: '2px 0', color: '#b91c1c' }}>0</h3>
            </div>
            <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <small style={{ fontSize: '10px', color: '#166534' }}>অন্যান্য</small>
              <h3 id="otherUsed" style={{ margin: '2px 0', color: '#15803d' }}>0</h3>
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: '#475569' }}>নতুন ছুটির এন্ট্রি করুন:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div><label style={{ fontSize: '10px' }}>তারিখ:</label><input type="date" id="leaveDate" /></div>
              <div>
                <label style={{ fontSize: '10px' }}>ছুটির ধরন:</label>
                <select id="leaveType">
                  <option value="CL">Casual Leave (CL)</option>
                  <option value="ML">Medical Leave (ML)</option>
                  <option value="Commuted">Commuted Leave</option>
                  <option value="Special">Special Leave</option>
                  <option value="Other">অন্যান্য</option>
                </select>
              </div>
            </div>
            <input type="text" id="leaveReason" placeholder="কারণ (যেমন: ব্যক্তিগত কাজ, অসুস্থতা)" style={{ marginTop: '6px' }} />
            <button className="btn b" onClick={() => (window as any).addLeaveEntry()} style={{ marginTop: '8px', padding: '9px' }}>➕ ছুটি সেভ করুন</button>
          </div>
          <div id="clWarning" style={{ display: 'none', marginTop: '10px', background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '8px', borderRadius: '8px', fontSize: '11px', textAlign: 'center', fontWeight: 700 }}></div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h5 style={{ margin: 0, fontSize: '12px' }}>গৃহীত ছুটির হিস্ট্রি:</h5>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => openLeavePdfModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                  }}
                >
                  📥 PDF
                </button>
                <button
                  onClick={() => openScreenPreview('leave')}
                  style={{
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  👁️ প্রিভিউ ও প্রিন্ট
                </button>
              </div>
            </div>
            <div id="leaveListArea" style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}></div>
          </div>
        </div>
      </div>

      {/* TAB 6: Assembly Guide & Activity */}
      <div id="p6" style={{ display: 'none' }}>
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e3a8a' }}>🎶 প্রাতঃকালীন প্রার্থনাসভা ও সহ-পাঠ্যক্রম স্টুডিও</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>৫২ সেঃ জাতীয় সঙ্গীত</span>
            <span style={{ background: '#fce7f3', color: '#be185d', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>বন্দে মাতরম্</span>
            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>জাতীয় শপথ</span>
            <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>৫ মিনিটের ভাষণ</span>
            <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>লেসন ডায়েরি</span>
          </div>
        </div>
        <div className="card" id="assemblyStudioCard">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '13.5px', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎶</span>
                <span>প্রাতঃকালীন প্রার্থনাসভা, জাতীয় সঙ্গীত ও সহ-পাঠ্যক্রমিক স্টুডিও</span>
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#64748b' }}>
                বিদ্যালয়ের সকালের প্রার্থনা লাইনের জন্য অফলাইন অডিও ও কারাওকে সহায়িকা
              </p>
            </div>
            <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
              অফলাইন অডিও
            </span>
          </div>

          <div id="assemblyStudioContainer">
            {/* Populated dynamically by renderAssemblyStudio() */}
            <div style={{ padding: '24px 10px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
              প্রার্থনাসভা স্টুডিও প্রস্তুত হচ্ছে...
            </div>
          </div>
        </div>

        <div className="card">
          <h4 style={{ margin: 0, fontSize: '13px' }}>🎨 শ্রেণিভিত্তিক ছড়া, গান, অঙ্কন ও বিশেষ অ্যাক্টিভিটি</h4>
          <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 6px' }}>শ্রেণি নির্বাচন করে উপযুক্ত অ্যাক্টিভিটির তালিকা দেখুন</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <select id="actClassSelect" onChange={() => (window as any).renderActivityContent()}>
              <option value="shishu">প্রাক-প্রাথমিক</option>
              <option value="class1">প্রথম শ্রেণি</option>
              <option value="class2">দ্বিতীয় শ্রেণি</option>
              <option value="class3">তৃতীয় শ্রেণি</option>
              <option value="class4">চতুর্থ শ্রেণি</option>
              <option value="class5">পঞ্চম শ্রেণি</option>
            </select>
            <select id="actTypeSelect" onChange={() => (window as any).renderActivityContent()}>
              <option value="rhyme">ছড়া ও আবৃত্তি</option>
              <option value="song">গান ও সমবেত সঙ্গীত</option>
              <option value="draw">অঙ্কন ও চারুকলা</option>
              <option value="special">বিশেষ অ্যাক্টিভিটি / খেলা</option>
            </select>
          </div>
          <div id="activityDisplayBox" className="speech-box" style={{ borderLeftColor: '#10b981', marginTop: '8px' }}></div>
        </div>

        <div className="card">
          <h4 style={{ margin: 0, fontSize: '13px' }}>📖 দৈনিক পাঠ পরিকল্পনা (Lesson Diary)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
            <input type="date" id="diaryDate" />
            <select id="diaryClass">
              <option value="শিশু শ্রেণি">শিশু শ্রেণি</option>
              <option value="প্রথম শ্রেণি">প্রথম শ্রেণি</option>
              <option value="দ্বিতীয় শ্রেণি">দ্বিতীয় শ্রেণি</option>
              <option value="তৃতীয় শ্রেণি">তৃতীয় শ্রেণি</option>
              <option value="চতুর্থ শ্রেণি">চতুর্থ শ্রেণি</option>
              <option value="পঞ্চম শ্রেণি">পঞ্চম শ্রেণি</option>
            </select>
          </div>
          <input type="text" id="diarySubject" placeholder="বিষয় ও পিরিয়ড (যেমন: বাংলা - ২য়)" />
          <textarea id="diaryTopic" rows={2} placeholder="কী পড়ানো হলো..."></textarea>
          <button className="btn b" onClick={() => (window as any).saveDiaryEntry()} style={{ marginTop: '6px' }}>➕ ডায়েরি সেভ করুন</button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <h5 style={{ margin: 0, fontSize: '11px' }}>আজকের রেকর্ড:</h5>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => openScreenPreview('diary')}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                👁️ প্রিভিউ ও প্রিন্ট
              </button>
              <button
                onClick={async () => {
                  const schoolNameInput = document.getElementById('schoolNameInput') as HTMLInputElement | null;
                  const name = schoolNameInput?.value || customSchool || getSchoolName();
                  await downloadLessonDiaryPDF(name);
                }}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                }}
              >
                📥 PDF
              </button>
            </div>
          </div>
          <div id="diaryListArea" style={{ maxHeight: '160px', overflowY: 'auto', marginTop: '6px' }}></div>
        </div>
      </div>

      {/* TAB 7: Settings & Backup */}
      <div id="p7" style={{ display: 'none' }}>
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e3a8a' }}>⚙️ সেটিংস, রিমাইন্ডার ও ব্যাকআপ</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>দৈনিক পুশ নোটিফিকেশন</span>
            <span style={{ background: '#fce7f3', color: '#be185d', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>JSON ডেটা সেভ ও রিস্টোর</span>
            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>হোয়াটসঅ্যাপ শেয়ার</span>
          </div>
        </div>
        <div className="card">
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>⚙️ ব্যাকআপ ও সেটিংস</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button className="btn b" onClick={() => (window as any).backupJSON()}>💾 ব্যাকআপ ফাইল</button>
            <button className="btn o" onClick={() => document.getElementById('importFile')?.click()}>📂 রিস্টোর করুন</button>
            <input type="file" id="importFile" style={{ display: 'none' }} onChange={(e) => (window as any).restoreJSON(e)} />
          </div>
          <div style={{ marginTop: '10px' }}>
            <button className="btn g" onClick={() => (window as any).speakHoliday()}>🔊 আজকের ছুটির স্ট্যাটাস শুনুন</button>
          </div>
          <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '11px' }}>দৈনিক রিমাইন্ডার:</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="time" id="remTime" defaultValue="07:00" />
              <button className="btn o" onClick={() => (window as any).setRem()} style={{ width: '80px' }}>সেট</button>
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
            <button className="btn b" style={{ padding: '8px 4px', fontSize: '10.5px' }} onClick={() => openPlannerPdfModal()}>📥 ছুটির প্ল্যানার</button>
            <button className="btn g" style={{ padding: '8px 4px', fontSize: '10.5px' }} onClick={() => openRoutinePdfModal(true)}>📥 মাস্টার রুটিন</button>
            <button className="btn o" style={{ padding: '8px 4px', fontSize: '10.5px', background: '#059669' }} onClick={() => openLeavePdfModal(true)}>📥 ছুটির খাতা</button>
          </div>
          <div style={{ marginTop: '6px' }}>
            <button className="btn o" onClick={() => (window as any).shareWA()} style={{ width: '100%' }}>💬 WhatsApp এ অ্যাপ শেয়ার</button>
          </div>
        </div>

        {/* NOTIFICATION & REMINDER CARD */}
        <div className="card" style={{ marginTop: '10px', border: '1.5px solid #bfdbfe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔔</span> দৈনিক নোটিফিকেশন ও রিমাইন্ডার
            </h4>
            <span
              style={{
                fontSize: '9.5px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 700,
                background: notifPermission === 'granted' ? '#dcfce7' : (notifPermission === 'denied' ? '#fee2e2' : '#fef3c7'),
                color: notifPermission === 'granted' ? '#166534' : (notifPermission === 'denied' ? '#991b1b' : '#92400e'),
                border: `1px solid ${notifPermission === 'granted' ? '#86efac' : (notifPermission === 'denied' ? '#fca5a5' : '#fde047')}`
              }}
            >
              {notifPermission === 'granted' && '🟢 অনুমতি সক্রিয়'}
              {notifPermission === 'default' && '🟡 অনুমতি দেওয়া হয়নি'}
              {notifPermission === 'denied' && '🔴 অনুমতি বন্ধ (Blocked)'}
              {notifPermission === 'unsupported' && 'ℹ️ ইন-অ্যাপ সক্রিয়'}
            </span>
          </div>
          <p style={{ fontSize: '10.5px', color: '#64748b', margin: '4px 0 10px' }}>
            ব্রাউজার নোটিফিকেশন API ব্যবহার করে প্রতিদিনের ক্লাস রুটিন, ছুটির আপডেট ও পার্সোনাল লিভ ব্যালেন্স জানুন
          </p>

          {/* PERMISSION CTA IF NOT GRANTED */}
          {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
            <div
              style={{
                background: notifPermission === 'denied' ? '#fff1f2' : '#f0f9ff',
                border: `1px solid ${notifPermission === 'denied' ? '#fecdd3' : '#bae6fd'}`,
                borderRadius: '8px',
                padding: '8px 10px',
                marginBottom: '10px'
              }}
            >
              {notifPermission === 'default' ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10.5px', color: '#0369a1' }}>
                    ব্রাউজারে সরাসরি পপ-আপ অ্যালার্ট পেতে নোটিফিকেশন পারমিশন সক্রিয় করুন:
                  </span>
                  <button
                    onClick={handleRequestPermission}
                    style={{
                      background: '#0284c7',
                      color: '#fff',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    🔔 পারমিশন চালু করুন
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '10px', color: '#991b1b', lineHeight: 1.4 }}>
                  ⚠️ আপনার ব্রাউজারে নোটিফিকেশন অনুমতি ব্লক করা আছে। ব্রাউজারের অ্যাড্রেসবারের বাম পাশের লক (Lock) আইকনে ট্যাপ করে Notifications <b>Allow</b> করুন। (তবে অ্যাপ খোলা থাকলে ইন-অ্যাপ ব্যানার কাজ করবে)।
                </div>
              )}
            </div>
          )}

          {/* TOGGLE & TIME SETTINGS */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' }}>
            {/* Enable switch */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={reminderSettings.enabled}
                onChange={(e) => setReminderSettings(s => ({ ...s, enabled: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                🔔 দৈনিক নোটিফিকেশন সার্ভিস সক্রিয় রাখুন
              </span>
            </label>

            {/* Time input */}
            <div style={{ marginTop: '8px', opacity: reminderSettings.enabled ? 1 : 0.6 }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                ⏰ নোটিফিকেশন পাঠানোর সময়:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="time"
                  id="remTime"
                  value={reminderSettings.time}
                  disabled={!reminderSettings.enabled}
                  onChange={(e) => setReminderSettings(s => ({ ...s, time: e.target.value }))}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    margin: 0,
                    width: '120px'
                  }}
                />
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>(প্রতিদিন স্বয়ংক্রিয়ভাবে অ্যালার্ট আসবে)</span>
              </div>

              {/* Quick Time Presets */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                {['07:00', '07:30', '08:00', '08:30', '09:00'].map((t) => (
                  <button
                    key={t}
                    disabled={!reminderSettings.enabled}
                    onClick={() => setReminderSettings(s => ({ ...s, time: t }))}
                    style={{
                      background: reminderSettings.time === t ? '#2563eb' : '#ffffff',
                      color: reminderSettings.time === t ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '3px 7px',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Checkboxes */}
            <div style={{ marginTop: '12px', borderTop: '1px dashed #e2e8f0', paddingTop: '10px', opacity: reminderSettings.enabled ? 1 : 0.6 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e3a8a', display: 'block', marginBottom: '6px' }}>
                📋 কোন কোন তথ্যের রিমাইন্ডার চান:
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: '#334155' }}>
                  <input
                    type="checkbox"
                    disabled={!reminderSettings.enabled}
                    checked={reminderSettings.routineReminder}
                    onChange={(e) => setReminderSettings(s => ({ ...s, routineReminder: e.target.checked }))}
                    style={{ width: '15px', height: '15px', accentColor: '#2563eb' }}
                  />
                  <span><b>📚 আজকের ক্লাস রুটিন:</b> সোম-শুক্রবার ও শনিবারের পিরিয়ড ও সময়সূচি</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: '#334155' }}>
                  <input
                    type="checkbox"
                    disabled={!reminderSettings.enabled}
                    checked={reminderSettings.leaveReminder}
                    onChange={(e) => setReminderSettings(s => ({ ...s, leaveReminder: e.target.checked }))}
                    style={{ width: '15px', height: '15px', accentColor: '#2563eb' }}
                  />
                  <span><b>📝 ব্যক্তিগত লিভ ব্যালেন্স:</b> অবশিষ্ট CL, ব্যবহৃত ML ও সতর্কবার্তা</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: '#334155' }}>
                  <input
                    type="checkbox"
                    disabled={!reminderSettings.enabled}
                    checked={reminderSettings.holidayReminder}
                    onChange={(e) => setReminderSettings(s => ({ ...s, holidayReminder: e.target.checked }))}
                    style={{ width: '15px', height: '15px', accentColor: '#2563eb' }}
                  />
                  <span><b>📅 ছুটির দিনপঞ্জিকা ও স্থিতি:</b> আজ স্কুল খোলা/ছুটি ও পরবর্তী ছুটি</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: '#334155', marginTop: '2px' }}>
                  <input
                    type="checkbox"
                    disabled={!reminderSettings.enabled}
                    checked={reminderSettings.soundEnabled}
                    onChange={(e) => setReminderSettings(s => ({ ...s, soundEnabled: e.target.checked }))}
                    style={{ width: '15px', height: '15px', accentColor: '#2563eb' }}
                  />
                  <span><b>🔊 অডিও টিউন:</b> রিমাইন্ডারের সাথে মৃদু নোটিফিকেশন শব্দ বাজান</span>
                </label>
              </div>
            </div>
          </div>

          {/* STATUS FEEDBACK MESSAGE */}
          {reminderStatusMsg && (
            <div
              style={{
                marginTop: '10px',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
                textAlign: 'center',
                background: reminderStatusMsg.type === 'success' ? '#f0fdf4' : (reminderStatusMsg.type === 'error' ? '#fef2f2' : '#f0f9ff'),
                color: reminderStatusMsg.type === 'success' ? '#166534' : (reminderStatusMsg.type === 'error' ? '#991b1b' : '#0369a1'),
                border: `1px solid ${reminderStatusMsg.type === 'success' ? '#bbf7d0' : (reminderStatusMsg.type === 'error' ? '#fecaca' : '#bae6fd')}`
              }}
            >
              {reminderStatusMsg.text}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px' }}>
            <button
              className="btn g"
              onClick={handleSaveReminder}
              style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                padding: '10px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              💾 রিমাইন্ডার সেভ করুন
            </button>

            <button
              className="btn b"
              disabled={isTestingNotif}
              onClick={handleTestNotification}
              style={{
                padding: '10px',
                fontSize: '11.5px',
                fontWeight: 700,
                opacity: isTestingNotif ? 0.7 : 1,
                cursor: isTestingNotif ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              {isTestingNotif ? '⏳ পাঠানো হচ্ছে...' : '🧪 টেস্ট নোটিফিকেশন'}
            </button>
          </div>
        </div>

        {/* VOICE SYNTHESIZER & ACCESSIBILITY SETTINGS CARD */}
        <div className="card" style={{ marginTop: '10px', border: '1.5px solid #a7f3d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔊</span> অডিও সহায়িকা ও স্পিচ সিন্থেসিস (Accessibility)
            </h4>
            <span
              style={{
                fontSize: '9.5px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 700,
                background: '#dcfce7',
                color: '#166534',
                border: '1px solid #86efac'
              }}
            >
              বাংলা কণ্ঠ সক্রিয়
            </span>
          </div>
          <p style={{ fontSize: '10.5px', color: '#64748b', margin: '4px 0 10px' }}>
            দৃষ্টিপ্রতিবন্ধী বা বিশেষ চাহিদাসম্পন্ন শিক্ষক-শিক্ষিকা ও পাঠকদের জন্য আজকের ছুটির গুরুত্ব, বিদ্যালয় স্থিতি ও ছুটির আপডেট পড়ে শোনানো হয়।
          </p>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px' }}>
            {/* Speed Rate Control */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#065f46', display: 'block', marginBottom: '4px' }}>
                🗣️ অডিও পাঠের গতি (Speech Rate):
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { r: 0.8, label: '০.৮x (ধীর ও স্পষ্ট)' },
                  { r: 1.0, label: '১.০x (স্বাভাবিক)' },
                  { r: 1.2, label: '১.২x (দ্রুত)' }
                ].map(({ r, label }) => (
                  <button
                    key={r}
                    onClick={() => setSpeechRate(r)}
                    style={{
                      flex: 1,
                      background: speechState.rate === r ? '#059669' : '#ffffff',
                      color: speechState.rate === r ? '#ffffff' : '#334155',
                      border: `1px solid ${speechState.rate === r ? '#059669' : '#cbd5e1'}`,
                      borderRadius: '8px',
                      padding: '6px 4px',
                      fontSize: '10.5px',
                      fontWeight: speechState.rate === r ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Read on Open */}
            <div style={{ borderTop: '1px dashed #bbf7d0', paddingTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={autoSpeakDaily}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAutoSpeakDailyState(checked);
                    setAutoSpeakSetting(checked);
                  }}
                  style={{ width: '15px', height: '15px', accentColor: '#059669' }}
                />
                <span><b>🚀 স্বয়ংক্রিয় অডিও নোটিশ:</b> ক্যালেন্ডার খোলার সময় স্বয়ংক্রিয়ভাবে আজকের ছুটির আপডেট পড়ে শোনান</span>
              </label>
            </div>
          </div>

          {/* Action Buttons: Test Voice & Stop */}
          <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px' }}>
            <button
              className="btn g"
              onClick={() => speakDailyHolidayUpdate()}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                padding: '10px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>🔊</span> আজকের আপডেট শুনুন
            </button>

            <button
              className="btn r"
              onClick={() => stopSpeech()}
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fca5a5',
                padding: '10px',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>⏹️</span> ভয়েস বন্ধ করুন
            </button>
          </div>
        </div>
      </div>

      {/* TAB 8: More Menu */}
      <div id="p8" style={{ display: 'none' }}>
        <PDFStudio />
        <DocumentScanner />
        <PhotoSignatureResizer />
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', padding: '20px 16px', borderRadius: '16px', color: '#fff', marginBottom: '16px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>বিদ্যালয় সহায়িকা</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>স্মার্ট টুলস ও সেটিংস</p>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {/* Group 1 */}
          <div className="card" style={{ padding: '0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>
              দিনপঞ্জিকা ও ট্রাভেল
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#e2e8f0' }}>
              <div onClick={() => (window as any).tab(2)} style={{ background: '#fff', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ fontSize: '26px', marginBottom: '8px' }}>📋</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>৬৫ দিনের তালিকা</div>
                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>অফিশিয়াল পর্ষদ ছুটি</div>
              </div>
              <div onClick={() => (window as any).tab(3)} style={{ background: '#fff', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ fontSize: '26px', marginBottom: '8px' }}>✈️</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>ছুটির প্ল্যানার</div>
                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>ভ্রমণ ও নোটস</div>
              </div>
            </div>
          </div>

          {/* Group 2 */}
          <div className="card" style={{ padding: '0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>
              অফিশিয়াল কাজ ও অন্যান্য
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px', background: '#e2e8f0' }}>
              <div onClick={() => (window as any).tab(6)} style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '16px', cursor: 'pointer', gap: '16px', transition: 'background 0.2s' }}>
                <div style={{ fontSize: '28px' }}>🎶</div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>প্রার্থনাসভা ও ডায়েরি</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>জাতীয় সঙ্গীত, শপথ, লেসন ডায়েরি</div>
                </div>
              </div>
              <div onClick={() => (window as any).tab(7)} style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '16px', cursor: 'pointer', gap: '16px', transition: 'background 0.2s' }}>
                <div style={{ fontSize: '28px' }}>⚙️</div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>সেটিংস ও ব্যাকআপ</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>রিমাইন্ডার, PDF জলছাপ, JSON ডেটা</div>
                </div>
              </div>
            </div>
          </div>

          {/* Group 3: Notice */}
          <div className="card" style={{ padding: '0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>
              নোটিশ ও আপডেট
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px', background: '#e2e8f0' }}>
              <div onClick={() => (window as any).tab(9)} style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '16px', cursor: 'pointer', gap: '16px', transition: 'background 0.2s' }}>
                <div style={{ fontSize: '28px' }}>📢</div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>WBBPE নোটিশ বোর্ড</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>সার্কুলার, অফিশিয়াল নোটিশ ও PDF</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 9: Notice Board */}
      <div id="p9" style={{ display: 'none' }}>
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e3a8a' }}>📢 WBBPE নোটিশ ও সার্কুলার হাব</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>লাইভ সিঙ্ক</span>
            <span style={{ background: '#fce7f3', color: '#be185d', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>PDF রিডার</span>
            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: 600 }}>হোয়াটসঅ্যাপ শেয়ার</span>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '13px' }}>নোটিশ বোর্ড (Google Drive)</h4>
            <button 
              className="btn" 
              style={{ padding: '6px 12px', fontSize: '11px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600 }}
              onClick={fetchNotices}
            >
              {noticesLoading ? '⏳ লোড হচ্ছে...' : '🔄 নতুন নোটিশ চেক করুন'}
            </button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <input 
              type="text" 
              placeholder="🔍 নোটিশ খুঁজুন..." 
              value={noticeSearch}
              onChange={e => setNoticeSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
            />
          </div>

          {useFallbackReader ? (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '8px', background: '#f8fafc', fontSize: '10px', color: '#64748b', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
                সরাসরি ড্রাইভ ভিউ (Direct Fallback Reader)
              </div>
              <iframe 
                src="https://drive.google.com/embeddedfolderview?id=1n4GnPQeu_XWgUx_mDW7_Omm8HvLJ7hRv#list" 
                style={{ width: '100%', height: '400px', border: 'none' }}
                title="WBBPE Notices"
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {notices.filter(n => n.title.toLowerCase().includes(noticeSearch.toLowerCase())).map(notice => (
                <div 
                  key={notice.id} 
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', cursor: 'pointer' }}
                  onClick={() => window.open('https://drive.google.com/drive/folders/1n4GnPQeu_XWgUx_mDW7_Omm8HvLJ7hRv', '_blank', 'noopener noreferrer')}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{notice.title}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '10px' }}>📅 {notice.date}</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <a 
                      href="https://drive.google.com/drive/folders/1n4GnPQeu_XWgUx_mDW7_Omm8HvLJ7hRv" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ flex: 1, textAlign: 'center', background: '#1e3a8a', color: '#fff', textDecoration: 'none', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      📄 PDF দেখুন
                    </a>
                    <a 
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`📢 *WBBPE Notice:*\n${notice.title}\n\n📄 Folder Link: https://drive.google.com/drive/folders/1n4GnPQeu_XWgUx_mDW7_Omm8HvLJ7hRv`)}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ flex: 1, textAlign: 'center', background: '#22c55e', color: '#fff', textDecoration: 'none', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      💬 শেয়ার
                    </a>
                  </div>
                </div>
              ))}
              {notices.filter(n => n.title.toLowerCase().includes(noticeSearch.toLowerCase())).length === 0 && !noticesLoading && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '12px' }}>
                  কোনো নোটিশ পাওয়া যায়নি।
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <a 
              href="https://drive.google.com/drive/folders/1n4GnPQeu_XWgUx_mDW7_Omm8HvLJ7hRv" 
              target="_blank" 
              rel="noreferrer"
              style={{ fontSize: '11px', color: '#3b82f6', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              📂 সরাসরি অফিসিয়াল ড্রাইভ ফোল্ডার খুলুন ↗
            </a>
          </div>
        </div>
      </div>

      {/* BOTTOM TABS - Modern 4 Main Tabs */}
      <div className="tabs">
        <div id="t1" className="act" onClick={() => (window as any).tab(1)}>📅<br />ক্যালেন্ডার</div>
        <div id="t4" onClick={() => (window as any).tab(4)}>📚<br />রুটিন</div>
        <div id="t5" onClick={() => (window as any).tab(5)}>📝<br />Leave</div>
        <div id="t8" onClick={() => (window as any).tab(8)}>☰<br />মেনু</div>
      </div>

      {/* PDF DOWNLOAD MODAL */}
      {isPdfModalOpen && (
        <div
          className="pdf-modal-overlay no-print"
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(2px)'
          }}
          onClick={() => {
            if (!isPdfLoading) setIsPdfModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '18px',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '360px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', color: '#1e40af', fontWeight: 800 }}>
                {pdfModalType === 'routine'
                  ? '📥 মাস্টার ক্লাস রুটিন PDF ডাউনলোড'
                  : (pdfModalType === 'leave' ? '📥 ব্যক্তিগত ছুটির খাতা PDF ডাউনলোড' : '📥 ছুটির প্ল্যানার ও তালিকা PDF ডাউনলোড')}
              </h4>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                disabled={isPdfLoading}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontWeight: 800, color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {pdfModalType === 'routine' ? (
              <div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 10px' }}>
                  <b>বিদ্যালয়:</b> {customSchool || 'পশ্চিমবঙ্গ প্রাথমিক বিদ্যালয়'}<br />
                  <span style={{ fontSize: '10px', color: '#64748b' }}>(A4 ল্যান্ডস্কেপ ফরম্যাটে সম্পূর্ণ সাপ্তাহিক মাস্টার শিট)</span>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    disabled={isPdfLoading}
                    onClick={handleDownloadRoutinePdf}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      textAlign: 'left',
                      cursor: isPdfLoading ? 'not-allowed' : 'pointer',
                      opacity: isPdfLoading ? 0.7 : 1
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12.5px' }}>📥 সম্পূর্ণ মাস্টার শিট PDF ফাইল সেভ করুন</div>
                    <div style={{ fontSize: '9.5px', opacity: 0.9 }}>সোমবার-শুক্রবার + শনিবারের বিশেষ রুটিন ও শিক্ষক বণ্টন</div>
                  </button>

                  <button
                    disabled={isPdfLoading}
                    onClick={() => {
                      setIsPdfModalOpen(false);
                      const schoolNameInput = document.getElementById('schoolNameInput') as HTMLInputElement | null;
                      const name = schoolNameInput?.value || customSchool || getSchoolName();
                      (window as any).exportMasterRoutinePDF(name);
                    }}
                    style={{
                      background: '#1e40af',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      textAlign: 'left',
                      cursor: isPdfLoading ? 'not-allowed' : 'pointer',
                      opacity: isPdfLoading ? 0.7 : 1
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12px' }}>📄 প্রিন্ট বা সরাসরি "Save as PDF" অপশন</div>
                    <div style={{ fontSize: '9.5px', opacity: 0.9 }}>ব্রাউজারের বিল্ট-ইন প্রিন্টার ডায়ালগ ওপেন করুন</div>
                  </button>
                </div>
              </div>
            ) : pdfModalType === 'leave' ? (
              <div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 10px' }}>
                  <b>বিদ্যালয়:</b> {customSchool || 'পশ্চিমবঙ্গ প্রাথমিক বিদ্যালয়'}<br />
                  <span style={{ fontSize: '10px', color: '#64748b' }}>(A4 পোর্ট্রেট ফরম্যাটে সম্পূর্ণ ছুটির হিসাব, রেজিস্টার ও অফিশিয়াল সিল)</span>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    disabled={isPdfLoading}
                    onClick={handleDownloadLeavePdf}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      textAlign: 'left',
                      cursor: isPdfLoading ? 'not-allowed' : 'pointer',
                      opacity: isPdfLoading ? 0.7 : 1
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12.5px' }}>📥 সম্পূর্ণ ছুটির রেজিস্টার PDF ফাইল সেভ করুন</div>
                    <div style={{ fontSize: '9.5px', opacity: 0.9 }}>ব্যবহৃত CL, অবশিষ্ট CL স্থিতি, মেডিকেল লিভ ও গৃহীত ছুটির লগ</div>
                  </button>

                  <button
                    disabled={isPdfLoading}
                    onClick={() => {
                      setIsPdfModalOpen(false);
                      const schoolNameInput = document.getElementById('schoolNameInput') as HTMLInputElement | null;
                      const name = schoolNameInput?.value || customSchool || getSchoolName();
                      (window as any).printLeaveRegister(name);
                    }}
                    style={{
                      background: '#1e40af',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      textAlign: 'left',
                      cursor: isPdfLoading ? 'not-allowed' : 'pointer',
                      opacity: isPdfLoading ? 0.7 : 1
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12px' }}>📄 প্রিন্ট বা সরাসরি "Save as PDF" অপশন</div>
                    <div style={{ fontSize: '9.5px', opacity: 0.9 }}>ব্রাউজারের বিল্ট-ইন প্রিন্টার ডায়ালগ ওপেন করুন</div>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 10px' }}>
                  আপনি যে ধরনের PDF ডাউনলোড করতে চান তা বেছে নিন:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    disabled={isPdfLoading}
                    onClick={() => handleDownloadPdf('both')}
                    style={{
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px',
                      textAlign: 'left',
                      cursor: isPdfLoading ? 'not-allowed' : 'pointer',
                      opacity: isPdfLoading ? 0.7 : 1
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12px' }}>🌟 সম্পূর্ণ প্ল্যানার ও ছুটির দিনপঞ্জিকা (প্রস্তাবিত)</div>
                    <div style={{ fontSize: '9.5px', opacity: 0.9 }}>আপনার ব্যক্তিগত ট্রাভেল প্ল্যান + ৬৫ দিনের সরকারি ছুটির তালিকা</div>
                  </button>

                  <button
                    disabled={isPdfLoading}
                    onClick={() => handleDownloadPdf('plans')}
                    style={{
                      background: '#059669',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px',
                      textAlign: 'left',
                      cursor: isPdfLoading ? 'not-allowed' : 'pointer',
                      opacity: isPdfLoading ? 0.7 : 1
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12px' }}>✈️ শুধুমাত্র আমার সংরক্ষিত প্ল্যান তালিকা</div>
                    <div style={{ fontSize: '9.5px', opacity: 0.9 }}>কাস্টম ট্যুর, ভ্রমণ নোট ও তারিখসমূহ</div>
                  </button>

                  <button
                    disabled={isPdfLoading}
                    onClick={() => handleDownloadPdf('official')}
                    style={{
                      background: '#dc2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px',
                      textAlign: 'left',
                      cursor: isPdfLoading ? 'not-allowed' : 'pointer',
                      opacity: isPdfLoading ? 0.7 : 1
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12px' }}>📋 শুধুমাত্র পর্ষদ অনুমোদিত ৬৫ দিনের তালিকা</div>
                    <div style={{ fontSize: '9.5px', opacity: 0.9 }}>পশ্চিমবঙ্গ প্রাথমিক শিক্ষা পর্ষদ অনুমোদিত সরকারি দিনপঞ্জিকা</div>
                  </button>
                </div>
              </div>
            )}

            {/* STATUS OR SPINNER */}
            {pdfStatusMsg && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  background: isPdfLoading ? '#eff6ff' : (pdfStatusMsg.includes('✅') ? '#f0fdf4' : '#fef2f2'),
                  color: isPdfLoading ? '#1e40af' : (pdfStatusMsg.includes('✅') ? '#166534' : '#991b1b'),
                  border: `1px solid ${isPdfLoading ? '#bfdbfe' : (pdfStatusMsg.includes('✅') ? '#bbf7d0' : '#fecaca')}`,
                  textAlign: 'center',
                  fontWeight: 600
                }}
              >
                {isPdfLoading && <span style={{ display: 'inline-block', marginRight: '6px', animation: 'spin 1s linear infinite' }}>⏳</span>}
                {pdfStatusMsg}
              </div>
            )}

            {/* FALLBACK DIRECT DOWNLOAD BUTTON */}
            {downloadBlob && (
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <a
                  href={downloadBlob.url}
                  download={downloadBlob.filename}
                  style={{
                    display: 'inline-block',
                    background: '#15803d',
                    color: '#fff',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '11.5px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                  }}
                >
                  📥 সরাসরি ডিভাইসে PDF সেভ করুন
                </a>
              </div>
            )}

            <div style={{ marginTop: '12px', display: 'flex', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              <button
                onClick={() => {
                  setIsPdfModalOpen(false);
                  if (pdfModalType === 'routine') {
                    openScreenPreview('routine');
                  } else if (pdfModalType === 'leave') {
                    openScreenPreview('leave');
                  } else {
                    openScreenPreview('planner', 'both');
                  }
                }}
                style={{
                  flex: 1,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  padding: '7px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                👁️ অন-স্ক্রিন প্রিভিউ
              </button>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                disabled={isPdfLoading}
                style={{
                  flex: 1,
                  background: '#e2e8f0',
                  border: 'none',
                  color: '#1e293b',
                  padding: '7px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ON-SCREEN PRINT PREVIEW MODAL */}
      <OnScreenPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        title={previewModal.title}
        docType={previewModal.docType}
        htmlContent={previewModal.htmlContent}
        orientation={previewModal.orientation}
        onDownloadPdf={previewModal.downloadHandler}
        isDownloading={isPdfLoading}
      />

      {/* POPUP MODAL */}
      <div
        id="dayPopup"
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,.5)',
          zIndex: 9999,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
        onClick={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: '16px',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '330px',
            textAlign: 'center'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h4 id="popTitle" style={{ margin: '0 0 4px', fontSize: '14px' }}></h4>
          <p id="popDate" style={{ fontSize: '12px', color: '#64748b', margin: '0 0 6px' }}></p>
          <p id="popDesc" style={{ fontSize: '13px', margin: '0 0 8px' }}></p>

          <div
            id="popSignificanceBox"
            style={{
              display: 'none',
              textAlign: 'left',
              background: '#f1f5f9',
              borderLeft: '3px solid #2563eb',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '11px',
              lineHeight: 1.5,
              maxHeight: '140px',
              overflowY: 'auto',
              margin: '8px 0'
            }}
          ></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' }}>
            <button className="btn g" id="noticeBtn" onClick={() => (window as any).sendWhatsAppNotice()}>নোটিশ পাঠান</button>
            <button className="btn o" id="significanceBtn" onClick={() => (window as any).toggleSignificance()}>দিবসের তাৎপর্য</button>
          </div>
          <button
            className="btn"
            id="popSpeakBtn"
            style={{
              marginTop: '6px',
              width: '100%',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 700
            }}
            onClick={() => (window as any).speakCurrentPopupDay()}
          >
            <span>🔊</span> গুরুত্ব ও স্থিতি শুনুন
          </button>
          <button
            className="btn"
            id="popRangeBtn"
            style={{
              marginTop: '6px',
              width: '100%',
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1.5px solid #93c5fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 700
            }}
            onClick={() => (window as any).startRangeFromPopup()}
          >
            <span>📊</span> এই দিন থেকে কার্যদিবস ও ছুটির রেঞ্জ মাপুন
          </button>
          <button
            className="btn b"
            style={{ marginTop: '6px' }}
            onClick={() => {
              const popup = document.getElementById('dayPopup');
              if (popup) popup.style.display = 'none';
            }}
          >
            ঠিক আছে
          </button>
        </div>
      </div>

      {/* MASTER ROUTINE PRINT CONTAINER */}
      <div id="masterPrintArea" style={{ display: 'none' }}></div>

      {/* PLANNER PRINT CONTAINER */}
      <div id="planPrintArea" style={{ display: 'none' }}></div>

      {/* LEAVE REGISTER PRINT CONTAINER */}
      <div id="leavePrintArea" style={{ display: 'none' }}></div>
    </div>
  );
}
