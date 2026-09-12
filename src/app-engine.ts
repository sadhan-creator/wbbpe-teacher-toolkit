import { holidays, daySignificanceData, Holiday } from './data/holidays';
import { fixedClassSchedule, classSubjectOptions, activityBank } from './data/activities';
import { assemblyTexts, assemblySpeeches, assemblyAudioTracks, AudioTrackInfo, LyricsLine } from './data/assembly';
import {
  speakDailyHolidayUpdate,
  speakDaySignificance,
  stopSpeech,
  speakText
} from './speech-service';

export interface LeaveItem {
  id: number;
  date: string;
  type: string;
  reason: string;
}

export interface DiaryItem {
  id: number;
  date: string;
  className: string;
  subject: string;
  topic: string;
}

export interface HolidayPlanItem {
  id: number;
  dates: string[];
  category: string;
  title: string;
  details: string;
}

// Global safe storage
export const SafeStorage = {
  data: {} as Record<string, string>,
  getItem: function(k: string): string | null {
    try { return window.localStorage.getItem(k); } catch (e) { return (this.data as Record<string, string>)[k] || null; }
  },
  setItem: function(k: string, v: string | number): void {
    try { window.localStorage.setItem(k, String(v)); } catch (e) { (this.data as Record<string, string>)[k] = String(v); }
  }
};

export function getLocalDateString(d?: Date): string {
  d = d || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function playBanglaVoice(text: string): void {
  speakText(text, 'অডিও পাঠ');
}

// App State
let cur = new Date(2026, 0, 1);
let holidayFilter: 'all' | 'holiday' | 'observation' = 'all';
let myLeaves: LeaveItem[] = [];
export function getMyLeaves(): LeaveItem[] {
  return myLeaves;
}
let myDiaries: DiaryItem[] = [];
export function getMyDiaries(): DiaryItem[] {
  return myDiaries;
}
export let myHolidayPlans: HolidayPlanItem[] = [];
export function getMyHolidayPlans(): HolidayPlanItem[] {
  return myHolidayPlans;
}
let currentPopupInfo: { date: string; holiday: Holiday | null; isSunday: boolean } | null = null;
let planCalDate = new Date(2026, 0, 1);
let selectedPlanIsoDates: string[] = [];

export function getEvent(s: string): Holiday | null {
  for (let i = 0; i < holidays.length; i++) {
    if (holidays[i].date === s) return holidays[i];
  }
  return null;
}

export function initStorage() {
  try {
    const saved = SafeStorage.getItem('my_school_leaves_2026');
    if (saved) myLeaves = JSON.parse(saved);
    const savedD = SafeStorage.getItem('my_school_diaries_2026');
    if (savedD) myDiaries = JSON.parse(savedD);
    const savedP = SafeStorage.getItem('my_holiday_plans_2026');
    if (savedP) myHolidayPlans = JSON.parse(savedP);
  } catch (e) {
    myLeaves = [];
    myDiaries = [];
    myHolidayPlans = [];
  }
}

export function updateHeaderStats() {
  const today = new Date();
  const todayIso = getLocalDateString(today);
  const todayTxtEl = document.getElementById('todayTxt');
  const todayStatusEl = document.getElementById('todayStatus');
  const nextTxtEl = document.getElementById('nextTxt');
  const nextDateEl = document.getElementById('nextDate');
  const remHolidayTxtEl = document.getElementById('remHolidayTxt');

  // Format today's date in Bengali
  const bnDateStr = today.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  if (todayTxtEl) todayTxtEl.innerText = bnDateStr;

  const todayEv = getEvent(todayIso);
  const isSunday = today.getDay() === 0;
  if (todayStatusEl) {
    if (todayEv && todayEv.isHoliday) {
      todayStatusEl.innerText = 'আজ ছুটি: ' + todayEv.name;
    } else if (todayEv && !todayEv.isHoliday) {
      todayStatusEl.innerText = 'পালনীয় দিবস: ' + todayEv.name;
    } else if (isSunday) {
      todayStatusEl.innerText = 'রবিবার সাপ্তাহিক ছুটি';
    } else {
      todayStatusEl.innerText = 'স্বাভাবিক স্কুল খোলা';
    }
  }

  // Next holiday calculation
  const sortedHolidays = [...holidays].filter(h => h.isHoliday).sort((a, b) => a.date.localeCompare(b.date));
  let nextHoliday = sortedHolidays.find(h => h.date >= todayIso);
  if (!nextHoliday && sortedHolidays.length > 0) {
    nextHoliday = sortedHolidays[0]; // fallback to first holiday of year
  }

  if (nextHoliday) {
    if (nextTxtEl) nextTxtEl.innerText = nextHoliday.name;
    if (nextDateEl) {
      const hd = new Date(nextHoliday.date + 'T00:00:00');
      const todayObj = new Date(todayIso + 'T00:00:00');
      const diffTime = hd.getTime() - todayObj.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const formattedDate = hd.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
      let dayText = '';
      if (diffDays === 0) dayText = 'আজ';
      else if (diffDays > 0) dayText = `${toBengaliNum(diffDays)} দিন বাকি`;
      
      nextDateEl.innerText = `${formattedDate}${dayText ? ' • ' + dayText : ''}`;
    }
  }

  // Remaining holidays
  const remainingCount = sortedHolidays.filter(h => h.date >= todayIso).length;
  if (remHolidayTxtEl) {
    remHolidayTxtEl.innerText = toBengaliNum(remainingCount > 0 ? remainingCount : sortedHolidays.length) + ' দিন';
  }
}

// Calendar Selection Mode ('day' = open day details, 'range' = range & working days calculator)
export let calSelectionMode: 'day' | 'range' = 'day';
export let rangeStartDate: string | null = null;
export let rangeEndDate: string | null = null;

export function toBengaliNum(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, d => bnDigits[parseInt(d, 10)]);
}

export function formatBnDate(iso: string): string {
  if (!iso) return '';
  const dt = new Date(iso + 'T00:00:00');
  if (isNaN(dt.getTime())) return iso;
  const day = toBengaliNum(dt.getDate());
  const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const month = months[dt.getMonth()];
  const year = toBengaliNum(dt.getFullYear());
  return `${day} ${month} ${year}`;
}

export interface DateRangeAnalysis {
  startDate: string;
  endDate: string;
  totalDays: number;
  officialHolidays: Holiday[];
  sundaysCount: number;
  holidaysOnSundayCount: number;
  holidaysOnWeekdayCount: number;
  totalOffDays: number;
  workingDays: number;
  saturdaysCount: number;
  observations: Holiday[];
  dateList: {
    iso: string;
    dayNum: number;
    dayName: string;
    isSunday: boolean;
    isSaturday: boolean;
    isHoliday: boolean;
    isObservation: boolean;
    eventName: string;
  }[];
}

export function analyzeDateRange(startIso: string | null, endIso: string | null): DateRangeAnalysis | null {
  if (!startIso || !endIso) return null;
  let d1 = new Date(startIso + 'T00:00:00');
  let d2 = new Date(endIso + 'T00:00:00');
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  if (d1 > d2) {
    const tmp = d1;
    d1 = d2;
    d2 = tmp;
  }

  const officialHolidays: Holiday[] = [];
  const observations: Holiday[] = [];
  let sundaysCount = 0;
  let holidaysOnSundayCount = 0;
  let holidaysOnWeekdayCount = 0;
  let saturdaysCount = 0;
  let totalOffDays = 0;

  const dateList: DateRangeAnalysis['dateList'] = [];
  const curr = new Date(d1);
  const dayNames = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

  while (curr <= d2) {
    const iso = getLocalDateString(curr);
    const dayOfWeek = curr.getDay();
    const isSunday = (dayOfWeek === 0);
    const isSaturday = (dayOfWeek === 6);
    const h = getEvent(iso);
    const isHoliday = !!(h && h.isHoliday);
    const isObs = !!(h && !h.isHoliday);

    if (isSunday) sundaysCount++;
    if (isSaturday) saturdaysCount++;

    if (isHoliday) {
      officialHolidays.push(h!);
      if (isSunday) holidaysOnSundayCount++;
      else holidaysOnWeekdayCount++;
    }

    if (isObs) {
      observations.push(h!);
    }

    const isOff = isSunday || isHoliday;
    if (isOff) totalOffDays++;

    dateList.push({
      iso,
      dayNum: curr.getDate(),
      dayName: dayNames[dayOfWeek],
      isSunday,
      isSaturday,
      isHoliday,
      isObservation: isObs,
      eventName: h ? h.name : ''
    });

    curr.setDate(curr.getDate() + 1);
  }

  const totalDays = dateList.length;
  const workingDays = Math.max(0, totalDays - totalOffDays);

  return {
    startDate: getLocalDateString(d1),
    endDate: getLocalDateString(d2),
    totalDays,
    officialHolidays,
    sundaysCount,
    holidaysOnSundayCount,
    holidaysOnWeekdayCount,
    totalOffDays,
    workingDays,
    saturdaysCount,
    observations,
    dateList
  };
}

export function setCalSelectionMode(mode: 'day' | 'range') {
  calSelectionMode = mode;
  const dayBtn = document.getElementById('calModeDayBtn');
  const rangeBtn = document.getElementById('calModeRangeBtn');
  const rangePanel = document.getElementById('calRangePanel');
  const calCard = document.getElementById('calCard');

  if (dayBtn && rangeBtn) {
    if (mode === 'day') {
      dayBtn.style.background = '#2563eb';
      dayBtn.style.color = '#ffffff';
      rangeBtn.style.background = '#f1f5f9';
      rangeBtn.style.color = '#475569';
      if (calCard) calCard.classList.remove('range-mode-active');
    } else {
      rangeBtn.style.background = '#2563eb';
      rangeBtn.style.color = '#ffffff';
      dayBtn.style.background = '#f1f5f9';
      dayBtn.style.color = '#475569';
      if (calCard) calCard.classList.add('range-mode-active');
    }
  }

  if (rangePanel) {
    rangePanel.style.display = (mode === 'range') ? 'block' : 'none';
  }

  renderCal();
  renderDateRangeAnalysis();
}

export function handleCalDayClick(iso: string) {
  if (calSelectionMode === 'range') {
    selectCalRangeDay(iso);
  } else {
    showDay(iso);
  }
}

export function selectCalRangeDay(iso: string) {
  if ((!rangeStartDate && !rangeEndDate) || (rangeStartDate && rangeEndDate)) {
    rangeStartDate = iso;
    rangeEndDate = null;
  } else if (rangeStartDate && !rangeEndDate) {
    if (iso >= rangeStartDate) {
      rangeEndDate = iso;
    } else {
      rangeEndDate = rangeStartDate;
      rangeStartDate = iso;
    }
  }

  // Sync with date inputs if present
  const fromInp = document.getElementById('rangeFromInput') as HTMLInputElement | null;
  const toInp = document.getElementById('rangeToInput') as HTMLInputElement | null;
  if (fromInp && rangeStartDate) fromInp.value = rangeStartDate;
  if (toInp) toInp.value = rangeEndDate || '';

  renderCal();
  renderDateRangeAnalysis();
}

export function setDateRange(startIso: string, endIso: string) {
  rangeStartDate = startIso;
  rangeEndDate = endIso;

  const fromInp = document.getElementById('rangeFromInput') as HTMLInputElement | null;
  const toInp = document.getElementById('rangeToInput') as HTMLInputElement | null;
  if (fromInp) fromInp.value = startIso;
  if (toInp) toInp.value = endIso;

  const d = new Date(startIso + 'T00:00:00');
  if (!isNaN(d.getTime())) {
    cur.setFullYear(d.getFullYear(), d.getMonth(), 1);
  }

  setCalSelectionMode('range');
}

export function clearDateRange() {
  rangeStartDate = null;
  rangeEndDate = null;

  const fromInp = document.getElementById('rangeFromInput') as HTMLInputElement | null;
  const toInp = document.getElementById('rangeToInput') as HTMLInputElement | null;
  if (fromInp) fromInp.value = '';
  if (toInp) toInp.value = '';

  renderCal();
  renderDateRangeAnalysis();
}

export function quickSelectRange(preset: string) {
  const today = new Date();
  let start = new Date();
  let end = new Date();

  if (preset === 'this_month') {
    start = new Date(cur.getFullYear(), cur.getMonth(), 1);
    end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
  } else if (preset === 'next_7') {
    start = new Date(today);
    end = new Date(today);
    end.setDate(end.getDate() + 6);
  } else if (preset === 'next_14') {
    start = new Date(today);
    end = new Date(today);
    end.setDate(end.getDate() + 13);
  } else if (preset === 'next_30') {
    start = new Date(today);
    end = new Date(today);
    end.setDate(end.getDate() + 29);
  } else if (preset === 'summer') {
    start = new Date(2026, 4, 24);
    end = new Date(2026, 5, 7);
  } else if (preset === 'puja') {
    start = new Date(2026, 9, 9);
    end = new Date(2026, 9, 31);
  }

  const startIso = getLocalDateString(start);
  const endIso = getLocalDateString(end);
  setDateRange(startIso, endIso);
}

export function startRangeFromPopup(iso?: string) {
  const targetIso = iso || (currentPopupInfo ? currentPopupInfo.date : null);
  if (!targetIso) return;

  const dayPopupEl = document.getElementById('dayPopup');
  if (dayPopupEl) dayPopupEl.style.display = 'none';

  rangeStartDate = targetIso;
  rangeEndDate = null;

  const fromInp = document.getElementById('rangeFromInput') as HTMLInputElement | null;
  const toInp = document.getElementById('rangeToInput') as HTMLInputElement | null;
  if (fromInp) fromInp.value = targetIso;
  if (toInp) toInp.value = '';

  setCalSelectionMode('range');
}

export function copyRangeAnalysisReport() {
  if (!rangeStartDate || !rangeEndDate) return;
  const res = analyzeDateRange(rangeStartDate, rangeEndDate);
  if (!res) return;

  const text = `📊 পশ্চিমবঙ্গ প্রাথমিক বিদ্যালয় ক্যালেন্ডার ২০২৬\n` +
    `🗓️ নির্বাচিত সময়সীমা: ${formatBnDate(res.startDate)} থেকে ${formatBnDate(res.endDate)}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 মোট দিন: ${toBengaliNum(res.totalDays)} দিন\n` +
    `🟢 মোট কার্যদিবস (Working Days): ${toBengaliNum(res.workingDays)} দিন\n` +
    `🔴 সরকারি ছুটি: ${toBengaliNum(res.officialHolidays.length)} দিন\n` +
    `🟡 রবিবার (সাপ্তাহিক ছুটি): ${toBengaliNum(res.sundaysCount)} দিন\n` +
    `🏫 শনিবার (অর্ধ-দিবস): ${toBengaliNum(res.saturdaysCount)} দিন\n` +
    `⛔ সর্বমোট বন্ধের দিন: ${toBengaliNum(res.totalOffDays)} দিন\n` +
    (res.officialHolidays.length > 0 ? `\n📌 সরকারি ছুটির তালিকা:\n` + res.officialHolidays.map(h => `• ${formatBnDate(h.date)}: ${h.name}`).join('\n') : '') +
    (res.observations.length > 0 ? `\n\n📌 পালনীয় দিবস (স্কুল খোলা):\n` + res.observations.map(o => `• ${formatBnDate(o.date)}: ${o.name}`).join('\n') : '') +
    `\n━━━━━━━━━━━━━━━━━━━━\n` +
    `উৎস: পশ্চিমবঙ্গ প্রাথমিক শিক্ষা পর্ষদ (WBBPE) অনুমোদিত দিনপঞ্জিকা`;

  navigator.clipboard.writeText(text).then(() => {
    alert('কার্যদিবস ও ছুটির হিসাবের রিপোর্ট ক্লিপবোর্ডে কপি হয়েছে!');
  }).catch(() => {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    document.body.removeChild(t);
    alert('কার্যদিবস ও ছুটির হিসাবের রিপোর্ট কপি হয়েছে!');
  });
}

export function shareRangeAnalysisWA() {
  if (!rangeStartDate || !rangeEndDate) return;
  const res = analyzeDateRange(rangeStartDate, rangeEndDate);
  if (!res) return;

  const text = `📊 *তারিখ রেঞ্জ ও কার্যদিবস বিশ্লেষণ (২০২৬)*\n` +
    `🗓️ *সময়সীমা:* ${formatBnDate(res.startDate)} থেকে ${formatBnDate(res.endDate)}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 মোট দিন: *${toBengaliNum(res.totalDays)} দিন*\n` +
    `🟢 মোট কার্যদিবস (Working Days): *${toBengaliNum(res.workingDays)} দিন*\n` +
    `🔴 সরকারি ছুটি: *${toBengaliNum(res.officialHolidays.length)} দিন*\n` +
    `🟡 রবিবার: *${toBengaliNum(res.sundaysCount)} দিন*\n` +
    `🏫 শনিবার (অর্ধ-দিবস): *${toBengaliNum(res.saturdaysCount)} দিন*\n` +
    (res.officialHolidays.length > 0 ? `\n📌 *ছুটির তালিকা:*\n` + res.officialHolidays.map(h => `• ${h.name} (${formatBnDate(h.date)})`).join('\n') : '') +
    `\n━━━━━━━━━━━━━━━━━━━━\n` +
    `_WBBPE প্রাথমিক বিদ্যালয় দিনপঞ্জিকা_`;

  window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
}

export function transferRangeToPlanner() {
  if (!rangeStartDate || !rangeEndDate) return;
  const d1 = new Date(rangeStartDate + 'T00:00:00');
  const d2 = new Date(rangeEndDate + 'T00:00:00');
  const list: string[] = [];
  const curr = new Date(Math.min(d1.getTime(), d2.getTime()));
  const end = new Date(Math.max(d1.getTime(), d2.getTime()));
  while (curr <= end) {
    list.push(getLocalDateString(curr));
    curr.setDate(curr.getDate() + 1);
  }
  selectedPlanIsoDates = list;
  tab(3);
  updatePlanDateDisplay();
  renderPlanCalendar();
}

export function renderDateRangeAnalysis() {
  const container = document.getElementById('rangeAnalysisArea');
  if (!container) return;

  // If in day mode and no range is selected, hide or show minimal hint
  if (calSelectionMode !== 'range') {
    container.innerHTML = '';
    return;
  }

  if (!rangeStartDate && !rangeEndDate) {
    container.innerHTML = `
      <div style="background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:14px;text-align:center;margin-top:10px;">
        <span style="font-size:24px;">📅</span>
        <p style="margin:4px 0 2px;font-weight:700;font-size:12px;color:#334155;">ক্যালেন্ডার থেকে যেকোনো দুটি দিন সিলেক্ট করুন</p>
        <p style="margin:0;font-size:11px;color:#64748b;">প্রথম স্পর্শে শুরুর তারিখ এবং দ্বিতীয় স্পর্শে সমাপ্তি তারিখ নির্বাচিত হবে। সাথে সাথে মোট সরকারি ছুটি ও কার্যদিবসের নিখুঁত হিসাব পাওয়া যাবে।</p>
      </div>
    `;
    return;
  }

  if (rangeStartDate && !rangeEndDate) {
    container.innerHTML = `
      <div style="background:#eff6ff;border:1.5px dashed #93c5fd;border-radius:12px;padding:14px;text-align:center;margin-top:10px;">
        <span style="font-size:20px;">📍</span>
        <p style="margin:4px 0 2px;font-weight:700;font-size:12.5px;color:#1d4ed8;">শুরুর তারিখ: ${formatBnDate(rangeStartDate)}</p>
        <p style="margin:0;font-size:11px;color:#3b82f6;">👉 এখন ক্যালেন্ডার থেকে রেঞ্জের <b>শেষের তারিখটি</b> স্পর্শ করুন।</p>
        <button onclick="window.clearDateRange()" style="margin-top:8px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;padding:4px 10px;border-radius:6px;font-size:10.5px;cursor:pointer;font-weight:600;">রিসেট</button>
      </div>
    `;
    return;
  }

  const res = analyzeDateRange(rangeStartDate, rangeEndDate);
  if (!res) return;

  const holidaysHtml = res.officialHolidays.length > 0
    ? `<div style="margin-top:8px;">
        <div style="font-size:11px;font-weight:700;color:#991b1b;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
          <span>📌</span> সরকারি ছুটির তালিকা (${toBengaliNum(res.officialHolidays.length)}টি):
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          ${res.officialHolidays.map(h => {
            const isSun = new Date(h.date + 'T00:00:00').getDay() === 0;
            return `<div style="background:#ffffff;border:1px solid #fecaca;border-radius:6px;padding:5px 8px;display:flex;justify-content:space-between;align-items:center;font-size:11px;">
              <span><b>${formatBnDate(h.date)}</b> — ${h.name}</span>
              <span class="badge" style="background:${isSun ? '#ea580c' : '#ef4444'};font-size:9.5px;">${isSun ? 'রবিবার ও ছুটি' : 'সরকারি ছুটি'}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`
    : `<div style="margin-top:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:6px 8px;font-size:11px;color:#166534;">
        ✅ এই নির্বাচিত তারিখের মধ্যে কোনো সরকারি ছুটি নেই (কেবল রবিবারগুলি ছাড়া)।
      </div>`;

  const obsHtml = res.observations.length > 0
    ? `<div style="margin-top:6px;">
        <div style="font-size:11px;font-weight:700;color:#4338ca;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
          <span>🌟</span> পালনীয় দিবস (${toBengaliNum(res.observations.length)}টি - স্কুল খোলা):
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          ${res.observations.map(o => `
            <div style="background:#ffffff;border:1px solid #c7d2fe;border-radius:6px;padding:5px 8px;display:flex;justify-content:space-between;align-items:center;font-size:11px;">
              <span><b>${formatBnDate(o.date)}</b> — ${o.name}</span>
              <span class="badge" style="background:#6366f1;font-size:9.5px;">পালনীয় (স্কুল খোলা)</span>
            </div>
          `).join('')}
        </div>
      </div>`
    : '';

  container.innerHTML = `
    <div style="background:#ffffff;border:1.5px solid #93c5fd;border-radius:14px;padding:12px;margin-top:10px;box-shadow:0 4px 12px rgba(37,99,235,0.08);">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">
        <div>
          <div style="font-size:10px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px;">📊 স্বয়ংক্রিয় কার্যদিবস ও ছুটি বিশ্লেষণ</div>
          <div style="font-size:13px;font-weight:800;color:#0f172a;margin-top:2px;">
            ${formatBnDate(res.startDate)} <span style="color:#94a3b8">থেকে</span> ${formatBnDate(res.endDate)}
          </div>
        </div>
        <button onclick="window.clearDateRange()" style="background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;padding:4px 8px;border-radius:6px;font-size:10.5px;cursor:pointer;font-weight:700;">
          ✕ রিসেট
        </button>
      </div>

      <!-- 4 METRIC CARDS -->
      <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:6px;margin:10px 0;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;text-align:center;">
          <div style="font-size:10px;color:#64748b;font-weight:700;">📅 মোট সময়কাল</div>
          <div style="font-size:18px;font-weight:800;color:#1e293b;margin-top:2px;">${toBengaliNum(res.totalDays)} <span style="font-size:11px;font-weight:600;">দিন</span></div>
        </div>

        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:8px 10px;text-align:center;">
          <div style="font-size:10.5px;color:#166534;font-weight:800;">🟢 মোট কার্যদিবস (Working)</div>
          <div style="font-size:20px;font-weight:900;color:#15803d;margin-top:2px;">${toBengaliNum(res.workingDays)} <span style="font-size:11px;font-weight:700;">দিন</span></div>
        </div>

        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:8px 10px;text-align:center;">
          <div style="font-size:10px;color:#991b1b;font-weight:700;">🔴 সরকারি ছুটি</div>
          <div style="font-size:18px;font-weight:800;color:#dc2626;margin-top:2px;">${toBengaliNum(res.officialHolidays.length)} <span style="font-size:11px;font-weight:600;">দিন</span></div>
        </div>

        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:8px 10px;text-align:center;">
          <div style="font-size:10px;color:#92400e;font-weight:700;">🟡 রবিবার (সাপ্তাহিক)</div>
          <div style="font-size:18px;font-weight:800;color:#d97706;margin-top:2px;">${toBengaliNum(res.sundaysCount)} <span style="font-size:11px;font-weight:600;">দিন</span></div>
        </div>
      </div>

      <!-- SUMMARY TEXT -->
      <div style="background:#f8fafc;border-left:3.5px solid #2563eb;padding:8px 10px;border-radius:0 8px 8px 0;font-size:11px;line-height:1.6;color:#334155;">
        <span>📌 <b>হিসাবের সারসংক্ষেপ:</b> মোট <b>${toBengaliNum(res.totalDays)}</b> দিনের মধ্যে সর্বমোট বন্ধের দিন <b>${toBengaliNum(res.totalOffDays)}</b> দিন (সরকারি ছুটি ${toBengaliNum(res.officialHolidays.length)} দিন + রবিবার ${toBengaliNum(res.sundaysCount)} দিন${res.holidaysOnSundayCount > 0 ? ` [যার মধ্যে ${toBengaliNum(res.holidaysOnSundayCount)}টি ছুটি রবিবার পড়েছে]` : ''})।</span><br />
        <span>🏫 বিদ্যালয়ে স্বাভাবিক ক্লাস ও পঠন-পাঠন চলবে <b>${toBengaliNum(res.workingDays)} দিন</b>${res.saturdaysCount > 0 ? ` (যার মধ্যে ${toBengaliNum(res.saturdaysCount)}টি শনিবার অন্তর্ভুক্ত, যেখানে টিফিনের পর ছুটি)` : ''}।</span>
      </div>

      ${holidaysHtml}
      ${obsHtml}

      <!-- ACTIONS -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px;">
        <button onclick="window.copyRangeAnalysisReport()" style="background:#f8fafc;border:1px solid #cbd5e1;color:#1e293b;padding:8px 6px;border-radius:8px;font-size:11px;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;gap:4px;">
          <span>📋</span> হিসাব কপি করুন
        </button>
        <button onclick="window.shareRangeAnalysisWA()" style="background:#16a34a;color:#ffffff;border:none;padding:8px 6px;border-radius:8px;font-size:11px;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;gap:4px;">
          <span>💬</span> হোয়াটসঅ্যাপ শেয়ার
        </button>
      </div>

      <button onclick="window.transferRangeToPlanner()" style="width:100%;margin-top:6px;background:linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);color:#ffffff;border:none;padding:8px;border-radius:8px;font-size:11px;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;gap:4px;">
        <span>✈️</span> এই তারিখগুলি দিয়ে ছুটির প্ল্যানার তৈরি করুন
      </button>
    </div>
  `;
}

export function renderCal() {
  const y = cur.getFullYear();
  const m = cur.getMonth();
  const monEl = document.getElementById('mon');
  if (monEl) {
    monEl.innerText = cur.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
  }

  const first = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  let html = '';

  for (let i = 0; i < first; i++) html += '<div></div>';
  for (let d = 1; d <= dim; d++) {
    const dt = new Date(y, m, d);
    const iso = getLocalDateString(dt);
    const h = getEvent(iso);
    const isSunday = dt.getDay() === 0;

    const isInRange = !!(rangeStartDate && rangeEndDate && (iso >= rangeStartDate && iso <= rangeEndDate));
    const isStart = !!(rangeStartDate && rangeEndDate && (iso === rangeStartDate));
    const isEnd = !!(rangeStartDate && rangeEndDate && (iso === rangeEndDate));
    const isSingle = !!(rangeStartDate && rangeEndDate && (rangeStartDate === rangeEndDate) && (iso === rangeStartDate));
    const isPickedStart = !!(rangeStartDate && !rangeEndDate && (iso === rangeStartDate));

    let cls = 'day';
    if (isSunday) cls += ' holi';
    if (h) {
      if (!h.isHoliday) cls += ' obs';
      else cls += ' holi';
    }
    if (getLocalDateString(new Date()) === iso) cls += ' today';

    if (calSelectionMode === 'range') {
      if (isSingle) cls += ' range-single';
      else if (isStart) cls += ' range-start';
      else if (isEnd) cls += ' range-end';
      else if (isInRange) cls += ' range-mid';
      else if (isPickedStart) cls += ' range-picked-start';
    }

    const label = isSunday && h && !h.isHoliday ? 'রবি+পালন' : (isSunday ? 'রবি' : (h ? (h.isHoliday ? 'ছুটি' : 'পালন') : ''));
    html += `<div class="${cls}" onclick="window.handleCalDayClick('${iso}')">${d}<div style="font-size:7px">${label}</div></div>`;
  }

  const calEl = document.getElementById('cal');
  if (calEl) calEl.innerHTML = html;

  const monthH = holidays.filter(h => {
    const hd = new Date(h.date + 'T00:00:00');
    return hd.getMonth() === m && hd.getFullYear() === y;
  });

  const monthListEl = document.getElementById('monthList');
  if (monthListEl) {
    if (monthH.length === 0) {
      monthListEl.innerHTML = '<div style="color:#64748b">এই মাসে কোনো ছুটি নেই</div>';
    } else {
      monthListEl.innerHTML = monthH.map(h => {
        const dayNum = new Date(h.date + 'T00:00:00').getDate();
        return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;cursor:pointer" onclick="window.showDay('${h.date}')">` +
          `<span><b>${dayNum} তারিখ</b> - ${h.name}</span>` +
          `<span class="badge" style="background:${h.isHoliday ? '#ef4444' : '#6366f1'}">${h.isHoliday ? 'ছুটি' : 'পালনীয়'}</span></div>`;
      }).join('');
    }
  }
}

export function showDay(iso: string) {
  const dt = new Date(iso + 'T00:00:00');
  const isSunday = dt.getDay() === 0;
  const h = getEvent(iso);
  const popDateEl = document.getElementById('popDate');
  if (popDateEl) popDateEl.innerText = iso;
  let speakText = '';
  currentPopupInfo = { date: iso, holiday: h, isSunday };

  const sigBox = document.getElementById('popSignificanceBox');
  if (sigBox) {
    sigBox.style.display = 'none';
    sigBox.innerHTML = '';
  }

  const popTitleEl = document.getElementById('popTitle');
  const popDescEl = document.getElementById('popDesc');

  if (h && !h.isHoliday) {
    if (isSunday) {
      if (popTitleEl) popTitleEl.innerText = 'রবিবার ছুটি ও পালনীয় দিবস';
      if (popDescEl) popDescEl.innerHTML = `<b>${h.name}</b><br><span class="badge" style="background:#ef4444">রবিবার</span> <span class="badge" style="background:#6366f1">পালনীয়</span>`;
      speakText = `আজ রবিবার ছুটি, তবে ${h.name} পালনীয় দিবস`;
    } else {
      if (popTitleEl) popTitleEl.innerText = 'পালনীয় দিবস - স্কুল খোলা';
      if (popDescEl) popDescEl.innerHTML = `<b>${h.name}</b><br><span class="badge" style="background:#6366f1">পালনীয়</span>`;
      speakText = `${h.name}, স্কুল খোলা আছে`;
    }
  } else if (h && h.isHoliday) {
    if (popTitleEl) popTitleEl.innerText = 'ছুটি';
    if (popDescEl) popDescEl.innerHTML = `<b>${h.name}</b><br><span class="badge" style="background:#ef4444">ছুটি</span>`;
    speakText = `${h.name} উপলক্ষে আজ ছুটি`;
  } else if (isSunday) {
    if (popTitleEl) popTitleEl.innerText = 'রবিবার ছুটি';
    if (popDescEl) popDescEl.innerHTML = `<span class="badge" style="background:#ef4444">ছুটি</span>`;
    speakText = 'আজ রবিবার বিদ্যালয় ছুটি';
  } else {
    if (popTitleEl) popTitleEl.innerText = 'স্কুল খোলা';
    if (popDescEl) popDescEl.innerText = 'স্বাভাবিক ক্লাস চালু আছে';
    speakText = 'আজ বিদ্যালয় খোলা আছে';
  }

  const dayPopupEl = document.getElementById('dayPopup');
  if (dayPopupEl) dayPopupEl.style.display = 'flex';
  playBanglaVoice(speakText);
}

export function speakCurrentPopupDay() {
  if (currentPopupInfo) {
    speakDaySignificance(currentPopupInfo.date);
  }
}

export function toggleSignificance() {
  if (!currentPopupInfo) return;
  const sigBox = document.getElementById('popSignificanceBox');
  if (!sigBox) return;
  if (sigBox.style.display === 'block') {
    sigBox.style.display = 'none';
    return;
  }
  let info = daySignificanceData[currentPopupInfo.date];
  if (!info) {
    if (currentPopupInfo.holiday) {
      info = `<b>${currentPopupInfo.holiday.name}:</b> এই দিনটি পর্ষদ নির্দেশিত বিশেষ ছুটির অন্তর্ভুক্ত। পঠনপাঠন বন্ধ থাকবে।`;
    } else if (currentPopupInfo.isSunday) {
      info = `<b>রবিবার:</b> সাপ্তাহিক ছুটির দিন।`;
    } else {
      info = `স্বাভাবিক পঠনপাঠন ও বিদ্যালয় কার্যক্রম চালু থাকবে।`;
    }
  }
  sigBox.innerHTML = info;
  sigBox.style.display = 'block';
}

export function sendWhatsAppNotice() {
  if (!currentPopupInfo) return;
  const title = currentPopupInfo.holiday ? currentPopupInfo.holiday.name : (currentPopupInfo.isSunday ? 'রবিবার' : 'বিশেষ দিবস');
  const isOff = (currentPopupInfo.holiday && currentPopupInfo.holiday.isHoliday) || currentPopupInfo.isSunday;
  const msg = `📢 *বিদ্যালয় নোটিশ*\n\nতারিখ: ${currentPopupInfo.date}\nউপলক্ষ: *${title}*\n\n` +
    (isOff ? 'এতদ্বারা জানানো যাচ্ছে যে উক্ত তারিখে বিদ্যালয়ের পঠনপাঠন বন্ধ থাকবে।' : 'উক্ত বিশেষ দিবসটি বিদ্যালয়ে যথাযথ মর্যাদার সঙ্গে পালন করা হবে।') +
    '\n\n- প্রধান শিক্ষক / ভারপ্রাপ্ত শিক্ষক';
  window.location.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg);
}

export function setHolidayFilter(mode: 'all' | 'holiday' | 'observation') {
  holidayFilter = mode;
  (window as any).holidayFilter = mode;
  renderList();
}

export function renderList() {
  const searchEl = document.getElementById('search') as HTMLInputElement | null;
  const s = (searchEl?.value || '').toLowerCase();
  
  const currentFilter = (window as any).holidayFilter || holidayFilter || 'all';

  const list = holidays.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(s) || h.date.includes(s);
    let matchesFilter = true;
    
    if (currentFilter === 'holiday') {
      matchesFilter = h.isHoliday === true;
    } else if (currentFilter === 'observation') {
      matchesFilter = h.isHoliday === false || !h.isHoliday;
    }
    
    return matchesSearch && matchesFilter;
  });

  const fullListEl = document.getElementById('fullList');
  if (fullListEl) {
    fullListEl.innerHTML = list.map(h => {
      return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:12px;cursor:pointer" onclick="window.showDay('${h.date}')">` +
        `<span><b>${h.date}</b> - ${h.name}</span>` +
        `<span style="font-size:10px;background:${h.isHoliday ? '#fee2e2' : '#e0e7ff'};color:${h.isHoliday ? '#991b1b' : '#3730a3'};padding:2px 6px;border-radius:6px;font-weight:700">${h.isHoliday ? 'ছুটি' : 'পালনীয়'}</span></div>`;
    }).join('');
  }
}

export function move(d: number) {
  cur.setMonth(cur.getMonth() + d);
  renderCal();
}

export function tab(n: number) {
  for (let i = 1; i <= 9; i++) {
    const p = document.getElementById('p' + i);
    const t = document.getElementById('t' + i);
    if (p) p.style.display = (n === i) ? 'block' : 'none';
    if (t) {
      if (i === 8 && [2, 3, 6, 7, 8, 9].includes(n)) {
        t.className = 'act';
      } else {
        t.className = (n === i) ? 'act' : '';
      }
    }
  }
  if (n === 1) renderCal();
  if (n === 2) renderList();
  if (n === 3) renderHolidayPlanner();
  if (n === 4) renderRoutine();
  if (n === 5) renderLeaveDashboard();
  if (n === 6) { renderActivityContent(); renderDiaryList(); renderAssemblyStudio(); }
}

export function movePlanCal(d: number) {
  planCalDate.setMonth(planCalDate.getMonth() + d);
  renderPlanCalendar();
}

export function renderPlanCalendar() {
  const y = planCalDate.getFullYear();
  const m = planCalDate.getMonth();
  const monEl = document.getElementById('planCalMon');
  if (monEl) {
    monEl.innerText = planCalDate.toLocaleDateString('bn-BD', { month: 'short', year: 'numeric' });
  }
  const first = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  let html = '';

  for (let i = 0; i < first; i++) html += '<div></div>';

  for (let d = 1; d <= dim; d++) {
    const dt = new Date(y, m, d);
    const iso = getLocalDateString(dt);
    const h = getEvent(iso);
    const isSunday = dt.getDay() === 0;

    let cls = 'plan-cal-day';
    if (isSunday) cls += ' holi';
    if (h) {
      if (!h.isHoliday) cls += ' obs';
      else cls += ' holi';
    }

    if (selectedPlanIsoDates.includes(iso)) {
      cls += ' plan-selected';
    }

    const label = isSunday && h && !h.isHoliday ? 'রবি+পালন' : (isSunday ? 'রবি' : (h ? (h.isHoliday ? 'ছুটি' : 'পালন') : ''));
    html += `<div class="${cls}" onclick="window.togglePlanDate('${iso}')">${d}<div style="font-size:7px">${label}</div></div>`;
  }
  const gridEl = document.getElementById('planCalGrid');
  if (gridEl) gridEl.innerHTML = html;
}

export function togglePlanDate(iso: string) {
  const idx = selectedPlanIsoDates.indexOf(iso);
  if (idx !== -1) {
    selectedPlanIsoDates.splice(idx, 1);
  } else {
    selectedPlanIsoDates.push(iso);
    selectedPlanIsoDates.sort();
  }
  updatePlanDateDisplay();
  renderPlanCalendar();
}

export function resetPlanDates() {
  selectedPlanIsoDates = [];
  updatePlanDateDisplay();
  renderPlanCalendar();
}

export function updatePlanDateDisplay() {
  const txt = document.getElementById('planSelectedCountTxt');
  const countInp = document.getElementById('planDaysCount') as HTMLInputElement | null;
  const len = selectedPlanIsoDates.length;

  if (len === 0) {
    if (txt) txt.innerHTML = '০ দিন';
    if (countInp) countInp.value = '০ দিন';
  } else {
    let holiCount = 0;
    let sundayCount = 0;
    let offDaysCount = 0;
    for (const iso of selectedPlanIsoDates) {
      const dt = new Date(iso + 'T00:00:00');
      const isSun = dt.getDay() === 0;
      const h = getEvent(iso);
      const isHoli = !!(h && h.isHoliday);
      if (isSun) sundayCount++;
      if (isHoli) holiCount++;
      if (isSun || isHoli) offDaysCount++;
    }
    const workCount = Math.max(0, len - offDaysCount);

    if (txt) {
      txt.innerHTML = `<b>${toBengaliNum(len)}টি দিন</b> <span style="font-size:10.5px;color:#1e40af;font-weight:700;">(🔴 ছুটি: ${toBengaliNum(holiCount)} | 🟡 রবি: ${toBengaliNum(sundayCount)} | 🟢 কার্যদিবস: ${toBengaliNum(workCount)} দিন)</span>`;
    }
    if (countInp) countInp.value = `${toBengaliNum(len)} দিন (কার্যদিবস: ${toBengaliNum(workCount)} দিন)`;
  }
}

export function toggleCustomCategory(val: string) {
  const box = document.getElementById('customCatBox');
  if (box) box.style.display = (val === 'CUSTOM') ? 'block' : 'none';
}

export function saveHolidayPlan() {
  if (selectedPlanIsoDates.length === 0) {
    alert('দয়া করে মূল ক্যালেন্ডার থেকে অন্তত একটি দিন সিলেক্ট করুন!');
    return;
  }

  const catSelectEl = document.getElementById('planCategory') as HTMLSelectElement | null;
  const catSelect = catSelectEl ? catSelectEl.value : 'সরকারি ছুটির ট্যুর';
  const customCatEl = document.getElementById('customCatInput') as HTMLInputElement | null;
  const cat = (catSelect === 'CUSTOM') ? ((customCatEl?.value || '').trim() || 'ব্যক্তিগত প্ল্যান') : catSelect;

  const titleEl = document.getElementById('planTitle') as HTMLInputElement | null;
  const detailsEl = document.getElementById('planDetails') as HTMLTextAreaElement | null;
  const title = (titleEl?.value || '').trim();
  const details = (detailsEl?.value || '').trim();

  if (!title) {
    alert('পরিকল্পনার একটি শিরোনাম দিন!');
    return;
  }

  myHolidayPlans.push({
    id: Date.now(),
    dates: [...selectedPlanIsoDates],
    category: cat,
    title,
    details: details || 'কোনো বিশেষ নোট নেই'
  });

  myHolidayPlans.sort((a, b) => new Date(a.dates[0]).getTime() - new Date(b.dates[0]).getTime());
  SafeStorage.setItem('my_holiday_plans_2026', JSON.stringify(myHolidayPlans));
  renderHolidayPlanner();

  resetPlanDates();
  if (titleEl) titleEl.value = '';
  if (detailsEl) detailsEl.value = '';
  if (customCatEl) customCatEl.value = '';
  if (catSelectEl) catSelectEl.value = 'সরকারি ছুটির ট্যুর';
  const box = document.getElementById('customCatBox');
  if (box) box.style.display = 'none';
}

export function deleteHolidayPlan(id: number) {
  myHolidayPlans = myHolidayPlans.filter(p => p.id !== id);
  SafeStorage.setItem('my_holiday_plans_2026', JSON.stringify(myHolidayPlans));
  renderHolidayPlanner();
}

export function printHolidayPlanList() {
  const printDiv = document.getElementById('planPrintArea');
  if (!printDiv) return;

  let html = '<div style="font-family:sans-serif;padding:15px;color:#0f172a;"><h2 style="text-align:center;color:#1e40af;margin-bottom:4px;">পশ্চিমবঙ্গ প্রাথমিক শিক্ষা পর্ষদ (WBBPE) - ২০২৬ ছুটির প্ল্যানার</h2><p style="text-align:center;font-size:11px;color:#475569;margin-top:0;">প্রাথমিক বিদ্যালয় ছুটির দিনপঞ্জিকা ও পরিকল্পনা সহায়িকা</p>';

  if (myHolidayPlans.length > 0) {
    html += '<h3 style="font-size:12px;color:#2563eb;margin-top:12px;border-bottom:1px solid #bfdbfe;padding-bottom:3px;">✈️ সংরক্ষিত ছুটির প্ল্যান তালিকা ও ট্রাভেল নোট</h3><table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:10px;"><tr style="background:#f1f5f9;"><th style="border:1px solid #cbd5e1;padding:5px;text-align:left;">শিরোনাম</th><th style="border:1px solid #cbd5e1;padding:5px;text-align:left;">ধরন</th><th style="border:1px solid #cbd5e1;padding:5px;text-align:left;">তারিখসমূহ</th><th style="border:1px solid #cbd5e1;padding:5px;text-align:left;">নোট</th></tr>';
    myHolidayPlans.forEach(p => {
      html += `<tr><td style="border:1px solid #cbd5e1;padding:5px;font-weight:bold;">${p.title}</td><td style="border:1px solid #cbd5e1;padding:5px;">${p.category}</td><td style="border:1px solid #cbd5e1;padding:5px;">${p.dates.join(', ')}</td><td style="border:1px solid #cbd5e1;padding:5px;">${p.details}</td></tr>`;
    });
    html += '</table>';
  }

  html += '<h3 style="font-size:12px;color:#b91c1c;margin-top:14px;border-bottom:1px solid #fecaca;padding-bottom:3px;">📋 সরকারি ছুটির বার্ষিক তালিকা (৬৫ দিন)</h3><table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:9.5px;"><tr style="background:#f8fafc;"><th style="border:1px solid #cbd5e1;padding:4px;text-align:center;width:8%;">নং</th><th style="border:1px solid #cbd5e1;padding:4px;text-align:left;">ছুটির নাম</th><th style="border:1px solid #cbd5e1;padding:4px;text-align:center;">তারিখ</th><th style="border:1px solid #cbd5e1;padding:4px;text-align:center;">ধরন</th></tr>';

  holidays.forEach((h, i) => {
    html += `<tr><td style="border:1px solid #cbd5e1;padding:3px;text-align:center;">${i + 1}</td><td style="border:1px solid #cbd5e1;padding:3px;font-weight:600;">${h.name}</td><td style="border:1px solid #cbd5e1;padding:3px;text-align:center;">${h.date}</td><td style="border:1px solid #cbd5e1;padding:3px;text-align:center;">${h.isHoliday ? 'ছুটি' : 'পালনীয়'}</td></tr>`;
  });

  html += '</table></div>';
  const masterArea = document.getElementById('masterPrintArea');
  if (masterArea) { masterArea.style.display = 'none'; masterArea.innerHTML = ''; }

  document.body.classList.remove('printing-routine', 'print-landscape');
  document.body.classList.add('printing-planner', 'print-portrait');

  printDiv.innerHTML = html;
  printDiv.style.display = 'block';
  
  const inIframe = window.self !== window.top;

  if (inIframe) {
    try {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`
          <html>
            <head>
              <title>Print Planner</title>
              <style>
                @media print {
                  @page { size: portrait; margin: 10mm; }
                  body { margin: 0; padding: 20px; }
                }
              </style>
            </head>
            <body>
              ${html}
              <script>
                window.onload = () => {
                  setTimeout(() => { window.print(); window.close(); }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWin.document.close();
        return;
      }
    } catch (e) {
      console.warn('Popup blocked or iframe restriction:', e);
    }
  }

  const afterPrint = () => {
    document.body.classList.remove('printing-planner', 'print-portrait');
    printDiv.style.display = 'none';
    printDiv.innerHTML = '';
    window.removeEventListener('afterprint', afterPrint);
  };
  window.addEventListener('afterprint', afterPrint);

  setTimeout(() => {
    window.print();
    setTimeout(afterPrint, 10000);
  }, 150);
}

export function renderHolidayPlanner() {
  renderPlanCalendar();
  const area = document.getElementById('holidayPlanListArea');
  if (!area) return;

  if (myHolidayPlans.length === 0) {
    area.innerHTML = '<div style="text-align:center;padding:12px;font-size:11px;color:#94a3b8">এখনও কোনো ছুটির প্ল্যান সংরক্ষিত নেই</div>';
    return;
  }

  let html = '<table class="routine-table" style="margin-top:0"><tr style="background:#f1f5f9"><th>তারিখ ও শিরোনাম</th><th>ক্যাটাগরি</th><th>অ্যালার্ট</th><th>✕</th></tr>';
  myHolidayPlans.forEach(p => {
    const dateTxt = p.dates.length > 3 ? `${p.dates.length}টি দিন (${p.dates[0]}...)` : p.dates.join(', ');
    html += `<tr>` +
      `<td style="text-align:left"><b>${p.title}</b><br><small style="color:#64748b">${dateTxt}</small></td>` +
      `<td><span class="badge" style="background:#2563eb;font-size:8px">${p.category}</span></td>` +
      `<td><button onclick="alert('${p.title.replace(/'/g, "\\'")} - ${p.details.replace(/'/g, "\\'")}')" style="border:none;background:#fef3c7;color:#b45309;padding:4px 6px;border-radius:6px;font-weight:700;cursor:pointer;font-size:10px">🔔 দেখুন</button></td>` +
      `<td><button onclick="window.deleteHolidayPlan(${p.id})" style="border:none;background:none;color:#ef4444;font-weight:700;cursor:pointer">✕</button></td>` +
      `</tr>`;
  });
  area.innerHTML = html + '</table>';
}

export function getSchoolName(): string {
  return SafeStorage.getItem('school_custom_name') || 'পশ্চিমবঙ্গ প্রাথমিক বিদ্যালয়';
}

export function saveSchoolName(name: string) {
  SafeStorage.setItem('school_custom_name', name.trim());
}

export function getSavedTeachers(): string[] {
  const t = SafeStorage.getItem('school_custom_teachers');
  if (t) {
    try { return JSON.parse(t); } catch (e) { /* fallback */ }
  }
  return ["শিক্ষক ১", "শিক্ষক ২", "শিক্ষক ৩", "শিক্ষক ৪"];
}

export function saveTeacherList() {
  const inp = document.getElementById('teacherListInput') as HTMLInputElement | null;
  const val = (inp?.value || '').trim();
  if (!val) return;
  const arr = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
  if (arr.length > 0) {
    SafeStorage.setItem('school_custom_teachers', JSON.stringify(arr));
    renderRoutine();
  }
}

export function saveRoutineCell(key: string, val: string) {
  SafeStorage.setItem(key, val);
}

export function renderRoutine() {
  const classSelectEl = document.getElementById('classSelect') as HTMLSelectElement | null;
  const daySelectEl = document.getElementById('daySelect') as HTMLSelectElement | null;
  const cls = classSelectEl?.value || 'shishu';
  const day = daySelectEl?.value || 'weekday';

  let schedule = fixedClassSchedule.class3_5;
  if (cls === 'shishu') schedule = fixedClassSchedule.shishu;
  else if (cls === 'class1' || cls === 'class2') schedule = fixedClassSchedule.class1_2;

  const isSat = (day === 'sat');
  const routineSubTxtEl = document.getElementById('routineSubTxt');
  if (routineSubTxtEl) {
    routineSubTxtEl.innerText = isSat ? 'শনিবারের বিশেষ সময়সূচি (টিফিনের পর ২:২০-এ ছুটি)' : 'সোমবার থেকে শুক্রবারের সাধারণ সময়সূচি (৩:৩০ পর্যন্ত ক্লাস)';
  }

  const teachers = getSavedTeachers();
  const inp = document.getElementById('teacherListInput') as HTMLInputElement | null;
  if (inp && !inp.value) inp.value = teachers.join(', ');

  const schInp = document.getElementById('schoolNameInput') as HTMLInputElement | null;
  if (schInp && !schInp.value) schInp.value = getSchoolName();

  const subjects = classSubjectOptions[cls] || [];
  let html = '<table class="routine-table"><tr><th>পিরিয়ড ও সময়</th><th>পাঠ্য বিষয়</th><th>শিক্ষক</th></tr>';
  for (let i = 0; i < schedule.periods.length; i++) {
    const pName = schedule.periods[i];
    const pTime = schedule.times[i];
    const isTiffin = pName.includes('টিফিন');
    const isSatOff = isSat && (i >= 5);

    const subjKey = `rout_subj_${cls}_${day}_${i}`;
    const teachKey = `rout_teach_${cls}_${day}_${i}`;

    const savedSubj = SafeStorage.getItem(subjKey) || '';
    const savedTeach = SafeStorage.getItem(teachKey) || '';

    let subjSelectHtml = '';
    let teachSelectHtml = '';

    if (isSatOff) {
      subjSelectHtml = '<b style="color:#ef4444">শনিবারের ছুটি</b>';
      teachSelectHtml = '<small style="color:#ef4444">স্কুল ছুটি (২:২০)</small>';
    } else if (isTiffin) {
      subjSelectHtml = '<b>মিড-ডে মিল ও বিরতি</b>';
      teachSelectHtml = '<small style="color:#d97706;font-weight:700">টিফিন ও MDM</small>';
    } else {
      subjSelectHtml = `<select class="routine-select" onchange="window.saveRoutineCell('${subjKey}', this.value)"><option value="">বিষয় বেছে নিন</option>`;
      for (let s = 0; s < subjects.length; s++) {
        const sSel = (savedSubj === subjects[s]) ? ' selected' : '';
        subjSelectHtml += `<option value="${subjects[s]}"${sSel}>${subjects[s]}</option>`;
      }
      subjSelectHtml += '</select>';

      teachSelectHtml = `<select class="routine-select" onchange="window.saveRoutineCell('${teachKey}', this.value)"><option value="">শিক্ষক বেছে নিন</option>`;
      for (let t = 0; t < teachers.length; t++) {
        const selected = (savedTeach === teachers[t]) ? ' selected' : '';
        teachSelectHtml += `<option value="${teachers[t]}"${selected}>${teachers[t]}</option>`;
      }
      teachSelectHtml += '</select>';
    }

    html += `<tr${isSatOff ? ' style="background:#fee2e2"' : (isTiffin ? ' style="background:#fef3c7"' : '')}>` +
      `<td style="font-weight:700">${pName}<br><small style="color:#64748b">${pTime}</small></td>` +
      `<td>${subjSelectHtml}</td><td>${teachSelectHtml}</td></tr>`;
  }
  const routineAreaEl = document.getElementById('routineArea');
  if (routineAreaEl) routineAreaEl.innerHTML = html + '</table>';
}

export function exportMasterRoutinePDF(customSchoolName?: string) {
  const schoolName = (customSchoolName || SafeStorage.getItem('school_custom_name') || 'পশ্চিমবঙ্গ প্রাথমিক বিদ্যালয়').trim();
  const teachers = getSavedTeachers();

  const classRows = [
    { key: 'shishu', name: 'প্রাক-প্রাথমিক', defaultSubjs: ['মজারু ও ছবি', 'ছড়া ও গল্প', 'খেলাধুলা ও কাজ'] },
    { key: 'class1', name: 'প্রথম শ্রেণি', defaultSubjs: ['আমার বই (বাংলা)', 'সহজ পাঠ', 'ইংরেজি', 'আমার গণিত', 'স্বাস্থ্য ও শরীর'] },
    { key: 'class2', name: 'দ্বিতীয় শ্রেণি', defaultSubjs: ['আমার বই (বাংলা)', 'সহজ পাঠ', 'ইংরেজি', 'আমার গণিত', 'স্বাস্থ্য ও শরীর'] },
    { key: 'class3', name: 'তৃতীয় শ্রেণি', defaultSubjs: ['পাতাবাহার', 'বাটারফ্লাই (Eng)', 'আমার গণিত', 'আমাদের পরিবেশ', 'স্বাস্থ্য ও শারীরশিক্ষা', 'হস্তশিল্প'] },
    { key: 'class4', name: 'চতুর্থ শ্রেণি', defaultSubjs: ['পাতাবাহার', 'বাটারফ্লাই (Eng)', 'আমার গণিত', 'আমাদের পরিবেশ', 'স্বাস্থ্য ও শারীরশিক্ষা', 'কম্পিউটার/আঁকা'] },
    { key: 'class5', name: 'পঞ্চম শ্রেণি', defaultSubjs: ['পাতাবাহার', 'বাটারফ্লাই (Eng)', 'আমার গণিত', 'আমাদের পরিবেশ', 'পরিবেশ ও ইতিহাস', 'শারীরশিক্ষা'] }
  ];

  function buildTableHtml(dayKey: string, titleText: string, isSaturday: boolean) {
    let tHtml = `<div style="margin-bottom:8px;"><div style="background:${isSaturday ? '#4338ca' : '#1e40af'};color:#fff;padding:4px 8px;font-weight:bold;font-size:10.5px;border-radius:3px 3px 0 0;display:flex;justify-content:space-between;"><span>${titleText}</span><span style="font-weight:normal;font-size:9.5px;">${isSaturday ? 'টিফিনের পর ০২:২০-এ বিদ্যালয় ছুটি' : 'পূর্ণ দিবস (বিকাল ০৩:৩০ পর্যন্ত)'}</span></div><table style="width:100%;border-collapse:collapse;font-size:9px;text-align:center;table-layout:fixed;"><thead><tr style="background:#f1f5f9;color:#0f172a;"><th style="border:1px solid #94a3b8;padding:4px;width:11%;">শ্রেণি</th><th style="border:1px solid #94a3b8;padding:4px;width:12%;">১ম<br><span style="font-size:8px;font-weight:normal">১১:০০-১১:৪০</span></th><th style="border:1px solid #94a3b8;padding:4px;width:12%;">২য়<br><span style="font-size:8px;font-weight:normal">১১:৪০-১২:২০</span></th><th style="border:1px solid #94a3b8;padding:4px;width:12%;">৩য়<br><span style="font-size:8px;font-weight:normal">১২:২০-০১:০০</span></th><th style="border:1px solid #94a3b8;padding:4px;width:12%;">৪র্থ<br><span style="font-size:8px;font-weight:normal">০১:০০-০১:৪০</span></th><th style="border:1px solid #94a3b8;padding:4px;width:15%;background:#fef3c7;color:#b45309;">টিফিন ও MDM<br><span style="font-size:8px;font-weight:normal">০১:৪০-০২:২০</span></th>${isSaturday ? '<th style="border:1px solid #94a3b8;padding:4px;width:26%;background:#fee2e2;color:#991b1b;">ছুটি<br><span style="font-size:8px;font-weight:normal">০২:২০-এ ছুটি</span></th>' : '<th style="border:1px solid #94a3b8;padding:4px;width:13%;">৫ম<br><span style="font-size:8px;font-weight:normal">০২:২০-০৩:০০</span></th><th style="border:1px solid #94a3b8;padding:4px;width:13%;">৬ষ্ঠ<br><span style="font-size:8px;font-weight:normal">০৩:০০-০৩:৩০</span></th>'}</tr></thead><tbody>`;

    classRows.forEach(c => {
      tHtml += `<tr><td style="border:1px solid #cbd5e1;padding:4px;font-weight:bold;background:#f8fafc;color:#1e40af;">${c.name}</td>`;
      for (let i = 0; i < 4; i++) {
        const savedSubj = SafeStorage.getItem(`rout_subj_${c.key}_${dayKey}_${i}`);
        const savedTeach = SafeStorage.getItem(`rout_teach_${c.key}_${dayKey}_${i}`);
        const subj = savedSubj || c.defaultSubjs[i % c.defaultSubjs.length] || '-';
        const teach = savedTeach ? `<br><span style="font-size:7.5px;color:#1e40af;">(${savedTeach})</span>` : '';
        if (c.key === 'shishu' && i >= 3) {
          tHtml += '<td style="border:1px solid #cbd5e1;padding:3px;color:#94a3b8;background:#f8fafc;font-size:8px;">ছুটি</td>';
        } else {
          tHtml += `<td style="border:1px solid #cbd5e1;padding:3px;"><b>${subj}</b>${teach}</td>`;
        }
      }
      tHtml += '<td style="border:1px solid #cbd5e1;padding:3px;background:#fef3c7;font-weight:bold;color:#b45309;font-size:8px;">মিড-ডে মিল</td>';

      if (isSaturday) {
        tHtml += '<td style="border:1px solid #cbd5e1;padding:3px;color:#ef4444;background:#fee2e2;font-weight:bold;font-size:8px;">ছুটি (২:২০)</td>';
      } else {
        if (c.key === 'shishu') {
          tHtml += '<td style="border:1px solid #cbd5e1;padding:3px;color:#94a3b8;background:#f8fafc;font-size:8px;">ছুটি</td>';
        } else {
          const s5 = SafeStorage.getItem(`rout_subj_${c.key}_${dayKey}_5`) || c.defaultSubjs[4 % c.defaultSubjs.length] || '-';
          const t5 = SafeStorage.getItem(`rout_teach_${c.key}_${dayKey}_5`) || '';
          tHtml += `<td style="border:1px solid #cbd5e1;padding:3px;"><b>${s5}</b>${t5 ? `<br><span style="font-size:7.5px;color:#1e40af;">(${t5})</span>` : ''}</td>`;
        }
        if (c.key === 'shishu' || c.key === 'class1' || c.key === 'class2') {
          tHtml += '<td style="border:1px solid #cbd5e1;padding:3px;color:#94a3b8;background:#f8fafc;font-size:8px;">ছুটি</td>';
        } else {
          const s6 = SafeStorage.getItem(`rout_subj_${c.key}_${dayKey}_6`) || c.defaultSubjs[5 % c.defaultSubjs.length] || '-';
          const t6 = SafeStorage.getItem(`rout_teach_${c.key}_${dayKey}_6`) || '';
          tHtml += `<td style="border:1px solid #cbd5e1;padding:3px;"><b>${s6}</b>${t6 ? `<br><span style="font-size:7.5px;color:#1e40af;">(${t6})</span>` : ''}</td>`;
        }
      }
      tHtml += '</tr>';
    });
    tHtml += '</tbody></table></div>';
    return tHtml;
  }

  let html = `<div style="font-family:system-ui,-apple-system,sans-serif;padding:8px;color:#0f172a;"><div style="text-align:center;border-bottom:2px solid #1e40af;padding-bottom:4px;margin-bottom:6px;"><h2 style="margin:0;font-size:16px;color:#1e3a8a;">${schoolName}</h2><h3 style="margin:2px 0 0;font-size:12px;color:#2563eb;">সম্পূর্ণ সাপ্তাহিক মাস্টার ক্লাস রুটিন ২০২৬</h3><p style="margin:2px 0 0;font-size:9.5px;color:#475569;">পশ্চিমবঙ্গ প্রাথমিক শিক্ষা পর্ষদ (WBBPE) অনুমোদিত সময়সূচি</p></div>`;
  html += buildTableHtml('weekday', 'সোমবার থেকে শুক্রবার (সাধারণ পূর্ণ দিবস রুটিন)', false);
  html += buildTableHtml('sat', 'শনিবারের বিশেষ সংক্ষিপ্ত রুটিন (টিফিনের পর ছুটি)', true);
  html += `<div style="margin-top:6px;display:flex;justify-content:space-between;align-items:flex-end;font-size:8.5px;color:#475569;border-top:1px dashed #cbd5e1;padding-top:4px;"><div><b>প্রার্থনা সভা:</b> ১০:৫০ - ১১:০০ • <b>মিড-ডে মিল:</b> ০১:৪০ - ০২:২০</div><div><b>শিক্ষকবৃন্দ:</b> ${teachers.join(', ')}</div><div style="text-align:right;"><b>স্বাক্ষর:</b> ___________________________<br><span style="font-size:7.5px">ভারপ্রাপ্ত প্রধান শিক্ষক / বিদ্যালয় সিল</span></div></div></div>`;

  const printArea = document.getElementById('masterPrintArea');
  if (!printArea) return;
  const planArea = document.getElementById('planPrintArea');
  if (planArea) { planArea.style.display = 'none'; planArea.innerHTML = ''; }

  document.body.classList.remove('printing-planner', 'print-portrait');
  document.body.classList.add('printing-routine', 'print-landscape');

  printArea.innerHTML = html;
  printArea.style.display = 'block';
  
  const inIframe = window.self !== window.top;

  if (inIframe) {
    try {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`
          <html>
            <head>
              <title>Print Routine</title>
              <style>
                @media print {
                  @page { size: landscape; margin: 5mm; }
                  body { margin: 0; padding: 10px; }
                }
              </style>
            </head>
            <body>
              ${html}
              <script>
                window.onload = () => {
                  setTimeout(() => { window.print(); window.close(); }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWin.document.close();
        return;
      }
    } catch (e) {
      console.warn('Popup blocked or iframe restriction:', e);
    }
  }

  const afterPrint = () => {
    document.body.classList.remove('printing-routine', 'print-landscape');
    printArea.style.display = 'none';
    printArea.innerHTML = '';
    window.removeEventListener('afterprint', afterPrint);
  };
  window.addEventListener('afterprint', afterPrint);

  setTimeout(() => {
    window.print();
    setTimeout(afterPrint, 10000);
  }, 150);
}

export function shareRoutineWA() {
  const msg = '🏫 *ক্লাস রুটিন ২০২৬*\nপ্রাথমিক বিদ্যালয় পঠনপাঠন সময়সূচি ও মাস্টার শিট আপডেট সম্পন্ন।';
  window.location.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg);
}

export function renderLeaveDashboard() {
  let cl = 0, ml = 0, other = 0;
  myLeaves.forEach(l => {
    if (l.type === 'CL') cl++;
    else if (l.type === 'ML' || l.type === 'Commuted') ml++;
    else other++;
  });

  const clRem = Math.max(0, 14 - cl);
  const clUsedEl = document.getElementById('clUsed');
  const medUsedEl = document.getElementById('medUsed');
  const otherUsedEl = document.getElementById('otherUsed');
  const clRemEl = document.getElementById('clRemaining');
  const clSubTxtEl = document.getElementById('clSubTxt');
  const warnEl = document.getElementById('clWarning');

  if (clUsedEl) clUsedEl.innerText = String(cl);
  if (medUsedEl) medUsedEl.innerText = String(ml);
  if (otherUsedEl) otherUsedEl.innerText = String(other);
  if (clRemEl) clRemEl.innerText = String(clRem);
  if (clSubTxtEl) clSubTxtEl.innerHTML = `(পর্ষদ অনুমোদিত ৬৫ দিনের মধ্যে)<br>CL বাকি: ${clRem}`;

  if (warnEl) {
    if (cl >= 14) {
      warnEl.style.display = 'block';
      warnEl.innerHTML = '⚠️ সতর্কবার্তা: আপনার অনুমোদিত ১৪টি Casual Leave (CL) সমাপ্ত হয়েছে!';
    } else if (cl >= 12) {
      warnEl.style.display = 'block';
      warnEl.innerHTML = `⚠️ সতর্কবার্তা: আপনার মাত্র ${clRem}টি Casual Leave (CL) অবশিষ্ট রয়েছে!`;
    } else {
      warnEl.style.display = 'none';
    }
  }

  const area = document.getElementById('leaveListArea');
  if (!area) return;

  if (myLeaves.length === 0) {
    area.innerHTML = '<div style="text-align:center;padding:12px;font-size:11px;color:#94a3b8">এখনও কোনো ছুটির রেকর্ড নেই</div>';
    return;
  }

  let html = '<table class="routine-table" style="margin-top:0"><tr style="background:#f1f5f9"><th>তারিখ</th><th>ধরন</th><th>কারণ</th><th>✕</th></tr>';
  myLeaves.forEach(l => {
    html += `<tr>` +
      `<td><b>${l.date}</b></td>` +
      `<td><span class="badge" style="background:${l.type === 'CL' ? '#2563eb' : (l.type === 'ML' ? '#ef4444' : '#16a34a')}">${l.type}</span></td>` +
      `<td style="text-align:left">${l.reason || '-'}</td>` +
      `<td><button onclick="window.deleteLeaveEntry(${l.id})" style="border:none;background:none;color:#ef4444;font-weight:700;cursor:pointer">✕</button></td>` +
      `</tr>`;
  });
  area.innerHTML = html + '</table>';
}

export function addLeaveEntryDirectly(dateStr: string, typeStr: string, reasonStr: string) {
  if (!dateStr) return;
  myLeaves.unshift({
    id: Date.now(),
    date: dateStr,
    type: typeStr,
    reason: reasonStr || 'ব্যক্তিগত ছুটি'
  });
  SafeStorage.setItem('my_school_leaves_2026', JSON.stringify(myLeaves));
  renderLeaveDashboard();
}

export function addLeaveEntry() {
  const dateEl = document.getElementById('leaveDate') as HTMLInputElement | null;
  const typeEl = document.getElementById('leaveType') as HTMLSelectElement | null;
  const reasonEl = document.getElementById('leaveReason') as HTMLInputElement | null;

  const dt = dateEl?.value || '';
  const typ = typeEl?.value || 'CL';
  const rsn = (reasonEl?.value || '').trim();

  if (!dt) {
    alert('দয়া করে ছুটির তারিখ নির্বাচন করুন!');
    return;
  }

  addLeaveEntryDirectly(dt, typ, rsn);
  if (reasonEl) reasonEl.value = '';
}

export function deleteLeaveEntry(id: number) {
  myLeaves = myLeaves.filter(l => l.id !== id);
  SafeStorage.setItem('my_school_leaves_2026', JSON.stringify(myLeaves));
  renderLeaveDashboard();
}

export function printLeaveRegister(customSchoolName?: string) {
  const schoolName = (customSchoolName || SafeStorage.getItem('school_custom_name') || 'পশ্চিমবঙ্গ প্রাথমিক বিদ্যালয়').trim();
  const printDiv = document.getElementById('leavePrintArea');
  if (!printDiv) return;

  let cl = 0, ml = 0, other = 0;
  myLeaves.forEach(l => {
    if (l.type === 'CL') cl++;
    else if (l.type === 'ML' || l.type === 'Commuted') ml++;
    else other++;
  });
  const clRem = Math.max(0, 14 - cl);
  const totalUsed = myLeaves.length;

  let html = `
    <div style="font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding:18px; color:#0f172a; max-width:780px; margin:0 auto;">
      <!-- Header -->
      <div style="text-align:center; border-bottom:2.5px solid #1e40af; padding-bottom:10px; margin-bottom:12px;">
        <h1 style="margin:0; font-size:18px; color:#1e40af; font-weight:800;">পশ্চিমবঙ্গ প্রাথমিক শিক্ষা পর্ষদ (WBBPE)</h1>
        <h2 style="margin:3px 0; font-size:14.5px; color:#0f172a;">${schoolName}</h2>
        <h3 style="margin:2px 0 0; font-size:13px; color:#2563eb; font-weight:700;">শিক্ষক / শিক্ষিকার ব্যক্তিগত ছুটির খাতা ও বিবরণী - ২০২৬</h3>
        <p style="margin:2px 0 0; font-size:10px; color:#64748b;">নৈমিত্তিক ছুটি (Casual Leave) রেজিস্টার • মেডিকেল ও অর্জিত ছুটির হিসাব</p>
      </div>

      <!-- Stats Summary Boxes -->
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin-bottom:14px; text-align:center;">
        <div style="border:1.5px solid #93c5fd; background:#eff6ff; padding:8px 6px; border-radius:6px;">
          <div style="font-size:10px; color:#1e40af; font-weight:bold;">অনুমোদিত CL</div>
          <div style="font-size:16px; font-weight:800; color:#1d4ed8; margin:2px 0;">১৪ দিন</div>
          <div style="font-size:9px; color:#64748b;">(ক্যালেন্ডার বর্ষ)</div>
        </div>
        <div style="border:1.5px solid #bfdbfe; background:#f8fafc; padding:8px 6px; border-radius:6px;">
          <div style="font-size:10px; color:#1e40af; font-weight:bold;">ব্যবহৃত CL</div>
          <div style="font-size:16px; font-weight:800; color:#2563eb; margin:2px 0;">${cl} দিন</div>
          <div style="font-size:9px; color:#64748b;">গৃহীত নৈমিত্তিক ছুটি</div>
        </div>
        <div style="border:1.5px solid ${clRem <= 2 ? '#fca5a5' : '#86efac'}; background:${clRem <= 2 ? '#fef2f2' : '#f0fdf4'}; padding:8px 6px; border-radius:6px;">
          <div style="font-size:10px; color:${clRem <= 2 ? '#991b1b' : '#166534'}; font-weight:bold;">অবশিষ্ট CL বাকি</div>
          <div style="font-size:16px; font-weight:800; color:${clRem <= 2 ? '#b91c1c' : '#15803d'}; margin:2px 0;">${clRem} দিন</div>
          <div style="font-size:9px; color:#64748b;">বর্তমান স্থিতি</div>
        </div>
        <div style="border:1.5px solid #fed7aa; background:#fff7ed; padding:8px 6px; border-radius:6px;">
          <div style="font-size:10px; color:#9a3412; font-weight:bold;">মেডিকেল ও অন্যান্য</div>
          <div style="font-size:16px; font-weight:800; color:#c2410c; margin:2px 0;">${ml + other} দিন</div>
          <div style="font-size:9px; color:#64748b;">(ML: ${ml}, অন্য: ${other})</div>
        </div>
      </div>

      <!-- Leave Log Table -->
      <div style="margin-bottom:16px;">
        <div style="background:#1e40af; color:#ffffff; padding:5px 10px; font-size:11px; font-weight:bold; border-radius:4px 4px 0 0; display:flex; justify-content:space-between; align-items:center;">
          <span>📋 গৃহীত ছুটির বিস্তারিত রেকর্ড</span>
          <span style="font-size:10px; font-weight:normal;">মোট গৃহীত এন্ট্রি: ${totalUsed}টি</span>
        </div>
  `;

  if (myLeaves.length === 0) {
    html += `
        <div style="border:1px solid #cbd5e1; border-top:none; padding:16px; text-align:center; font-size:11px; color:#64748b; background:#f8fafc; border-radius:0 0 4px 4px;">
          এখনও পর্যন্ত কোনো ছুটির এন্ট্রি নথিভুক্ত করা হয়নি।
        </div>
    `;
  } else {
    html += `
        <table style="width:100%; border-collapse:collapse; font-size:10px; text-align:left; border:1px solid #cbd5e1;">
          <thead>
            <tr style="background:#f1f5f9; color:#0f172a;">
              <th style="border:1px solid #cbd5e1; padding:6px; text-align:center; width:8%;">ক্র.নং</th>
              <th style="border:1px solid #cbd5e1; padding:6px; width:22%;">ছুটির তারিখ</th>
              <th style="border:1px solid #cbd5e1; padding:6px; text-align:center; width:20%;">ছুটির ধরন</th>
              <th style="border:1px solid #cbd5e1; padding:6px; width:35%;">ছুটি গ্রহণের কারণ</th>
              <th style="border:1px solid #cbd5e1; padding:6px; text-align:center; width:15%;">মন্তব্য</th>
            </tr>
          </thead>
          <tbody>
    `;

    myLeaves.forEach((l, idx) => {
      const typeBadge = l.type === 'CL' ? 'Casual Leave (CL)' : (l.type === 'ML' ? 'Medical Leave (ML)' : l.type);
      html += `
            <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="border:1px solid #cbd5e1; padding:5px 6px; text-align:center; font-weight:bold;">${idx + 1}</td>
              <td style="border:1px solid #cbd5e1; padding:5px 6px; font-weight:600; color:#1e40af;">${l.date}</td>
              <td style="border:1px solid #cbd5e1; padding:5px 6px; text-align:center;">
                <span style="display:inline-block; padding:2px 6px; border-radius:3px; font-size:9px; font-weight:bold; background:${l.type === 'CL' ? '#dbeafe' : (l.type === 'ML' ? '#fee2e2' : '#dcfce7')}; color:${l.type === 'CL' ? '#1e40af' : (l.type === 'ML' ? '#991b1b' : '#166534')};">
                  ${typeBadge}
                </span>
              </td>
              <td style="border:1px solid #cbd5e1; padding:5px 6px;">${l.reason || 'ব্যক্তিগত ছুটি'}</td>
              <td style="border:1px solid #cbd5e1; padding:5px 6px; text-align:center; color:#15803d; font-weight:600;">অনুমোদিত</td>
            </tr>
      `;
    });

    html += `
          </tbody>
        </table>
    `;
  }

  // Official Signature Block
  html += `
      </div>

      <div style="margin-top:28px; display:flex; justify-content:space-between; align-items:flex-end; font-size:10.5px; padding-top:10px;">
        <div style="text-align:center; width:200px;">
          <div style="border-top:1px dashed #64748b; padding-top:4px;">
            <b>আবেদনকারী শিক্ষক/শিক্ষিকার স্বাক্ষর</b><br>
            <span style="font-size:9px; color:#64748b;">তারিখ: .............................</span>
          </div>
        </div>
        <div style="text-align:center; width:220px;">
          <div style="border-top:1px dashed #64748b; padding-top:4px;">
            <b>প্রধান শিক্ষক / TIC-এর স্বাক্ষর ও বিদ্যালয় সিল</b><br>
            <span style="font-size:9px; color:#64748b;">অনুমোদিত ও সার্ভিস রেজিস্টারে নথিভুক্ত</span>
          </div>
        </div>
      </div>

      <div style="margin-top:14px; text-align:center; font-size:8.5px; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:4px;">
        WBBPE পশ্চিমবঙ্গ প্রাথমিক শিক্ষক-শিক্ষিকা দিনপঞ্জিকা ও সার্ভিস পোর্টাল ২০২৬ দ্বারা প্রস্তুতকৃত
      </div>
    </div>
  `;

  // Hide other print areas
  const masterArea = document.getElementById('masterPrintArea');
  if (masterArea) { masterArea.style.display = 'none'; masterArea.innerHTML = ''; }
  const planArea = document.getElementById('planPrintArea');
  if (planArea) { planArea.style.display = 'none'; planArea.innerHTML = ''; }

  printDiv.innerHTML = html;
  printDiv.style.display = 'block';

  document.body.classList.remove('printing-routine', 'print-landscape', 'printing-planner');
  document.body.classList.add('printing-leave', 'print-portrait');

  const inIframe = window.self !== window.top;

  if (inIframe) {
    try {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`
          <html>
            <head>
              <title>Print Leave Application</title>
              <style>
                @media print {
                  @page { size: portrait; margin: 10mm; }
                  body { margin: 0; padding: 20px; }
                }
              </style>
            </head>
            <body>
              ${html}
              <script>
                window.onload = () => {
                  setTimeout(() => { window.print(); window.close(); }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWin.document.close();
        return;
      }
    } catch (e) {
      console.warn('Popup blocked or iframe restriction:', e);
    }
  }

  const afterPrint = () => {
    document.body.classList.remove('printing-leave', 'print-portrait');
    printDiv.style.display = 'none';
    printDiv.innerHTML = '';
    window.removeEventListener('afterprint', afterPrint);
  };
  window.addEventListener('afterprint', afterPrint);

  setTimeout(() => {
    window.print();
    setTimeout(afterPrint, 10000);
  }, 150);
}

// =========================================================================
// MORNING ASSEMBLY AUDIO PLAYER & PRAYER STUDIO ENGINE
// =========================================================================
let currentAssemblyTabType: 'anthem' | 'vande' | 'pledge' | 'speech' = 'anthem';
let currentAssemblyTrackId: 'anthem' | 'vande' = 'anthem';
let vandePlayMode: 'prayer' | 'full' = 'prayer';
let assemblyAudio: HTMLAudioElement | null = null;
let isAssemblyAudioPlaying: boolean = false;
let assemblyAudioVolume: number = 1.0;
let lastActiveKaraokeIdx: number = -1;
let currentSpeechSelection: string = 'netaji';

export function formatAudioSeconds(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${toBengaliNum(m)}:${toBengaliNum(r.toString().padStart(2, '0'))}`;
}

export function initAssemblyAudio(trackId: 'anthem' | 'vande', autoplay: boolean = false) {
  currentAssemblyTabType = trackId;
  currentAssemblyTrackId = trackId;
  lastActiveKaraokeIdx = -1;

  const track = assemblyAudioTracks[trackId];

  if (!assemblyAudio) {
    assemblyAudio = new Audio();
  }

  const curSrc = assemblyAudio.src || '';
  if (!curSrc.endsWith(track.audioSrc)) {
    assemblyAudio.pause();
    assemblyAudio.src = track.audioSrc;
    assemblyAudio.currentTime = 0;
  }
  assemblyAudio.volume = assemblyAudioVolume;

  assemblyAudio.ontimeupdate = () => handleAssemblyAudioTimeUpdate();
  assemblyAudio.onplay = () => updateAssemblyPlayStatus(true);
  assemblyAudio.onpause = () => updateAssemblyPlayStatus(false);
  assemblyAudio.onended = () => handleAssemblyAudioEnded();
  assemblyAudio.onerror = () => {
    updateAssemblyPlayStatus(false);
    console.warn('Audio error on', track.audioSrc);
  };

  renderAssemblyStudio();

  if (autoplay) {
    assemblyAudio.play().catch(e => {
      console.warn('Autoplay prevented:', e);
      updateAssemblyPlayStatus(false);
    });
  }
}

export function updateAssemblyPlayStatus(playing: boolean) {
  isAssemblyAudioPlaying = playing;
  const playBtn = document.getElementById('assemblyPlayPauseBtn');
  const waveContainer = document.getElementById('assemblySoundWaves');
  if (playBtn) {
    playBtn.innerHTML = playing
      ? `<span style="font-size:15px">⏸️</span> <span>পজ করুন</span>`
      : `<span style="font-size:15px">▶️</span> <span>বাজান (Play)</span>`;
    playBtn.style.background = playing ? '#d97706' : '#16a34a';
  }
  if (waveContainer) {
    if (playing) waveContainer.classList.add('playing');
    else waveContainer.classList.remove('playing');
  }
}

export function handleAssemblyAudioEnded() {
  updateAssemblyPlayStatus(false);
  if (assemblyAudio) assemblyAudio.currentTime = 0;
  const timerEl = document.getElementById('assemblyTimerReadout');
  const progBar = document.getElementById('assemblyProgressBar');
  if (progBar) progBar.style.width = '0%';
  if (timerEl) {
    const track = assemblyAudioTracks[currentAssemblyTrackId];
    const dur = (currentAssemblyTrackId === 'vande' && vandePlayMode === 'prayer' && track.prayerDuration)
      ? track.prayerDuration
      : track.duration;
    timerEl.innerText = `${formatAudioSeconds(0)} / ${formatAudioSeconds(dur)}`;
  }
}

export function handleAssemblyAudioTimeUpdate() {
  if (!assemblyAudio) return;
  const curr = assemblyAudio.currentTime;
  const track = assemblyAudioTracks[currentAssemblyTrackId];
  const maxDur = (currentAssemblyTrackId === 'vande' && vandePlayMode === 'prayer' && track.prayerDuration)
    ? track.prayerDuration
    : (assemblyAudio.duration && !isNaN(assemblyAudio.duration) && assemblyAudio.duration > 0 ? assemblyAudio.duration : track.duration);

  // Auto-pause for Vande Mataram prayer mode at 1m 12s
  if (currentAssemblyTrackId === 'vande' && vandePlayMode === 'prayer' && track.prayerDuration && curr >= track.prayerDuration) {
    assemblyAudio.pause();
    assemblyAudio.currentTime = 0;
    updateAssemblyPlayStatus(false);
    const toast = document.getElementById('assemblyPrayerCompleteToast');
    if (toast) {
      toast.style.display = 'block';
      setTimeout(() => { if (toast) toast.style.display = 'none'; }, 6000);
    }
    return;
  }

  // Update timer readout
  const timerEl = document.getElementById('assemblyTimerReadout');
  if (timerEl) {
    timerEl.innerText = `${formatAudioSeconds(curr)} / ${formatAudioSeconds(maxDur)}`;
  }

  // Anthem 52-second Countdown Badge
  const countdownEl = document.getElementById('anthemCountdownBadge');
  if (countdownEl && currentAssemblyTrackId === 'anthem') {
    const rem = Math.max(0, 52 - Math.floor(curr));
    countdownEl.innerHTML = `⏳ <b>৫২ সেকেন্ডের প্রমিত বিধান:</b> অবশিষ্ট <b>${toBengaliNum(rem)} সেকেন্ড</b>`;
  }

  // Progress Bar
  const progBar = document.getElementById('assemblyProgressBar');
  if (progBar && maxDur > 0) {
    const pct = Math.min(100, (curr / maxDur) * 100);
    progBar.style.width = pct + '%';
  }

  // Karaoke Lyric Line Tracking
  const lyrics = track.lyrics;
  let activeIdx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (curr >= lyrics[i].start && curr < lyrics[i].end) {
      activeIdx = i;
      break;
    }
  }

  if (activeIdx !== lastActiveKaraokeIdx) {
    if (lastActiveKaraokeIdx !== -1) {
      const prevEl = document.getElementById(`karaoke-line-${lastActiveKaraokeIdx}`);
      if (prevEl) {
        prevEl.classList.remove('active-karaoke');
        const b = prevEl.querySelector('.active-singing-badge');
        if (b) b.remove();
      }
    }
    if (activeIdx !== -1) {
      const nextEl = document.getElementById(`karaoke-line-${activeIdx}`);
      if (nextEl) {
        nextEl.classList.add('active-karaoke');
        if (!nextEl.querySelector('.active-singing-badge')) {
          const b = document.createElement('span');
          b.className = 'active-singing-badge';
          b.style.cssText = 'background:#2563eb;color:#ffffff;font-size:9.5px;padding:2px 6px;border-radius:4px;margin-right:6px;font-weight:700;display:inline-block;vertical-align:middle;';
          b.innerText = '▶️ এখন গাওয়া হচ্ছে';
          nextEl.prepend(b);
        }
        nextEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    lastActiveKaraokeIdx = activeIdx;
  }
}

export function toggleAssemblyPlay() {
  if (!assemblyAudio) {
    initAssemblyAudio(currentAssemblyTrackId, true);
    return;
  }
  if (assemblyAudio.paused) {
    assemblyAudio.play().catch(e => {
      console.warn('Playback error:', e);
    });
  } else {
    assemblyAudio.pause();
  }
}

export function restartAssemblyAudio() {
  if (!assemblyAudio) {
    initAssemblyAudio(currentAssemblyTrackId, true);
    return;
  }
  assemblyAudio.currentTime = 0;
  assemblyAudio.play().catch(() => {});
}

export function seekAssemblyAudio(e: MouseEvent) {
  if (!assemblyAudio) return;
  const bar = document.getElementById('assemblyProgressContainer');
  if (!bar) return;
  const rect = bar.getBoundingClientRect();
  const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  const ratio = clickX / rect.width;
  const track = assemblyAudioTracks[currentAssemblyTrackId];
  const maxDur = (currentAssemblyTrackId === 'vande' && vandePlayMode === 'prayer' && track.prayerDuration)
    ? track.prayerDuration
    : (assemblyAudio.duration && !isNaN(assemblyAudio.duration) && assemblyAudio.duration > 0 ? assemblyAudio.duration : track.duration);
  assemblyAudio.currentTime = ratio * maxDur;
}

export function setAssemblyVolume(val: number) {
  assemblyAudioVolume = Math.max(0, Math.min(1, val));
  if (assemblyAudio) {
    assemblyAudio.volume = assemblyAudioVolume;
  }
  const pctEl = document.getElementById('assemblyVolPct');
  if (pctEl) {
    pctEl.innerText = `${toBengaliNum(Math.round(assemblyAudioVolume * 100))}%`;
  }
}

export function setVandePlayMode(mode: 'prayer' | 'full') {
  vandePlayMode = mode;
  if (assemblyAudio) {
    assemblyAudio.currentTime = 0;
    if (isAssemblyAudioPlaying) {
      assemblyAudio.play().catch(() => {});
    }
  }
  renderAssemblyStudio();
}

export function switchAssemblyTrack(trackId: 'anthem' | 'vande') {
  const wasPlaying = isAssemblyAudioPlaying;
  initAssemblyAudio(trackId, wasPlaying);
}

export function showAssembly(type: string) {
  if (type === 'anthem') {
    switchAssemblyTrack('anthem');
  } else if (type === 'vande') {
    switchAssemblyTrack('vande');
  } else if (type === 'pledge') {
    currentAssemblyTabType = 'pledge';
    if (assemblyAudio) assemblyAudio.pause();
    renderAssemblyStudio();
  } else if (type === 'speech') {
    currentAssemblyTabType = 'speech';
    if (assemblyAudio) assemblyAudio.pause();
    renderAssemblyStudio();
  }
}

export function showAssemblySpeechMenu() {
  showAssembly('speech');
}

export function showSpecificSpeech(val: string) {
  currentAssemblyTabType = 'speech';
  currentSpeechSelection = val;
  if (assemblyAudio) assemblyAudio.pause();
  renderAssemblyStudio(val);
}

export function jumpToAssemblyAndPlay(trackId: 'anthem' | 'vande') {
  tab(6);
  setTimeout(() => {
    const card = document.getElementById('assemblyStudioCard');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    initAssemblyAudio(trackId, true);
  }, 120);
}

export function renderAssemblyStudio(selectedSpeechKey?: string) {
  const container = document.getElementById('assemblyStudioContainer');
  if (!container) return;

  if (selectedSpeechKey) {
    currentSpeechSelection = selectedSpeechKey;
  }

  // Active track info if in audio mode
  const isAudioMode = currentAssemblyTabType === 'anthem' || currentAssemblyTabType === 'vande';
  const track = isAudioMode ? assemblyAudioTracks[currentAssemblyTrackId] : null;
  const isAnthem = currentAssemblyTabType === 'anthem';
  const isVande = currentAssemblyTabType === 'vande';

  const effectiveDuration = track
    ? (isVande && vandePlayMode === 'prayer' && track.prayerDuration ? track.prayerDuration : track.duration)
    : 0;

  const currentSeconds = assemblyAudio ? assemblyAudio.currentTime : 0;
  const progressPct = effectiveDuration > 0 ? Math.min(100, (currentSeconds / effectiveDuration) * 100) : 0;

  // Render navigation buttons
  let navHtml = `
    <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:5px;margin-bottom:12px;">
      <button onclick="window.showAssembly('anthem')" class="assembly-track-tab ${currentAssemblyTabType === 'anthem' ? 'active-track' : ''}">
        <span style="font-size:14px">🇮🇳</span>
        <span>জাতীয় সঙ্গীত (৫২ সেঃ)</span>
      </button>
      <button onclick="window.showAssembly('vande')" class="assembly-track-tab ${currentAssemblyTabType === 'vande' ? 'active-track' : ''}">
        <span style="font-size:14px">🌸</span>
        <span>বন্দে মাতরম্ (লতা মঙ্গেশকর)</span>
      </button>
      <button onclick="window.showAssembly('pledge')" class="assembly-track-tab ${currentAssemblyTabType === 'pledge' ? 'active-track' : ''}">
        <span style="font-size:14px">📜</span>
        <span>জাতীয় শপথ (Pledge)</span>
      </button>
      <button onclick="window.showAssembly('speech')" class="assembly-track-tab ${currentAssemblyTabType === 'speech' ? 'active-track' : ''}">
        <span style="font-size:14px">🎙️</span>
        <span>৫ মিনিটের ভাষণ</span>
      </button>
    </div>
  `;

  let bodyHtml = '';

  if (isAudioMode && track) {
    // Mode Switcher for Vande Mataram
    const modeSwitchHtml = isVande ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:8px 10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;font-weight:700;color:#334155;">সংস্করণ নির্বাচন:</span>
        <div style="display:flex;gap:4px;">
          <button onclick="window.setVandePlayMode('prayer')" class="assembly-mode-pill ${vandePlayMode === 'prayer' ? 'active-pill' : ''}">
            🔔 প্রার্থনাসভা ১ম স্তবক (১:১২ মি)
          </button>
          <button onclick="window.setVandePlayMode('full')" class="assembly-mode-pill ${vandePlayMode === 'full' ? 'active-pill' : ''}">
            🎶 সম্পূর্ণ গান (৩:৫৫ মি)
          </button>
        </div>
      </div>
    ` : '';

    // Anthem Countdown indicator
    const anthemCountdownHtml = isAnthem ? `
      <div id="anthemCountdownBadge" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:6px 10px;font-size:11px;color:#1e40af;text-align:center;margin-bottom:10px;">
        ⏳ <b>৫২ সেকেন্ডের প্রমিত বিধান:</b> অবশিষ্ট <b>${toBengaliNum(Math.max(0, 52 - Math.floor(currentSeconds)))} সেকেন্ড</b>
      </div>
    ` : '';

    // Lyrics lines
    const lyricsHtml = track.lyrics.map((l, idx) => `
      <div id="karaoke-line-${idx}" class="karaoke-line ${idx === lastActiveKaraokeIdx ? 'active-karaoke' : ''}">
        ${idx === lastActiveKaraokeIdx ? '<span class="active-singing-badge" style="background:#2563eb;color:#ffffff;font-size:9.5px;padding:2px 6px;border-radius:4px;margin-right:6px;font-weight:700;display:inline-block;vertical-align:middle;">▶️ এখন গাওয়া হচ্ছে</span>' : ''}
        ${l.text}
      </div>
    `).join('');

    bodyHtml = `
      <!-- AUDIO PLAYER CARD -->
      <div style="background:linear-gradient(135deg, #1e293b, #0f172a);border-radius:14px;padding:14px;color:#ffffff;box-shadow:0 4px 14px rgba(15,23,42,0.16);margin-bottom:12px;">
        
        <!-- HEADER ROW: TITLE & SOUND WAVE -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:10px;margin-bottom:10px;">
          <div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:16px">${isAnthem ? '🇮🇳' : '🌸'}</span>
              <span style="font-size:14px;font-weight:800;color:#ffffff;">${track.title}</span>
            </div>
            <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">${track.composer}</div>
          </div>

          <!-- ANIMATED SOUND WAVES -->
          <div id="assemblySoundWaves" class="sound-wave-container ${isAssemblyAudioPlaying ? 'playing' : ''}">
            <div class="sound-wave-bar" style="background:#60a5fa"></div>
            <div class="sound-wave-bar" style="background:#38bdf8"></div>
            <div class="sound-wave-bar" style="background:#818cf8"></div>
            <div class="sound-wave-bar" style="background:#38bdf8"></div>
            <div class="sound-wave-bar" style="background:#60a5fa"></div>
          </div>
        </div>

        <!-- ARTIST BADGE & TRIBUTE -->
        <div style="background:rgba(255,255,255,0.07);border-radius:8px;padding:8px 10px;margin-bottom:12px;font-size:11px;line-height:1.5;">
          <div style="color:#fcd34d;font-weight:700;">🎙️ ${track.artist}</div>
          <div style="color:#94a3b8;font-size:10px;margin-top:2px;">${track.artistNote}</div>
        </div>

        ${modeSwitchHtml}
        ${anthemCountdownHtml}

        <!-- COMPLETION TOAST -->
        <div id="assemblyPrayerCompleteToast" style="display:none;background:#dcfce7;border:1px solid #86efac;color:#15803d;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;text-align:center;margin-bottom:10px;">
          ✓ প্রাতঃকালীন প্রার্থনাসভার ১ম স্তবক সফলভাবে সম্পন্ন হয়েছে!
        </div>

        <!-- SCRUBBER PROGRESS BAR -->
        <div style="margin-bottom:8px;">
          <div
            id="assemblyProgressContainer"
            onclick="window.seekAssemblyAudio(event)"
            style="background:rgba(255,255,255,0.2);height:8px;border-radius:6px;cursor:pointer;position:relative;overflow:hidden;"
            title="ক্লিক করে এগিয়ে বা পিছিয়ে নিন"
          >
            <div id="assemblyProgressBar" style="background:linear-gradient(90deg, #3b82f6, #60a5fa);height:100%;width:${progressPct}%;border-radius:6px;transition:width 0.1s linear;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8;margin-top:4px;">
            <span id="assemblyTimerReadout" style="font-weight:700;color:#ffffff;">
              ${formatAudioSeconds(currentSeconds)} / ${formatAudioSeconds(effectiveDuration)}
            </span>
            <span style="font-size:10px;">
              ${isAnthem ? '৫২ সেকেন্ড অফিসিয়াল প্রমিত সময়' : (vandePlayMode === 'prayer' ? 'প্রার্থনাসভা সংক্ষিপ্ত রূপ' : 'সম্পূর্ণ সাউন্ডট্র্যাক')}
            </span>
          </div>
        </div>

        <!-- AUDIO PLAYBACK CONTROLS -->
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-top:10px;">
          <button
            id="assemblyPlayPauseBtn"
            onclick="window.toggleAssemblyPlay()"
            style="background:${isAssemblyAudioPlaying ? '#d97706' : '#16a34a'};color:#ffffff;border:none;border-radius:10px;padding:10px 14px;font-size:12.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 3px 8px rgba(0,0,0,0.2);"
          >
            <span style="font-size:15px">${isAssemblyAudioPlaying ? '⏸️' : '▶️'}</span>
            <span>${isAssemblyAudioPlaying ? 'পজ করুন' : 'বাজান (Play)'}</span>
          </button>

          <button
            onclick="window.restartAssemblyAudio()"
            style="background:rgba(255,255,255,0.15);color:#ffffff;border:1px solid rgba(255,255,255,0.25);border-radius:10px;padding:10px 10px;font-size:11.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;"
            title="পুনরায় শুরু থেকে চালান"
          >
            <span>🔄</span>
            <span>পুনরায়</span>
          </button>
        </div>

        <!-- VOLUME SLIDER & SPEAKER BOOST -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:14px">🔊</span>
            <span style="font-size:10.5px;color:#cbd5e1;">সাউন্ড ভলিউম:</span>
            <span id="assemblyVolPct" style="font-size:10.5px;font-weight:800;color:#ffffff;">${toBengaliNum(Math.round(assemblyAudioVolume * 100))}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value="${assemblyAudioVolume}"
            oninput="window.setAssemblyVolume(parseFloat(this.value))"
            style="width:110px;cursor:pointer;"
          />
        </div>
      </div>

      <!-- KARAOKE LYRICS CONTAINER -->
      <div style="background:#ffffff;border:1.5px solid #bfdbfe;border-radius:14px;padding:12px;margin-bottom:12px;box-shadow:0 3px 10px rgba(37,99,235,0.06);">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:8px;">
          <div style="font-size:12px;font-weight:800;color:#1e40af;display:flex;align-items:center;gap:4px;">
            <span>📖</span>
            <span>লাইভ কারাওকে লিরিক্স (Karaoke Follow-Along)</span>
          </div>
          <span style="font-size:10px;color:#64748b;">গানের সাথে সাথে হাইলাইট হবে</span>
        </div>

        <div id="assemblyKaraokeBox" class="karaoke-box">
          ${lyricsHtml}
        </div>
      </div>

      <!-- ASSEMBLY PROTOCOL & RULES -->
      <div style="background:#fefce8;border:1.5px solid #fef08a;border-radius:12px;padding:10px 12px;">
        <div style="font-size:11.5px;font-weight:800;color:#854d0e;display:flex;align-items:center;gap:4px;margin-bottom:4px;">
          <span>⚠️</span>
          <span>প্রাতঃকালীন প্রার্থনাসভা শিষ্টাচার ও সরকারি নির্দেশিকা:</span>
        </div>
        <ul style="margin:0;padding-left:18px;font-size:10.5px;line-height:1.6;color:#713f12;">
          ${track.guidelines.map(g => `<li>${g}</li>`).join('')}
        </ul>
      </div>
    `;
  } else if (currentAssemblyTabType === 'pledge') {
    // NATIONAL PLEDGE VIEW
    bodyHtml = `
      <div style="background:#ffffff;border:1.5px solid #fed7aa;border-radius:14px;padding:14px;box-shadow:0 4px 12px rgba(249,115,22,0.08);">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #ffedd5;padding-bottom:8px;margin-bottom:10px;">
          <div>
            <div style="font-size:14px;font-weight:800;color:#c2410c;">🇮🇳 ভারতের জাতীয় শপথ (National Pledge)</div>
            <div style="font-size:10.5px;color:#78716c;margin-top:1px;">প্রার্থনাসভায় শিক্ষার্থীদের সমবেত শপথ পাঠ</div>
          </div>
          <div style="display:flex;gap:4px;">
            <button
              onclick="window.speakText(assemblyTexts.pledge.replace(/<[^>]*>/g, ' '))"
              style="background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:5px 8px;border-radius:6px;font-size:10.5px;font-weight:700;cursor:pointer;"
            >
              🔊 পাঠ শুনুন
            </button>
            <button
              onclick="navigator.clipboard.writeText(assemblyTexts.pledge.replace(/<[^>]*>/g, ' '));alert('শপথ কপি হয়েছে!');"
              style="background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;padding:5px 8px;border-radius:6px;font-size:10.5px;font-weight:700;cursor:pointer;"
            >
              📋 কপি
            </button>
          </div>
        </div>

        <div style="background:#fff7ed;border-left:4px solid #f97316;padding:10px 12px;border-radius:0 10px 10px 0;font-size:13px;line-height:1.8;color:#431407;margin-bottom:12px;">
          <p style="margin:0 0 8px 0;font-weight:700;">ভারত আমার দেশ। সমস্ত ভারতবাসী আমার ভাই ও বোন।</p>
          <p style="margin:0 0 8px 0;">আমি আমার দেশকে ভালোবাসি এবং এর সমৃদ্ধ ও বৈচিত্র্যপূর্ণ ঐতিহ্যের জন্য আমি গর্বিত।</p>
          <p style="margin:0 0 8px 0;">আমি সর্বদা এর যোগ্য হওয়ার সচেষ্ট থাকব।</p>
          <p style="margin:0 0 8px 0;">আমি আমার পিতামাতা, শিক্ষক-শিক্ষিকা এবং সকল গুরুজনদের প্রতি শ্রদ্ধা জ্ঞাপন করব এবং সকলের সাথে শিষ্টাচার বজায় রাখব।</p>
          <p style="margin:0;font-weight:700;">আমি আমার দেশ এবং দেশের জনগণের সেবায় নিজেকে উৎসর্গ করার শপথ গ্রহণ করছি। তাদের সার্বিক মঙ্গল ও সমৃদ্ধির মধ্যেই নিহিত আমার সুখ ও আনন্দ। জয় হিন্দ!</p>
        </div>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;font-size:10.5px;color:#475569;line-height:1.5;">
          <b>📌 নির্দেশিকা:</b> জাতীয় শপথ পাঠ করার সময় ডান হাত বুক বরাবর সোজা সামনে প্রসারিত করে অথবা সাবধান অবস্থায় দাঁড়িয়ে স্পষ্ট উচ্চারণে সমবেত কণ্ঠে পাঠ করা হয়।
        </div>
      </div>
    `;
  } else if (currentAssemblyTabType === 'speech') {
    // 5-MINUTE SPEECHES VIEW
    const currentSpeechText = assemblySpeeches[currentSpeechSelection] || 'ভাষণ পাওয়া যায়নি';
    bodyHtml = `
      <div style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:14px;padding:14px;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
        <div style="margin-bottom:10px;">
          <label style="font-size:11px;font-weight:800;color:#1e293b;display:block;margin-bottom:4px;">
            🎙️ দিবস নির্বাচন করুন (৫ মিনিটের উপযোগী সহজ-সরল ভাষণ):
          </label>
          <select
            id="speechDaySelect"
            onchange="window.showSpecificSpeech(this.value)"
            style="width:100%;padding:8px;border-radius:8px;border:1.5px solid #94a3b8;font-size:12px;background:#f8fafc;font-weight:600;"
          >
            <option value="netaji" ${currentSpeechSelection === 'netaji' ? 'selected' : ''}>নেতাজি জয়ন্তী (২৩ জানুয়ারি)</option>
            <option value="bhasha" ${currentSpeechSelection === 'bhasha' ? 'selected' : ''}>আন্তর্জাতিক মাতৃভাষা দিবস (২১ ফেব্রুয়ারি)</option>
            <option value="rabindra" ${currentSpeechSelection === 'rabindra' ? 'selected' : ''}>রবীন্দ্র জয়ন্তী (৯ মে)</option>
            <option value="nazrul" ${currentSpeechSelection === 'nazrul' ? 'selected' : ''}>নজরুল জয়ন্তী (২৬ মে)</option>
            <option value="swadhinata" ${currentSpeechSelection === 'swadhinata' ? 'selected' : ''}>স্বাধীনতা দিবস (১৫ আগস্ট)</option>
            <option value="shikshak" ${currentSpeechSelection === 'shikshak' ? 'selected' : ''}>শিক্ষক দিবস (৫ সেপ্টেম্বর)</option>
            <option value="vidyasagar" ${currentSpeechSelection === 'vidyasagar' ? 'selected' : ''}>ঈশ্বরচন্দ্র বিদ্যাসাগর জন্মজয়ন্তী (২৬ সেপ্টেম্বর)</option>
            <option value="shishu" ${currentSpeechSelection === 'shishu' ? 'selected' : ''}>শিশু দিবস (১৪ নভেম্বর)</option>
          </select>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:8px;">
          <button
            onclick="window.speakText(assemblySpeeches['${currentSpeechSelection}'].replace(/<[^>]*>/g, ' '))"
            style="background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:4px 8px;border-radius:6px;font-size:10.5px;font-weight:700;cursor:pointer;"
          >
            🔊 স্পষ্ট স্বরে ভাষণ শুনুন
          </button>
          <button
            onclick="navigator.clipboard.writeText(assemblySpeeches['${currentSpeechSelection}'].replace(/<[^>]*>/g, ' '));alert('ভাষণ কপি হয়েছে!');"
            style="background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;padding:4px 8px;border-radius:6px;font-size:10.5px;font-weight:700;cursor:pointer;"
          >
            📋 কপি
          </button>
        </div>

        <div style="background:#f8fafc;border-left:4px solid #3b82f6;border-radius:0 10px 10px 0;padding:12px;font-size:12.5px;line-height:1.7;color:#1e293b;max-height:280px;overflow-y:auto;">
          ${currentSpeechText}
        </div>
      </div>
    `;
  }

  container.innerHTML = navHtml + bodyHtml;
}

export function renderActivityContent() {
  const classEl = document.getElementById('actClassSelect') as HTMLSelectElement | null;
  const typeEl = document.getElementById('actTypeSelect') as HTMLSelectElement | null;
  const cls = classEl?.value || 'shishu';
  const typ = typeEl?.value || 'rhyme';
  const content = (activityBank[cls] && activityBank[cls][typ]) ? activityBank[cls][typ] : 'অ্যাক্টিভিটি তথ্য পাওয়া যায়নি';
  const displayBox = document.getElementById('activityDisplayBox');
  if (displayBox) displayBox.innerHTML = content;
}

export function saveDiaryEntry() {
  const dateEl = document.getElementById('diaryDate') as HTMLInputElement | null;
  const classEl = document.getElementById('diaryClass') as HTMLSelectElement | null;
  const subjEl = document.getElementById('diarySubject') as HTMLInputElement | null;
  const topicEl = document.getElementById('diaryTopic') as HTMLTextAreaElement | null;

  const date = dateEl?.value || '';
  const className = classEl?.value || 'শিশু শ্রেণি';
  const subject = (subjEl?.value || '').trim();
  const topic = (topicEl?.value || '').trim();

  if (!date || !subject || !topic) {
    alert('দয়া করে তারিখ, বিষয় ও কী পড়ানো হলো তা লিখুন!');
    return;
  }

  myDiaries.unshift({
    id: Date.now(),
    date,
    className,
    subject,
    topic
  });

  SafeStorage.setItem('my_school_diaries_2026', JSON.stringify(myDiaries));
  renderDiaryList();

  if (subjEl) subjEl.value = '';
  if (topicEl) topicEl.value = '';
}

export function deleteDiaryEntry(id: number) {
  myDiaries = myDiaries.filter(d => d.id !== id);
  SafeStorage.setItem('my_school_diaries_2026', JSON.stringify(myDiaries));
  renderDiaryList();
}

export function renderDiaryList() {
  const area = document.getElementById('diaryListArea');
  if (!area) return;

  if (myDiaries.length === 0) {
    area.innerHTML = '<div style="text-align:center;padding:10px;font-size:11px;color:#94a3b8">এখনও কোনো ডায়েরি রেকর্ড নেই</div>';
    return;
  }

  let html = '<table class="routine-table" style="margin-top:0"><tr style="background:#f1f5f9"><th>তারিখ ও শ্রেণি</th><th>বিষয় ও বিবরণ</th><th>✕</th></tr>';
  myDiaries.forEach(d => {
    html += `<tr>` +
      `<td><b>${d.date}</b><br><small style="color:#2563eb">${d.className}</small></td>` +
      `<td style="text-align:left"><b>${d.subject}</b><br><span style="font-size:10px;color:#475569">${d.topic}</span></td>` +
      `<td><button onclick="window.deleteDiaryEntry(${d.id})" style="border:none;background:none;color:#ef4444;font-weight:700;cursor:pointer">✕</button></td>` +
      `</tr>`;
  });
  area.innerHTML = html + '</table>';
}

export function backupJSON() {
  const exportData = {
    leaves: myLeaves,
    diaries: myDiaries,
    holidayPlans: myHolidayPlans,
    teachers: getSavedTeachers(),
    exportDate: new Date().toISOString()
  };
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const dl = document.createElement('a');
  dl.setAttribute('href', dataStr);
  dl.setAttribute('download', 'WBBPE_Teacher_Calendar_Backup_2026.json');
  dl.click();
}

export function restoreJSON(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target?.result as string);
      if (parsed.leaves) {
        myLeaves = parsed.leaves;
        SafeStorage.setItem('my_school_leaves_2026', JSON.stringify(myLeaves));
      }
      if (parsed.diaries) {
        myDiaries = parsed.diaries;
        SafeStorage.setItem('my_school_diaries_2026', JSON.stringify(myDiaries));
      }
      if (parsed.holidayPlans) {
        myHolidayPlans = parsed.holidayPlans;
        SafeStorage.setItem('my_holiday_plans_2026', JSON.stringify(myHolidayPlans));
      }
      if (parsed.teachers) {
        SafeStorage.setItem('school_custom_teachers', JSON.stringify(parsed.teachers));
      }
      alert('সফলভাবে সমস্ত ডেটা রিস্টোর করা হয়েছে!');
      renderLeaveDashboard();
      renderDiaryList();
      renderHolidayPlanner();
      renderRoutine();
    } catch (err) {
      alert('ভুল ফাইল ফরম্যাট! ব্যাকআপ ফাইল পড়তে সমস্যা হয়েছে।');
    }
  };
  reader.readAsText(file);
}

export function speakHoliday() {
  speakDailyHolidayUpdate();
}

export function setRem() {
  const timeInp = document.getElementById('remTime') as HTMLInputElement | null;
  const val = timeInp?.value || '07:30';
  SafeStorage.setItem('daily_reminder_time', val);
  try {
    const raw = SafeStorage.getItem('wbbpe_reminder_settings_2026');
    const existing = raw ? JSON.parse(raw) : {};
    existing.time = val;
    existing.enabled = true;
    SafeStorage.setItem('wbbpe_reminder_settings_2026', JSON.stringify(existing));
  } catch (e) {}
  alert(`দৈনিক নোটিফিকেশন ও রিমাইন্ডার সকাল ${val} টায় সক্রিয় করা হয়েছে।`);
}

export function shareWA() {
  const msg = '📅 *WBBPE Teacher Calendar 2026*\nপশ্চিমবঙ্গ প্রাথমিক শিক্ষক শিক্ষিকা দিনপঞ্জিকা ও ৬৫ দিনের অফিসিয়াল ছুটির তালিকা।\nhttps://wbbpe.wb.gov.in';
  window.location.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg);
}

export function setupSwipes() {
  // Calendar Card Swipe
  const calContainer = document.getElementById('calCard');
  if (calContainer) {
    let touchStartX = 0, touchEndX = 0, touchStartY = 0, touchEndY = 0;
    calContainer.addEventListener('touchstart', (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    calContainer.addEventListener('touchend', (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX < 0) move(1);
        else move(-1);
      }
    }, { passive: true });
  }

  // Planner Calendar Swipe
  const planCalContainer = document.getElementById('planCalCard');
  if (planCalContainer) {
    let planTouchStartX = 0, planTouchEndX = 0, planTouchStartY = 0, planTouchEndY = 0;
    planCalContainer.addEventListener('touchstart', (e: TouchEvent) => {
      planTouchStartX = e.changedTouches[0].screenX;
      planTouchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    planCalContainer.addEventListener('touchend', (e: TouchEvent) => {
      planTouchEndX = e.changedTouches[0].screenX;
      planTouchEndY = e.changedTouches[0].screenY;
      const diffX = planTouchEndX - planTouchStartX;
      const diffY = planTouchEndY - planTouchStartY;
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX < 0) movePlanCal(1);
        else movePlanCal(-1);
      }
    }, { passive: true });
  }
}

export function initApp() {
  initStorage();

  // Set today dates for date inputs
  const todayStr = getLocalDateString(new Date());
  const leaveDateEl = document.getElementById('leaveDate') as HTMLInputElement | null;
  const diaryDateEl = document.getElementById('diaryDate') as HTMLInputElement | null;
  if (leaveDateEl) leaveDateEl.value = todayStr;
  if (diaryDateEl) diaryDateEl.value = todayStr;

  updateHeaderStats();
  renderCal();
  renderList();
  renderRoutine();
  renderLeaveDashboard();
  renderActivityContent();
  renderDiaryList();
  renderHolidayPlanner();
  setupSwipes();
}

// Bind all to window for HTML inline onclick handlers
export function bindToWindow() {
  const w = window as any;
  w.SafeStorage = SafeStorage;
  w.getLocalDateString = getLocalDateString;
  w.holidays = holidays;
  w.daySignificanceData = daySignificanceData;
  w.cur = cur;
  w.holidayFilter = holidayFilter;
  w.getEvent = getEvent;
  w.playBanglaVoice = playBanglaVoice;
  w.showDay = showDay;
  w.toggleSignificance = toggleSignificance;
  w.sendWhatsAppNotice = sendWhatsAppNotice;
  w.renderCal = renderCal;
  w.renderList = renderList;
  w.setHolidayFilter = setHolidayFilter;
  w.move = move;
  w.tab = tab;
  w.movePlanCal = movePlanCal;
  w.renderPlanCalendar = renderPlanCalendar;
  w.togglePlanDate = togglePlanDate;
  w.resetPlanDates = resetPlanDates;
  w.updatePlanDateDisplay = updatePlanDateDisplay;
  w.toggleCustomCategory = toggleCustomCategory;
  w.saveHolidayPlan = saveHolidayPlan;
  w.deleteHolidayPlan = deleteHolidayPlan;
  w.printHolidayPlanList = printHolidayPlanList;
  w.renderHolidayPlanner = renderHolidayPlanner;
  w.getSavedTeachers = getSavedTeachers;
  w.saveTeacherList = saveTeacherList;
  w.getSchoolName = getSchoolName;
  w.saveSchoolName = saveSchoolName;
  w.saveRoutineCell = saveRoutineCell;
  w.renderRoutine = renderRoutine;
  w.exportMasterRoutinePDF = exportMasterRoutinePDF;
  w.shareRoutineWA = shareRoutineWA;
  w.renderLeaveDashboard = renderLeaveDashboard;
  w.addLeaveEntryDirectly = addLeaveEntryDirectly;
  w.addLeaveEntry = addLeaveEntry;
  w.deleteLeaveEntry = deleteLeaveEntry;
  w.printLeaveRegister = printLeaveRegister;
  w.getMyLeaves = getMyLeaves;
  w.showAssembly = showAssembly;
  w.showAssemblySpeechMenu = showAssemblySpeechMenu;
  w.showSpecificSpeech = showSpecificSpeech;
  w.initAssemblyAudio = initAssemblyAudio;
  w.toggleAssemblyPlay = toggleAssemblyPlay;
  w.restartAssemblyAudio = restartAssemblyAudio;
  w.seekAssemblyAudio = seekAssemblyAudio;
  w.setAssemblyVolume = setAssemblyVolume;
  w.setVandePlayMode = setVandePlayMode;
  w.switchAssemblyTrack = switchAssemblyTrack;
  w.jumpToAssemblyAndPlay = jumpToAssemblyAndPlay;
  w.renderAssemblyStudio = renderAssemblyStudio;
  w.renderActivityContent = renderActivityContent;
  w.saveDiaryEntry = saveDiaryEntry;
  w.deleteDiaryEntry = deleteDiaryEntry;
  w.renderDiaryList = renderDiaryList;
  w.backupJSON = backupJSON;
  w.restoreJSON = restoreJSON;
  w.speakHoliday = speakHoliday;
  w.speakDailyHolidayUpdate = speakDailyHolidayUpdate;
  w.speakDaySignificance = speakDaySignificance;
  w.speakCurrentPopupDay = speakCurrentPopupDay;
  w.stopSpeech = stopSpeech;
  w.setRem = setRem;
  w.shareWA = shareWA;

  // Date Range and Working Day Calculator
  w.toBengaliNum = toBengaliNum;
  w.formatBnDate = formatBnDate;
  w.analyzeDateRange = analyzeDateRange;
  w.setCalSelectionMode = setCalSelectionMode;
  w.handleCalDayClick = handleCalDayClick;
  w.selectCalRangeDay = selectCalRangeDay;
  w.setDateRange = setDateRange;
  w.clearDateRange = clearDateRange;
  w.quickSelectRange = quickSelectRange;
  w.startRangeFromPopup = startRangeFromPopup;
  w.copyRangeAnalysisReport = copyRangeAnalysisReport;
  w.shareRangeAnalysisWA = shareRangeAnalysisWA;
  w.transferRangeToPlanner = transferRangeToPlanner;
  w.renderDateRangeAnalysis = renderDateRangeAnalysis;

  window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-routine', 'print-landscape', 'printing-planner', 'printing-leave', 'print-portrait');
    const pa = document.getElementById('masterPrintArea');
    if (pa) { pa.style.display = 'none'; pa.innerHTML = ''; }
    const pp = document.getElementById('planPrintArea');
    if (pp) { pp.style.display = 'none'; pp.innerHTML = ''; }
    const pl = document.getElementById('leavePrintArea');
    if (pl) { pl.style.display = 'none'; pl.innerHTML = ''; }
  });
}
