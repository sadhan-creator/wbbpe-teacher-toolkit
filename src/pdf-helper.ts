import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { holidays, Holiday } from './data/holidays';
import {
  getMyHolidayPlans,
  HolidayPlanItem,
  SafeStorage,
  getSavedTeachers,
  getMyLeaves,
  LeaveItem,
  getMyDiaries,
  DiaryItem
} from './app-engine';

const bengaliDigits: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

export function toBengaliNumber(num: number | string): string {
  return String(num).replace(/\d/g, d => bengaliDigits[d] || d);
}

const bengaliMonths = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const bengaliDays = [
  'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
];

export function getPdfDateLang(): 'bn' | 'en' {
  return (SafeStorage.getItem('pdf_date_lang') as 'bn' | 'en') || 'bn';
}

export function formatPdfDate(isoStr: string): { dateStr: string; dayStr: string } {
  const lang = getPdfDateLang();
  if (lang === 'en') {
    const parts = isoStr.split('-');
    if (parts.length < 3) return { dateStr: isoStr, dayStr: '' };
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return {
      dateStr: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      dayStr: d.toLocaleDateString('en-GB', { weekday: 'long' })
    };
  }
  return formatBengaliDate(isoStr);
}

export function formatPdfCurrentDate(): string {
  const lang = getPdfDateLang();
  if (lang === 'en') {
    return new Date().toLocaleDateString('en-GB');
  }
  return toBengaliNumber(new Date().toLocaleDateString('bn-BD'));
}

export function formatBengaliDate(isoStr: string): { dateStr: string; dayStr: string } {
  const parts = isoStr.split('-');
  if (parts.length < 3) return { dateStr: isoStr, dayStr: '' };
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, monthIdx, day);

  const dateStr = `${toBengaliNumber(day)} ${bengaliMonths[monthIdx]} ${toBengaliNumber(year)}`;
  const dayStr = bengaliDays[d.getDay()];
  return { dateStr, dayStr };
}

export interface PdfGenerationResult {
  success: boolean;
  blobUrl: string;
  filename: string;
}

export async function generateAndDownloadPdf(
  element: HTMLElement,
  filename: string,
  orientation: 'p' | 'l' = 'p',
  watermark?: string
): Promise<PdfGenerationResult> {
  // Mount in valid viewport coordinates behind the page content
  element.style.position = 'fixed';
  element.style.left = '0px';
  element.style.top = '0px';
  element.style.zIndex = '-9999';
  element.style.pointerEvents = 'none';
  element.style.visibility = 'visible';
  element.style.opacity = '1';
  element.style.transform = 'none';

  document.body.appendChild(element);

  try {
    // Wait a brief tick for full DOM rendering and layout computation
    await new Promise(resolve => setTimeout(resolve, 80));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      windowWidth: orientation === 'l' ? 1120 : 800,
    });

    const pdf = new jsPDF(orientation, 'mm', 'a4');
    const pdfPageWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const imgHeightInMm = (imgHeight * pdfPageWidth) / imgWidth;

    if (imgHeightInMm <= pdfPageHeight) {
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfPageWidth, imgHeightInMm);
    } else {
      const pageHeightInCanvas = (imgWidth * pdfPageHeight) / pdfPageWidth;
      let renderedHeight = 0;
      let pageIndex = 0;

      while (renderedHeight < imgHeight) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        const currentSliceHeight = Math.min(pageHeightInCanvas, imgHeight - renderedHeight);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidth;
        pageCanvas.height = currentSliceHeight;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, imgWidth, currentSliceHeight);
          ctx.drawImage(
            canvas,
            0,
            renderedHeight,
            imgWidth,
            currentSliceHeight,
            0,
            0,
            imgWidth,
            currentSliceHeight
          );

          const sliceImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          const sliceHeightInMm = (currentSliceHeight * pdfPageWidth) / imgWidth;
          pdf.addImage(sliceImgData, 'JPEG', 0, 0, pdfPageWidth, sliceHeightInMm);
        }

        renderedHeight += currentSliceHeight;
        pageIndex++;
      }
    }

    // Apply watermark if provided
    if (watermark && watermark.trim() !== '') {
      const totalPages = pdf.internal.getNumberOfPages();
      pdf.setTextColor(150, 150, 150); // Light gray
      pdf.setFontSize(50);
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        // Using GState for transparency (supported in newer jsPDF)
        pdf.setGState(new (pdf.GState as any)({ opacity: 0.25 }));
        pdf.text(watermark.trim(), pdfPageWidth / 2, pdfPageHeight / 2, {
          angle: 45,
          align: 'center',
        });
        pdf.setGState(new (pdf.GState as any)({ opacity: 1.0 }));
      }
    }

    // Direct save trigger
    pdf.save(filename);

    // Create persistent blob URL for fallback click / direct view
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    try {
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      setTimeout(() => {
        if (downloadLink.parentNode) {
          downloadLink.parentNode.removeChild(downloadLink);
        }
      }, 1000);
    } catch (e) {
      console.warn('Auto download error:', e);
    }

    return {
      success: true,
      blobUrl,
      filename
    };
  } finally {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }
}

export type PlannerPdfMode = 'both' | 'plans' | 'official';

export function buildHolidayPlannerHtml(mode: PlannerPdfMode = 'both', customSchoolName?: string): string {
  const plans = getMyHolidayPlans();
  const schoolName = (customSchoolName || SafeStorage.getItem('school_custom_name') || 'পশ্চিমবঙ্গ প্রাথমিক বিদ্যালয়').trim();
  
  let html = `
    <div style="text-align: center; border-bottom: 2.5px solid #2563eb; padding-bottom: 12px; margin-bottom: 14px;">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; margin-bottom: 2px;">
        পশ্চিমবঙ্গ প্রাথমিক শিক্ষা পর্ষদ (WBBPE)
      </div>
      ${getSchoolLogoHtml()}
      <h1 style="margin: 0; font-size: 20px; color: #1e40af; font-weight: 800;">
        ${schoolName}
      </h1>
      <h2 style="margin: 4px 0 0; font-size: 15px; color: #0f172a;">
        শিক্ষক-শিক্ষিকা ছুটির প্ল্যানার ও বার্ষিক দিনপঞ্জিকা ২০২৬
      </h2>
      <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">
        পর্ষদ অনুমোদিত ৬৫ দিনের ছুটির তালিকা • ব্যক্তিগত ছুটির পরিকল্পনা • ট্রাভেল নোট
      </p>
    </div>
  `;

  // 1. User Custom Plans Section
  if (mode === 'both' || mode === 'plans') {
    html += `
      <div style="margin-bottom: 18px;">
        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 6px 12px; margin-bottom: 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 13px; color: #1e40af;">
            ✈️ শিক্ষক/শিক্ষিকার ব্যক্তিগত ছুটির পরিকল্পনা ও ট্রাভেল নোট
          </h3>
          <span style="font-size: 10px; font-weight: 700; color: #2563eb;">মোট প্ল্যান: ${toBengaliNumber(plans.length)}টি</span>
        </div>
    `;

    if (plans.length === 0) {
      html += `
        <div style="padding: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; font-size: 11px; color: #64748b; background: #f8fafc;">
          এখনও কোনো ব্যক্তিগত ছুটির প্ল্যান সংরক্ষিত নেই। ক্যালেন্ডার থেকে দিন সিলেক্ট করে নিজস্ব ট্যুর বা ইভেন্ট সংরক্ষণ করতে পারেন।
        </div>
      `;
    } else {
      html += `
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 4px;">
          <thead>
            <tr style="background: #2563eb; color: #ffffff;">
              <th style="border: 1px solid #1e40af; padding: 6px 8px; text-align: left; width: 26%;">পরিকল্পনার নাম</th>
              <th style="border: 1px solid #1e40af; padding: 6px 8px; text-align: left; width: 20%;">ধরন / ক্যাটাগরি</th>
              <th style="border: 1px solid #1e40af; padding: 6px 8px; text-align: left; width: 24%;">তারিখসমূহ</th>
              <th style="border: 1px solid #1e40af; padding: 6px 8px; text-align: left; width: 30%;">নোট / ভ্রমণ বিশদ</th>
            </tr>
          </thead>
          <tbody>
      `;

      plans.forEach((plan: HolidayPlanItem, idx: number) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const formattedDates = plan.dates.map(d => {
          const fb = formatPdfDate(d);
          return fb.dateStr;
        }).join(', ');

        html += `
          <tr style="background: ${bg};">
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 700; color: #1e3a8a;">${plan.title}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">
              <span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 600;">
                ${plan.category}
              </span>
            </td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px; color: #0f172a; font-weight: 600;">${formattedDates}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px; color: #334155; line-height: 1.4;">${plan.details}</td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      `;
    }
    html += `</div>`;
  }

  // 2. Official WBBPE Holiday List (65 Days)
  if (mode === 'both' || mode === 'official') {
    html += `
      <div style="margin-top: 14px;">
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 6px 12px; margin-bottom: 8px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 13px; color: #991b1b;">
            📋 পর্ষদ অনুমোদিত ৬৫ দিনের ছুটির বার্ষিক তালিকা (২০২৬)
          </h3>
          <span style="font-size: 10px; font-weight: 700; color: #b91c1c;">সরকারি ছুটি: ৬৫ দিন</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
          <thead>
            <tr style="background: #f1f5f9; color: #0f172a;">
              <th style="border: 1px solid #94a3b8; padding: 4px 5px; text-align: center; width: 6%;">নং</th>
              <th style="border: 1px solid #94a3b8; padding: 4px 6px; text-align: left; width: 38%;">ছুটি / উৎসবের নাম</th>
              <th style="border: 1px solid #94a3b8; padding: 4px 6px; text-align: center; width: 24%;">তারিখ (২০২৬)</th>
              <th style="border: 1px solid #94a3b8; padding: 4px 6px; text-align: center; width: 16%;">বার</th>
              <th style="border: 1px solid #94a3b8; padding: 4px 6px; text-align: center; width: 16%;">ধরন</th>
            </tr>
          </thead>
          <tbody>
    `;

    holidays.forEach((item: Holiday, idx: number) => {
      const isObs = !item.isHoliday;
      const bg = isObs ? '#fdf4ff' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc');
      const badgeStyle = isObs
        ? 'background: #e0e7ff; color: #4338ca; border: 1px dashed #6366f1;'
        : 'background: #fee2e2; color: #991b1b;';

      const fb = formatPdfDate(item.date);

      html += `
        <tr style="background: ${bg};">
          <td style="border: 1px solid #cbd5e1; padding: 3px 5px; text-align: center; font-weight: 600;">${toBengaliNumber(idx + 1)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 3px 6px; font-weight: 600; color: #1e293b;">${item.name}</td>
          <td style="border: 1px solid #cbd5e1; padding: 3px 6px; text-align: center; font-weight: 600;">${fb.dateStr}</td>
          <td style="border: 1px solid #cbd5e1; padding: 3px 6px; text-align: center; color: #475569;">${fb.dayStr}</td>
          <td style="border: 1px solid #cbd5e1; padding: 3px 6px; text-align: center;">
            <span style="display: inline-block; padding: 1px 4px; border-radius: 3px; font-size: 7.5px; font-weight: 700; ${badgeStyle}">
              ${isObs ? 'পালনীয় দিবস' : 'সরকারি ছুটি'}
            </span>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Footer
  html += `
    <div style="margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; font-size: 8.5px; color: #64748b;">
      <span>WBBPE Teacher Calendar • ডিজিটাল শিক্ষক দিনপঞ্জিকা ও প্ল্যানার ২০২৬</span>
      <span>ডাউনলোডের তারিখ: ${formatPdfCurrentDate()}</span>
    </div>
  `;

  return html;
}

export function buildOfficialHolidaysHtml(customSchoolName?: string): string {
  return buildHolidayPlannerHtml('official', customSchoolName);
}

export async function downloadHolidayPlannerPDF(mode: PlannerPdfMode = 'both', customSchoolName?: string): Promise<PdfGenerationResult> {
  const container = document.createElement('div');
  container.id = 'holiday-planner-pdf-render-box';
  container.style.position = 'fixed';
  container.style.left = '0px';
  container.style.top = '0px';
  container.style.width = '780px';
  container.style.padding = '22px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.boxSizing = 'border-box';

  container.innerHTML = buildHolidayPlannerHtml(mode, customSchoolName);
  const fileName = mode === 'plans'
    ? 'WBBPE-My-Holiday-Plans-2026.pdf'
    : (mode === 'official' ? 'WBBPE-Official-Holiday-List-2026.pdf' : 'WBBPE-Holiday-Planner-2026.pdf');

  const watermark = SafeStorage.getItem('pdf_watermark');
  return await generateAndDownloadPdf(container, fileName, 'p', watermark || undefined);
}

export function getSchoolLogoHtml(): string {
  const logo = SafeStorage.getItem('school_custom_logo');
  const align = SafeStorage.getItem('school_custom_logo_align') || 'center';
  const scaleStr = SafeStorage.getItem('school_custom_logo_scale');
  const scale = scaleStr ? parseInt(scaleStr, 10) : 50;
  const isGrayscale = SafeStorage.getItem('school_custom_logo_grayscale') === 'true';
  const filterStyle = isGrayscale ? 'filter: grayscale(100%);' : '';
  
  if (logo) return `<div style="text-align: ${align};"><img src="${logo}" style="max-height: ${scale}px; max-width: ${scale * 2}px; margin-bottom: 4px; ${filterStyle}" alt="Logo" /></div>`;
  return "";
}

export function buildLessonDiaryHtml(customSchoolName?: string): string {
  const schoolName = (customSchoolName || SafeStorage.getItem('school_custom_name') || 'পশ্চিমবঙ্গ প্রাথমিক বিদ্যালয়').trim();
  const diaries = getMyDiaries();

  let html = `
    <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 12px;">
      ${getSchoolLogoHtml()}
      <h2 style="margin: 0; font-size: 18px; color: #1e40af; font-weight: 800;">
        ${schoolName}
      </h2>
      <h3 style="margin: 4px 0 0; font-size: 14px; color: #0f172a;">
        দৈনিক পাঠ পরিকল্পনা ও শিক্ষক ডায়েরি রেজিস্টার (২০২৬)
      </h3>
      <p style="margin: 3px 0 0; font-size: 10.5px; color: #64748b;">
        পশ্চিমবঙ্গ প্রাথমিক শিক্ষা পর্ষদ (WBBPE) পাঠ্যসূচি অনুযায়ী শ্রেণিভিত্তিক দৈনিক পাঠ লগ
      </p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; font-size: 11px;">
      <span><b>মোট রেকর্ডকৃত ক্লাস সংখ্যা:</b> ${toBengaliNumber(diaries.length)}টি</span>
      <span><b>তারিখ:</b> ${formatPdfCurrentDate()}</span>
    </div>
  `;

  if (diaries.length === 0) {
    html += `
      <div style="padding: 24px; text-align: center; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; font-size: 12px; background: #f8fafc;">
        এখনও কোনো পাঠ পরিকল্পনা এন্ট্রি করা হয়নি। 'প্রার্থনা সভা ও সহায়িকা' ট্যাবে গিয়ে দৈনিক ডায়েরি যুক্ত করুন।
      </div>
    `;
  } else {
    html += `
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
        <thead>
          <tr style="background: #2563eb; color: #ffffff;">
            <th style="border: 1px solid #1e40af; padding: 6px 8px; text-align: center; width: 6%;">নং</th>
            <th style="border: 1px solid #1e40af; padding: 6px 8px; text-align: center; width: 16%;">তারিখ</th>
            <th style="border: 1px solid #1e40af; padding: 6px 8px; text-align: center; width: 16%;">শ্রেণি</th>
            <th style="border: 1px solid #1e40af; padding: 6px 8px; text-align: left; width: 22%;">বিষয় ও পিরিয়ড</th>
            <th style="border: 1px solid #1e40af; padding: 6px 8px; text-align: left; width: 40%;">কী পড়ানো হলো ও বিশদ</th>
          </tr>
        </thead>
        <tbody>
    `;

    diaries.forEach((d: DiaryItem, idx: number) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const fb = formatPdfDate(d.date);

      html += `
        <tr style="background: ${bg};">
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-weight: 700;">${toBengaliNumber(idx + 1)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-weight: 600; color: #1e40af;">${fb.dateStr}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">
            <span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9.5px;">
              ${d.className}
            </span>
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 700; color: #0f172a;">${d.subject}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; color: #334155; line-height: 1.4;">${d.topic}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;
  }

  html += `
    <div style="margin-top: 36px; display: flex; justify-content: space-between; font-size: 11px; color: #0f172a; padding: 0 10px;">
      <div style="text-align: center; width: 170px;">
        <div style="border-top: 1.5px dashed #64748b; padding-top: 5px;">শিক্ষক/শিক্ষিকার স্বাক্ষর</div>
      </div>
      <div style="text-align: center; width: 170px;">
        <div style="border-top: 1.5px dashed #64748b; padding-top: 5px;">প্রধান শিক্ষক/ভারপ্রাপ্ত শিক্ষকের সিল ও স্বাক্ষর</div>
      </div>
    </div>

    <div style="margin-top: 18px; border-top: 1px dashed #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; font-size: 8.5px; color: #64748b;">
      <span>WBBPE Teacher Calendar & Daily Lesson Diary ২০২৬</span>
      <span>মুদ্রণের তারিখ: ${formatPdfCurrentDate()}</span>
    </div>
  `;

  return html;
}

export async function downloadLessonDiaryPDF(customSchoolName?: string): Promise<PdfGenerationResult> {
  const container = document.createElement('div');
  container.id = 'lesson-diary-pdf-render-box';
  container.style.position = 'fixed';
  container.style.left = '0px';
  container.style.top = '0px';
  container.style.width = '780px';
  container.style.padding = '22px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.boxSizing = 'border-box';

  container.innerHTML = buildLessonDiaryHtml(customSchoolName);
  const fileName = 'WBBPE-Daily-Lesson-Diary-2026.pdf';
  const watermark = SafeStorage.getItem('pdf_watermark');
  return await generateAndDownloadPdf(container, fileName, 'p', watermark || undefined);
}

export function buildMasterRoutineHtml(customSchoolName?: string): string {
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

  function renderTable(dayKey: 'weekday' | 'sat', title: string, isSaturday: boolean) {
    let tHtml = `
      <div style="margin-bottom: 10px;">
        <div style="background: ${isSaturday ? '#4338ca' : '#1e40af'}; color: #fff; padding: 4px 10px; font-weight: bold; font-size: 11px; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between; align-items: center;">
          <span>📌 ${title}</span>
          <span style="font-weight: normal; font-size: 9.5px; opacity: 0.95;">
            ${isSaturday ? 'টিফিনের পর ০২:২০-এ বিদ্যালয় ছুটি' : 'পূর্ণ দিবস পঠনপাঠন (বিকাল ০৩:৩০ পর্যন্ত)'}
          </span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; text-align: center; table-layout: fixed;">
          <thead>
            <tr style="background: #f1f5f9; color: #0f172a;">
              <th style="border: 1px solid #94a3b8; padding: 4px 2px; width: 11%;">শ্রেণি</th>
              <th style="border: 1px solid #94a3b8; padding: 4px 2px; width: 12%;">১ম পিরিয়ড<br><span style="font-size: 8px; font-weight: normal; color: #475569;">১১:০০ - ১১:৪০</span></th>
              <th style="border: 1px solid #94a3b8; padding: 4px 2px; width: 12%;">২য় পিরিয়ড<br><span style="font-size: 8px; font-weight: normal; color: #475569;">১১:৪০ - ১২:২০</span></th>
              <th style="border: 1px solid #94a3b8; padding: 4px 2px; width: 12%;">৩য় পিরিয়ড<br><span style="font-size: 8px; font-weight: normal; color: #475569;">১২:২০ - ০১:০০</span></th>
              <th style="border: 1px solid #94a3b8; padding: 4px 2px; width: 12%;">৪র্থ পিরিয়ড<br><span style="font-size: 8px; font-weight: normal; color: #475569;">০১:০০ - ০১:৪০</span></th>
              <th style="border: 1px solid #94a3b8; padding: 4px 2px; width: 15%; background: #fef3c7; color: #92400e;">মিড-ডে মিল ও টিফিন<br><span style="font-size: 8px; font-weight: normal;">০১:৪০ - ০২:২০</span></th>
              ${
                isSaturday
                  ? `<th style="border: 1px solid #94a3b8; padding: 4px 2px; width: 26%; background: #fee2e2; color: #991b1b;">ছুটি<br><span style="font-size: 8px; font-weight: normal;">০২:২০-এ বিদ্যালয় ছুটি</span></th>`
                  : `
                  <th style="border: 1px solid #94a3b8; padding: 4px 2px; width: 13%;">৫ম পিরিয়ড<br><span style="font-size: 8px; font-weight: normal; color: #475569;">০২:২০ - ০৩:০০</span></th>
                  <th style="border: 1px solid #94a3b8; padding: 4px 2px; width: 13%;">৬ষ্ঠ পিরিয়ড<br><span style="font-size: 8px; font-weight: normal; color: #475569;">০৩:০০ - ০৩:৩০</span></th>
                  `
              }
            </tr>
          </thead>
          <tbody>
    `;

    classRows.forEach(c => {
      tHtml += `<tr><td style="border: 1px solid #cbd5e1; padding: 5px 3px; font-weight: bold; background: #f8fafc; color: #1e40af;">${c.name}</td>`;

      // Periods 0 to 3
      for (let i = 0; i < 4; i++) {
        const savedSubj = SafeStorage.getItem(`rout_subj_${c.key}_${dayKey}_${i}`);
        const savedTeach = SafeStorage.getItem(`rout_teach_${c.key}_${dayKey}_${i}`);
        const subj = savedSubj || c.defaultSubjs[i % c.defaultSubjs.length] || '-';
        const teach = savedTeach ? `<br><span style="font-size: 7.5px; color: #1e40af; font-weight: 600;">(${savedTeach})</span>` : '';

        if (c.key === 'shishu' && i >= 3) {
          tHtml += '<td style="border: 1px solid #cbd5e1; padding: 4px; color: #64748b; background: #f8fafc; font-size: 8.5px;">ছুটি</td>';
        } else {
          tHtml += `<td style="border: 1px solid #cbd5e1; padding: 4px 2px;"><b style="color: #1e293b;">${subj}</b>${teach}</td>`;
        }
      }

      // Tiffin
      tHtml += '<td style="border: 1px solid #cbd5e1; padding: 4px 2px; background: #fef3c7; font-weight: bold; color: #b45309; font-size: 8.5px;">মিড-ডে মিল ও বিরতি</td>';

      // Periods 4 & 5 (or Saturday off)
      if (isSaturday) {
        tHtml += '<td style="border: 1px solid #cbd5e1; padding: 4px 2px; color: #dc2626; background: #fee2e2; font-weight: bold; font-size: 8.5px;">বিদ্যালয় ছুটি (০২:২০)</td>';
      } else {
        // Period 5 (i=5)
        if (c.key === 'shishu') {
          tHtml += '<td style="border: 1px solid #cbd5e1; padding: 4px; color: #64748b; background: #f8fafc; font-size: 8.5px;">ছুটি</td>';
        } else {
          const s5 = SafeStorage.getItem(`rout_subj_${c.key}_${dayKey}_5`) || c.defaultSubjs[4 % c.defaultSubjs.length] || '-';
          const t5 = SafeStorage.getItem(`rout_teach_${c.key}_${dayKey}_5`);
          const t5Str = t5 ? `<br><span style="font-size: 7.5px; color: #1e40af; font-weight: 600;">(${t5})</span>` : '';
          tHtml += `<td style="border: 1px solid #cbd5e1; padding: 4px 2px;"><b style="color: #1e293b;">${s5}</b>${t5Str}</td>`;
        }

        // Period 6 (i=6)
        if (c.key === 'shishu' || c.key === 'class1' || c.key === 'class2') {
          tHtml += '<td style="border: 1px solid #cbd5e1; padding: 4px; color: #64748b; background: #f8fafc; font-size: 8.5px;">ছুটি (০৩:০০)</td>';
        } else {
          const s6 = SafeStorage.getItem(`rout_subj_${c.key}_${dayKey}_6`) || c.defaultSubjs[5 % c.defaultSubjs.length] || '-';
          const t6 = SafeStorage.getItem(`rout_teach_${c.key}_${dayKey}_6`);
          const t6Str = t6 ? `<br><span style="font-size: 7.5px; color: #1e40af; font-weight: 600;">(${t6})</span>` : '';
          tHtml += `<td style="border: 1px solid #cbd5e1; padding: 4px 2px;"><b style="color: #1e293b;">${s6}</b>${t6Str}</td>`;
        }
      }

      tHtml += '</tr>';
    });

    tHtml += '</tbody></table></div>';
    return tHtml;
  }

  const teacherListStr = teachers.join(' • ');

  let html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 12px 16px; color: #0f172a; background: #ffffff;">
      <!-- HEADER -->
      <div style="text-align: center; border-bottom: 2.5px solid #1e40af; padding-bottom: 6px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="text-align: left;">
            <span style="font-size: 9px; font-weight: bold; color: #1e40af; background: #dbeafe; padding: 2px 6px; border-radius: 4px;">WBBPE Approved</span>
            <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">শিক্ষাবর্ষ: ২০২৬</div>
          </div>
          <div style="text-align: center; flex: 1;">
            ${getSchoolLogoHtml()}
            <h1 style="margin: 0; font-size: 17px; color: #1e3a8a; font-weight: 800; letter-spacing: 0.2px;">
              ${schoolName}
            </h1>
            <h2 style="margin: 3px 0 0; font-size: 12.5px; color: #2563eb; font-weight: 700;">
              সম্পূর্ণ সাপ্তাহিক মাস্টার ক্লাস রুটিন ২০২৬
            </h2>
            <p style="margin: 2px 0 0; font-size: 9px; color: #475569;">
              পশ্চিমবঙ্গ প্রাথমিক শিক্ষা পর্ষদের বিধিসম্মত সময়সূচি ও পাঠবণ্টন নির্দেশিকা
            </p>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 9px; font-weight: bold; color: #059669; background: #d1fae5; padding: 2px 6px; border-radius: 4px;">মাস্টার শিট</span>
            <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">প্রাক-প্রাথমিক - ৫ম শ্রেণি</div>
          </div>
        </div>
      </div>

      <!-- TABLES -->
      ${renderTable('weekday', 'সোমবার থেকে শুক্রবার (সাধারণ পূর্ণ দিবস পঠনপাঠন)', false)}
      ${renderTable('sat', 'শনিবারের বিশেষ সময়সূচি (টিফিনের পর অর্ধ দিবস ছুটি)', true)}

      <!-- FOOTER INFO & SIGNATURES -->
      <div style="margin-top: 10px; border-top: 1.5px dashed #94a3b8; padding-top: 8px; display: grid; grid-template-columns: 1.3fr 1.7fr 1fr; gap: 12px; font-size: 9px; color: #334155;">
        <div style="background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <b style="color: #1e40af; display: block; margin-bottom: 2px;">⏰ সাধারণ সময়সূচি:</b>
          <div>• প্রার্থনা সভা: সকাল ১০:৫০ - ১১:০০</div>
          <div>• মিড-ডে মিল ও টিফিন: দুপুর ০১:৪০ - ০২:২০</div>
          <div>• শনিবারে টিফিনের পর ০২:২০-এ বিদ্যালয় ছুটি</div>
        </div>

        <div style="background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <b style="color: #1e40af; display: block; margin-bottom: 2px;">👥 কর্মরত শিক্ষক-শিক্ষিকাবৃন্দ:</b>
          <div style="color: #1e293b; font-weight: 600; line-height: 1.4;">${teacherListStr || 'শিক্ষকদের নাম রুটিন সেকশন থেকে যোগ করুন'}</div>
        </div>

        <div style="display: flex; flex-direction: column; justify-content: flex-end; text-align: center; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 6px;">
          <div style="margin-top: 22px; border-top: 1px solid #475569; padding-top: 3px; font-weight: bold; color: #0f172a; font-size: 8.5px;">
            ভারপ্রাপ্ত প্রধান শিক্ষকের স্বাক্ষর ও বিদ্যালয় সিল
          </div>
        </div>
      </div>
    </div>
  `;

  return html;
}

export async function downloadMasterRoutinePDF(customSchoolName?: string): Promise<PdfGenerationResult> {
  const container = document.createElement('div');
  container.id = 'master-routine-pdf-render-box';
  container.style.position = 'fixed';
  container.style.left = '0px';
  container.style.top = '0px';
  container.style.width = '1120px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.boxSizing = 'border-box';

  container.innerHTML = buildMasterRoutineHtml(customSchoolName);
  const fileName = 'WBBPE-Master-Class-Routine-2026.pdf';

  const watermark = SafeStorage.getItem('pdf_watermark');
  return await generateAndDownloadPdf(container, fileName, 'l', watermark || undefined);
}

export function buildLeaveTrackerHtml(customSchoolName?: string): string {
  const leaves = getMyLeaves();
  const schoolName = (customSchoolName || SafeStorage.getItem('school_custom_name') || 'পশ্চিমবঙ্গ প্রাথমিক বিদ্যালয়').trim();

  let cl = 0, ml = 0, other = 0;
  leaves.forEach((l: LeaveItem) => {
    if (l.type === 'CL') cl++;
    else if (l.type === 'ML' || l.type === 'Commuted') ml++;
    else other++;
  });
  const clRem = Math.max(0, 14 - cl);
  const totalLeaves = leaves.length;

  let html = `
    <div style="padding: 24px 28px; background: #ffffff; color: #0f172a; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2.5px solid #1e40af; padding-bottom: 12px; margin-bottom: 14px;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; margin-bottom: 2px;">
          পশ্চিমবঙ্গ প্রাথমিক শিক্ষা পর্ষদ (WBBPE)
        </div>
        ${getSchoolLogoHtml()}
        <h1 style="margin: 0; font-size: 20px; color: #1e40af; font-weight: 800;">
          ${schoolName}
        </h1>
        <h2 style="margin: 4px 0 0; font-size: 15px; color: #0f172a; font-weight: 700;">
          শিক্ষক / শিক্ষিকার ব্যক্তিগত ছুটির খাতা ও বিবরণী - ২০২৬
        </h2>
        <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">
          নৈমিত্তিক ছুটি (Casual Leave), মেডিকেল ও অর্জিত ছুটির বার্ষিক রেজিস্টার
        </p>
      </div>

      <!-- Stats Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; text-align: center;">
        <div style="border: 1.5px solid #93c5fd; background: #eff6ff; padding: 10px 8px; border-radius: 8px;">
          <div style="font-size: 11px; color: #1e40af; font-weight: bold;">মোট অনুমোদিত CL</div>
          <div style="font-size: 20px; font-weight: 800; color: #1d4ed8; margin: 3px 0;">১৪ দিন</div>
          <div style="font-size: 9.5px; color: #64748b;">(ক্যালেন্ডার বর্ষ ২০২৬)</div>
        </div>

        <div style="border: 1.5px solid #bfdbfe; background: #f8fafc; padding: 10px 8px; border-radius: 8px;">
          <div style="font-size: 11px; color: #1e40af; font-weight: bold;">ব্যবহৃত CL</div>
          <div style="font-size: 20px; font-weight: 800; color: #2563eb; margin: 3px 0;">${toBengaliNumber(cl)} দিন</div>
          <div style="font-size: 9.5px; color: #64748b;">গৃহীত নৈমিত্তিক ছুটি</div>
        </div>

        <div style="border: 1.5px solid ${clRem <= 2 ? '#fca5a5' : '#86efac'}; background: ${clRem <= 2 ? '#fef2f2' : '#f0fdf4'}; padding: 10px 8px; border-radius: 8px;">
          <div style="font-size: 11px; color: ${clRem <= 2 ? '#991b1b' : '#166534'}; font-weight: bold;">অবশিষ্ট CL বাকি</div>
          <div style="font-size: 20px; font-weight: 800; color: ${clRem <= 2 ? '#b91c1c' : '#15803d'}; margin: 3px 0;">${toBengaliNumber(clRem)} দিন</div>
          <div style="font-size: 9.5px; color: #64748b;">বর্তমান স্থিতি</div>
        </div>

        <div style="border: 1.5px solid #fed7aa; background: #fff7ed; padding: 10px 8px; border-radius: 8px;">
          <div style="font-size: 11px; color: #9a3412; font-weight: bold;">মেডিকেল ও অন্যান্য</div>
          <div style="font-size: 20px; font-weight: 800; color: #c2410c; margin: 3px 0;">${toBengaliNumber(ml + other)} দিন</div>
          <div style="font-size: 9.5px; color: #64748b;">(ML: ${toBengaliNumber(ml)}, অন্য: ${toBengaliNumber(other)})</div>
        </div>
      </div>

      <!-- Leave Log Table -->
      <div style="margin-bottom: 20px;">
        <div style="background: #1e40af; color: #ffffff; padding: 7px 12px; font-size: 12px; font-weight: bold; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center;">
          <span>📋 গৃহীত ছুটির বিস্তারিত তালিকা ও রেকর্ড</span>
          <span style="font-size: 10.5px; font-weight: normal;">মোট গৃহীত এন্ট্রি: ${toBengaliNumber(totalLeaves)}টি</span>
        </div>
  `;

  if (leaves.length === 0) {
    html += `
        <div style="border: 1px solid #cbd5e1; border-top: none; padding: 22px; text-align: center; font-size: 11.5px; color: #64748b; background: #f8fafc; border-radius: 0 0 6px 6px;">
          এখনও পর্যন্ত কোনো ছুটির এন্ট্রি নথিভুক্ত করা হয়নি।
        </div>
    `;
  } else {
    html += `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: #f1f5f9; color: #0f172a;">
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 8%;">ক্র.নং</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; width: 22%;">ছুটির তারিখ</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 20%;">ছুটির ধরন</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; width: 35%;">ছুটি গ্রহণের কারণ</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 15%;">অনুমোদন স্থিতি</th>
            </tr>
          </thead>
          <tbody>
    `;

    leaves.forEach((l: LeaveItem, idx: number) => {
      const fb = formatPdfDate(l.date);
      const displayDate = fb.dateStr ? `${fb.dateStr} (${fb.dayStr})` : l.date;
      const typeBadge = l.type === 'CL' ? 'Casual Leave (CL)' : (l.type === 'ML' ? 'Medical Leave (ML)' : l.type);

      html += `
            <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: center; font-weight: bold;">${toBengaliNumber(idx + 1)}</td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 8px; font-weight: 600; color: #1e40af;">${displayDate}</td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: center;">
                <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; background: ${l.type === 'CL' ? '#dbeafe' : (l.type === 'ML' ? '#fee2e2' : '#dcfce7')}; color: ${l.type === 'CL' ? '#1e40af' : (l.type === 'ML' ? '#991b1b' : '#166534')};">
                  ${typeBadge}
                </span>
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 8px;">${l.reason || 'ব্যক্তিগত ছুটি'}</td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: center; color: #15803d; font-weight: 700;">✅ অনুমোদিত</td>
            </tr>
      `;
    });

    html += `
          </tbody>
        </table>
    `;
  }

  // Verification & Signatures
  html += `
      </div>

      <div style="margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; padding: 0 10px;">
        <div style="text-align: center; width: 220px;">
          <div style="border-top: 1px dashed #475569; padding-top: 6px;">
            <b>আবেদনকারী শিক্ষক/শিক্ষিকার স্বাক্ষর</b><br>
            <span style="font-size: 9.5px; color: #64748b;">তারিখ: .............................</span>
          </div>
        </div>
        <div style="text-align: center; width: 240px;">
          <div style="border-top: 1px dashed #475569; padding-top: 6px;">
            <b>প্রধান শিক্ষক / TIC-এর স্বাক্ষর ও বিদ্যালয় সিল</b><br>
            <span style="font-size: 9.5px; color: #64748b;">অনুমোদিত ও সার্ভিস রেজিস্টারে নথিভুক্ত</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 20px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px;">
        WBBPE পশ্চিমবঙ্গ প্রাথমিক শিক্ষক শিক্ষিকা দিনপঞ্জিকা ও সার্ভিস পোর্টাল ২০২৬
      </div>
    </div>
  `;

  return html;
}

export async function downloadLeaveTrackerPDF(customSchoolName?: string): Promise<PdfGenerationResult> {
  const container = document.createElement('div');
  container.id = 'leave-tracker-pdf-render-box';
  container.style.position = 'fixed';
  container.style.left = '0px';
  container.style.top = '0px';
  container.style.width = '780px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.boxSizing = 'border-box';

  container.innerHTML = buildLeaveTrackerHtml(customSchoolName);
  const schoolName = (customSchoolName || SafeStorage.getItem('school_custom_name') || 'WBBPE').trim().replace(/\s+/g, '_');
  const fileName = `WBBPE-Leave-Register-2026-${schoolName}.pdf`;

  const watermark = SafeStorage.getItem('pdf_watermark');
  return await generateAndDownloadPdf(container, fileName, 'p', watermark || undefined);
}

