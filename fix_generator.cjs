const fs = require('fs');

const content = `import React, { useState, useEffect, useRef } from 'react';

const toTitleCase = (str: string) => {
  return str.replace(/\\w\\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

const formatDateToLocale = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return \`\${d}-\${m}-\${y}\`;
};

export default function LeaveApplicationGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  
  const [leaveCategory, setLeaveCategory] = useState('cl');
  
  // Profile
  const [teacherName, setTeacherName] = useState('');
  const [designation, setDesignation] = useState('Assistant Teacher');
  const [schoolName, setSchoolName] = useState('');
  const [circleName, setCircleName] = useState('');
  const [districtName, setDistrictName] = useState('');
  
  // Dates
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hasPrefixSuffix, setHasPrefixSuffix] = useState(false);
  
  // CL specific
  const [clRecipient, setClRecipient] = useState('The Sub-Inspector of Schools (Through The Head Teacher)');
  const [reason, setReason] = useState('Urgent Family Business');
  const [customReason, setCustomReason] = useState('');
  
  // Commuted / Half Pay specific
  const [commutedGround, setCommutedGround] = useState('medical');
  const [illnessDesc, setIllnessDesc] = useState('');
  
  // CCL specific
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childOrder, setChildOrder] = useState('1st Child');
  const [cclSpell, setCclSpell] = useState('1st Spell');
  const [cclPurpose, setCclPurpose] = useState('Examination');
  
  // Maternity specific
  const [maternityMode, setMaternityMode] = useState('Full Term Confinement');
  
  // Quarantine Leave specific
  const [diseaseName, setDiseaseName] = useState('');
  const [relation, setRelation] = useState('');
  
  // Compensatory Leave specific
  const [memoNo, setMemoNo] = useState('');

  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = window as any;
    if (w.SafeStorage) {
      setTeacherName(w.SafeStorage.getItem('teacher_name_cl') || '');
      setDesignation(w.SafeStorage.getItem('teacher_designation_cl') || 'Assistant Teacher');
      setSchoolName(w.SafeStorage.getItem('teacher_school_cl') || '');
      setCircleName(w.SafeStorage.getItem('teacher_circle_cl') || '');
      setDistrictName(w.SafeStorage.getItem('teacher_district_cl') || '');
    } else {
      setTeacherName(localStorage.getItem('teacher_name_cl') || '');
      setDesignation(localStorage.getItem('teacher_designation_cl') || 'Assistant Teacher');
      setSchoolName(localStorage.getItem('teacher_school_cl') || '');
      setCircleName(localStorage.getItem('teacher_circle_cl') || '');
      setDistrictName(localStorage.getItem('teacher_district_cl') || '');
    }
  }, []);

  const updateProfile = (key: string, value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const formatted = toTitleCase(value);
    setter(formatted);
    const w = window as any;
    if (w.SafeStorage) {
      w.SafeStorage.setItem(key, formatted);
    } else {
      localStorage.setItem(key, formatted);
    }
  };

  // Date Logic
  let totalDays = 0;
  if (fromDate && toDate) {
    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);
    totalDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;
  } else if (fromDate) {
    totalDays = 1;
  }
  
  let validationWarning = '';
  let isDaysValid = true;
  
  if (totalDays < 1 && fromDate && toDate) {
    validationWarning = 'End date cannot be earlier than start date.';
    isDaysValid = false;
  }
  
  if (leaveCategory === 'cl' && totalDays > 7) {
    validationWarning = 'As per WBBPE Leave Rules, Casual Leave cannot exceed 7 consecutive days at a single stretch.';
    isDaysValid = false;
  } else if (leaveCategory === 'ccl' && totalDays > 0 && totalDays < 15) {
    validationWarning = 'CCL requires a minimum of 15 days per spell.';
    isDaysValid = false;
  } else if (leaveCategory === 'maternity' && maternityMode === 'Miscarriage / Abortion' && totalDays > 45) {
    validationWarning = 'Maternity leave for Miscarriage/Abortion cannot exceed 45 days.';
    isDaysValid = false;
  } else if (leaveCategory === 'maternity' && maternityMode === 'Full Term Confinement' && totalDays > 180) {
    validationWarning = 'Maternity leave for Full Term Confinement cannot exceed 180 days.';
    isDaysValid = false;
  } else if (leaveCategory === 'quarantine' && totalDays > 30) {
    validationWarning = 'Quarantine leave is generally limited to 21 to 30 days maximum.';
    isDaysValid = false;
  }

  const generateLetterContent = () => {
    const tName = teacherName || '[Teacher Name]';
    const tDesig = designation || '[Designation]';
    const tSchool = schoolName || '[School Name]';
    const tCircle = circleName || '[Circle Name]';
    const tDist = districtName || '[District]';
    
    const formattedFrom = formatDateToLocale(fromDate);
    const formattedTo = toDate ? formatDateToLocale(toDate) : formattedFrom;
    const displayDays = totalDays;
    const dynamicDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    
    let header = '';
    let sub = '';
    let bodyText = '';
    let enclosures = '';
    let showDualSignature = false;

    const prefixSuffixText = hasPrefixSuffix ? " I also pray for permission to prefix/suffix the adjoining holiday(s)/Sunday(s)." : "";

    if (leaveCategory === 'cl') {
      if (clRecipient === 'The Sub-Inspector of Schools (Through The Head Teacher)') {
        header = \`To,\\nThe Sub-Inspector of Schools,\\n\${tCircle},\\n\${tDist}\\nThrough: The Head Teacher, \${tSchool}\`;
      } else if (clRecipient === 'The Sub-Inspector of Schools') {
        header = \`To,\\nThe Sub-Inspector of Schools,\\n\${tCircle},\\n\${tDist}\`;
      } else {
        header = \`To,\\nThe Head Teacher / Teacher-in-Charge,\\n\${tSchool},\\n\${tCircle}, \${tDist}\`;
      }
      
      sub = \`Application for Casual Leave (CL)\`;
      const r = reason === 'custom' ? customReason : reason;
      bodyText = \`With due respect and humble submission, I beg to state that I am \${tName}, \${tDesig} of \${tSchool}, \${tCircle}, \${tDist}. I shall not be able to attend the school from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)) due to \${r || '[Reason]'}.\${prefixSuffixText}\\n\\nSo I shall be highly obliged if you kindly grant me the Casual Leave for these days.\`;
    } else {
      header = \`To,\\nThe Chairman,\\nDistrict Primary School Council, \${tDist}\\nThrough:\\n1. The Head Teacher, \${tSchool}\\n2. The Sub-Inspector of Schools, \${tCircle}\`;
      showDualSignature = true;
      
      if (leaveCategory === 'commuted') {
        sub = \`Application for Commuted Leave\`;
        const ground = commutedGround === 'medical' ? 'Medical Ground' : 'Private Affairs';
        bodyText = \`With due respect and humble submission, I beg to state that I am \${tName}, \${tDesig} of \${tSchool}, \${tCircle}, \${tDist}. I am in urgent need of leave from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)) on \${ground}.\\nI therefore pray for the commutation of \${displayDays * 2} Half Pay Leaves into \${displayDays} day(s) of Full Pay Commuted Leave (with full pay and allowances) as admissible under Rule 4(e) of WBBPE Leave Rules, 1999 (as amended from time to time).\`;
        if (commutedGround === 'medical') {
          enclosures = \`Enclosures:\\n1. Medical Certificate\\n2. Fitness Certificate issued by Registered Medical Practitioner\`;
        }
      } else if (leaveCategory === 'half_pay') {
        sub = \`Application for Half Pay Leave\`;
        const ground = commutedGround === 'medical' ? 'Medical Ground' : 'Private Affairs';
        bodyText = \`With due respect and humble submission, I beg to state that I am \${tName}, \${tDesig} of \${tSchool}, \${tCircle}, \${tDist}. I pray for sanction of \${displayDays} day(s) of Half Pay Leave from \${formattedFrom} to \${formattedTo} on \${ground} as admissible under Rule 4(d) of WBBPE Leave Rules, 1999 (as amended from time to time). I understand that this leave carries half average pay and debits \${displayDays} day(s) from my HPL account.\`;
        if (commutedGround === 'medical') {
          enclosures = \`Enclosures:\\n1. Medical Certificate\\n2. Fitness Certificate issued by Registered Medical Practitioner\`;
        }
      } else if (leaveCategory === 'ccl') {
        sub = \`Application for Child Care Leave (CCL)\`;
        bodyText = \`With due respect and humble submission, I beg to state that I am \${tName}, \${tDesig} of \${tSchool}, \${tCircle}, \${tDist}. In terms of Finance Dept Memo No. 5560-F(P) read with relevant WBBPE notifications (as amended from time to time), I pray for Child Care Leave for a period of \${displayDays} day(s) from \${formattedFrom} to \${formattedTo} for the purpose of \${cclPurpose || '[Reason]'} of my child, \${childName || '[Child Name]'} (Age: \${childAge || '[Age]'} years). This is my \${cclSpell} of CCL in this calendar year.\`;
        enclosures = \`Enclosures:\\n1. Birth Certificate of Child / Examination Schedule / Medical Documents\`;
      } else if (leaveCategory === 'maternity') {
        sub = \`Application for Maternity Leave\`;
        bodyText = \`With due respect and humble submission, I beg to state that I am \${tName}, \${tDesig} of \${tSchool}, \${tCircle}, \${tDist}. In terms of WBBPE Leave Rules / G.O. No. 573-SE(Pry) (as amended from time to time), I pray for sanction of Maternity Leave for a period of \${displayDays} day(s) from \${formattedFrom} to \${formattedTo} on account of \${maternityMode}.\`;
        enclosures = \`Enclosures:\\n1. Registered Medical Practitioner's Certificate\`;
      } else if (leaveCategory === 'quarantine') {
        sub = \`Application for Quarantine Leave\`;
        bodyText = \`With due respect and humble submission, I beg to state that I am \${tName}, \${tDesig} of \${tSchool}, \${tCircle}, \${tDist}. I pray for sanction of Quarantine Leave for a period of \${displayDays} day(s) from \${formattedFrom} to \${formattedTo} due to the presence of an infectious disease (\${diseaseName || '[Disease]'}) contracted by my \${relation || '[Relationship]'}. This application is made as admissible under Rule 4(i) of WBBPE Leave Rules, 1999 (as amended from time to time).\`;
        enclosures = \`Enclosures:\\n1. Medical / Public Health Officer Certificate\`;
      } else if (leaveCategory === 'compensatory') {
        sub = \`Application for Compensatory Leave\`;
        bodyText = \`With due respect and humble submission, I beg to state that I am \${tName}, \${tDesig} of \${tSchool}, \${tCircle}, \${tDist}. I pray for sanction of Compensatory Leave for a period of \${displayDays} day(s) from \${formattedFrom} to \${formattedTo} in lieu of my duties performed during the vacation/holidays as per Council / Board Order / Memo No. \${memoNo || '[Memo No.]'}. This application is made as admissible under Rule 4(c) of WBBPE Leave Rules, 1999 (as amended from time to time).\`;
        enclosures = \`Enclosures:\\n1. Copy of relevant Order / Memo No.\`;
      }
    }

    return { header, sub, bodyText, enclosures, showDualSignature, dynamicDate };
  };

  const { header, sub, bodyText, enclosures, showDualSignature, dynamicDate } = generateLetterContent();

  const handlePrint = () => {
    if (!isDaysValid) {
      alert(validationWarning);
      return;
    }
    const printWindow = window.open('', '', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.write(\`
        <html>
          <head>
            <title>Leave Application</title>
            <style>
              @page { size: A4 portrait; margin: 20mm; }
              body { font-family: serif; font-size: 15px; line-height: 1.8; color: #000; text-align: justify; white-space: pre-wrap; padding: 20px; }
              .header-block { white-space: pre-wrap; margin-bottom: 20px; }
              .sub-block { font-weight: bold; margin-bottom: 20px; }
              .signature-block { width: fit-content; margin-left: auto; text-align: center; margin-top: 40px; }
              .dual-signatures { display: flex; justify-content: space-between; margin-top: 60px; text-align: center; }
            </style>
          </head>
          <body>
            <div style="text-align: right; margin-bottom: 20px;">Date: \${dynamicDate}</div>
            <div class="header-block">\${header}</div>
            <div class="sub-block">Sub: \${sub}</div>
            <div>Sir/Madam,</div>
            <div style="margin-top: 10px; margin-bottom: 20px;">\${bodyText}</div>
            <div style="margin-top: 20px; font-weight: bold;">Yours faithfully,</div>
            <div class="signature-block">
              <br/><br/><br/>
              Signature of Applicant<br/>
              Name: \${teacherName || '[Name]'}<br/>
              \${designation || '[Designation]'}<br/>
              \${schoolName || '[School]'}
            </div>
            \${enclosures ? \`<div style="margin-top: 30px;"><b>\${enclosures}</b></div>\` : ''}
            \${showDualSignature ? \`
              <div class="dual-signatures">
                <div>Forwarded & Recommended<br/><br/><br/><br/>Signature of HT with Seal</div>
                <div>Forwarded & Recommended<br/><br/><br/><br/>Signature of SI/S with Seal</div>
              </div>
            \` : ''}
          </body>
        </html>
      \`);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handleWhatsApp = () => {
    if (!isDaysValid) {
      alert(validationWarning);
      return;
    }
    let text = \`Date: \${dynamicDate}\\n\\n\${header}\\n\\nSub: \${sub}\\n\\nSir/Madam,\\n\${bodyText}\\n\\nYours faithfully,\\n\${teacherName}\\n\${designation}\\n\${schoolName}\`;
    if (enclosures) text += \`\\n\\n\${enclosures}\`;
    const wLink = \`https://wa.me/?text=\${encodeURIComponent(text)}\`;
    window.open(wLink, '_blank');
  };

  const handleAddToRegister = () => {
    if (leaveCategory !== 'cl') {
      alert('Only CL is deducted from the local 14-day balance!');
      return;
    }
    if (!fromDate) {
      alert('Please select the From date!');
      return;
    }
    if (!isDaysValid) {
      alert(validationWarning);
      return;
    }
    const w = window as any;
    if (w.addLeaveEntryDirectly) {
      w.addLeaveEntryDirectly(fromDate, 'CL', reason === 'custom' ? customReason : reason);
      alert('✅ Successfully added to the leave register and deducted from balance!');
    }
  };

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
          <span style={{ fontSize: '18px' }}>📝</span> WBBPE Leave Application Generator
        </span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700 }}>Leave Type</label>
            <select 
              value={leaveCategory} 
              onChange={e => { setLeaveCategory(e.target.value); setHasPrefixSuffix(false); }}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #94a3b8', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
            >
              <option value="cl">Casual Leave (CL) - Rule 4(a)</option>
              <option value="commuted">Commuted Leave (রূপান্তরিত ছুটি - Full Pay) - Rule 4(e)</option>
              <option value="half_pay">Half Pay Leave (অর্ধ-বেতন ছুটি - Half Pay) - Rule 4(d)</option>
              <option value="ccl">Child Care Leave (CCL)</option>
              <option value="maternity">Maternity Leave</option>
              <option value="quarantine">Quarantine Leave - Rule 4(i)</option>
              <option value="compensatory">Compensatory Leave - Rule 4(c)</option>
            </select>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#1e3a8a' }}>Profile Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input type="text" placeholder="Teacher Name" value={teacherName} onChange={e => updateProfile('teacher_name_cl', e.target.value, setTeacherName)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
              <select value={designation} onChange={e => updateProfile('teacher_designation_cl', e.target.value, setDesignation)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                <option value="Assistant Teacher">Assistant Teacher</option>
                <option value="Head Teacher">Head Teacher</option>
                <option value="Teacher-in-Charge">Teacher-in-Charge</option>
              </select>
              <input type="text" placeholder="School Name" value={schoolName} onChange={e => updateProfile('teacher_school_cl', e.target.value, setSchoolName)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
              <input type="text" placeholder="Circle Name" value={circleName} onChange={e => updateProfile('teacher_circle_cl', e.target.value, setCircleName)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
              <input type="text" placeholder="District" value={districtName} onChange={e => updateProfile('teacher_district_cl', e.target.value, setDistrictName)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', gridColumn: '1 / -1' }} />
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#1e3a8a' }}>Leave Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>From Date</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginTop: '2px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>To Date (Inclusive)</label>
                <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginTop: '2px' }} />
              </div>
            </div>
            {totalDays > 0 && <div style={{ fontSize: '12px', fontWeight: 700, color: isDaysValid ? '#15803d' : '#b91c1c' }}>Total Days: {totalDays} {validationWarning && <span style={{display:'block',marginTop:'4px'}}>⚠️ {validationWarning}</span>}</div>}
          </div>

          {/* Conditional Form Inputs */}
          {leaveCategory === 'cl' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Recipient</label>
              <select value={clRecipient} onChange={e => setClRecipient(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '8px' }}>
                <option value="The Sub-Inspector of Schools (Through The Head Teacher)">The Sub-Inspector of Schools (Through The Head Teacher)</option>
                <option value="The Sub-Inspector of Schools">The Sub-Inspector of Schools</option>
                <option value="The Head Teacher / Teacher-in-Charge">The Head Teacher / Teacher-in-Charge</option>
              </select>
              
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Reason</label>
              <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '8px' }}>
                <option value="Urgent Family Business">Urgent Family Business</option>
                <option value="Sudden Illness">Sudden Illness</option>
                <option value="Medical Check-up">Medical Check-up</option>
                <option value="custom">Other (Type custom...)</option>
              </select>
              {reason === 'custom' && (
                <input type="text" value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Enter reason..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '8px' }} />
              )}
              
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginTop: '4px' }}>
                <input type="checkbox" checked={hasPrefixSuffix} onChange={e => setHasPrefixSuffix(e.target.checked)} />
                ☑️ Prefix/Suffix Sundays or Holidays
              </label>
            </div>
          )}

          {(leaveCategory === 'commuted' || leaveCategory === 'half_pay') && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Purpose</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: commutedGround === 'medical' ? 700 : 500 }}>
                  <input type="radio" checked={commutedGround === 'medical'} onChange={() => setCommutedGround('medical')} /> Medical Ground
                </label>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: commutedGround === 'private' ? 700 : 500 }}>
                  <input type="radio" checked={commutedGround === 'private'} onChange={() => setCommutedGround('private')} /> Private Affairs
                </label>
              </div>

              {commutedGround === 'medical' && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Illness Details</label>
                  <input type="text" value={illnessDesc} onChange={e => setIllnessDesc(e.target.value)} placeholder="e.g., Viral Fever" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '11.5px', color: leaveCategory === 'commuted' ? '#b45309' : '#1d4ed8', fontWeight: 600, background: leaveCategory === 'commuted' ? '#fef3c7' : '#eff6ff', padding: '8px', borderRadius: '6px', border: \`1px solid \${leaveCategory === 'commuted' ? '#fde68a' : '#bfdbfe'}\` }}>
                {leaveCategory === 'commuted' 
                  ? '⚡ পূর্ণ বেতন (Full Pay) | সার্ভিস বুকের HPL অ্যাকাউন্ট থেকে দ্বিগুণ (2x) দিন কর্তন হবে। সমগ্র চাকরিকালে সর্বোচ্চ ১৮০ দিন।' 
                  : 'ℹ️ অর্ধ-বেতন (Half Pay) | ১ দিনের ছুটির জন্য ১টি Half Pay Leave কাটা হবে।'}
              </div>
            </div>
          )}

          {leaveCategory === 'ccl' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input type="text" placeholder="Child Name" value={childName} onChange={e => setChildName(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <input type="number" placeholder="Child Age (Max 18)" max={18} value={childAge} onChange={e => setChildAge(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <select value={childOrder} onChange={e => setChildOrder(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                  <option value="1st Child">1st Child</option>
                  <option value="2nd Child">2nd Child</option>
                </select>
                <select value={cclSpell} onChange={e => setCclSpell(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                  <option value="1st Spell">1st Spell</option>
                  <option value="2nd Spell">2nd Spell</option>
                  <option value="3rd Spell">3rd Spell</option>
                </select>
                <input type="text" placeholder="Purpose (e.g. Examination)" value={cclPurpose} onChange={e => setCclPurpose(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', gridColumn: '1 / -1' }} />
              </div>
            </div>
          )}

          {leaveCategory === 'maternity' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Maternity Mode</label>
              <select value={maternityMode} onChange={e => setMaternityMode(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                <option value="Full Term Confinement">Full Term Confinement (Max 180 days)</option>
                <option value="Miscarriage / Abortion">Miscarriage / Abortion (Max 45 days)</option>
              </select>
            </div>
          )}

          {leaveCategory === 'quarantine' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <input type="text" placeholder="Infectious Disease Name" value={diseaseName} onChange={e => setDiseaseName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '8px' }} />
              <input type="text" placeholder="Relationship of Infected Member" value={relation} onChange={e => setRelation(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
            </div>
          )}

          {leaveCategory === 'compensatory' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <input type="text" placeholder="Council / Board Order or Memo No." value={memoNo} onChange={e => setMemoNo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{ padding: '12px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              {showPreview ? 'Hide Preview' : '👀 Live Preview'}
            </button>
            <button
              onClick={handlePrint}
              disabled={!isDaysValid}
              style={{ padding: '12px', background: isDaysValid ? '#2563eb' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: isDaysValid ? 'pointer' : 'not-allowed' }}
            >
              🖨️ Print A4
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            {leaveCategory === 'cl' && (
              <button
                onClick={handleAddToRegister}
                disabled={!isDaysValid}
                style={{ flex: 1, padding: '10px', background: isDaysValid ? '#10b981' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: isDaysValid ? 'pointer' : 'not-allowed' }}
              >
                ➕ Add to CL Register
              </button>
            )}
            <button
              onClick={handleWhatsApp}
              disabled={!isDaysValid}
              style={{ flex: 1, padding: '10px', background: isDaysValid ? '#25D366' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: isDaysValid ? 'pointer' : 'not-allowed' }}
            >
              💬 Share WA
            </button>
          </div>

          {showPreview && (
            <div style={{ marginTop: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '12px', lineHeight: 1.6, color: '#334155' }}>
                <div style={{ textAlign: 'right', marginBottom: '12px' }}>Date: {dynamicDate}</div>
                <div style={{ fontWeight: 'bold' }}>{header}</div>
                <div style={{ margin: '12px 0', fontWeight: 'bold' }}>Sub: {sub}</div>
                <div>Sir/Madam,</div>
                <div style={{ margin: '8px 0', textAlign: 'justify' }}>{bodyText}</div>
                <div style={{ marginTop: '12px' }}>Yours faithfully,</div>
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
`;

fs.writeFileSync('src/components/LeaveApplicationGenerator.tsx', content);
console.log('Successfully written script correctly without shell escaping issues.');
