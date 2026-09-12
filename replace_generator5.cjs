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
  const [recipient, setRecipient] = useState('মাননীয় বিদ্যালয় পরিদর্শক (SI of Schools) মহাশয়');
  const [teacherName, setTeacherName] = useState('');
  const [designation, setDesignation] = useState('সহকারী শিক্ষক / শিক্ষিকা');
  const [schoolName, setSchoolName] = useState('');
  const [circleName, setCircleName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [leaveType, setLeaveType] = useState('advance');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('পারিবারিক জরুরি কাজ');
  const [customReason, setCustomReason] = useState('');
  const [hasPrefixSuffix, setHasPrefixSuffix] = useState(false);
  const [useThroughHT, setUseThroughHT] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Dropdown options based on language
  const recipients = lang === 'bn' 
    ? ['মাননীয় বিদ্যালয় পরিদর্শক (SI of Schools) মহাশয়', 'মাননীয় প্রধান শিক্ষক / ভারপ্রাপ্ত প্রধান শিক্ষক মহাশয়']
    : ['The Sub-Inspector of Schools (Through The Head Teacher)', 'The Head Teacher / Teacher-in-Charge'];
    
  const designations = lang === 'bn'
    ? ['সহকারী শিক্ষক / শিক্ষিকা', 'প্রধান শিক্ষক / শিক্ষিকা', 'ভারপ্রাপ্ত প্রধান শিক্ষক']
    : ['Assistant Teacher', 'Head Teacher', 'Teacher-in-Charge'];
    
  const reasonPresets = lang === 'bn'
    ? ['পারিবারিক জরুরি কাজ', 'হঠাৎ শারীরিক অসুস্থতা', 'চিকিৎসকের পরামর্শ / মেডিকেল চেক-আপ', 'অন্যান্য ব্যক্তিগত কারণ']
    : ['Urgent Family Business', 'Sudden Illness', 'Medical Check-up', 'Other Personal Reasons'];

  useEffect(() => {
    setRecipient(recipients[0]);
    setDesignation(designations[0]);
    setReason(reasonPresets[0]);
    setCustomReason('');
  }, [lang]);

  useEffect(() => {
    if (recipient.includes('SI') || recipient.includes('পরিদর্শক') || recipient.includes('Sub-Inspector')) {
      setUseThroughHT(true);
    } else {
      setUseThroughHT(false);
    }
  }, [recipient]);

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
    if (diffTime < 0) return 1;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const totalDays = calcDays();
  const isDaysValid = totalDays <= 7;
  const locale = lang === 'bn' ? 'bn-IN' : 'en-IN';
  const currentFormattedDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  const generateLetterContent = () => {
    const formattedFrom = fromDate ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(fromDate)) : '___';
    const formattedTo = toDate ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(toDate)) : '___';
    const formattedJoining = joiningDate ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(joiningDate)) : '___';
    const displayDays = lang === 'bn' ? toBengaliNum(totalDays) : totalDays.toString();
    
    let body = '';
    let signature = '';

    const tName = lang === 'en' ? toTitleCase(teacherName.trim()) : teacherName.trim();
    const tDesig = designation.trim();
    const tSchool = lang === 'en' ? toTitleCase(schoolName.trim()) : schoolName.trim();
    const tCircle = lang === 'en' ? toTitleCase(circleName.trim()) : circleName.trim();
    const tDistrict = lang === 'en' ? toTitleCase(districtName.trim()) : districtName.trim();
    const cleanReason = displayReason || '______';
    
    const isSI = recipient.includes('পরিদর্শক') || recipient.includes('SI') || recipient.includes('Sub-Inspector');
    
    if (lang === 'bn') {
      const schCircDist = [tSchool || '[বিদ্যালয়ের নাম]', tCircle, tDistrict].filter(Boolean).join(', ');
      
      body = \`প্রতি,\\n\${isSI ? 'মাননীয় বিদ্যালয় পরিদর্শক (SI of Schools) মহাশয়' : recipient}\\n\`;
      
      if (isSI) {
        body += \`\${tCircle || '[সার্কেলের নাম]'}\\n\${tDistrict || '[জেলার নাম]'}\\n\`;
      } else {
        body += \`\${schCircDist}\\n\`;
      }
      
      if (useThroughHT) {
        body += \`মাধ্যম: মাননীয় প্রধান শিক্ষক, \${tSchool || '[বিদ্যালয়ের নাম]'}\\n\\n\`;
      } else {
        body += \`\\n\`;
      }
      
      body += \`বিষয়: নৈমিত্তিক ছুটি (Casual Leave)-র আবেদন।\\n\\n\`;
      body += \`মহাশয়,\\n\`;
      
      let prefixSuffixText = hasPrefixSuffix ? \` উক্ত ছুটির সহিত রবিবার ও অন্যান্য সরকারি ছুটির দিনগুলি সংযুক্ত করার অনুমতি প্রার্থনা করিতেছি।\` : '';

      body += \`   বিনীত নিবেদন এই যে, আমি \${tName || '[আপনার নাম]'}, আপনার বিদ্যালয়ের \${tDesig}। \`;
      
      if (leaveType === 'advance') {
        body += \`আমার \${cleanReason}-এর জন্য আগামী \${formattedFrom} হইতে \${formattedTo} পর্যন্ত মোট \${displayDays} দিনের নৈমিত্তিক ছুটি (CL) গ্রহণ করা একান্ত প্রয়োজন।\${prefixSuffixText}\\n\\n\`;
        body += \`অতএব, আপনার নিকট বিনীত প্রার্থনা, অনুগ্রহপূর্বক উক্ত দিনগুলির নৈমিত্তিক ছুটি মঞ্জুর করিয়া বাধিত করিবেন।\`;
      } else {
        body += \`আমি বিগত \${formattedFrom} হইতে \${formattedTo} পর্যন্ত মোট \${displayDays} দিন \${cleanReason}-এর কারণে বিদ্যালয়ে উপস্থিত হইতে পারি নাই। আমি অদ্য \${formattedJoining} তারিখে বিদ্যালয়ে নিয়মিত দায়িত্বে যোগদান করিলাম।\${prefixSuffixText}\\n\\n\`;
        body += \`অতএব, আপনার নিকট বিনীত প্রার্থনা, অনুগ্রহপূর্বক উক্ত দিনগুলি নৈমিত্তিক ছুটি (CL) হিসেবে মঞ্জুর করিয়া বাধিত করিবেন।\`;
      }
      
      body += \`\\n\\nতারিখ: \${currentFormattedDate}\`;
      signature = \`বিনীত,\\n\${tName || '[শিক্ষকের নাম]'}\\n\${tDesig}\\n\${tSchool || '[বিদ্যালয়ের নাম]'}\`;
      
    } else {
      const schCircDist = [tSchool || '[School Name]', tCircle, tDistrict].filter(Boolean).join(', ');
      
      body = \`To,\\n\${isSI ? 'The Sub-Inspector of Schools' : 'The Head Teacher / Teacher-in-Charge'}\\n\`;
      
      if (isSI) {
        body += \`\${tCircle || '[Circle Name]'}\\n\${tDistrict || '[District]'}\\n\`;
      } else {
        body += \`\${schCircDist}\\n\`;
      }
      
      if (useThroughHT) {
        body += \`Through: The Head Teacher, \${tSchool || '[School Name]'}\\n\\n\`;
      } else {
        body += \`\\n\`;
      }
      
      body += \`Sub: Application for Casual Leave (CL)\\n\\n\`;
      body += \`Respected Madam/Sir,\\n\\n\`;
      
      let prefixSuffixText = hasPrefixSuffix ? \` I also request you to kindly allow me to prefix/suffix the Sundays and public holidays with this leave.\` : '';

      body += \`   With due respect and humble submission, I beg to state that I am \${tName || '[Teacher Name]'}, \${tDesig} of \${schCircDist}. \`;
      
      if (leaveType === 'advance') {
        body += \`I shall not be able to attend the school from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)) due to \${cleanReason}.\${prefixSuffixText}\\n\\n\`;
        body += \`So I shall be highly obliged if you kindly grant me the casual leave for these days.\`;
      } else {
        body += \`I was not able to attend the school from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)) due to \${cleanReason}. I have resumed my regular duties at the school today, \${formattedJoining}.\${prefixSuffixText}\\n\\n\`;
        body += \`So I shall be highly obliged if you kindly sanction my casual leave for these days.\`;
      }
      
      body += \`\\n\\nThanking you,\\n\\nDate: \${currentFormattedDate}\`;
      signature = \`Yours faithfully,\\n\${tName || '[Teacher Name]'}\\n\${tDesig}\\n\${tSchool || '[School Name]'}\`;
    }
    
    return { body, signature };
  };

  const handlePrint = () => {
    if (!isDaysValid) {
      alert(lang === 'bn' ? 'সরকারি নিয়ম অনুযায়ী একবারে ৭ দিনের বেশি ছুটি মঞ্জুরযোগ্য নয়।' : 'Maximum 7 days leave allowed at a time.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const { body, signature } = generateLetterContent();
    
    const html = \`
      <html>
        <head>
          <title>CL Application</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600&display=swap');
            @page {
              size: A4 portrait;
              margin: 25mm 20mm;
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
            .signature-container {
              display: flex;
              justify-content: flex-end;
              margin-top: 40px;
            }
            .signature-block {
              white-space: pre-wrap;
              text-align: left;
              min-width: 250px;
            }
            @media print {
              body { padding: 0; font-size: 14pt; }
            }
          </style>
        </head>
        <body>
          <div class="letter-body">\${body}</div>
          <div class="signature-container">
            <div class="signature-block">\${signature}</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    \`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleWhatsApp = () => {
    if (!isDaysValid) {
      alert(lang === 'bn' ? 'সরকারি নিয়ম অনুযায়ী একবারে ৭ দিনের বেশি ছুটি মঞ্জুরযোগ্য নয়।' : 'Maximum 7 days leave allowed at a time.');
      return;
    }
    const { body, signature } = generateLetterContent();
    const text = body + '\\n\\n' + signature.split('\\n').map(line => ' '.repeat(30) + line).join('\\n');
    window.open(\`https://wa.me/?text=\${encodeURIComponent(text)}\`, '_blank');
  };

  const handleAddToRegister = () => {
    if (!fromDate) {
      alert(lang === 'bn' ? 'দয়া করে শুরুর তারিখ নির্বাচন করুন!' : 'Please select the From date!');
      return;
    }
    if (!isDaysValid) {
      alert(lang === 'bn' ? 'সরকারি নিয়ম অনুযায়ী একবারে ৭ দিনের বেশি ছুটি মঞ্জুরযোগ্য নয়।' : 'Maximum 7 days leave allowed at a time.');
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
          background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
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
          <span style={{ fontSize: '18px' }}>✍️</span> {lang === 'bn' ? 'স্মার্ট CL দরখাস্ত তৈরি করুন' : 'Smart CL Application Generator'}
        </span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '24px', border: '1px solid #cbd5e1' }}>
              <button onClick={() => setLang('bn')} style={{ background: lang === 'bn' ? '#fff' : 'transparent', color: lang === 'bn' ? '#2563eb' : '#64748b', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: lang === 'bn' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>বাংলা</button>
              <button onClick={() => setLang('en')} style={{ background: lang === 'en' ? '#fff' : 'transparent', color: lang === 'en' ? '#2563eb' : '#64748b', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: lang === 'en' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>English</button>
            </div>
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
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'প্রাপক (To)' : 'Recipient (To)'}</label>
              <select 
                value={recipient} 
                onChange={e => setRecipient(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
              >
                {recipients.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <input type="checkbox" checked={useThroughHT} onChange={e => setUseThroughHT(e.target.checked)} /> 
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{lang === 'bn' ? 'প্রধান শিক্ষকের মাধ্যমে (Through The Head Teacher)' : 'Through The Head Teacher'}</span>
            </label>
          </div>

          <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>{lang === 'bn' ? 'আবেদনের ধরন' : 'Application Type'}</label>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: leaveType === 'advance' ? 700 : 500, color: leaveType === 'advance' ? '#2563eb' : '#475569' }}>
                <input type="radio" checked={leaveType === 'advance'} onChange={() => setLeaveType('advance')} /> {lang === 'bn' ? 'অগ্রিম আবেদন' : 'Advance Application'}
              </label>
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: leaveType === 'post-facto' ? 700 : 500, color: leaveType === 'post-facto' ? '#2563eb' : '#475569' }}>
                <input type="radio" checked={leaveType === 'post-facto'} onChange={() => setLeaveType('post-facto')} /> {lang === 'bn' ? 'ছুটি পরবর্তী নিয়মিতকরণ' : 'Post-facto'}
              </label>
            </div>
            
            {leaveType === 'post-facto' && (
              <div style={{ background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'কাজে যোগদানের তারিখ (Joining Date)' : 'Joining Date'}</label>
                <input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
              </div>
            )}
          </div>

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
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{lang === 'bn' ? 'রবিবার বা অন্যান্য সরকারি ছুটি সংযুক্ত (Prefix/Suffix Holidays)' : 'Prefix/Suffix Sundays & Public Holidays'}</span>
            </label>
          </div>

          <div style={{ marginBottom: '12px', fontSize: '12px', color: isDaysValid ? '#1e40af' : '#991b1b', fontWeight: 700, background: isDaysValid ? '#eff6ff' : '#fef2f2', padding: '8px 12px', borderRadius: '8px', border: \`1px solid \${isDaysValid ? '#bfdbfe' : '#fecaca'}\` }}>
            {lang === 'bn' ? \`মোট ছুটি: \${toBengaliNum(totalDays)} দিন\` : \`Total Leave: \${totalDays} day(s)\`}
            {!isDaysValid && (
              <div style={{marginTop: '4px', fontSize: '11px', color: '#dc2626'}}>
                {lang === 'bn' ? '⚠️ সরকারি নিয়ম অনুযায়ী একবারে ৭ দিনের বেশি CL মঞ্জুরযোগ্য নয়!' : '⚠️ WBBPE rules allow maximum 7 days CL at a time!'}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>{lang === 'bn' ? 'ছুটির কারণ' : 'Reason for Leave'}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {reasonPresets.map(r => (
                <span 
                  key={r}
                  onClick={() => { setReason(r); setCustomReason(''); }}
                  style={{ background: reason === r ? '#3b82f6' : '#f1f5f9', color: reason === r ? '#fff' : '#475569', padding: '6px 12px', borderRadius: '16px', fontSize: '11.5px', cursor: 'pointer', fontWeight: reason === r ? 600 : 500, border: reason === r ? 'none' : '1px solid #cbd5e1' }}
                >
                  {r}
                </span>
              ))}
              <span 
                onClick={() => setReason('custom')}
                style={{ background: reason === 'custom' ? '#3b82f6' : '#f1f5f9', color: reason === 'custom' ? '#fff' : '#475569', padding: '6px 12px', borderRadius: '16px', fontSize: '11.5px', cursor: 'pointer', fontWeight: reason === 'custom' ? 600 : 500, border: reason === 'custom' ? 'none' : '1px solid #cbd5e1' }}
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left', minWidth: '200px' }}>{previewContent.signature}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button disabled={!isDaysValid} onClick={handlePrint} style={{ opacity: isDaysValid ? 1 : 0.5, background: '#475569', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                🖨️ {lang === 'bn' ? 'প্রিন্ট / PDF' : 'Print / PDF'}
              </button>
              <button disabled={!isDaysValid} onClick={handleWhatsApp} style={{ opacity: isDaysValid ? 1 : 0.5, background: '#16a34a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(22,163,74,0.2)' }}>
                💬 WhatsApp
              </button>
            </div>
            <button disabled={!isDaysValid} onClick={handleAddToRegister} style={{ opacity: isDaysValid ? 1 : 0.5, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              ➕ {lang === 'bn' ? 'লিভ রেজিস্টারে যুক্ত করুন' : 'Add to Leave Register'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
`;
  const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Successfully updated LeaveApplicationGenerator with final rules');
} else {
  console.log('Failed to find boundaries');
}
