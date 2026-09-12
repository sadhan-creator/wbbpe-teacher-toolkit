import { holidays } from './data/holidays';
import { SafeStorage, getLocalDateString } from './app-engine';

export interface ReminderSettings {
  enabled: boolean;
  time: string; // "HH:MM" e.g., "07:30"
  routineReminder: boolean;
  leaveReminder: boolean;
  holidayReminder: boolean;
  soundEnabled: boolean;
  lastNotifiedDate: string; // "YYYY-MM-DD"
}

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  time: '07:30',
  routineReminder: true,
  leaveReminder: true,
  holidayReminder: true,
  soundEnabled: true,
  lastNotifiedDate: ''
};

const STORAGE_KEY = 'wbbpe_reminder_settings_2026';
const BELL_ICON = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232563eb"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

export function getReminderSettings(): ReminderSettings {
  const saved = SafeStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to parse saved reminder settings:', e);
    }
  }
  const legacyTime = SafeStorage.getItem('daily_reminder_time');
  if (legacyTime) {
    return { ...DEFAULT_REMINDER_SETTINGS, time: legacyTime };
  }
  return { ...DEFAULT_REMINDER_SETTINGS };
}

export function saveReminderSettings(settings: Partial<ReminderSettings>): ReminderSettings {
  const current = getReminderSettings();
  const updated: ReminderSettings = { ...current, ...settings };
  SafeStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  SafeStorage.setItem('daily_reminder_time', updated.time);
  return updated;
}

/**
 * Synthesizes a soft, pleasant notification chime using Web Audio API
 */
export function playNotificationSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Double chime: D5 (587.33Hz) -> A5 (880Hz)
    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.start(now);
    osc.stop(now + 0.62);
  } catch (err) {
    // Autoplay restrictions or audio disabled
  }
}

export interface ReminderSection {
  icon: string;
  label: string;
  text: string;
  tabTarget?: number;
}

export interface ReminderPayload {
  title: string;
  body: string;
  sections: ReminderSection[];
  dateStr: string;
}

export function buildDailyReminderContent(settings: ReminderSettings, targetDate: Date = new Date()): ReminderPayload {
  const dayNames = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  const dayIndex = targetDate.getDay();
  const dayName = dayNames[dayIndex];
  const dateStr = getLocalDateString(targetDate);

  const sections: ReminderSection[] = [];

  // 1. Holiday Status
  if (settings.holidayReminder) {
    if (dayIndex === 0) {
      sections.push({
        icon: '🏖️',
        label: 'সাপ্তাহিক ছুটি',
        text: 'আজ রবিবার — বিদ্যালয় বন্ধ।'
      });
    } else {
      const match = holidays.find(h => h.date === dateStr);
      if (match) {
        sections.push({
          icon: match.isHoliday ? '🎉' : '🚩',
          label: match.isHoliday ? 'আজকের ছুটি' : 'আজ বিশেষ দিন',
          text: `আজ ${match.name} ${match.isHoliday ? '(বিদ্যালয় বন্ধ)' : '(বিদ্যালয়ে পালনীয়)'}।`,
          tabTarget: 2
        });
      } else {
        const upcoming = holidays
          .filter(h => h.date > dateStr && h.isHoliday)
          .sort((a, b) => a.date.localeCompare(b.date));
        const nextHol = upcoming.length > 0 ? `পরবর্তী ছুটি: ${upcoming[0].name} (${upcoming[0].date})` : '';
        sections.push({
          icon: '🏫',
          label: 'বিদ্যালয় স্থিতি',
          text: `আজ স্বাভাবিক বিদ্যালয় খোলা। ${nextHol}`,
          tabTarget: 1
        });
      }
    }
  }

  // 2. Class Routine
  if (settings.routineReminder) {
    if (dayIndex === 0) {
      sections.push({
        icon: '📚',
        label: 'ক্লাস রুটিন',
        text: 'আজ রবিবার, কোনো ক্লাস নেই।'
      });
    } else if (dayIndex === 6) {
      sections.push({
        icon: '📚',
        label: 'শনিবারের বিশেষ রুটিন',
        text: '১ম-৪র্থ পিরিয়ড (১১:০০-১:৪০), টিফিন ও MDM শেষে ০২:২০-এ ছুটি।',
        tabTarget: 4
      });
    } else {
      sections.push({
        icon: '📚',
        label: 'আজকের রুটিন (সোম-শুক্র)',
        text: 'পূর্ণ দিবস (১০:৪০-৩:৩০): ১ম-৪র্থ পিরিয়ড, ১:৪০-এ MDM, ৫ম ও ৬ষ্ঠ পিরিয়ড।',
        tabTarget: 4
      });
    }
  }

  // 3. Personal Leave Balance
  if (settings.leaveReminder) {
    let clUsed = 0;
    let mlUsed = 0;
    const rawLeaves = SafeStorage.getItem('my_school_leaves_2026');
    if (rawLeaves) {
      try {
        const arr = JSON.parse(rawLeaves);
        if (Array.isArray(arr)) {
          arr.forEach((l: any) => {
            if (l.type === 'CL') clUsed++;
            else if (l.type === 'ML') mlUsed++;
          });
        }
      } catch (e) {}
    }
    const clRem = Math.max(0, 14 - clUsed);
    let leaveMsg = `অবশিষ্ট CL: ${clRem}/১৪ | ব্যবহৃত ML: ${mlUsed}`;
    if (clUsed >= 14) {
      leaveMsg += ' (⚠️ সব CL সমাপ্ত!)';
    } else if (clUsed >= 12) {
      leaveMsg += ` (⚠️ মাত্র ${clRem}টি CL বাকি)`;
    }
    sections.push({
      icon: '📝',
      label: 'ব্যক্তিগত লিভ ব্যালেন্স',
      text: leaveMsg,
      tabTarget: 5
    });
  }

  const title = `🔔 WBBPE শিক্ষক দিনপঞ্জিকা (${dayName})`;
  const body = sections.map(s => `${s.icon} ${s.label}: ${s.text}`).join('\n');

  return { title, body, sections, dateStr };
}

/**
 * Dispatches browser Notification and in-app event
 */
export function dispatchReminderNotification(payload: ReminderPayload): boolean {
  const settings = getReminderSettings();
  if (settings.soundEnabled) {
    playNotificationSound();
  }

  let browserFired = false;
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const notifOptions: any = {
        body: payload.body,
        icon: BELL_ICON,
        badge: BELL_ICON,
        tag: 'wbbpe-daily-reminder',
        renotify: true
      };
      const notif = new Notification(payload.title, notifOptions);
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      browserFired = true;
    } catch (err) {
      console.warn('Native Notification failed:', err);
    }
  }

  // Broadcast in-app toast event
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('wbbpe-inapp-notification', {
      detail: payload
    });
    window.dispatchEvent(event);
  }

  return browserFired;
}

/**
 * Trigger test notification immediately
 */
export async function triggerTestNotification(): Promise<{
  success: boolean;
  browserFired: boolean;
  message: string;
}> {
  let perm = getNotificationPermissionStatus();
  if (perm === 'default') {
    perm = await requestNotificationPermission();
  }

  const settings = getReminderSettings();
  const payload = buildDailyReminderContent(settings, new Date());
  payload.title = `🧪 টেস্ট রিমাইন্ডার: ${payload.title}`;

  const browserFired = dispatchReminderNotification(payload);

  let message = '✅ টেস্ট রিমাইন্ডার সফলভাবে সম্পন্ন হয়েছে!';
  if (browserFired) {
    message = '✅ ব্রাউজার নোটিফিকেশন পাঠানো হয়েছে!';
  } else if (perm === 'denied') {
    message = '⚠️ ব্রাউজারে নোটিফিকেশন বন্ধ (Blocked)। ইন-অ্যাপ ব্যানারে রিমাইন্ডার দেখানো হলো।';
  } else if (perm === 'unsupported') {
    message = 'ℹ️ এই ব্রাউজারে নোটিফিকেশন API সমর্থিত নয়। ইন-অ্যাপ ব্যানারে দেখানো হয়েছে।';
  }

  return { success: true, browserFired, message };
}

let schedulerTimer: any = null;

export function startReminderScheduler(): void {
  if (typeof window === 'undefined') return;
  if (schedulerTimer) clearInterval(schedulerTimer);

  // Check immediately on launch
  checkAndTriggerScheduledReminder();

  // Periodic check every 30 seconds
  schedulerTimer = setInterval(() => {
    checkAndTriggerScheduledReminder();
  }, 30000);
}

export function checkAndTriggerScheduledReminder(): boolean {
  const settings = getReminderSettings();
  if (!settings.enabled) return false;

  const now = new Date();
  const currentHM = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const todayStr = getLocalDateString(now);

  if (settings.lastNotifiedDate === todayStr) {
    return false;
  }

  if (currentHM >= settings.time) {
    const payload = buildDailyReminderContent(settings, now);
    dispatchReminderNotification(payload);
    saveReminderSettings({ lastNotifiedDate: todayStr });
    return true;
  }

  return false;
}
