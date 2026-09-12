const fs = require('fs');
const content = `import React, { useState, useEffect } from 'react';

// Helper function to auto-capitalize (Title Case) inputs safely
const toTitleCase = (str: string) => {
  return str.replace(
    /\\w\\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export default function LeaveApplicationGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<'bn' | 'en'>(() => {
    return (localStorage.getItem('leave_app_lang') as 'bn' | 'en') || 'bn';
  });

  // Profile State
  const [teacherName, setTeacherName] = useState(() => localStorage.getItem('teacherName') || '');
  const [designation, setDesignation] = useState(() => localStorage.getItem('designation') || 'Assistant Teacher');
  const [schoolName, setSchoolName] = useState(() => localStorage.getItem('schoolName') || '');
  const [circleName, setCircleName] = useState(() => localStorage.getItem('circleName') || '');
  const [district, setDistrict] = useState(() => localStorage.getItem('district') || '');

  // Persist Profile & Lang
  useEffect(() => {
    localStorage.setItem('teacherName', teacherName);
    localStorage.setItem('designation', designation);
    localStorage.setItem('schoolName', schoolName);
    localStorage.setItem('circleName', circleName);
    localStorage.setItem('district', district);
    localStorage.setItem('leave_app_lang', lang);
  }, [teacherName, designation, schoolName, circleName, district, lang]);

  // Leave Form State
  const [leaveCategory, setLeaveCategory] = useState('cl');
  const [recipientOption, setRecipientOption] = useState('1'); 
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [prefixSuffix, setPrefixSuffix] = useState(false);
  
  // Generic / Custom Reason state
  const [selectedReason, setSelectedReason] = useState('reason_1');
  const [customReason, setCustomReason] = useState('');

  // CL balance logic
  const [clBalance, setClBalance] = useState(14);
  useEffect(() => {
    const savedCL = localStorage.getItem('clCount2025');
    if (savedCL) {
      setClBalance(14 - parseInt(savedCL));
    }
  }, []);

  // Specific state for DPSC leaves
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childOrder, setChildOrder] = useState('1st Child');
  const [cclSpell, setCclSpell] = useState('1st Spell');
  const [maternityMode, setMaternityMode] = useState('Full Term Confinement');
  const [diseaseName, setDiseaseName] = useState('');
  const [relation, setRelation] = useState('');
  const [memoNo, setMemoNo] = useState('');

  const [showPreview, setShowPreview] = useState(false);

  // Sync end date
  useEffect(() => {
    if (new Date(endDate) < new Date(startDate)) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  const daysMs = new Date(endDate).getTime() - new Date(startDate).getTime();
  const totalDays = Math.round(daysMs / (1000 * 60 * 60 * 24)) + 1;

  // Validations
  let isDaysValid = true;
  let errorMsg = '';
  if (leaveCategory === 'cl' && totalDays > 7) {
    isDaysValid = false;
    errorMsg = 'CL cannot exceed 7 days at a time.';
  }
  if (leaveCategory === 'ccl' && totalDays < 15) {
    isDaysValid = false;
    errorMsg = 'CCL must be taken for a minimum of 15 days per spell.';
  }
  if (leaveCategory === 'maternity') {
    if (maternityMode === 'Full Term Confinement' && totalDays > 180) {
      isDaysValid = false;
      errorMsg = 'Maternity Leave (Full Term) cannot exceed 180 days.';
    }
    if (maternityMode === 'Miscarriage / Abortion' && totalDays > 45) {
      isDaysValid = false;
      errorMsg = 'Maternity Leave (Miscarriage) cannot exceed 45 days.';
    }
  }
  if (leaveCategory === 'quarantine' && totalDays > 30) {
    isDaysValid = false;
    errorMsg = 'Quarantine Leave cannot exceed 30 days initially.';
  }

  const formatDisplayDate = (dString: string) => {
    if (!dString) return '';
    const d = new Date(dString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return \`\${day}/\${month}/\${year}\`;
  };

  const dynamicDate = formatDisplayDate(new Date().toISOString().split('T')[0]);
  const startDisp = formatDisplayDate(startDate);
  const endDisp = formatDisplayDate(endDate);

  const getReasonOptions = () => {
    if (leaveCategory === 'cl') {
      return [
        { id: 'reason_1', bn: 'জরুরি পারিবারিক কাজ', en: 'Urgent Family Business' },
        { id: 'reason_2', bn: 'ব্যক্তিগত কাজ', en: 'Personal Affairs' },
        { id: 'reason_3', bn: 'হঠাৎ অসুস্থতা', en: 'Sudden Illness / Indisposition' },
        { id: 'reason_4', bn: 'সামাজিক / ধর্মীয় অনুষ্ঠান', en: 'Social / Religious Obligation' },
        { id: 'other', bn: 'অন্যান্য (নিজস্ব কারণ)', en: 'Other (Type custom...)' }
      ];
    }
    if (leaveCategory === 'commuted' || leaveCategory === 'halfpay') {
      return [
        { id: 'reason_1', bn: 'চিকিৎসা ও চিকিৎসকের পরামর্শে বিশ্রাম', en: 'Medical Treatment & Medically Advised Rest' },
        { id: 'reason_2', bn: 'গুরুতর অসুস্থতা / অস্ত্রোপচার', en: 'Severe Illness / Surgery' },
        { id: 'reason_3', bn: 'জরুরি ব্যক্তিগত প্রয়োজন', en: 'Urgent Private Affairs' },
        { id: 'other', bn: 'অন্যান্য (নিজস্ব কারণ)', en: 'Other (Type custom...)' }
      ];
    }
    if (leaveCategory === 'ccl') {
      return [
        { id: 'reason_1', bn: 'সন্তানের চূড়ান্ত / বোর্ড পরীক্ষার প্রস্তুতি', en: 'Annual / Board Examination Preparation' },
        { id: 'reason_2', bn: 'সন্তানের অসুস্থতা ও শুশ্রূষা', en: 'Child Illness & Nursing Care' },
        { id: 'reason_3', bn: 'সন্তানের শিক্ষাপ্রতিষ্ঠানে ভর্তি ও সার্বিক যত্ন', en: 'Academic Admission & Care' },
        { id: 'other', bn: 'অন্যান্য (নিজস্ব কারণ)', en: 'Other (Type custom...)' }
      ];
    }
    if (leaveCategory === 'maternity') {
      return [
        { id: 'reason_1', bn: 'সন্তান প্রসব ও প্রসূতিকালীন যত্ন', en: 'Full-term Confinement & Delivery' },
        { id: 'reason_2', bn: 'উন্নত গর্ভাবস্থা ও বিশ্রাম', en: 'Advanced Stage of Pregnancy' },
        { id: 'reason_3', bn: 'গর্ভপাত / গর্ভস্রাবজনিত বিশ্রাম', en: 'Miscarriage / Medical Termination' },
        { id: 'other', bn: 'অন্যান্য (নিজস্ব কারণ)', en: 'Other (Type custom...)' }
      ];
    }
    if (leaveCategory === 'quarantine') {
      return [
        { id: 'reason_1', bn: 'পরিবারে সংক্রামক ব্যাধি (বসন্ত)', en: 'Infectious Disease in Family (Smallpox/Chickenpox)' },
        { id: 'reason_2', bn: 'সংক্রামক ব্যাধি (কোভিড/মেনিনজাইটিস)', en: 'Severe Contagious Infection (COVID-19 / Meningitis)' },
        { id: 'other', bn: 'অন্যান্য (নিজস্ব কারণ)', en: 'Other (Type custom...)' }
      ];
    }
    if (leaveCategory === 'compensatory') {
      return [
        { id: 'reason_1', bn: 'গ্রীষ্মাবকাশে বাধ্যতামূলক পর্ষদ/নির্বাচনী দায়িত্ব', en: 'Compulsory Duty during Summer Vacation' },
        { id: 'reason_2', bn: 'পূজাবকাশে সরকারি দায়িত্ব পালন', en: 'Compulsory Duty during Puja Vacation' },
        { id: 'other', bn: 'অন্যান্য (নিজস্ব কারণ)', en: 'Other (Type custom...)' }
      ];
    }
    return [{ id: 'other', bn: 'অন্যান্য', en: 'Other' }];
  };

  useEffect(() => {
    // Reset reason when category changes
    setSelectedReason('reason_1');
    setCustomReason('');
  }, [leaveCategory]);

  const getActiveReasonText = () => {
    if (selectedReason === 'other') return customReason || (lang === 'bn' ? '[আপনার কারণ লিখুন]' : '[Type your reason]');
    const opt = getReasonOptions().find(o => o.id === selectedReason);
    return opt ? (lang === 'bn' ? opt.bn : opt.en) : '';
  };

  const generateLetterContent = () => {
    let header = '';
    let sub = '';
    let bodyText = '';
    let enclosures = '';
    let isDPSC = leaveCategory !== 'cl';
    const reasonText = getActiveReasonText();

    const renderBold = (txt: string) => <span style={{ fontWeight: 800 }}>{txt}</span>;

    // 1. HEADER (Address)
    if (lang === 'bn') {
      if (leaveCategory === 'cl') {
        if (recipientOption === '1') {
          header = \`বরাবর,\nঅবর বিদ্যালয় পরিদর্শক,\n\${circleName || '[Circle Name]'}\n\${district || '[District]'}\nমারফত: প্রধান শিক্ষক, \${schoolName || '[School]'}\`;
        } else if (recipientOption === '2') {
          header = \`বরাবর,\nঅবর বিদ্যালয় পরিদর্শক,\n\${circleName || '[Circle Name]'}\n\${district || '[District]'}\`;
        } else {
          header = \`বরাবর,\nপ্রধান শিক্ষক / টিচার-ইন-চার্জ,\n\${schoolName || '[School]'}\n\${circleName || '[Circle]'}\`;
        }
      } else {
        // DPSC Header for all other leaves
        header = \`বরাবর,\nমাননীয় চেয়ারম্যান মহাশয়,\nজেলা প্রাথমিক বিদ্যালয় সংসদ, \${district || '[District]'}\nমারফত:\n১. প্রধান শিক্ষক / টিচার-ইন-চার্জ, \${schoolName || '[School]'}\n২. অবর বিদ্যালয় পরিদর্শক, \${circleName || '[Circle]'}\`;
      }
    } else {
      if (leaveCategory === 'cl') {
        if (recipientOption === '1') {
          header = \`To,\nThe Sub-Inspector of Schools\n\${circleName || '[Circle Name]'}\n\${district || '[District]'}\nThrough: The Head Teacher, \${schoolName || '[School]'}\`;
        } else if (recipientOption === '2') {
          header = \`To,\nThe Sub-Inspector of Schools\n\${circleName || '[Circle Name]'}\n\${district || '[District]'}\`;
        } else {
          header = \`To,\nThe Head Teacher / Teacher-in-Charge\n\${schoolName || '[School Name]'}, \${circleName || '[Circle]'}, \${district || '[District]'}\`;
        }
      } else {
        header = \`To,\nThe Chairman,\nDistrict Primary School Council, \${district || '[District]'}\nThrough:\n1. The Head Teacher, \${schoolName || '[School]'}\n2. The Sub-Inspector of Schools, \${circleName || '[Circle]'}\`;
      }
    }

    // 2. SUBJECT & ENCLOSURES
    if (lang === 'bn') {
      if (leaveCategory === 'cl') {
        sub = \`নৈমিত্তিক ছুটির (Casual Leave) জন্য আবেদন।\`;
      } else if (leaveCategory === 'commuted') {
        sub = \`Rule 4(e) অনুযায়ী রূপান্তরিত ছুটির (Commuted Leave) জন্য আবেদন।\`;
        enclosures = \`সংযুক্তি:\n১. মেডিকেল ফিটনেস সার্টিফিকেট\n২. লিভ স্টেটমেন্ট\`;
      } else if (leaveCategory === 'halfpay') {
        sub = \`Rule 4(d) অনুযায়ী অর্ধ-বেতন ছুটির (Half Pay Leave) জন্য আবেদন।\`;
        enclosures = \`সংযুক্তি:\n১. চিকিৎসকের শংসাপত্র (প্রযোজ্য ক্ষেত্রে)\n২. লিভ স্টেটমেন্ট\`;
      } else if (leaveCategory === 'ccl') {
        sub = \`সন্তান প্রতিপালন ছুটির (Child Care Leave) জন্য আবেদন।\`;
        enclosures = \`সংযুক্তি:\n১. সন্তানের জন্ম প্রমাণপত্র\n২. লিভ স্টেটমেন্ট\n৩. আনুষঙ্গিক প্রমাণপত্র (প্রযোজ্য ক্ষেত্রে)\`;
      } else if (leaveCategory === 'maternity') {
        sub = \`প্রসূতিকালীন ছুটির (Maternity Leave) জন্য আবেদন।\`;
        enclosures = \`সংযুক্তি:\n১. মেডিকেল সার্টিফিকেট / চিকিৎসকের রিপোর্ট\n২. লিভ স্টেটমেন্ট\`;
      } else if (leaveCategory === 'quarantine') {
        sub = \`কোয়ারেন্টাইন ছুটির (Quarantine Leave) জন্য আবেদন।\`;
        enclosures = \`সংযুক্তি:\n১. পাবলিক হেলথ অফিসারের রিপোর্ট / চিকিৎসকের শংসাপত্র\`;
      } else if (leaveCategory === 'compensatory') {
        sub = \`কমপেনসেটরি ছুটির (Compensatory Leave) জন্য আবেদন।\`;
        enclosures = \`সংযুক্তি:\n১. ডিউটির অর্ডার কপি / মেমো\`;
      }
    } else {
      if (leaveCategory === 'cl') {
        sub = \`Application for Casual Leave.\`;
      } else if (leaveCategory === 'commuted') {
        sub = \`Application for Commuted Leave under Rule 4(e).\`;
        enclosures = \`Enclosures:\n1. Medical Certificate\n2. Fitness Certificate\n3. Leave Statement\`;
      } else if (leaveCategory === 'halfpay') {
        sub = \`Application for Half Pay Leave under Rule 4(d).\`;
        enclosures = \`Enclosures:\n1. Medical Certificate (if on medical ground)\n2. Leave Statement\`;
      } else if (leaveCategory === 'ccl') {
        sub = \`Application for Child Care Leave (CCL) as per Memo No. 5560-F(P).\`;
        enclosures = \`Enclosures:\n1. Child's Birth Certificate\n2. Leave Statement\n3. Supporting Documents (if applicable)\`;
      } else if (leaveCategory === 'maternity') {
        sub = \`Application for Maternity Leave under Rule 4(f).\`;
        enclosures = \`Enclosures:\n1. Medical Certificate / Doctor's Prescription\n2. Leave Statement\`;
      } else if (leaveCategory === 'quarantine') {
        sub = \`Application for Quarantine Leave under Rule 4(i).\`;
        enclosures = \`Enclosures:\n1. Certificate from Medical or Public Health Officer\`;
      } else if (leaveCategory === 'compensatory') {
        sub = \`Application for Compensatory Leave under Rule 4(c).\`;
        enclosures = \`Enclosures:\n1. Copy of Order/Memo for compulsory duty during vacation\`;
      }
    }

    // 3. BODY TEXT
    if (lang === 'bn') {
      const suffixText = prefixSuffix ? ' (প্রকাশ থাকে যে, উল্লিখিত ছুটির আগে/পরে রবিবার বা সরকারি ছুটি যুক্ত করা হয়েছে)' : '';
      let bodyPrefix = \`সবিনয় নিবেদন এই যে, আমি \${teacherName || '[Name]'}, আপনার অধীনস্থ \${schoolName || '[School]'}-এ একজন \${designation || '[Designation]'} হিসেবে কর্মরত। \`;
      
      if (leaveCategory === 'cl') {
        bodyText = \`\${bodyPrefix}আগামী \${startDisp} তারিখ হতে \${endDisp} তারিখ পর্যন্ত মোট \${totalDays} দিন \${reasonText} হেতু আমি বিদ্যালয়ে উপস্থিত থাকতে অসমর্থ।\${suffixText}\n\nঅতএব, মহাশয়ের নিকট বিনীত প্রার্থনা, উক্ত \${totalDays} দিনের নৈমিত্তিক ছুটি মঞ্জুর করে বাধিত করবেন।\`;
      } else if (leaveCategory === 'commuted') || (leaveCategory === 'halfpay') {
        bodyText = \`\${bodyPrefix} \${reasonText}-এর কারণে আমি গত \${startDisp} থেকে \${endDisp} পর্যন্ত মোট \${totalDays} দিন বিদ্যালয়ে উপস্থিত থাকতে পারিনি।\n\nঅতএব, মহাশয়ের নিকট বিনীত প্রার্থনা, আমার সার্ভিস বুকের HPL অ্যাকাউন্ট সাপেক্ষে উপরোক্ত \${totalDays} দিনের \${leaveCategory === 'commuted' ? 'রূপান্তরিত ছুটি (Commuted Leave)' : 'অর্ধ-বেতন ছুটি (Half Pay Leave)'} মঞ্জুর করতে আজ্ঞা হয়।\`;
      } else if (leaveCategory === 'ccl') {
        bodyText = \`\${bodyPrefix}আমার সন্তান \${childName || '[Child Name]'} (বয়স: \${childAge || '[Age]'}, \${childOrder || '[Order]'})-এর \${reasonText} হেতু আমি \${startDisp} হতে \${endDisp} পর্যন্ত মোট \${totalDays} দিন বিদ্যালয়ে উপস্থিত থাকতে পারব না। এটি আমার \${cclSpell || '1st Spell'} Child Care Leave।\n\nঅতএব, মহাশয়ের নিকট বিনীত প্রার্থনা, উক্ত \${totalDays} দিনের Child Care Leave মঞ্জুর করে বাধিত করবেন।\`;
      } else if (leaveCategory === 'maternity') {
        bodyText = \`\${bodyPrefix}\${reasonText}-এর জন্য চিকিৎসকের পরামর্শ অনুযায়ী আমি \${startDisp} হতে \${endDisp} পর্যন্ত মোট \${totalDays} দিন সম্পূর্ণ বিশ্রামে থাকব।\n\nঅতএব, মহাশয়ের নিকট বিনীত প্রার্থনা, উক্ত \${totalDays} দিনের প্রসূতিকালীন ছুটি (Maternity Leave) মঞ্জুর করতে আজ্ঞা হয়।\`;
      } else if (leaveCategory === 'quarantine') {
        bodyText = \`\${bodyPrefix}আমার পরিবারের সদস্য (\${relation || '[Relation]'}) \${diseaseName || '[Disease]'}-এ আক্রান্ত হওয়ায়, জনস্বাস্থ্য সুরক্ষার্থে আমি \${startDisp} হতে \${endDisp} পর্যন্ত মোট \${totalDays} দিন কোয়ারেন্টাইনে ছিলাম।\n\nঅতএব, মহাশয়ের নিকট বিনীত প্রার্থনা, উক্ত \${totalDays} দিনের Quarantine Leave মঞ্জুর করে বাধিত করবেন।\`;
      } else if (leaveCategory === 'compensatory') {
        bodyText = \`\${bodyPrefix}\${reasonText}-এর কারণে (অর্ডার নং: \${memoNo || '[Memo No]'}) আমি অবকাশের সময়কাল ডিউটি পালন করেছি। তার পরিবর্তে আমি \${startDisp} হতে \${endDisp} পর্যন্ত মোট \${totalDays} দিন ছুটি গ্রহণে ইচ্ছুক।\n\nঅতএব, মহাশয়ের নিকট বিনীত প্রার্থনা, উক্ত \${totalDays} দিনের Compensatory Leave মঞ্জুর করে বাধিত করবেন।\`;
      }
    } else {
      const suffixText = prefixSuffix ? ' (I also declare that Sunday/Holiday has been prefixed/suffixed with the leave).' : '';
      let bodyPrefix = \`With due respect, I, \${teacherName || '[Name]'}, \${designation || '[Designation]'} of \${schoolName || '[School]'}, beg to state that \`;

      if (leaveCategory === 'cl') {
        bodyText = \`\${bodyPrefix}I shall not be able to attend my duties from \${startDisp} to \${endDisp} (\${totalDays} days) due to \${reasonText}.\${suffixText}\n\nI, therefore, earnestly request you to kindly grant me Casual Leave for the said \${totalDays} days and oblige.\`;
      } else if (leaveCategory === 'commuted' || leaveCategory === 'halfpay') {
        bodyText = \`\${bodyPrefix}I was unable to attend my duties from \${startDisp} to \${endDisp} (\${totalDays} days) on account of \${reasonText}.\n\nI, therefore, earnestly request you to kindly grant me \${leaveCategory === 'commuted' ? 'Commuted Leave' : 'Half Pay Leave'} for the said \${totalDays} days against my HPL account and oblige.\`;
      } else if (leaveCategory === 'ccl') {
        bodyText = \`\${bodyPrefix}I am unable to attend my duties from \${startDisp} to \${endDisp} (\${totalDays} days) due to \${reasonText} of my \${childOrder || '[Order]'} child, \${childName || '[Child Name]'} (Age: \${childAge || '[Age]'}). This is my \${cclSpell || '1st Spell'} of CCL.\n\nI, therefore, earnestly request you to kindly grant me Child Care Leave for the said \${totalDays} days and oblige.\`;
      } else if (leaveCategory === 'maternity') {
        bodyText = \`\${bodyPrefix}I am advised complete medical rest from \${startDisp} to \${endDisp} (\${totalDays} days) due to \${reasonText}.\n\nI, therefore, earnestly request you to kindly grant me Maternity Leave for the said \${totalDays} days and oblige.\`;
      } else if (leaveCategory === 'quarantine') {
        bodyText = \`\${bodyPrefix}due to the presence of an infectious disease (\${diseaseName || '[Disease]'}) contracted by my \${relation || '[Relation]'} in my household, I was unable to attend school from \${startDisp} to \${endDisp} (\${totalDays} days) as per medical advice.\n\nI, therefore, earnestly request you to kindly grant me Quarantine Leave for the said \${totalDays} days and oblige.\`;
      } else if (leaveCategory === 'compensatory') {
        bodyText = \`\${bodyPrefix}I had performed compulsory duties during vacation as per order \${memoNo || '[Memo No]'}. In lieu of that, I wish to avail leave from \${startDisp} to \${endDisp} (\${totalDays} days) on account of \${reasonText}.\n\nI, therefore, earnestly request you to kindly grant me Compensatory Leave for the said \${totalDays} days and oblige.\`;
      }
    }

    return { header, sub, bodyText, enclosures, isDPSC };
  };

  const handlePrint = () => {
    document.body.classList.add('printing-leave');
    const pa = document.getElementById('leavePrintArea');
    if (!pa) return;

    const { header, sub, bodyText, enclosures, isDPSC } = generateLetterContent();

    let dpscBoxes = '';
    if (isDPSC) {
      if (lang === 'bn') {
        dpscBoxes = \`
          <div style="display:flex; justify-content:space-between; margin-top:80px;">
            <div style="border: 1px dashed #000; padding:40px 20px 10px; width:45%; text-align:center; font-size:12px;">
              সুপারিশসহ প্রেরিত<br><br><br>স্বাক্ষর ও সিল (প্রধান শিক্ষক)
            </div>
            <div style="border: 1px dashed #000; padding:40px 20px 10px; width:45%; text-align:center; font-size:12px;">
              সুপারিশসহ প্রেরিত<br><br><br>স্বাক্ষর ও সিল (অবর বিদ্যালয় পরিদর্শক)
            </div>
          </div>\`;
      } else {
        dpscBoxes = \`
          <div style="display:flex; justify-content:space-between; margin-top:80px;">
            <div style="border: 1px dashed #000; padding:40px 20px 10px; width:45%; text-align:center; font-size:12px;">
              Forwarded & Recommended<br><br><br>Signature & Seal (Head Teacher)
            </div>
            <div style="border: 1px dashed #000; padding:40px 20px 10px; width:45%; text-align:center; font-size:12px;">
              Forwarded & Recommended<br><br><br>Signature & Seal (Sub-Inspector)
            </div>
          </div>\`;
      }
    }

    const salutation = lang === 'bn' ? 'মহাশয় / মহাশয়া,' : 'Sir/Madam,';
    const closingStr = lang === 'bn' ? 'নমস্কারান্তে,<br>আপনার বিশ্বস্ত,' : 'Yours faithfully,';

    pa.innerHTML = \`
      <div style="font-family: 'Times New Roman', serif, sans-serif; font-size: 14px; line-height: 1.6; max-width: 750px; margin: 0 auto; color: #000;">
        <div style="text-align: right; margin-bottom: 20px;">Date: \${dynamicDate}</div>
        <div style="white-space: pre-wrap; font-weight: bold;">\${header}</div>
        <div style="margin: 20px 0; font-weight: bold; text-decoration: underline;">Sub: \${sub}</div>
        <div>\${salutation}</div>
        <div style="margin: 10px 0; text-align: justify; white-space: pre-wrap;">\${bodyText}</div>
        <div style="margin-top: 40px; display: flex; justify-content: space-between;">
          <div style="width: 50%;">
            \${enclosures ? \`<div style="white-space: pre-wrap; font-size: 12px; margin-top: 20px;">\${enclosures}</div>\` : ''}
          </div>
          <div style="width: 40%; text-align: right;">
            \${closingStr}<br><br><br>
            <span style="font-weight:bold;">\${teacherName || '[Name]'}</span><br>
            \${designation || '[Designation]'}<br>
            \${schoolName || '[School]'}
          </div>
        </div>
        \${dpscBoxes}
      </div>
    \`;
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-leave');
    }, 1000);
  };

  const handleWhatsApp = () => {
    const { header, sub, bodyText, enclosures } = generateLetterContent();
    const salutation = lang === 'bn' ? 'মহাশয় / মহাশয়া,' : 'Sir/Madam,';
    const closingStr = lang === 'bn' ? 'নমস্কারান্তে,\\nআপনার বিশ্বস্ত,' : 'Yours faithfully,';
    
    const text = \`Date: \${dynamicDate}\\n\\n\${header}\\n\\nSub: \${sub}\\n\\n\${salutation}\\n\${bodyText}\\n\\n\${closingStr}\\n\${teacherName || '[Name]'}\\n\${designation || '[Designation]'}\\n\${schoolName || '[School]'}\\n\\n\${enclosures}\`;
    window.open(\`https://wa.me/?text=\${encodeURIComponent(text)}\`, '_blank');
  };

  const handleAddToRegister = () => {
    if (leaveCategory !== 'cl') {
      alert(lang === 'bn' ? "শুধুমাত্র CL रजिस्टर-এ সেভ করা যায়।" : "Only CL can be saved to the register.");
      return;
    }
    const curTotalStr = localStorage.getItem('clCount2025') || '0';
    let curTotal = parseInt(curTotalStr);
    if (curTotal + totalDays > 14) {
      alert(lang === 'bn' ? \`লিমিট ওভার! আপনার ব্যালেন্স আছে মাত্র \${14 - curTotal} দিন।\` : \`Limit exceeded! Balance left: \${14 - curTotal} days.\`);
      return;
    }
    curTotal += totalDays;
    localStorage.setItem('clCount2025', curTotal.toString());
    setClBalance(14 - curTotal);
    
    // update array
    const takenStr = localStorage.getItem('clTakenDates2025') || '[]';
    const takenArr = JSON.parse(takenStr);
    takenArr.push({
      start: startDate,
      end: endDate,
      days: totalDays,
      reason: getActiveReasonText()
    });
    localStorage.setItem('clTakenDates2025', JSON.stringify(takenArr));
    
    alert(lang === 'bn' ? \`✅ সফলভাবে যুক্ত হয়েছে! বাকি ব্যালেন্স: \${14 - curTotal} দিন।\` : \`✅ Added successfully! Balance left: \${14 - curTotal} days.\`);
  };

  const { header, sub, bodyText, enclosures } = generateLetterContent();

  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: '#ffffff',
          border: 'none',
          padding: '12px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
          cursor: 'pointer'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📝</span> WBBPE Leave Application Generator
        </span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          
          {/* BILINGUAL TOGGLE */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '20px', padding: '4px' }}>
              <button 
                onClick={() => setLang('bn')} 
                style={{ background: lang === 'bn' ? '#2563eb' : 'transparent', color: lang === 'bn' ? '#fff' : '#475569', border: 'none', padding: '6px 16px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                বাংলা
              </button>
              <button 
                onClick={() => setLang('en')} 
                style={{ background: lang === 'en' ? '#2563eb' : 'transparent', color: lang === 'en' ? '#fff' : '#475569', border: 'none', padding: '6px 16px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                English
              </button>
            </div>
          </div>

          <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px 0', textAlign: 'center' }}>
            {lang === 'bn' ? 'অফিশিয়াল লিভ রুলস (WBBPE) অনুযায়ী স্বয়ংক্রিয় অ্যাপ্লিকেশন জেনারেটর।' : 'Statutory Application Generator as per WBBPE Leave Rules.'}
          </p>
          
          {/* PROFILE DATA (Persisted) */}
          <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', marginBottom: '8px', display: 'block' }}>{lang === 'bn' ? 'আপনার প্রোফাইল (স্বয়ংক্রিয় সেভ)' : 'Your Profile (Auto-saved)'}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input type="text" placeholder={lang === 'bn' ? "শিক্ষকের নাম" : "Teacher Name"} value={teacherName} onChange={e => setTeacherName(toTitleCase(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', gridColumn: '1 / -1' }} />
              <select value={designation} onChange={e => setDesignation(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', gridColumn: '1 / -1' }}>
                <option value="Assistant Teacher">Assistant Teacher</option>
                <option value="Head Teacher">Head Teacher</option>
                <option value="Teacher-in-Charge">Teacher-in-Charge</option>
              </select>
              <input type="text" placeholder={lang === 'bn' ? "বিদ্যালয়ের নাম" : "School Name"} value={schoolName} onChange={e => setSchoolName(toTitleCase(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', gridColumn: '1 / -1' }} />
              <input type="text" placeholder={lang === 'bn' ? "সার্কেলের নাম" : "Circle Name"} value={circleName} onChange={e => setCircleName(toTitleCase(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
              <input type="text" placeholder={lang === 'bn' ? "জেলার নাম" : "District"} value={district} onChange={e => setDistrict(toTitleCase(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
            </div>
          </div>

          <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'ছুটির ধরন (Leave Type)' : 'Leave Type'}</label>
          <select 
            value={leaveCategory} 
            onChange={e => setLeaveCategory(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #2563eb', fontSize: '13px', fontWeight: 700, color: '#1e3a8a', marginBottom: '16px' }}
          >
            <option value="cl">Casual Leave (CL) [Rule 4(a)]</option>
            <option value="commuted">Commuted Leave (Full Pay) [Rule 4(e)]</option>
            <option value="halfpay">Half Pay Leave [Rule 4(d)]</option>
            <option value="ccl">Child Care Leave (CCL) [Memo 5560-F(P)]</option>
            <option value="maternity">Maternity Leave [Rule 4(f)]</option>
            <option value="quarantine">Quarantine Leave [Rule 4(i)]</option>
            <option value="compensatory">Compensatory Leave [Rule 4(c)]</option>
          </select>

          {/* DATES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'শুরুর তারিখ (From)' : 'Start Date'}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'শেষের তারিখ (To)' : 'End Date'}</label>
              <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isDaysValid ? '#dcfce7' : '#fee2e2', padding: '8px', borderRadius: '6px', marginBottom: '12px', border: \`1px solid \${isDaysValid ? '#bbf7d0' : '#fecaca'}\` }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: isDaysValid ? '#166534' : '#991b1b' }}>
              {lang === 'bn' ? 'মোট দিন:' : 'Total Days:'} {totalDays} {lang === 'bn' ? 'দিন' : 'days'}
            </span>
            {!isDaysValid && <span style={{ fontSize: '11px', color: '#991b1b', fontWeight: 600 }}>⚠️ {errorMsg}</span>}
          </div>

          {/* REASON DROPBOX (Dynamic) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'ছুটির কারণ (Reason)' : 'Reason'}</label>
            <select 
              value={selectedReason} 
              onChange={e => setSelectedReason(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '8px' }}
            >
              {getReasonOptions().map(opt => (
                <option key={opt.id} value={opt.id}>{lang === 'bn' ? opt.bn : opt.en}</option>
              ))}
            </select>
            
            {selectedReason === 'other' && (
              <input 
                type="text" 
                placeholder={lang === 'bn' ? "আপনার নির্দিষ্ট কারণ লিখুন..." : "Type custom reason..."}
                value={customReason} 
                onChange={e => setCustomReason(e.target.value)} 
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '12px', background: '#eff6ff' }} 
              />
            )}
          </div>

          {/* DYNAMIC FORM SECTIONS BASED ON TYPE */}
          {leaveCategory === 'cl' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>{lang === 'bn' ? 'CL ব্যালেন্স (বর্তমান বছর):' : 'CL Balance:'}</label>
                <span style={{ fontSize: '13px', fontWeight: 800, color: clBalance < 3 ? '#dc2626' : '#16a34a' }}>{clBalance} {lang === 'bn' ? 'দিন' : 'Days'}</span>
              </div>
              
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'চিঠির প্রাপক (Addressed To)' : 'Addressed To'}</label>
              <select value={recipientOption} onChange={e => setRecipientOption(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '8px' }}>
                <option value="1">{lang === 'bn' ? 'অবর বিদ্যালয় পরিদর্শক (প্রধান শিক্ষকের মাধ্যমে)' : 'The Sub-Inspector of Schools (Through The Head Teacher)'}</option>
                <option value="2">{lang === 'bn' ? 'অবর বিদ্যালয় পরিদর্শক (সরাসরি / HT-দের জন্য)' : 'The Sub-Inspector of Schools'}</option>
                <option value="3">{lang === 'bn' ? 'প্রধান শিক্ষক / টিচার-ইন-চার্জ' : 'The Head Teacher / Teacher-in-Charge'}</option>
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <input type="checkbox" checked={prefixSuffix} onChange={e => setPrefixSuffix(e.target.checked)} />
                {lang === 'bn' ? '☑️ আগে/পরে রবিবার বা ছুটি যুক্ত করা হয়েছে (Prefix/Suffix)' : '☑️ Prefix/Suffix Sundays or Holidays'}
              </label>
            </div>
          )}

          {leaveCategory === 'commuted' && (
             <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#b45309', fontWeight: 600, background: '#fef3c7', padding: '8px', borderRadius: '6px', border: '1px solid #fde68a' }}>
               {lang === 'bn' ? '⚡ পূর্ণ বেতন (Full Pay) | সার্ভিস বুকের HPL অ্যাকাউন্ট থেকে দ্বিগুণ (2x) দিন কর্তন হবে। সমগ্র চাকরিকালে সর্বোচ্চ ১৮০ দিন।' : '⚡ Full Pay | 2 days debited from HPL for each day of leave.'}
             </div>
          )}
          {leaveCategory === 'halfpay' && (
             <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#1d4ed8', fontWeight: 600, background: '#eff6ff', padding: '8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
               {lang === 'bn' ? 'ℹ️ অর্ধ-বেতন (Half Pay) | ১ দিনের ছুটির জন্য ১টি Half Pay Leave কাটা হবে।' : 'ℹ️ Half Pay | 1 day debited from HPL.'}
             </div>
          )}

          {leaveCategory === 'ccl' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input type="text" placeholder={lang === 'bn' ? "সন্তানের নাম" : "Child Name"} value={childName} onChange={e => setChildName(toTitleCase(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <input type="number" placeholder={lang === 'bn' ? "বয়স (সর্বোচ্চ ১৮)" : "Child Age (Max 18)"} max={18} value={childAge} onChange={e => setChildAge(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <select value={childOrder} onChange={e => setChildOrder(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                  <option value={lang === 'bn' ? 'প্রথম সন্তান' : '1st Child'}>{lang === 'bn' ? 'প্রথম সন্তান' : '1st Child'}</option>
                  <option value={lang === 'bn' ? 'দ্বিতীয় সন্তান' : '2nd Child'}>{lang === 'bn' ? 'দ্বিতীয় সন্তান' : '2nd Child'}</option>
                </select>
                <select value={cclSpell} onChange={e => setCclSpell(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                  <option value={lang === 'bn' ? 'প্রথম স্পেল' : '1st Spell'}>{lang === 'bn' ? 'প্রথম স্পেল' : '1st Spell'}</option>
                  <option value={lang === 'bn' ? 'দ্বিতীয় স্পেল' : '2nd Spell'}>{lang === 'bn' ? 'দ্বিতীয় স্পেল' : '2nd Spell'}</option>
                  <option value={lang === 'bn' ? 'তৃতীয় স্পেল' : '3rd Spell'}>{lang === 'bn' ? 'তৃতীয় স্পেল' : '3rd Spell'}</option>
                </select>
              </div>
            </div>
          )}

          {leaveCategory === 'maternity' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'ধরন' : 'Maternity Mode'}</label>
              <select value={maternityMode} onChange={e => setMaternityMode(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                <option value="Full Term Confinement">{lang === 'bn' ? 'Full Term (সর্বোচ্চ ১৮০ দিন)' : 'Full Term Confinement (Max 180 days)'}</option>
                <option value="Miscarriage / Abortion">{lang === 'bn' ? 'Miscarriage / Abortion (সর্বোচ্চ ৪৫ দিন)' : 'Miscarriage / Abortion (Max 45 days)'}</option>
              </select>
            </div>
          )}

          {leaveCategory === 'quarantine' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
              <input type="text" placeholder={lang === 'bn' ? "সংক্রামক ব্যাধির নাম (যেমন: জলবসন্ত)" : "Infectious Disease Name"} value={diseaseName} onChange={e => setDiseaseName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '8px' }} />
              <input type="text" placeholder={lang === 'bn' ? "পরিবারের আক্রান্ত সদস্যের সাথে সম্পর্ক (যেমন: পুত্র/কন্যা)" : "Relationship of Infected Member"} value={relation} onChange={e => setRelation(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
            </div>
          )}

          {leaveCategory === 'compensatory' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
              <input type="text" placeholder={lang === 'bn' ? "পর্ষদ/সরকারি নির্দেশের মেমো নং" : "Council / Board Order or Memo No."} value={memoNo} onChange={e => setMemoNo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{ padding: '12px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              {showPreview ? (lang === 'bn' ? 'প্রিভিউ লুকান' : 'Hide Preview') : (lang === 'bn' ? '👀 লাইভ প্রিভিউ' : '👀 Live Preview')}
            </button>
            <button
              onClick={handlePrint}
              disabled={!isDaysValid}
              style={{ padding: '12px', background: isDaysValid ? '#2563eb' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: isDaysValid ? 'pointer' : 'not-allowed' }}
            >
              🖨️ {lang === 'bn' ? 'প্রিন্ট (A4)' : 'Print A4'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            {leaveCategory === 'cl' && (
              <button
                onClick={handleAddToRegister}
                disabled={!isDaysValid}
                style={{ flex: 1, padding: '10px', background: isDaysValid ? '#10b981' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: isDaysValid ? 'pointer' : 'not-allowed' }}
              >
                ➕ {lang === 'bn' ? 'CL রেজিস্টারে সেভ' : 'Add to CL Register'}
              </button>
            )}
            <button
              onClick={handleWhatsApp}
              disabled={!isDaysValid}
              style={{ flex: 1, padding: '10px', background: isDaysValid ? '#25D366' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: isDaysValid ? 'pointer' : 'not-allowed' }}
            >
              💬 {lang === 'bn' ? 'WhatsApp শেয়ার' : 'Share WA'}
            </button>
          </div>

          {showPreview && (
            <div style={{ marginTop: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '12px', lineHeight: 1.6, color: '#334155' }}>
                <div style={{ textAlign: 'right', marginBottom: '12px' }}>Date: {dynamicDate}</div>
                <div style={{ fontWeight: 'bold' }}>{header}</div>
                <div style={{ margin: '12px 0', fontWeight: 'bold' }}>Sub: {sub}</div>
                <div>{lang === 'bn' ? 'মহাশয় / মহাশয়া,' : 'Sir/Madam,'}</div>
                <div style={{ margin: '8px 0', textAlign: 'justify' }}>{bodyText}</div>
                <div style={{ marginTop: '12px' }}>{lang === 'bn' ? 'নমস্কারান্তে,\\nআপনার বিশ্বস্ত,' : 'Yours faithfully,'}</div>
                <div style={{ textAlign: 'right', marginTop: '12px' }}>
                  {teacherName || '[Name]'}<br/>
                  {designation || '[Designation]'}<br/>
                  {schoolName || '[School]'}
                </div>
                {enclosures && <div style={{ marginTop: '16px', fontWeight: 'bold' }}>{enclosures}</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
`
fs.writeFileSync('src/components/LeaveApplicationGenerator.tsx', content);
