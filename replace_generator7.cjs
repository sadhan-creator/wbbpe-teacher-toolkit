const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');

const startStr = "function LeaveApplicationGenerator() {";
const endStr = "export default function App() {";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `function LeaveApplicationGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  
  const [leaveCategory, setLeaveCategory] = useState('cl');
  
  const [teacherName, setTeacherName] = useState('');
  const [designation, setDesignation] = useState('সহকারী শিক্ষক / শিক্ষিকা');
  const [schoolName, setSchoolName] = useState('');
  const [circleName, setCircleName] = useState('');
  const [districtName, setDistrictName] = useState('');
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [hasPrefixSuffix, setHasPrefixSuffix] = useState(false);
  
  // CL specific
  const [clTiming, setClTiming] = useState('advance');
  const [recipient, setRecipient] = useState('মাননীয় বিদ্যালয় পরিদর্শক (SI of Schools) মহাশয় (প্রধান শিক্ষকের মাধ্যমে)');
  const [reason, setReason] = useState('পারিবারিক জরুরি কাজ');
  const [customReason, setCustomReason] = useState('');

  // Medical specific
  const [illnessDesc, setIllnessDesc] = useState('');
  const [isCommuted, setIsCommuted] = useState(false);

  // CCL specific
  const [childAge, setChildAge] = useState('');
  const [childOrder, setChildOrder] = useState('1st Child');
  const [cclSpell, setCclSpell] = useState('1st Spell');

  // Maternity specific
  const [maternityMode, setMaternityMode] = useState('Full Term Confinement');

  const [showPreview, setShowPreview] = useState(false);

  const clRecipients = lang === 'bn' 
    ? [
        'মাননীয় বিদ্যালয় পরিদর্শক (SI of Schools) মহাশয় (প্রধান শিক্ষকের মাধ্যমে)',
        'মাননীয় বিদ্যালয় পরিদর্শক (SI of Schools) মহাশয়', 
        'মাননীয় প্রধান শিক্ষক / ভারপ্রাপ্ত প্রধান শিক্ষক মহাশয়'
      ]
    : [
        'The Sub-Inspector of Schools (Through The Head Teacher)',
        'The Sub-Inspector of Schools',
        'The Head Teacher / Teacher-in-Charge'
      ];
    
  const designations = lang === 'bn'
    ? ['সহকারী শিক্ষক / শিক্ষিকা', 'প্রধান শিক্ষক / শিক্ষিকা', 'ভারপ্রাপ্ত প্রধান শিক্ষক']
    : ['Assistant Teacher', 'Head Teacher', 'Teacher-in-Charge'];
    
  const reasonPresets = lang === 'bn'
    ? ['পারিবারিক জরুরি কাজ', 'হঠাৎ শারীরিক অসুস্থতা', 'চিকিৎসকের পরামর্শ / মেডিকেল চেক-আপ', 'অন্যান্য ব্যক্তিগত কারণ']
    : ['Urgent Family Business', 'Sudden Illness', 'Medical Check-up', 'Other Personal Reasons'];

  useEffect(() => {
    setRecipient(clRecipients[0]);
    setDesignation(designations[0]);
    setReason(reasonPresets[0]);
    setCustomReason('');
  }, [lang]);

  const displayReason = reason === 'custom' ? customReason.trim() : reason;

  useEffect(() => {
    const w = window as any;
    const name = w.SafeStorage?.getItem('teacher_name_cl') || '';
    const des = w.SafeStorage?.getItem('teacher_designation_cl');
    const sch = w.SafeStorage?.getItem('teacher_school_cl') || '';
    const circ = w.SafeStorage?.getItem('teacher_circle_cl') || '';
    const dist = w.SafeStorage?.getItem('teacher_district_cl') || '';
    
    if (name) setTeacherName(name);
    if (des && (designations.includes(des) || lang === 'bn')) {
      if (designations.includes(des)) setDesignation(des);
    }
    if (sch) setSchoolName(sch);
    if (circ) setCircleName(circ);
    if (dist) setDistrictName(dist);
  }, [lang]);

  useEffect(() => {
    const w = window as any;
    if (w.SafeStorage) {
      w.SafeStorage.setItem('teacher_name_cl', teacherName);
      w.SafeStorage.setItem('teacher_designation_cl', designation);
      w.SafeStorage.setItem('teacher_school_cl', schoolName);
      w.SafeStorage.setItem('teacher_circle_cl', circleName);
      w.SafeStorage.setItem('teacher_district_cl', districtName);
    }
  }, [teacherName, designation, schoolName, circleName, districtName]);

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = e.target.value;
    setFromDate(newFrom);
    if (toDate && newFrom > toDate) {
      setToDate(newFrom);
    }
  };

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|\\s|-)\\S/g, function(a) { return a.toUpperCase(); });
  };

  const calcDays = () => {
    if (!fromDate || !toDate) return 1;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = to.getTime() - from.getTime();
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const totalDays = calcDays();
  
  let isDaysValid = true;
  let validationWarning = '';

  if (totalDays <= 0 && fromDate && toDate) {
    isDaysValid = false;
    validationWarning = lang === 'bn' ? '⚠️ শেষের তারিখ শুরুর তারিখের আগে হতে পারে না!' : '⚠️ End Date cannot be earlier than Start Date!';
  } else if (leaveCategory === 'cl' && totalDays > 7) {
    isDaysValid = false;
    validationWarning = lang === 'bn' ? '⚠️ WBBPE নিয়ম অনুযায়ী একবারে ৭ দিনের বেশি CL মঞ্জুরযোগ্য নয়!' : '⚠️ As per WBBPE rules, CL cannot exceed 7 consecutive days.';
  } else if (leaveCategory === 'ccl' && totalDays > 0 && totalDays < 15) {
    isDaysValid = false;
    validationWarning = lang === 'bn' ? '⚠️ নিয়ম অনুযায়ী একবারে ন্যূনতম ১৫ দিনের CCL নিতে হবে!' : '⚠️ Minimum 15 days required per CCL spell!';
  } else if (leaveCategory === 'ccl' && childAge && parseInt(childAge) > 18) {
    isDaysValid = false;
    validationWarning = lang === 'bn' ? '⚠️ সন্তানের বয়স ১৮ বছরের বেশি হলে CCL প্রযোজ্য নয়!' : '⚠️ CCL not applicable if child age > 18 years!';
  } else if (leaveCategory === 'maternity') {
    if (maternityMode === 'Full Term Confinement' && totalDays > 180) {
      isDaysValid = false;
      validationWarning = lang === 'bn' ? '⚠️ ম্যাটারনিটি লিভ সর্বাধিক ১৮০ দিন হতে পারে!' : '⚠️ Maternity Leave max limit is 180 days!';
    } else if (maternityMode === 'Miscarriage / Abortion' && totalDays > 45) {
      isDaysValid = false;
      validationWarning = lang === 'bn' ? '⚠️ গর্ভপাত জনিত লিভ সর্বাধিক ৪৫ দিন হতে পারে!' : '⚠️ Miscarriage/Abortion Leave max limit is 45 days!';
    }
  } else if (leaveCategory === 'pccl' && totalDays > 30) {
    isDaysValid = false;
    validationWarning = lang === 'bn' ? '⚠️ PCCL সর্বাধিক ৩০ দিন হতে পারে!' : '⚠️ PCCL max limit is 30 days!';
  }

  const locale = lang === 'bn' ? 'bn-IN' : 'en-IN';
  const currentFormattedDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  const generateLetterContent = () => {
    const formattedFrom = fromDate ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(fromDate)) : '___';
    const formattedTo = toDate ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(toDate)) : '___';
    const formattedJoining = joiningDate ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(joiningDate)) : '___';
    const displayDays = lang === 'bn' ? toBengaliNum(totalDays || 0) : (totalDays || 0).toString();
    
    let body = '';
    let signature = '';
    let enclosures = '';
    let recommendations = '';

    const tName = lang === 'en' ? toTitleCase(teacherName.trim()) : teacherName.trim();
    const tDesig = designation.trim();
    const tSchool = lang === 'en' ? toTitleCase(schoolName.trim()) : schoolName.trim();
    const tCircle = lang === 'en' ? toTitleCase(circleName.trim()) : circleName.trim();
    const tDistrict = lang === 'en' ? toTitleCase(districtName.trim()) : districtName.trim();
    const cleanReason = displayReason || '______';
    const isBn = lang === 'bn';

    const prefixSuffixEn = hasPrefixSuffix ? \` I also request you to kindly allow me to prefix/suffix the Sundays and public holidays with this leave.\` : '';
    const prefixSuffixBn = hasPrefixSuffix ? \` উক্ত ছুটির সহিত রবিবার ও অন্যান্য সরকারি ছুটির দিনগুলি সংযুক্ত করার অনুমতি প্রার্থনা করিতেছি।\` : '';
    
    if (leaveCategory === 'cl') {
      const isSI = recipient.includes('পরিদর্শক') || recipient.includes('SI') || recipient.includes('Sub-Inspector');
      const isThroughHT = recipient.includes('Through') || recipient.includes('মাধ্যমে');
      
      if (isBn) {
        const schCircDist = [tSchool || '[বিদ্যালয়ের নাম]', tCircle, tDistrict].filter(Boolean).join(', ');
        
        body = \`প্রতি,\\n\${isSI ? 'মাননীয় বিদ্যালয় পরিদর্শক (SI of Schools) মহাশয়' : 'মাননীয় প্রধান শিক্ষক / ভারপ্রাপ্ত প্রধান শিক্ষক মহাশয়'}\\n\`;
        
        if (isSI) {
          body += \`\${tCircle || '[সার্কেলের নাম]'}\\n\${tDistrict || '[জেলার নাম]'}\\n\`;
          if (isThroughHT) {
            body += \`মাধ্যম: মাননীয় প্রধান শিক্ষক, \${tSchool || '[বিদ্যালয়ের নাম]'}\\n\\n\`;
          } else {
            body += \`\\n\`;
          }
        } else {
          body += \`\${schCircDist}\\n\\n\`;
        }
        
        body += \`বিষয়: নৈমিত্তিক ছুটি (Casual Leave)-র আবেদন।\\n\\n\`;
        body += \`মহাশয়,\\n\`;
        
        body += \`   বিনীত নিবেদন এই যে, আমি \${tName || '[আপনার নাম]'}, আপনার বিদ্যালয়ের \${tDesig}। \`;
        
        if (clTiming === 'advance') {
          body += \`আমার \${cleanReason}-এর জন্য আগামী \${formattedFrom} হইতে \${formattedTo} পর্যন্ত মোট \${displayDays} দিনের নৈমিত্তিক ছুটি (CL) গ্রহণ করা একান্ত প্রয়োজন।\${prefixSuffixBn}\\n\\n\`;
          body += \`অতএব, আপনার নিকট বিনীত প্রার্থনা, অনুগ্রহপূর্বক উক্ত দিনগুলির নৈমিত্তিক ছুটি মঞ্জুর করিয়া বাধিত করিবেন।\`;
        } else {
          body += \`আমি বিগত \${formattedFrom} হইতে \${formattedTo} পর্যন্ত মোট \${displayDays} দিন \${cleanReason}-এর কারণে বিদ্যালয়ে উপস্থিত হইতে পারি নাই। আমি অদ্য \${formattedJoining} তারিখে বিদ্যালয়ে নিয়মিত দায়িত্বে যোগদান করিলাম।\${prefixSuffixBn}\\n\\n\`;
          body += \`অতএব, আপনার নিকট বিনীত প্রার্থনা, অনুগ্রহপূর্বক উক্ত দিনগুলি নৈমিত্তিক ছুটি (CL) হিসেবে মঞ্জুর করিয়া বাধিত করিবেন।\`;
        }
        
        body += \`\\n\\nতারিখ: \${currentFormattedDate}\`;
        signature = \`বিনীত,\\n\${tName || '[শিক্ষকের নাম]'}\\n\${tDesig}\\n\${tSchool || '[বিদ্যালয়ের নাম]'}\`;
        
      } else {
        const schCircDist = [tSchool || '[School Name]', tCircle, tDistrict].filter(Boolean).join(', ');
        
        body = \`To,\\n\${isSI ? 'The Sub-Inspector of Schools' : 'The Head Teacher / Teacher-in-Charge'}\\n\`;
        
        if (isSI) {
          body += \`\${tCircle || '[Circle Name]'}\\n\${tDistrict || '[District]'}\\n\`;
          if (isThroughHT) {
            body += \`Through: The Head Teacher, \${tSchool || '[School Name]'}\\n\\n\`;
          } else {
            body += \`\\n\`;
          }
        } else {
          body += \`\${schCircDist}\\n\\n\`;
        }
        
        body += \`Sub: Application for Casual Leave (CL)\\n\\n\`;
        body += \`Respected Madam/Sir,\\n\\n\`;
        
        body += \`   With due respect and humble submission, I beg to state that I am \${tName || '[Teacher Name]'}, \${tDesig} of \${schCircDist}. \`;
        
        if (clTiming === 'advance') {
          body += \`I shall not be able to attend the school from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)) due to \${cleanReason}.\${prefixSuffixEn}\\n\\n\`;
          body += \`So I shall be highly obliged if you kindly grant me the casual leave for these days.\`;
        } else {
          body += \`I was not able to attend the school from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)) due to \${cleanReason}. I have resumed my regular duties at the school today, \${formattedJoining}.\${prefixSuffixEn}\\n\\n\`;
          body += \`So I shall be highly obliged if you kindly sanction my casual leave for these days.\`;
        }
        
        body += \`\\n\\nDate: \${currentFormattedDate}\`;
        signature = \`Yours faithfully,\\n\${tName || '[Teacher Name]'}\\n\${tDesig}\\n\${tSchool || '[School Name]'}\`;
      }
    } else {
       // DPSC Leaves
       if (isBn) {
          body += \`প্রতি,\\nমাননীয় সভাপতি (Chairman),\\nজেলা প্রাথমিক বিদ্যালয় সংসদ (DPSC),\\n\${tDistrict || '[জেলার নাম]'}\\n\\n\`;
          body += \`মাধ্যম:\\n১. মাননীয় প্রধান শিক্ষক, \${tSchool || '[বিদ্যালয়ের নাম]'}\\n২. মাননীয় বিদ্যালয় পরিদর্শক, \${tCircle || '[সার্কেলের নাম]'}\\n\\n\`;
       } else {
          body += \`To,\\nThe Chairman,\\nDistrict Primary School Council,\\n\${tDistrict || '[District]'}\\n\\n\`;
          body += \`Through:\\n1. The Head Teacher, \${tSchool || '[School Name]'}\\n2. The Sub-Inspector of Schools, \${tCircle || '[Circle Name]'}\\n\\n\`;
       }
       
       let subBn = '';
       let subEn = '';
       let bodyTextBn = '';
       let bodyTextEn = '';

       if (leaveCategory === 'medical') {
         const leaveNameEn = isCommuted ? 'Commuted Leave' : 'Medical Leave';
         const leaveNameBn = isCommuted ? 'কমিউটেড লিভ (Commuted Leave)' : 'মেডিকেল লিভ (Medical Leave)';
         subEn = \`Application for \${leaveNameEn}\`;
         subBn = \`\${leaveNameBn}-এর জন্য আবেদন।\`;
         
         bodyTextEn = \`I am \${tName || '[Name]'}, \${tDesig} of \${tSchool || '[School]'}, \${tCircle || '[Circle]'}, \${tDistrict || '[District]'}. I have been suffering from \${illnessDesc || '______'} and I am advised by the registered medical practitioner to take rest from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)).\${prefixSuffixEn}\\n\\nSo I shall be highly obliged if you kindly grant me the \${leaveNameEn} for these days.\`;
         bodyTextBn = \`আমি \${tName || '[Name]'}, আপনার অধীনস্থ \${tSchool || '[School]'}-এর \${tDesig}। আমি \${illnessDesc || '______'}-এ আক্রান্ত হওয়ায় চিকিৎসক আমাকে আগামী \${formattedFrom} হইতে \${formattedTo} পর্যন্ত (মোট \${displayDays} দিন) বিশ্রামের পরামর্শ দিয়েছেন।\${prefixSuffixBn}\\n\\nঅতএব, আপনার নিকট বিনীত প্রার্থনা, অনুগ্রহপূর্বক উক্ত দিনগুলির জন্য আমার \${leaveNameBn} মঞ্জুর করিয়া বাধিত করিবেন।\`;
         
         enclosures = isBn 
            ? "সংযুক্তি:\\n১. মেডিকেল সার্টিফিকেট\\n২. ফিটনেস সার্টিফিকেট (Registered Medical Practitioner দ্বারা)"
            : "Enclosures:\\n1. Medical Certificate\\n2. Fitness Certificate by Registered Medical Practitioner";
       } else if (leaveCategory === 'ccl') {
         subEn = \`Application for Child Care Leave (CCL) - \${cclSpell}\`;
         subBn = \`চাইল্ড কেয়ার লিভ (CCL)-এর জন্য আবেদন - \${cclSpell === '1st Spell' ? '১ম স্পেল' : cclSpell === '2nd Spell' ? '২য় স্পেল' : '৩য় স্পেল'}।\`;
         
         bodyTextEn = \`I am \${tName || '[Name]'}, \${tDesig} of \${tSchool || '[School]'}, \${tCircle || '[Circle]'}, \${tDistrict || '[District]'}. I am in urgent need of Child Care Leave (CCL) for my \${childOrder} (Age: \${childAge || '__'} years) from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)). This is my \${cclSpell} of CCL in the current year.\${prefixSuffixEn}\\n\\nSo I shall be highly obliged if you kindly grant me the Child Care Leave for these days.\`;
         bodyTextBn = \`আমি \${tName || '[Name]'}, আপনার অধীনস্থ \${tSchool || '[School]'}-এর \${tDesig}। আমার \${childOrder === '1st Child' ? 'প্রথম' : 'দ্বিতীয়'} সন্তানের (বয়স: \${childAge || '__'} বছর) বিশেষ প্রয়োজনে আগামী \${formattedFrom} হইতে \${formattedTo} পর্যন্ত (মোট \${displayDays} দিন) আমার চাইল্ড কেয়ার লিভ (CCL) প্রয়োজন। চলতি বছরে এটি আমার \${cclSpell === '1st Spell' ? '১ম' : cclSpell === '2nd Spell' ? '২য়' : '৩য়'} স্পেল।\${prefixSuffixBn}\\n\\nঅতএব, আপনার নিকট বিনীত প্রার্থনা, অনুগ্রহপূর্বক উক্ত দিনগুলির জন্য আমার চাইল্ড কেয়ার লিভ মঞ্জুর করিয়া বাধিত করিবেন।\`;
         
         enclosures = isBn
            ? "সংযুক্তি:\\n১. সন্তানের জন্ম শংসাপত্র (Birth Certificate)\\n২. অন্যান্য প্রাসঙ্গিক নথিপত্র"
            : "Enclosures:\\n1. Birth Certificate of Child\\n2. Relevant Documents";
       } else if (leaveCategory === 'maternity') {
         subEn = \`Application for Maternity Leave\`;
         subBn = \`ম্যাটারনিটি লিভ (Maternity Leave)-এর জন্য আবেদন।\`;
         
         bodyTextEn = \`I am \${tName || '[Name]'}, \${tDesig} of \${tSchool || '[School]'}, \${tCircle || '[Circle]'}, \${tDistrict || '[District]'}. I am expecting a child / recovering from \${maternityMode.toLowerCase()} and need to take Maternity Leave from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)) as per WBBPE rules.\${prefixSuffixEn}\\n\\nSo I shall be highly obliged if you kindly grant me the Maternity Leave for these days.\`;
         bodyTextBn = \`আমি \${tName || '[Name]'}, আপনার অধীনস্থ \${tSchool || '[School]'}-এর \${tDesig}। আমি \${maternityMode === 'Full Term Confinement' ? 'মাতৃত্বকালীন' : 'গর্ভপাত/মিসক্যারেজ জনিত'} কারণে আগামী \${formattedFrom} হইতে \${formattedTo} পর্যন্ত (মোট \${displayDays} দিন) ম্যাটারনিটি লিভ গ্রহণ করতে ইচ্ছুক।\${prefixSuffixBn}\\n\\nঅতএব, আপনার নিকট বিনীত প্রার্থনা, অনুগ্রহপূর্বক উক্ত দিনগুলির জন্য আমার ম্যাটারনিটি লিভ মঞ্জুর করিয়া বাধিত করিবেন।\`;
         
         enclosures = isBn
            ? "সংযুক্তি:\\n১. মেডিকেল প্র্যাকটিশনার সার্টিফিকেট"
            : "Enclosures:\\n1. Medical Practitioner Certificate";
       } else if (leaveCategory === 'pccl') {
         subEn = \`Application for Paternity-cum-Child Care Leave (PCCL)\`;
         subBn = \`প্যাটারনিটি-কাম-চাইল্ড কেয়ার লিভ (PCCL)-এর জন্য আবেদন।\`;
         
         bodyTextEn = \`I am \${tName || '[Name]'}, \${tDesig} of \${tSchool || '[School]'}, \${tCircle || '[Circle]'}, \${tDistrict || '[District]'}. I am in urgent need of Paternity-cum-Child Care Leave (PCCL) from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)) to care for my newborn child/wife.\${prefixSuffixEn}\\n\\nSo I shall be highly obliged if you kindly grant me the PCCL for these days.\`;
         bodyTextBn = \`আমি \${tName || '[Name]'}, আপনার অধীনস্থ \${tSchool || '[School]'}-এর \${tDesig}। আমার নবজাতক সন্তান/স্ত্রীর দেখভালের জন্য আগামী \${formattedFrom} হইতে \${formattedTo} পর্যন্ত (মোট \${displayDays} দিন) আমার প্যাটারনিটি-কাম-চাইল্ড কেয়ার লিভ (PCCL) প্রয়োজন।\${prefixSuffixBn}\\n\\nঅতএব, আপনার নিকট বিনীত প্রার্থনা, অনুগ্রহপূর্বক উক্ত দিনগুলির জন্য আমার PCCL মঞ্জুর করিয়া বাধিত করিবেন।\`;
       }
       
       body += isBn ? \`বিষয়: \${subBn}\\n\\nমহাশয়,\\n\\n   বিনীত নিবেদন এই যে, \${bodyTextBn}\` : \`Sub: \${subEn}\\n\\nRespected Madam/Sir,\\n\\n   With due respect and humble submission, I beg to state that \${bodyTextEn}\`;
       
       body += \`\\n\\n\${isBn ? 'তারিখ:' : 'Date:'} \${currentFormattedDate}\`;
       signature = \`\${isBn ? 'বিনীত,' : 'Yours faithfully,'}\\n\${tName || (isBn ? '[শিক্ষকের নাম]' : '[Teacher Name]')}\\n\${tDesig}\\n\${tSchool || (isBn ? '[বিদ্যালয়ের নাম]' : '[School Name]')}\`;
       
       recommendations = \`
        <div style="display: flex; justify-content: space-between; margin-top: 60px; font-size: 13px; font-weight: 600;">
          <div style="text-align: center; border-top: 1px dashed #000; padding-top: 8px; width: 45%;">
            Forwarded & Recommended<br/>Signature of HT with Seal
          </div>
          <div style="text-align: center; border-top: 1px dashed #000; padding-top: 8px; width: 45%;">
            Forwarded & Recommended<br/>Signature of SI/S with Seal
          </div>
        </div>\`;
    }
    
    return { body, signature, enclosures, recommendations };
  };

  const handlePrint = () => {
    if (!isDaysValid) {
      alert(validationWarning);
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const { body, signature, enclosures, recommendations } = generateLetterContent();
    
    const html = \`
      <html>
        <head>
          <title>Leave Application</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600&display=swap');
            @page {
              size: A4 portrait;
              margin: 20mm;
            }
            body { 
              font-family: 'Hind Siliguri', sans-serif; 
              padding: 40px; 
              color: #000; 
              line-height: 1.6; 
              font-size: 15px; 
            }
            .letter-body { 
              white-space: pre-wrap; 
              text-align: justify; 
            }
            .flex-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 40px;
            }
            .enclosures-block {
              white-space: pre-wrap;
              font-size: 13px;
              font-weight: 500;
              max-width: 50%;
            }
            .signature-block {
              white-space: pre-wrap;
              text-align: left;
              min-width: 250px;
            }
            @media print {
              body { padding: 0; font-size: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="letter-body">\${body}</div>
          <div class="flex-container">
            <div class="enclosures-block">\${enclosures}</div>
            <div class="signature-block">\${signature}</div>
          </div>
          \${recommendations || ''}
          <script>window.print();</script>
        </body>
      </html>
    \`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleWhatsApp = () => {
    if (!isDaysValid) {
      alert(validationWarning);
      return;
    }
    const { body, signature, enclosures } = generateLetterContent();
    let text = body + '\\n\\n';
    if (enclosures) text += enclosures + '\\n\\n';
    text += signature.split('\\n').map(line => ' '.repeat(20) + line).join('\\n');
    window.open(\`https://wa.me/?text=\${encodeURIComponent(text)}\`, '_blank');
  };

  const handleAddToRegister = () => {
    if (leaveCategory !== 'cl') {
      alert(lang === 'bn' ? 'শুধুমাত্র CL-এর হিসাব লিভ রেজিস্টারে যুক্ত হয়!' : 'Only CL is deducted from the local 14-day balance!');
      return;
    }
    if (!fromDate) {
      alert(lang === 'bn' ? 'দয়া করে শুরুর তারিখ নির্বাচন করুন!' : 'Please select the From date!');
      return;
    }
    if (!isDaysValid) {
      alert(validationWarning);
      return;
    }
    const w = window as any;
    if (w.addLeaveEntryDirectly) {
      w.addLeaveEntryDirectly(fromDate, 'CL', displayReason);
      alert(lang === 'bn' ? '✅ সফলভাবে লিভ রেজিস্টারে যুক্ত করা হয়েছে এবং CL ব্যালেন্স থেকে দিন বাদ দেওয়া হয়েছে!' : '✅ Successfully added to the leave register and deducted from balance!');
    }
  };

  const previewContent = generateLetterContent();

  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #0f172a, #334155)',
          color: '#ffffff',
          border: 'none',
          padding: '12px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
          cursor: 'pointer'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📝</span> {lang === 'bn' ? 'WBBPE লিভ অ্যাপ্লিকেশন জেনারেটর' : 'WBBPE Leave Application Generator'}
        </span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '24px', border: '1px solid #cbd5e1' }}>
              <button onClick={() => setLang('bn')} style={{ background: lang === 'bn' ? '#fff' : 'transparent', color: lang === 'bn' ? '#334155' : '#64748b', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: lang === 'bn' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>বাংলা</button>
              <button onClick={() => setLang('en')} style={{ background: lang === 'en' ? '#fff' : 'transparent', color: lang === 'en' ? '#334155' : '#64748b', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: lang === 'en' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>English</button>
            </div>
          </div>

          <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '8px' }}>{lang === 'bn' ? 'ছুটির ধরন (Leave Type)' : 'Leave Type'}</label>
            <select 
              value={leaveCategory} 
              onChange={e => setLeaveCategory(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #94a3b8', fontSize: '13px', fontWeight: 600, background: '#fff', color: '#0f172a' }}
            >
              <option value="cl">Casual Leave (CL)</option>
              <option value="medical">Medical / Commuted Leave</option>
              <option value="ccl">Child Care Leave (CCL)</option>
              <option value="maternity">Maternity Leave</option>
              <option value="pccl">Paternity-cum-Child Care Leave (PCCL)</option>
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'শিক্ষকের নাম' : 'Teacher Name'}</label>
            <input 
              type="text" 
              value={teacherName} 
              onChange={e => setTeacherName(e.target.value)} 
              placeholder={lang === 'bn' ? 'আপনার নাম লিখুন' : 'Enter your name'} 
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'পদবী' : 'Designation'}</label>
                <select 
                  value={designation} 
                  onChange={e => setDesignation(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                >
                  {designations.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'বিদ্যালয়ের নাম' : 'School Name'}</label>
                <input 
                  type="text" 
                  value={schoolName} 
                  onChange={e => setSchoolName(e.target.value)} 
                  placeholder={lang === 'bn' ? 'স্কুলের নাম' : 'School name'} 
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'সার্কেলের নাম' : 'Circle Name'}</label>
                <input 
                  type="text" 
                  value={circleName} 
                  onChange={e => setCircleName(e.target.value)} 
                  placeholder={lang === 'bn' ? 'সার্কেল (যেমন: Chakdaha)' : 'Circle name'} 
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'জেলা (District)' : 'District'}</label>
                <input 
                  type="text" 
                  value={districtName} 
                  onChange={e => setDistrictName(e.target.value)} 
                  placeholder={lang === 'bn' ? 'জেলার নাম (যেমন: Nadia)' : 'District name'} 
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
                />
              </div>
            </div>
            
            {leaveCategory === 'cl' && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'প্রাপক (To)' : 'Recipient (To)'}</label>
                <select 
                  value={recipient} 
                  onChange={e => setRecipient(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                >
                  {clRecipients.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
          </div>

          {leaveCategory === 'cl' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>{lang === 'bn' ? 'আবেদনের ধরন' : 'Application Type'}</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: clTiming === 'advance' ? 700 : 500, color: clTiming === 'advance' ? '#2563eb' : '#475569' }}>
                  <input type="radio" checked={clTiming === 'advance'} onChange={() => setClTiming('advance')} /> {lang === 'bn' ? 'অগ্রিম আবেদন' : 'Advance Application'}
                </label>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: clTiming === 'post-facto' ? 700 : 500, color: clTiming === 'post-facto' ? '#2563eb' : '#475569' }}>
                  <input type="radio" checked={clTiming === 'post-facto'} onChange={() => setClTiming('post-facto')} /> {lang === 'bn' ? 'ছুটি পরবর্তী নিয়মিতকরণ' : 'Post-facto'}
                </label>
              </div>
              
              {clTiming === 'post-facto' && (
                <div style={{ background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'কাজে যোগদানের তারিখ (Joining Date)' : 'Joining Date'}</label>
                  <input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
              )}
            </div>
          )}

          {leaveCategory === 'medical' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>{lang === 'bn' ? 'অসুস্থতার বিবরণ' : 'Illness Details'}</label>
              <input type="text" value={illnessDesc} onChange={e => setIllnessDesc(e.target.value)} placeholder={lang === 'bn' ? 'যেমন: ভাইরাল ফিভার' : 'e.g., Viral Fever'} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '8px' }} />
              
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={isCommuted} onChange={e => setIsCommuted(e.target.checked)} /> 
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{lang === 'bn' ? 'কমিউটেড লিভ (Commuted Leave)' : 'Commuted Leave'}</span>
              </label>
            </div>
          )}

          {leaveCategory === 'ccl' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'সন্তান ক্রম' : 'Child Order'}</label>
                <select value={childOrder} onChange={e => setChildOrder(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                  <option value="1st Child">1st Child</option>
                  <option value="2nd Child">2nd Child</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'সন্তানের বয়স (বছর)' : 'Child Age (Years)'}</label>
                <input type="number" value={childAge} onChange={e => setChildAge(e.target.value)} placeholder="Age <= 18" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'চলতি বছরে স্পেল' : 'Spell of the Year'}</label>
                <select value={cclSpell} onChange={e => setCclSpell(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                  <option value="1st Spell">1st Spell</option>
                  <option value="2nd Spell">2nd Spell</option>
                  <option value="3rd Spell">3rd Spell</option>
                </select>
              </div>
            </div>
          )}

          {leaveCategory === 'maternity' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>{lang === 'bn' ? 'ম্যাটারনিটি মোড' : 'Maternity Mode'}</label>
              <select value={maternityMode} onChange={e => setMaternityMode(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                <option value="Full Term Confinement">Full Term Confinement (Max 180 Days)</option>
                <option value="Miscarriage / Abortion">Miscarriage / Abortion (Max 45 Days)</option>
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'শুরুর তারিখ (From)' : 'Start Date (From)'}</label>
              <input type="date" value={fromDate} onChange={handleFromDateChange} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'শেষের তারিখ (To)' : 'End Date (To)'}</label>
              <input type="date" min={fromDate} value={toDate} onChange={e => setToDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <input type="checkbox" checked={hasPrefixSuffix} onChange={e => setHasPrefixSuffix(e.target.checked)} /> 
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{lang === 'bn' ? 'রবিবার বা সরকারি ছুটি সংযুক্ত (Prefix/Suffix Holidays)' : 'Prefix/Suffix Sundays & Holidays'}</span>
            </label>
          </div>

          {validationWarning && (
            <div style={{marginBottom: '12px', padding: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '11.5px', fontWeight: 600}}>
              {validationWarning}
            </div>
          )}

          <div style={{ marginBottom: '12px', fontSize: '12px', color: isDaysValid ? '#0f172a' : '#991b1b', fontWeight: 700, background: isDaysValid ? '#f1f5f9' : '#fef2f2', padding: '8px 12px', borderRadius: '8px', border: \`1px solid \${isDaysValid ? '#cbd5e1' : '#fecaca'}\` }}>
            {lang === 'bn' ? \`মোট ছুটি: \${toBengaliNum(totalDays)} দিন\` : \`Total Leave: \${totalDays} day(s)\`}
          </div>

          {leaveCategory === 'cl' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>{lang === 'bn' ? 'ছুটির কারণ' : 'Reason for Leave'}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {reasonPresets.map(r => (
                  <span 
                    key={r}
                    onClick={() => { setReason(r); setCustomReason(''); }}
                    style={{ background: reason === r ? '#334155' : '#f1f5f9', color: reason === r ? '#fff' : '#475569', padding: '6px 12px', borderRadius: '16px', fontSize: '11.5px', cursor: 'pointer', fontWeight: reason === r ? 600 : 500, border: reason === r ? 'none' : '1px solid #cbd5e1' }}
                  >
                    {r}
                  </span>
                ))}
                <span 
                  onClick={() => setReason('custom')}
                  style={{ background: reason === 'custom' ? '#334155' : '#f1f5f9', color: reason === 'custom' ? '#fff' : '#475569', padding: '6px 12px', borderRadius: '16px', fontSize: '11.5px', cursor: 'pointer', fontWeight: reason === 'custom' ? 600 : 500, border: reason === 'custom' ? 'none' : '1px solid #cbd5e1' }}
                >
                  {lang === 'bn' ? 'নিজে লিখুন...' : 'Custom...'}
                </span>
              </div>
              {reason === 'custom' && (
                <input 
                  type="text" 
                  value={customReason} 
                  onChange={e => setCustomReason(e.target.value)} 
                  placeholder={lang === 'bn' ? 'ছুটির কারণ সংক্ষেপে লিখুন' : 'Enter custom reason briefly'} 
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
                />
              )}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <button 
              onClick={() => setShowPreview(!showPreview)}
              style={{ width: '100%', background: showPreview ? '#f1f5f9' : '#ffffff', color: '#475569', border: '1px dashed #94a3b8', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
            >
              👁️ {showPreview ? (lang === 'bn' ? 'প্রিভিউ বন্ধ করুন' : 'Hide Preview') : (lang === 'bn' ? 'লাইভ প্রিভিউ দেখুন' : 'View Live Preview')}
            </button>
            {showPreview && (
              <div style={{ marginTop: '8px', padding: '16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12.5px', lineHeight: 1.6, color: '#334155', maxHeight: '400px', overflowY: 'auto', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{previewContent.body}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '30px' }}>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '11.5px', fontWeight: 600, maxWidth: '50%' }}>{previewContent.enclosures}</div>
                  <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left', minWidth: '200px' }}>{previewContent.signature}</div>
                </div>
                {previewContent.recommendations && (
                  <div dangerouslySetInnerHTML={{__html: previewContent.recommendations}} />
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button disabled={!isDaysValid} onClick={handlePrint} style={{ opacity: isDaysValid ? 1 : 0.5, background: '#334155', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                🖨️ {lang === 'bn' ? 'প্রিন্ট / PDF' : 'Print / PDF'}
              </button>
              <button disabled={!isDaysValid} onClick={handleWhatsApp} style={{ opacity: isDaysValid ? 1 : 0.5, background: '#16a34a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(22,163,74,0.2)' }}>
                💬 WhatsApp
              </button>
            </div>
            {leaveCategory === 'cl' && (
              <button disabled={!isDaysValid} onClick={handleAddToRegister} style={{ opacity: isDaysValid ? 1 : 0.5, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                ➕ {lang === 'bn' ? 'লিভ রেজিস্টারে যুক্ত করুন (CL)' : 'Add to Leave Register (CL)'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
`;
  const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Successfully upgraded LeaveApplicationGenerator to Multi-Leave Compliance Engine');
} else {
  console.log('Failed to find boundaries');
}
