const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace dropdown options
const dropdownTarget = `<option value="cl">Casual Leave (CL) - G.O. 453-SE</option>
              <option value="commuted">Commuted Leave / Half Pay Leave</option>
              <option value="ccl">Child Care Leave (CCL)</option>`;
const dropdownReplacement = `<option value="cl">Casual Leave (CL) - G.O. 453-SE</option>
              <option value="commuted">Commuted Leave (রূপান্তরিত ছুটি - Full Pay)</option>
              <option value="half_pay">Half Pay Leave (অর্ধ-বেতন ছুটি - Half Pay)</option>
              <option value="ccl">Child Care Leave (CCL)</option>`;
content = content.replace(dropdownTarget, dropdownReplacement);


// Replace UI Block
const uiTarget = `{leaveCategory === 'commuted' && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>{lang === 'bn' ? 'ছুটির কারণ (Purpose)' : 'Purpose'}</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: commutedGround === 'medical' ? 700 : 500, color: commutedGround === 'medical' ? '#2563eb' : '#475569' }}>
                  <input type="radio" checked={commutedGround === 'medical'} onChange={() => setCommutedGround('medical')} /> {lang === 'bn' ? 'চিকিৎসাজনিত কারণ' : 'Medical Ground'}
                </label>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: commutedGround === 'private' ? 700 : 500, color: commutedGround === 'private' ? '#2563eb' : '#475569' }}>
                  <input type="radio" checked={commutedGround === 'private'} onChange={() => setCommutedGround('private')} /> {lang === 'bn' ? 'ব্যক্তিগত জরুরি প্রয়োজন' : 'Private Affairs'}
                </label>
              </div>

              {commutedGround === 'medical' && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'অসুস্থতার বিবরণ' : 'Illness Details'}</label>
                  <input type="text" value={illnessDesc} onChange={e => setIllnessDesc(e.target.value)} placeholder={lang === 'bn' ? 'যেমন: ভাইরাল ফিভার' : 'e.g., Viral Fever'} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>
                {lang === 'bn' ? 'ℹ️ এই ছুটির জন্য ২ দিন হাফ-পে লিভ কাটা হবে। সমগ্র সার্ভিসে সর্বাধিক ১৮০ দিন মঞ্জুরযোগ্য।' : 'ℹ️ Debits 2x days from Half Pay Leave account. Max limit: 180 days in entire service.'}
              </div>
            </div>
          )}`;
const uiReplacement = `{(leaveCategory === 'commuted' || leaveCategory === 'half_pay') && (
            <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>{lang === 'bn' ? 'ছুটির কারণ (Purpose)' : 'Purpose'}</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: commutedGround === 'medical' ? 700 : 500, color: commutedGround === 'medical' ? '#2563eb' : '#475569' }}>
                  <input type="radio" checked={commutedGround === 'medical'} onChange={() => setCommutedGround('medical')} /> {lang === 'bn' ? 'চিকিৎসাজনিত কারণ' : 'Medical Ground'}
                </label>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: commutedGround === 'private' ? 700 : 500, color: commutedGround === 'private' ? '#2563eb' : '#475569' }}>
                  <input type="radio" checked={commutedGround === 'private'} onChange={() => setCommutedGround('private')} /> {lang === 'bn' ? 'ব্যক্তিগত জরুরি প্রয়োজন' : 'Private Affairs'}
                </label>
              </div>

              {commutedGround === 'medical' && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{lang === 'bn' ? 'অসুস্থতার বিবরণ' : 'Illness Details'}</label>
                  <input type="text" value={illnessDesc} onChange={e => setIllnessDesc(e.target.value)} placeholder={lang === 'bn' ? 'যেমন: ভাইরাল ফিভার' : 'e.g., Viral Fever'} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '11.5px', color: leaveCategory === 'commuted' ? '#b45309' : '#1d4ed8', fontWeight: 600, background: leaveCategory === 'commuted' ? '#fef3c7' : '#eff6ff', padding: '8px', borderRadius: '6px', border: \`1px solid \${leaveCategory === 'commuted' ? '#fde68a' : '#bfdbfe'}\` }}>
                {leaveCategory === 'commuted' 
                  ? (lang === 'bn' ? '⚡ পূর্ণ বেতন (Full Pay) | সার্ভিস বুকের HPL অ্যাকাউন্ট থেকে দ্বিগুণ (2x) দিন কর্তন হবে। সমগ্র চাকরিকালে সর্বোচ্চ ১৮০ দিন।' : '⚡ Full Pay | Debits 2x days from HPL account. Max limit: 180 days in entire service.')
                  : (lang === 'bn' ? 'ℹ️ অর্ধ-বেতন (Half Pay) | ১ দিনের ছুটির জন্য ১টি Half Pay Leave কাটা হবে।' : 'ℹ️ Half Pay | 1 day of leave debits 1 Half Pay Leave.')}
              </div>
            </div>
          )}`;
content = content.replace(uiTarget, uiReplacement);


// Replace Logic Block
const logicTarget = `if (leaveCategory === 'commuted') {
         const leaveNameEn = 'Commuted Leave / Half Pay Leave';
         const leaveNameBn = 'কমিউটেড লিভ / হাফ-পে লিভ';
         subEn = \`Application for \${leaveNameEn}\`;
         subBn = \`\${leaveNameBn}-এর জন্য আবেদন।\`;
         
         if (commutedGround === 'medical') {
            bodyTextEn = \`I am \${tName || '[Name]'}, \${tDesig} of \${tSchool || '[School]'}, \${tCircle || '[Circle]'}, \${tDistrict || '[District]'}. I have been suffering from \${illnessDesc || '______'} and I am advised by the registered medical practitioner to take rest from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)). I would like to commute \${totalDays * 2 || 0} Half Pay Leaves on medical ground.\${prefixSuffixEn}\\n\\nSo I shall be highly obliged if you kindly grant me the Commuted Leave for these days.\`;
            bodyTextBn = \`আমি \${tName || '[Name]'}, আপনার অধীনস্থ \${tSchool || '[School]'}-এর \${tDesig}। আমি \${illnessDesc || '______'}-এ আক্রান্ত হওয়ায় চিকিৎসক আমাকে আগামী \${formattedFrom} হইতে \${formattedTo} পর্যন্ত (মোট \${displayDays} দিন) বিশ্রামের পরামর্শ দিয়েছেন। আমি চিকিৎসাজনিত কারণে \${totalDays * 2 || 0} দিনের হাফ-পে লিভ কমিউট করতে ইচ্ছুক।\${prefixSuffixBn}\\n\\nঅতএব, আপনার নিকট বিনীত প্রার্থনা, অনুগ্রহপূর্বক উক্ত দিনগুলির জন্য আমার কমিউটেড লিভ মঞ্জুর করিয়া বাধিত করিবেন।\`;
            enclosures = isBn 
               ? "সংযুক্তি:\\n১. মেডিকেল সার্টিফিকেট\\n২. ফিটনেস সার্টিফিকেট (Registered Medical Practitioner দ্বারা)"
               : "Enclosures:\\n1. Medical Certificate\\n2. Fitness Certificate issued by Registered Medical Practitioner";
         } else {
            bodyTextEn = \`I am \${tName || '[Name]'}, \${tDesig} of \${tSchool || '[School]'}, \${tCircle || '[Circle]'}, \${tDistrict || '[District]'}. I am in urgent need of leave for private affairs from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)). I would like to commute \${totalDays * 2 || 0} Half Pay Leaves on private affairs as per Rule 4(e) of G.O. 453-SE(Pry).\${prefixSuffixEn}\\n\\nSo I shall be highly obliged if you kindly grant me the Commuted Leave for these days.\`;
            bodyTextBn = \`আমি \${tName || '[Name]'}, আপনার অধীনস্থ \${tSchool || '[School]'}-এর \${tDesig}। ব্যক্তিগত জরুরি প্রয়োজনে আমার আগামী \${formattedFrom} হইতে \${formattedTo} পর্যন্ত (মোট \${displayDays} দিন) ছুটির প্রয়োজন। আমি G.O. 453-SE(Pry)-এর Rule 4(e) অনুসারে \${totalDays * 2 || 0} দিনের হাফ-পে লিভ কমিউট করতে ইচ্ছুক।\${prefixSuffixBn}\\n\\nঅতএব, আপনার নিকট বিনীত প্রার্থনা, অনুগ্রহপূর্বক উক্ত দিনগুলির জন্য আমার কমিউটেড লিভ মঞ্জুর করিয়া বাধিত করিবেন।\`;
            enclosures = "";
         }
       } else if (leaveCategory === 'ccl') {`;

const logicReplacement = `if (leaveCategory === 'commuted' || leaveCategory === 'half_pay') {
         const isCommuted = leaveCategory === 'commuted';
         const leaveNameEn = isCommuted ? 'Commuted Leave' : 'Half Pay Leave';
         const leaveNameBn = isCommuted ? 'কমিউটেড লিভ (Commuted Leave)' : 'অর্ধ-বেতন ছুটি (Half Pay Leave)';
         
         subEn = \`Application for \${leaveNameEn}\`;
         subBn = \`\${leaveNameBn}-এর জন্য আবেদন।\`;
         
         if (commutedGround === 'medical') {
            bodyTextEn = \`I am \${tName || '[Name]'}, \${tDesig} of \${tSchool || '[School]'}, \${tCircle || '[Circle]'}, \${tDistrict || '[District]'}. I have been suffering from \${illnessDesc || '______'} and I am advised by the registered medical practitioner to take rest from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)). I would like to \${isCommuted ? 'commute ' + (totalDays * 2 || 0) + ' Half Pay Leaves' : 'take ' + (totalDays || 0) + ' Half Pay Leave(s)'} on medical ground.\${prefixSuffixEn}\\n\\nSo I shall be highly obliged if you kindly grant me the \${leaveNameEn} for these days.\`;
            bodyTextBn = \`আমি \${tName || '[Name]'}, আপনার অধীনস্থ \${tSchool || '[School]'}-এর \${tDesig}। আমি \${illnessDesc || '______'}-এ আক্রান্ত হওয়ায় চিকিৎসক আমাকে আগামী \${formattedFrom} হইতে \${formattedTo} পর্যন্ত (মোট \${displayDays} দিন) বিশ্রামের পরামর্শ দিয়েছেন। আমি চিকিৎসাজনিত কারণে \${isCommuted ? (totalDays * 2 || 0) + ' দিনের হাফ-পে লিভ কমিউট করতে' : (totalDays || 0) + ' দিনের হাফ-পে লিভ গ্রহণ করতে'} ইচ্ছুক।\${prefixSuffixBn}\\n\\nঅতএব, আপনার নিকট বিনীত প্রার্থনা, অনুগ্রহপূর্বক উক্ত দিনগুলির জন্য আমার \${leaveNameBn} মঞ্জুর করিয়া বাধিত করিবেন।\`;
            enclosures = isBn 
               ? "সংযুক্তি:\\n১. মেডিকেল সার্টিফিকেট\\n২. ফিটনেস সার্টিফিকেট (Registered Medical Practitioner দ্বারা)"
               : "Enclosures:\\n1. Medical Certificate\\n2. Fitness Certificate issued by Registered Medical Practitioner";
         } else {
            bodyTextEn = \`I am \${tName || '[Name]'}, \${tDesig} of \${tSchool || '[School]'}, \${tCircle || '[Circle]'}, \${tDistrict || '[District]'}. I am in urgent need of leave for private affairs from \${formattedFrom} to \${formattedTo} (total \${displayDays} day(s)). I would like to \${isCommuted ? 'commute ' + (totalDays * 2 || 0) + ' Half Pay Leaves' : 'take ' + (totalDays || 0) + ' Half Pay Leave(s)'} on private affairs as per Rule 4(\${isCommuted ? 'e' : 'd'}) of G.O. 453-SE(Pry).\${prefixSuffixEn}\\n\\nSo I shall be highly obliged if you kindly grant me the \${leaveNameEn} for these days.\`;
            bodyTextBn = \`আমি \${tName || '[Name]'}, আপনার অধীনস্থ \${tSchool || '[School]'}-এর \${tDesig}। ব্যক্তিগত জরুরি প্রয়োজনে আমার আগামী \${formattedFrom} হইতে \${formattedTo} পর্যন্ত (মোট \${displayDays} দিন) ছুটির প্রয়োজন। আমি G.O. 453-SE(Pry)-এর Rule 4(\${isCommuted ? 'e' : 'd'}) অনুসারে \${isCommuted ? (totalDays * 2 || 0) + ' দিনের হাফ-পে লিভ কমিউট করতে' : (totalDays || 0) + ' দিনের হাফ-পে লিভ গ্রহণ করতে'} ইচ্ছুক।\${prefixSuffixBn}\\n\\nঅতএব, আপনার নিকট বিনীত প্রার্থনা, অনুগ্রহপূর্বক উক্ত দিনগুলির জন্য আমার \${leaveNameBn} মঞ্জুর করিয়া বাধিত করিবেন।\`;
            enclosures = "";
         }
       } else if (leaveCategory === 'ccl') {`;

content = content.replace(logicTarget, logicReplacement);

fs.writeFileSync('src/App.tsx', content);
console.log('Successfully separated Commuted Leave and Half Pay Leave');
