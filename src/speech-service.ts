import { holidays, daySignificanceData, Holiday } from './data/holidays';
import { getMyLeaves, LeaveItem } from './app-engine';

export interface SpeechState {
  isSpeaking: boolean;
  isPaused: boolean;
  currentTitle: string;
  currentText: string;
  rate: number;
}

export interface DayUpdateInfo {
  dateIso: string;
  bengaliDateStr: string;
  dayOfWeek: string;
  schoolStatus: string;
  holidayName: string | null;
  isHoliday: boolean;
  isSunday: boolean;
  isObservance: boolean;
  importance: string;
  nextHolidayInfo: string;
  leaveBalanceInfo: string;
  fullSpeechScript: string;
}

const STORAGE_KEY_RATE = 'wbbpe_speech_rate_2026';
const STORAGE_KEY_AUTO = 'wbbpe_speech_auto_daily';

// Initial state
let currentRate: number = 0.9;
try {
  const savedRate = localStorage.getItem(STORAGE_KEY_RATE);
  if (savedRate) {
    const parsed = parseFloat(savedRate);
    if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 1.5) {
      currentRate = parsed;
    }
  }
} catch (e) {}

let state: SpeechState = {
  isSpeaking: false,
  isPaused: false,
  currentTitle: '',
  currentText: '',
  rate: currentRate
};

const listeners = new Set<(state: SpeechState) => void>();

function notifyListeners() {
  listeners.forEach(cb => {
    try {
      cb({ ...state });
    } catch (e) {
      console.error('Error in speech listener:', e);
    }
  });
}

export function subscribeSpeechState(callback: (state: SpeechState) => void): () => void {
  listeners.add(callback);
  callback({ ...state });
  return () => {
    listeners.delete(callback);
  };
}

export function getSpeechState(): SpeechState {
  return { ...state };
}

export function setSpeechRate(rate: number): void {
  currentRate = Math.max(0.5, Math.min(1.5, rate));
  state.rate = currentRate;
  try {
    localStorage.setItem(STORAGE_KEY_RATE, String(currentRate));
  } catch (e) {}
  notifyListeners();
}

export function getAutoSpeakSetting(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_AUTO) === 'true';
  } catch (e) {
    return false;
  }
}

export function setAutoSpeakSetting(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTO, enabled ? 'true' : 'false');
  } catch (e) {}
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

// Bengali Day Names
const bengaliDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const bengaliMonths = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

// Convert standard numbers to Bengali digits
export function toBengaliNumber(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, d => bnDigits[parseInt(d, 10)]);
}

/**
 * Strip HTML tags and clean up string for speech synthesis
 */
function cleanTextForSpeech(html: string): string {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, 'এবং')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

/**
 * Generate comprehensive daily holiday update & importance information for any date
 */
export function getDayUpdateInfo(targetDate?: Date | string): DayUpdateInfo {
  let dt: Date;
  if (!targetDate) {
    dt = new Date();
  } else if (typeof targetDate === 'string') {
    dt = new Date(targetDate + 'T00:00:00');
  } else {
    dt = targetDate;
  }

  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const dateIso = `${y}-${m}-${d}`;

  const dayOfWeek = bengaliDays[dt.getDay()];
  const bengaliDateStr = `${toBengaliNumber(dt.getDate())}ই ${bengaliMonths[dt.getMonth()]} ${toBengaliNumber(dt.getFullYear())}`;

  const isSunday = dt.getDay() === 0;
  const holiday = holidays.find(h => h.date === dateIso) || null;
  const isHoliday = !!(holiday && holiday.isHoliday);
  const isObservance = !!(holiday && !holiday.isHoliday);
  const holidayName = holiday ? holiday.name : null;

  // School status
  let schoolStatus = '';
  let speechStatus = '';
  if (isHoliday) {
    schoolStatus = `আজ পর্ষদ অনুমোদিত ছুটি: ${holidayName}`;
    speechStatus = `পর্ষদ নির্দেশিকা অনুযায়ী আজ বিদ্যালয় সম্পূর্ণ ছুটি। ছুটির উপলক্ষ: ${holidayName}।`;
  } else if (isObservance) {
    if (isSunday) {
      schoolStatus = `রবিবার ছুটি ও পালনীয় দিবস: ${holidayName}`;
      speechStatus = `আজ রবিবার সাপ্তাহিক ছুটির দিন, এবং একই সাথে ${holidayName} পালনীয় দিবস।`;
    } else {
      schoolStatus = `পালনীয় দিবস - স্কুল খোলা: ${holidayName}`;
      speechStatus = `আজ ${holidayName} পালনীয় দিবস। আজ বিদ্যালয় খোলা আছে এবং বিশেষ মর্যাদায় দিবসটি উদযাপিত হবে।`;
    }
  } else if (isSunday) {
    schoolStatus = 'রবিবার সাপ্তাহিক ছুটি (বিদ্যালয় বন্ধ)';
    speechStatus = 'আজ রবিবার সাপ্তাহিক ছুটির দিন। বিদ্যালয়ের সকল পঠনপাঠন কর্মসূচি বন্ধ থাকবে।';
  } else {
    schoolStatus = 'স্বাভাবিক স্কুল খোলা (পঠনপাঠন চালু)';
    speechStatus = 'আজ স্বাভাবিক বিদ্যালয় খোলা রয়েছে। নিয়মিত ক্লাস ও পঠনপাঠন কর্মসূচি চালু আছে।';
  }

  // Day's Importance / Significance
  let rawImportance = daySignificanceData[dateIso];
  if (!rawImportance) {
    if (holiday) {
      rawImportance = `${holiday.name}: পশ্চিমবঙ্গ প্রাথমিক শিক্ষা পর্ষদ নির্দেশিত বার্ষিক দিনপঞ্জিকার বিশেষ দিন।`;
    } else if (isSunday) {
      rawImportance = 'রবিবার সাপ্তাহিক ছুটির দিন। শিক্ষক-শিক্ষিকা ও ছাত্রছাত্রীদের সাপ্তাহিক অবকাশ।';
    } else {
      rawImportance = 'দৈনন্দিন পাঠদান, শিশু-কেন্দ্রিক শিক্ষণ ও বিদ্যালয়ের নিয়মিত কার্যক্রম পরিচালনার স্বাভাবিক দিন।';
    }
  }
  const cleanImportance = cleanTextForSpeech(rawImportance);

  // Next Holiday Info
  const sortedUpcoming = holidays
    .filter(h => h.isHoliday && h.date > dateIso)
    .sort((a, b) => a.date.localeCompare(b.date));

  let nextHolidayInfo = '';
  let speechNextHoliday = '';
  if (sortedUpcoming.length > 0) {
    const nextH = sortedUpcoming[0];
    const nextDt = new Date(nextH.date + 'T00:00:00');
    const diffTime = nextDt.getTime() - dt.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const nextBnDate = `${toBengaliNumber(nextDt.getDate())}ই ${bengaliMonths[nextDt.getMonth()]}`;
    const diffStr = diffDays === 1 ? 'আগামীকাল' : `${toBengaliNumber(diffDays)} দিন পর`;
    nextHolidayInfo = `${nextH.name} (${nextBnDate}, ${diffStr})`;
    speechNextHoliday = `পরবর্তী ছুটি: ${nextH.name}, ${nextBnDate} তারিখে, অর্থাৎ ${diffStr}।`;
  } else {
    nextHolidayInfo = 'চলতি শিক্ষাবর্ষের সকল ছুটি সম্পন্ন হয়েছে';
    speechNextHoliday = 'চলতি ২০২৬ শিক্ষাবর্ষের আর কোনো ছুটি অবশিষ্ট নেই।';
  }

  // Teacher Leave Balance
  let clCount = 14;
  try {
    const leaves = getMyLeaves();
    const usedCl = leaves.filter(l => l.type.includes('CL') || l.type.includes('ক্যাজুয়াল')).length;
    clCount = Math.max(0, 14 - usedCl);
  } catch (e) {}

  const leaveBalanceInfo = `অবশিষ্ট CL: ${toBengaliNumber(clCount)}/১৪`;
  const speechLeaveBalance = `আপনার বর্তমান ক্যাজুয়াল লিভ ব্যালেন্স রয়েছে ${toBengaliNumber(clCount)} দিন।`;

  // Full speech synthesis script designed for crystal-clear auditory comprehension
  const fullSpeechScript = [
    `নমস্কার। পশ্চিমবঙ্গ প্রাথমিক বিদ্যালয় দিনপঞ্জিকা ও দৈনিক অডিও বুলেটিন।`,
    `আজ ${dayOfWeek}, ${bengaliDateStr}।`,
    `বিদ্যালয় স্থিতি: ${speechStatus}`,
    `দিবসের গুরুত্ব ও তাৎপর্য: ${cleanImportance}`,
    `${speechNextHoliday}`,
    `${speechLeaveBalance}`,
    `সকলের জন্য শুভকামনা রইল। ধন্যবাদ।`
  ].join(' ');

  return {
    dateIso,
    bengaliDateStr,
    dayOfWeek,
    schoolStatus,
    holidayName,
    isHoliday,
    isSunday,
    isObservance,
    importance: cleanImportance,
    nextHolidayInfo,
    leaveBalanceInfo,
    fullSpeechScript
  };
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let sentenceQueue: string[] = [];
let currentQueueIndex = 0;

/**
 * Break long text into manageable sentences to prevent Web Speech API cut-offs on mobile/WebKit
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence terminators: Bengali danda (।), period, exclamation, question, or comma
  const parts = text.split(/([।!?\n]+)/g);
  const sentences: string[] = [];
  let current = '';

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    if (!p) continue;
    if (p === '।' || p === '!' || p === '?' || p === '\n') {
      current += p;
      if (current.trim().length > 0) {
        sentences.push(current.trim());
        current = '';
      }
    } else {
      if (current) sentences.push(current.trim());
      current = p;
    }
  }
  if (current.trim().length > 0) {
    sentences.push(current.trim());
  }

  return sentences.filter(s => s.length > 0);
}

/**
 * Find best Bengali voice available in browser, or fallback
 */
function getBestBengaliVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Exact match for bn-IN or bn-BD
  const exactBn = voices.find(v => v.lang === 'bn-IN' || v.lang === 'bn-BD');
  if (exactBn) return exactBn;

  // 2. Language starts with bn
  const bnPrefix = voices.find(v => v.lang.toLowerCase().startsWith('bn'));
  if (bnPrefix) return bnPrefix;

  // 3. Name contains Bengali or Bangla
  const nameBn = voices.find(v => {
    const n = v.name.toLowerCase();
    return n.includes('bengali') || n.includes('bangla') || n.includes('বাংলা');
  });
  if (nameBn) return nameBn;

  // 4. Default voice
  const defaultVoice = voices.find(v => v.default);
  if (defaultVoice) return defaultVoice;

  return voices[0] || null;
}

/**
 * Stop any current speech playback
 */
export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  sentenceQueue = [];
  currentQueueIndex = 0;
  activeUtterance = null;
  state.isSpeaking = false;
  state.isPaused = false;
  state.currentTitle = '';
  state.currentText = '';
  notifyListeners();
}

/**
 * Pause speech
 */
export function pauseSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.pause();
    state.isPaused = true;
    notifyListeners();
  }
}

/**
 * Resume speech
 */
export function resumeSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.resume();
    state.isPaused = false;
    notifyListeners();
  }
}

/**
 * Synthesize and play speech with full accessibility lifecycle
 */
export function speakText(
  text: string,
  title: string = 'অডিও পাঠ',
  options?: { rate?: number; onEnd?: () => void }
): void {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis not supported in this environment');
    alert('আপনার ব্রাউজারে স্পিচ সিন্থেসিস (Speech Synthesis) সমর্থিত নয় বা নিষ্ক্রিয় রয়েছে।');
    return;
  }

  // Stop any active speech
  stopSpeech();

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) return;

  const sentences = splitIntoSentences(cleanText);
  if (sentences.length === 0) return;

  sentenceQueue = sentences;
  currentQueueIndex = 0;

  const targetRate = options?.rate ?? currentRate;

  state.isSpeaking = true;
  state.isPaused = false;
  state.currentTitle = title;
  state.currentText = cleanText;
  state.rate = targetRate;
  notifyListeners();

  function playNextSentence() {
    if (currentQueueIndex >= sentenceQueue.length) {
      // Completed all sentences
      state.isSpeaking = false;
      state.isPaused = false;
      state.currentTitle = '';
      state.currentText = '';
      notifyListeners();
      if (options?.onEnd) options.onEnd();
      return;
    }

    const sentence = sentenceQueue[currentQueueIndex];
    currentQueueIndex++;

    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'bn-BD';
    utterance.rate = targetRate;
    utterance.pitch = 1.0;

    const voice = getBestBengaliVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      // Small pause between sentences for clarity
      setTimeout(() => {
        if (state.isSpeaking && !state.isPaused) {
          playNextSentence();
        }
      }, 120);
    };

    utterance.onerror = (e) => {
      console.error('Speech utterance error:', e);
      // Attempt next sentence or finish
      if (currentQueueIndex >= sentenceQueue.length) {
        state.isSpeaking = false;
        notifyListeners();
      } else {
        playNextSentence();
      }
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // Ensure voices are loaded (on Chromium voices may load asynchronously)
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      playNextSentence();
    };
  } else {
    setTimeout(playNextSentence, 40);
  }
}

/**
 * Speak the daily holiday update & school status for today or any specific date
 */
export function speakDailyHolidayUpdate(targetDate?: Date | string): void {
  const updateInfo = getDayUpdateInfo(targetDate);
  const title = `দৈনিক আপডেট: ${updateInfo.bengaliDateStr} (${updateInfo.dayOfWeek})`;
  speakText(updateInfo.fullSpeechScript, title);
}

/**
 * Speak the status and importance of a specific date (used in Day Popup)
 */
export function speakDaySignificance(dateIso: string): void {
  const updateInfo = getDayUpdateInfo(dateIso);
  const title = `${updateInfo.bengaliDateStr}: গুরুত্ব ও স্থিতি`;
  const text = [
    `তারিখ: ${updateInfo.bengaliDateStr}, ${updateInfo.dayOfWeek}।`,
    `বিদ্যালয় স্থিতি: ${updateInfo.schoolStatus}।`,
    `দিবসের তাৎপর্য ও গুরুত্ব: ${updateInfo.importance}`
  ].join(' ');
  speakText(text, title);
}
