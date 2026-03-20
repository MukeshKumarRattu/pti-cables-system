import { useState, useEffect } from 'react';

// =========================================================================
// SECTION 1: GLOBAL STYLES & HELPER FUNCTIONS
// =========================================================================
const STYLES = {
  input: { width: '100%', padding: '12px 16px', fontSize: '16px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', boxSizing: 'border-box', outline: 'none', transition: '0.2s' },
  label: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  thExcel: { padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  tdExcel: { padding: '10px 16px', fontSize: '13px', color: '#334155', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle' }
};

const formatClockTime = (utcString) => new Date(utcString.endsWith('Z') ? utcString : utcString + 'Z').toLocaleTimeString('en-CA', { timeZone: 'America/Toronto', hour12: false, hour: '2-digit', minute: '2-digit' });
const formatDate = (utcString) => new Date(utcString.endsWith('Z') ? utcString : utcString + 'Z').toLocaleDateString('en-CA', { timeZone: 'America/Toronto', month: 'short', day: 'numeric' });

const getCurrentShift = () => {
  const currentHour = parseInt(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', hour12: false }).format(new Date()), 10);
  return (currentHour >= 7 && currentHour < 19) ? 'Day' : 'Night';
};

const printLabel = (row, isReel) => {
  const unitLabel = isReel ? "Reel #" : "Pallet #";
  const qtyLabel = isReel ? "Total Reels" : "Total Spools";
  const shiftIcon = row.shift === 'Day' ? '☀️' : '🌙';
  const printWindow = window.open('', '_blank', 'width=600,height=400');
  printWindow.document.write(`
    <html><head><title>Print Label</title><style>
      body { font-family: 'Arial', sans-serif; padding: 20px; text-align: center; }
      .label-box { border: 5px solid black; padding: 30px; margin: 0 auto; max-width: 450px; border-radius: 10px; }
      h1 { font-size: 26px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 2px;}
      h2 { font-size: 32px; color: #000; margin: 0 0 20px 0; border-bottom: 2px solid black; padding-bottom: 10px;}
      .details { font-size: 20px; text-align: left; line-height: 1.8; }
      .bold { font-weight: 900; display: inline-block; width: 140px; }
      .highlight { background-color: #f0f0f0; padding: 2px 8px; border-radius: 4px; border: 1px solid #ccc; font-family: monospace; font-size: 24px;}
    </style></head><body>
    <div class="label-box">
    <img src="/pti-logo.webp" alt="PTI Cables" style="height: 60px; margin-bottom: 10px;" />
    <h2>${row.wire_type}</h2><div class="details">
    <div><span class="bold">Machine:</span> ${row.line_name}</div>
    <div><span class="bold">Operator:</span> ${row.operator_name || 'N/A'} <span style="font-size:16px;">(${shiftIcon} ${row.shift} Shift)</span></div>
    <div><span class="bold">Date:</span> ${formatDate(row.timestamp)} ${formatClockTime(row.timestamp)}</div>
    <div><span class="bold">${unitLabel}</span> <span style="font-size: 26px; font-weight: bold;">${row.pallet_num}</span></div>
    <div><span class="bold">${qtyLabel}:</span> ${row.total_spools}</div>
    <div style="margin-top: 15px;"><span class="bold">Audit Range:</span> <span class="highlight">${row.audit_start} - ${row.audit_end}</span></div>
    </div></div><script>setTimeout(() => { window.print(); window.close(); }, 250);</script></body></html>
  `);
  printWindow.document.close();
};

const printQuarantineLabel = (payload) => {
  const shiftIcon = payload.shift === 'Day' ? '☀️' : '🌙';
  const printWindow = window.open('', '_blank', 'width=600,height=400');
  printWindow.document.write(`
    <html><head><title>Print Label</title><style>
      body { font-family: 'Arial', sans-serif; padding: 20px; text-align: center; }
      .label-box { border: 6px solid #ea580c; padding: 30px; margin: 0 auto; max-width: 450px; border-radius: 10px; background-color: #fff7ed; }
      h1 { font-size: 36px; margin: 0 0 10px 0; color: #ea580c; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;}
      h2 { font-size: 28px; color: #000; margin: 0 0 20px 0; border-bottom: 2px dashed #ea580c; padding-bottom: 10px;}
      .details { font-size: 20px; text-align: left; line-height: 1.8; color: #000;}
      .bold { font-weight: 900; display: inline-block; width: 140px; color: #9a3412;}
      .highlight { background-color: #f97316; color: white; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 26px;}
    </style></head><body>
    <div class="label-box">
    <h1>⚠️ QUARANTINE</h1>
    <h2>${payload.wire_type}</h2><div class="details">
    <div><span class="bold">Machine:</span> ${payload.line_name}</div>
    <div><span class="bold">Operator:</span> ${payload.operator_name} (${shiftIcon})</div>
    <div><span class="bold">Date:</span> ${new Date().toLocaleDateString('en-CA')} ${new Date().toLocaleTimeString('en-CA', {hour12:false, hour:'2-digit', minute:'2-digit'})}</div>
    <div style="margin-top: 15px;"><span class="bold">Odd Length:</span> <span class="highlight">${payload.length}</span></div>
    <div style="margin-top: 15px;"><span class="bold">Reason:</span> <span style="font-weight: bold; color: #9a3412;">${payload.reason}</span></div>
    </div></div><script>setTimeout(() => { window.print(); window.close(); }, 250);</script></body></html>
  `);
  printWindow.document.close();
};

// =========================================================================
// SECTION 2: EXCEL LOG BOOK COMPONENT
// =========================================================================
function LogBookTable({ activeOrderObj, isHistoryReel }) {
  if (!activeOrderObj) return null;

  return (
    <div style={{ backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead>
            <tr>
              <th style={STYLES.thExcel}>Date / Time</th>
              <th style={STYLES.thExcel}>Shift</th>
              <th style={STYLES.thExcel}>Operator</th>
              <th style={{...STYLES.thExcel, textAlign: 'center'}}>{isHistoryReel ? 'Reel Num' : 'Pallet Num'}</th>
              <th style={{...STYLES.thExcel, textAlign: 'center'}}>Qty Req.</th>
              <th style={{...STYLES.thExcel, textAlign: 'center'}}>{isHistoryReel ? 'Reels Made' : 'Spools Made'}</th>
              <th style={STYLES.thExcel}>Audit Range</th>
              <th style={STYLES.thExcel}>Comments / Reason</th>
              <th style={{...STYLES.thExcel, borderRight: 'none', textAlign: 'center'}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {activeOrderObj.logs.map((row, index) => {
              const isShort = !isHistoryReel && row.qty_requested > 0 && row.total_spools < row.qty_requested;
              const isOver = !isHistoryReel && row.qty_requested > 0 && row.total_spools > row.qty_requested;
              const hasVariance = isShort || isOver;
              
              return (
                <tr key={row.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={STYLES.tdExcel}><div style={{ fontWeight: '700' }}>{formatDate(row.timestamp)}</div><div style={{ fontSize: '11px', color: '#64748b' }}>{formatClockTime(row.timestamp)}</div></td>
                  <td style={{...STYLES.tdExcel, fontWeight: '800', color: row.shift === 'Day' ? '#d97706' : '#3b82f6'}}>{row.shift === 'Day' ? '☀️ Day' : '🌙 Night'}</td>
                  <td style={{...STYLES.tdExcel, fontWeight: '700', color: '#2563eb'}}>{row.operator_name || '—'}</td>
                  <td style={{...STYLES.tdExcel, fontWeight: '900', color: isHistoryReel ? '#9a3412' : '#334155', textAlign: 'center'}}>{row.pallet_num === 0 ? '—' : row.pallet_num}</td>
                  <td style={{...STYLES.tdExcel, fontWeight: '700', color: '#475569', textAlign: 'center'}}>{row.qty_requested || '—'}</td>
                  <td style={{
                    ...STYLES.tdExcel, fontWeight: '800', 
                    color: isShort ? '#ef4444' : (isOver ? '#b45309' : '#059669'), 
                    backgroundColor: isOver ? '#fef08a' : (isShort ? '#fee2e2' : 'transparent'),
                    textAlign: 'center'
                  }}>{row.total_spools}</td>
                  <td style={{...STYLES.tdExcel, fontFamily: 'monospace', color: '#475569', fontWeight: 'bold'}}>{row.audit_start} - {row.audit_end}</td>
                  <td style={{...STYLES.tdExcel, color: isShort ? '#ef4444' : (isOver ? '#b45309' : '#64748b'), fontStyle: row.comments ? 'normal' : 'italic', fontWeight: hasVariance ? 'bold' : 'normal'}}>{row.comments || 'none'}</td>
                  <td style={{...STYLES.tdExcel, borderRight: 'none', textAlign: 'center'}}><button onClick={() => printLabel(row, isHistoryReel)} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>🖨️ Print Tag</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '16px 32px', backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1', textAlign: 'right', fontSize: '14px', fontWeight: '700', color: '#334155', flexShrink: 0 }}>
        Run Total: <span style={{ color: isHistoryReel ? '#9a3412' : '#059669', marginLeft: '8px', fontSize: '16px' }}>{isHistoryReel ? `${activeOrderObj.logs.reduce((sum, log) => sum + log.total_spools, 0)} Reels` : `${activeOrderObj.logs.length} Pallets`}</span>
      </div>
    </div>
  );
}

// =========================================================================
// SECTION 3: SMART VARIANCE MODAL
// =========================================================================
function ActionModal({ config, onClose }) {
  const [varianceReason, setVarianceReason] = useState('');
  const [reconNotes, setReconNotes] = useState('');

  // Quarantine specific states
  const [qLength, setQLength] = useState('');
  const [qReason, setQReason] = useState('');
  const [qStartupReason, setQStartupReason] = useState(''); 
  const [qOtherReason, setQOtherReason] = useState('');
  const [qOtherStartupReason, setQOtherStartupReason] = useState('');
  const [qOddLengthReason, setQOddLengthReason] = useState(''); 

  useEffect(() => {
    if (config?.type === 'variance') { setVarianceReason(''); setReconNotes(''); }
    if (config?.type === 'quarantine') { 
      setQLength(''); setQReason(''); setQStartupReason(''); 
      setQOtherReason(''); setQOtherStartupReason(''); setQOddLengthReason('');
    }
  }, [config]);

  if (!config) return null;

  const targetQty = config.extraData?.target || 0;
  const labelsPulled = config.extraData?.span || 0;
  const isShort = labelsPulled < targetQty;
  const isOver = labelsPulled > targetQty;
  const labelDiff = Math.abs(labelsPulled - targetQty);

  // Parse standard length for comparison (e.g., extract 150 from "150m")
  const qTargetLength = config.extraData?.targetLength || 0;
  // Automatically strip out any non-numbers just in case, but input type="number" handles most of it
  const inputLengthNum = parseInt(String(qLength).replace(/\D/g, ''), 10) || 0;
  const lengthDiff = inputLengthNum - qTargetLength;
  const hasInput = inputLengthNum > 0;

  let calculatedSpools = labelsPulled; 
  let summaryText = "";

  if (isOver) {
    if (varianceReason === 'Extra Production') { calculatedSpools = labelsPulled; summaryText = `✓ Logging ${labelDiff} extra spools. Target was ${targetQty}.`; } 
    else if (varianceReason === 'Damaged Labels') { calculatedSpools = targetQty; summaryText = `✓ Threw away ${labelDiff} damaged labels. Spools made remains locked to ${targetQty}.`; }
  } else if (isShort) {
    if (varianceReason === 'Missed Labels') { calculatedSpools = targetQty; summaryText = `✓ Spools made locked to ${targetQty}. Assuming ${labelDiff} labels went missing.`; } 
    else if (varianceReason) { calculatedSpools = labelsPulled; summaryText = `✓ Short Run recorded. Logging ${calculatedSpools} physical spools made.`; }
  }

  // --- VALIDATION FLAGS ---
  let isQInvalid = false;
  if (config.type === 'quarantine') {
    if (!qLength.trim() || !qReason) isQInvalid = true;
    if (qReason === 'Other' && !qOtherReason.trim()) isQInvalid = true;
    
    if (qReason === 'ODD Length') {
      if (!qOddLengthReason) isQInvalid = true;
      // VALIDATION: Reel Transfers must strictly be shorter than the target length
      if (qOddLengthReason === 'Reel Transfer' && qTargetLength > 0 && inputLengthNum >= qTargetLength) {
        isQInvalid = true;
      }
      // VALIDATION: Extra Lengths must strictly be longer than the target length
      if (qOddLengthReason === 'Extra Length' && qTargetLength > 0 && inputLengthNum <= qTargetLength) {
        isQInvalid = true;
      }
    }
    
    if (qReason === 'Startup') {
      if (!qStartupReason) isQInvalid = true;
      if (qStartupReason === 'Other' && !qOtherStartupReason.trim()) isQInvalid = true;
    }
  }
  
  const isVarianceInvalid = config.type === 'variance' && !varianceReason;
  const isConfirmDisabled = isQInvalid || isVarianceInvalid;

  const handleConfirm = () => {
    if (config.type === 'quarantine') {
       if (isQInvalid) return;

       let finalReason = qReason;
       if (qReason === 'Other') finalReason = qOtherReason.trim();
       if (qReason === 'ODD Length') finalReason = `ODD Length - ${qOddLengthReason}`;
       if (qReason === 'Startup') {
         const subReason = qStartupReason === 'Other' ? qOtherStartupReason.trim() : qStartupReason;
         finalReason = `Startup - ${subReason}`;
       }

       config.resolve({ length: qLength, reason: finalReason });
       
    } else if (config.type === 'variance') {
      if (isVarianceInvalid) return; 
      let finalComment = varianceReason;
      if (isOver) {
        if (varianceReason === 'Damaged Labels') finalComment += ` (${labelDiff} labels thrown away)`;
        if (varianceReason === 'Extra Production') finalComment += ` (${labelDiff} extra spools made)`;
      } else if (isShort) {
        if (varianceReason === 'Missed Labels') finalComment += ` (${labelDiff} labels missing, spools met target)`;
        else finalComment += ` (Short by ${labelDiff} spools)`;
      }
      if (reconNotes.trim()) finalComment += ` | Notes: ${reconNotes.trim()}`;
      config.resolve({ spoolsMade: calculatedSpools, comments: finalComment }); 
    } else { config.resolve(true); }
    onClose();
  };

  const btnBgColor = isConfirmDisabled ? '#94a3b8' : (config.type === 'alert' ? '#3b82f6' : (config.type === 'quarantine' ? '#ea580c' : (config.type === 'variance' ? '#10b981' : '#ef4444')));

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{config.type === 'alert' ? '🛑' : (config.type === 'variance' ? '📋' : (config.type === 'quarantine' ? '✂️' : '⚠️'))}</div>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>{config.title}</h3>
        <p style={{ margin: '0 0 28px 0', color: '#475569', fontSize: '16px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{config.message}</p>
        
        {config.type === 'quarantine' && (
          <div style={{ textAlign: 'left', marginBottom: '28px' }}>
            <label style={STYLES.label}>Estimated Length / Size:</label>
            {/* CHANGED TO TYPE="NUMBER" SO ALPHABETS ARE BLOCKED */}
            <input 
              type="number" 
              value={qLength} 
              onChange={e => setQLength(e.target.value)} 
              style={{...STYLES.input, marginBottom: '16px'}} 
              placeholder="e.g. 850" 
              autoFocus 
              min="1"
            />
            
            <label style={STYLES.label}>Reason for Defect / Quarantine:</label>
            <select 
              value={qReason} 
              onChange={e => { setQReason(e.target.value); setQStartupReason(''); setQOtherReason(''); setQOddLengthReason(''); }} 
              style={{...STYLES.input, marginBottom: (qReason === 'Startup' || qReason === 'Other' || qReason === 'ODD Length') ? '16px' : '0'}}
            >
              <option value="">-- Select Reason --</option>
              <option value="ODD Length">ODD Length</option>
              <option value="Startup">Startup</option>
              <option value="Red Light">Red Light</option>
              <option value="Lump">Lump</option>
              <option value="Rough Wire">Rough Wire</option>
              <option value="Bad Jacket">Bad Jacket</option>
              <option value="Bad Color">Bad Color</option>
              <option value="No Print">No Print</option>
              <option value="Bad Print">Bad Print</option>
              <option value="Other">Other...</option>
            </select>

            {qReason === 'ODD Length' && (
              <div style={{ animation: 'fadeIn 0.2s' }}>
                <label style={{...STYLES.label, color: '#ea580c'}}>Odd Length Detail:</label>
                <select 
                  value={qOddLengthReason} 
                  onChange={e => setQOddLengthReason(e.target.value)} 
                  style={{...STYLES.input, border: '2px solid #fdba74', marginBottom: qOddLengthReason ? '16px' : '0'}}
                >
                  <option value="">-- Select Detail --</option>
                  <option value="Reel Transfer">Reel Transfer</option>
                  <option value="Extra Length">Extra Length</option>
                </select>

                {/* DYNAMIC VALIDATION: REEL TRANSFER */}
                {qOddLengthReason === 'Reel Transfer' && qTargetLength > 0 && (
                   <div style={{ padding: '12px', backgroundColor: (!hasInput || inputLengthNum >= qTargetLength) ? '#fef2f2' : '#f0fdf4', border: `1px dashed ${(!hasInput || inputLengthNum >= qTargetLength) ? '#f87171' : '#86efac'}`, borderRadius: '8px', fontSize: '14px', color: (!hasInput || inputLengthNum >= qTargetLength) ? '#b91c1c' : '#166534', fontWeight: 'bold' }}>
                     Target Length: {qTargetLength}m <br/>
                     Entered Length: {inputLengthNum}m <br/>
                     {!hasInput ? "⚠️ Please enter a length above." : (inputLengthNum >= qTargetLength ? "⚠️ Error: Reel transfers must be shorter than target." : `✓ Valid short reel transfer (-${Math.abs(lengthDiff)}m)`)}
                   </div>
                )}

                {/* DYNAMIC VALIDATION: EXTRA LENGTH */}
                {qOddLengthReason === 'Extra Length' && qTargetLength > 0 && (
                   <div style={{ padding: '12px', backgroundColor: (!hasInput || inputLengthNum <= qTargetLength) ? '#fef2f2' : '#f0fdf4', border: `1px dashed ${(!hasInput || inputLengthNum <= qTargetLength) ? '#f87171' : '#86efac'}`, borderRadius: '8px', fontSize: '14px', color: (!hasInput || inputLengthNum <= qTargetLength) ? '#b91c1c' : '#166534', fontWeight: 'bold' }}>
                     Target Length: {qTargetLength}m <br/>
                     Entered Length: {inputLengthNum}m <br/>
                     {!hasInput ? "⚠️ Please enter a length above." : (inputLengthNum <= qTargetLength ? "⚠️ Error: Extra length must be greater than target." : `✓ Valid extra length (+${lengthDiff}m)`)}
                   </div>
                )}
              </div>
            )}

            {qReason === 'Other' && (
              <input 
                type="text" 
                value={qOtherReason} 
                onChange={e => setQOtherReason(e.target.value)} 
                style={{...STYLES.input, animation: 'fadeIn 0.2s'}} 
                placeholder="Please specify reason..." 
              />
            )}

            {qReason === 'Startup' && (
              <div style={{ animation: 'fadeIn 0.2s' }}>
                <label style={{...STYLES.label, color: '#ea580c'}}>Startup Issue Detail:</label>
                <select 
                  value={qStartupReason} 
                  onChange={e => { setQStartupReason(e.target.value); setQOtherStartupReason(''); }} 
                  style={{...STYLES.input, border: '2px solid #fdba74', marginBottom: qStartupReason === 'Other' ? '16px' : '0'}}
                >
                  <option value="">-- Select Startup Issue --</option>
                  <option value="Power Flicker">Power Flicker</option>
                  <option value="Full Clean Out">Full Clean Out</option>
                  <option value="PLC/Drive Error">PLC/Drive Error</option>
                  <option value="Run Out of Compound">Run Out of Compound</option>
                  <option value="Bad Spooling">Bad Spooling</option>
                  <option value="Giveup Broke">Giveup Broke</option>
                  <option value="Other">Other...</option>
                </select>

                {qStartupReason === 'Other' && (
                   <input 
                     type="text" 
                     value={qOtherStartupReason} 
                     onChange={e => setQOtherStartupReason(e.target.value)} 
                     style={{...STYLES.input, border: '2px solid #fdba74', animation: 'fadeIn 0.2s'}} 
                     placeholder="Please specify startup issue..." 
                   />
                )}
              </div>
            )}
          </div>
        )}

        {config.type === 'variance' && (
          <div style={{ textAlign: 'left', marginBottom: '28px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
              <div><strong>Target:</strong> <span style={{color: '#1e40af'}}>{targetQty} spools</span></div>
              <div><strong>Labels Scanned:</strong> <span style={{color: isShort ? '#b45309' : '#991b1b'}}>{labelsPulled} labels</span></div>
            </div>
            <label style={STYLES.label}>Select Reason for {isShort ? 'Shortage' : 'Overrun'}:</label>
            <select value={varianceReason} onChange={e => setVarianceReason(e.target.value)} style={{...STYLES.input, marginBottom: '16px', border: '2px solid #3b82f6', fontWeight: 'bold'}}>
              <option value="">-- Choose Reason --</option>
              {isShort && (
                <>
                  <option value="End of Run">End of Run</option>
                  <option value="Urgently needed at shipping">Urgently needed at shipping</option>
                  <option value="Product changeover">Product changeover</option>
                  <option value="Machine broke">Machine broke</option>
                  <option value="Missed Labels">Missed Labels</option>
                </>
              )}
              {isOver && (
                <>
                  <option value="Extra Production">Extra Production</option>
                  <option value="Damaged Labels">Damaged Labels</option>
                </>
              )}
            </select>
            {varianceReason && (
              <div style={{ padding: '16px', backgroundColor: '#f0fdf4', border: '1px dashed #86efac', borderRadius: '8px', marginBottom: '16px', animation: 'fadeIn 0.2s' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#166534', textAlign: 'center' }}>{summaryText}</div>
              </div>
            )}
            <label style={STYLES.label}>Additional Notes (Optional):</label>
            <input type="text" value={reconNotes} onChange={e => setReconNotes(e.target.value)} style={STYLES.input} placeholder="Type explanation here..." />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {(config.type === 'confirm' || config.type === 'variance' || config.type === 'quarantine') && (
            <button onClick={() => { config.resolve(false); onClose(); }} style={{ padding: '12px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', flex: 1, transition: '0.2s' }}>Cancel</button>
          )}
          <button 
            disabled={isConfirmDisabled}
            onClick={handleConfirm} 
            style={{ padding: '12px 20px', backgroundColor: btnBgColor, color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: isConfirmDisabled ? 'not-allowed' : 'pointer', flex: 1, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: '0.2s' }}>
            {config.type === 'alert' ? 'Understood' : (config.type === 'variance' ? 'Save Record' : (config.type === 'quarantine' ? 'Print Tag' : 'Yes, Proceed'))}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SECTION 4: MAIN OPERATOR PANEL (Data Fetching & Layout)
// =========================================================================
export default function OperatorPanel({ lines }) {
  const [selectedLine, setSelectedLine] = useState(null);
  const [operatorName, setOperatorName] = useState('');
  const [comments, setComments] = useState('');
  const [auditStart, setAuditStart] = useState('');
  const [auditEnd, setAuditEnd] = useState('');
  
  const [productionHistory, setProductionHistory] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]); 
  const [selectedJobId, setSelectedJobId] = useState(''); 
  
  const [shiftNotes, setShiftNotes] = useState([]); 
  const [newNoteText, setNewNoteText] = useState(''); 

  const [activeWireTab, setActiveWireTab] = useState('');
  const [activeOrderTab, setActiveOrderTab] = useState('');
  const [dialogConfig, setDialogConfig] = useState(null);

  const showCustomModal = (title, message, type = 'alert', extraData = null) => {
    return new Promise((resolve) => { setDialogConfig({ title, message, type, extraData, resolve }); });
  };

  const fetchData = async (line) => {
    try {
      const historyRes = await fetch(`https://pti-cables-system.onrender.com/api/history/${line}`);
      if (historyRes.ok) setProductionHistory(await historyRes.json());

      const jobRes = await fetch(`https://pti-cables-system.onrender.com/api/jobs/${line}`);
      if (jobRes.ok) {
        const jobData = await jobRes.json();
        setActiveJobs(jobData);
        if (jobData.length > 0 && !selectedJobId) setSelectedJobId(jobData[0].id.toString());
        else if (jobData.length === 0) setSelectedJobId('');
      }
      
      const notesRes = await fetch(`https://pti-cables-system.onrender.com/api/notes/${line}`);
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setShiftNotes(Array.isArray(notesData) ? notesData : []); 
      } else {
        setShiftNotes([]);
      }
    } catch (error) { 
      console.error("Fetch Error:", error); 
    }
  };

  useEffect(() => { if (selectedLine) { setActiveWireTab(''); setActiveOrderTab(''); fetchData(selectedLine); } }, [selectedLine]);

  const historyWireTypes = [...new Set(productionHistory.map(log => log.wire_type))].sort();
  const logsForActiveWire = productionHistory.filter(log => log.wire_type === activeWireTab);
  const orderGroupsForWire = logsForActiveWire.reduce((groups, log) => {
    const key = log.job_id ? `order_${log.job_id}` : 'legacy';
    if (!groups[key]) groups[key] = { id: key, realId: log.job_id, logs: [] };
    groups[key].logs.push(log);
    return groups;
  }, {});
  const orderTabs = Object.values(orderGroupsForWire).sort((a, b) => new Date(b.logs[0].timestamp) - new Date(a.logs[0].timestamp));

  useEffect(() => {
    if (selectedJobId && activeJobs.length > 0) {
      const job = activeJobs.find(j => j.id.toString() === selectedJobId);
      if (job) { setActiveWireTab(job.wire_type); setActiveOrderTab(`order_${job.id}`); }
    } else if (productionHistory.length > 0 && !activeWireTab && historyWireTypes.length > 0) { 
      setActiveWireTab(historyWireTypes[0]); 
    }
  }, [selectedJobId, activeJobs]);

  useEffect(() => { if (activeWireTab && orderTabs.length > 0) { if (!orderTabs.find(t => t.id === activeOrderTab)) setActiveOrderTab(orderTabs[0].id); } }, [activeWireTab, orderTabs.length]);

  useEffect(() => { if (selectedLine) setOperatorName(localStorage.getItem(`draft_operator_${selectedLine}`) || ''); }, [selectedLine]);
  useEffect(() => {
    if (selectedLine && selectedJobId) {
      setAuditStart(localStorage.getItem(`draft_start_${selectedLine}_${selectedJobId}`) || '');
      setAuditEnd(localStorage.getItem(`draft_end_${selectedLine}_${selectedJobId}`) || '');
      setComments(localStorage.getItem(`draft_comments_${selectedLine}_${selectedJobId}`) || '');
    } else { setAuditStart(''); setAuditEnd(''); setComments(''); }
  }, [selectedLine, selectedJobId]);

  const handleOperatorChange = (e) => { setOperatorName(e.target.value); localStorage.setItem(`draft_operator_${selectedLine}`, e.target.value); };
  const handleStartChange = (e) => { setAuditStart(e.target.value); if (selectedJobId) localStorage.setItem(`draft_start_${selectedLine}_${selectedJobId}`, e.target.value); };
  const handleEndChange = (e) => { setAuditEnd(e.target.value); if (selectedJobId) localStorage.setItem(`draft_end_${selectedLine}_${selectedJobId}`, e.target.value); };
  const handleCommentsChange = (e) => { setComments(e.target.value); if (selectedJobId) localStorage.setItem(`draft_comments_${selectedLine}_${selectedJobId}`, e.target.value); };

  const autoFillStart = async () => {
    const currentJob = activeJobs.find(j => j.id.toString() === selectedJobId);
    if (!currentJob) return;
    const jobHistory = productionHistory.filter(log => log.job_id === currentJob.id);
    if (jobHistory.length > 0) {
      const maxAuditEnd = Math.max(...jobHistory.map(log => log.audit_end));
      const nextStart = String(maxAuditEnd + 1);
      setAuditStart(nextStart); localStorage.setItem(`draft_start_${selectedLine}_${selectedJobId}`, nextStart);
    } else { await showCustomModal("Notice", "This is the first unit for this job! No previous number exists.", "alert"); }
  };

  const handlePostNote = async () => {
    if (!newNoteText.trim()) return;
    if (!operatorName.trim()) { await showCustomModal("Missing Name", "Please enter your Operator Name inside the white form so we know who wrote this note.", "alert"); return; }
    
    try {
      const response = await fetch('https://pti-cables-system.onrender.com/api/notes', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ line_name: selectedLine, message: newNoteText, author: `${operatorName} (${getCurrentShift()} Shift)` }) 
      });
      if (response.ok) { setNewNoteText(''); fetchData(selectedLine); }
    } catch (error) { console.error(error); }
  };

  const handleDeleteNote = async (noteId) => {
    const proceed = await showCustomModal("Resolve Note?", "Are you sure you want to remove this sticky note? Only remove it if the issue has been resolved.", "confirm");
    if (!proceed) return;
    try {
      await fetch(`https://pti-cables-system.onrender.com/api/notes/${noteId}`, { method: 'DELETE' });
      fetchData(selectedLine);
    } catch (error) { console.error(error); }
  };

  const currentJob = activeJobs.find(j => j.id.toString() === selectedJobId);
  const isReelJob = currentJob ? currentJob.pallets_needed === 0 : false;
  const jobHistory = currentJob ? productionHistory.filter(log => log.job_id === currentJob.id) : [];
  const completedForJob = currentJob ? (isReelJob ? jobHistory.reduce((sum, log) => sum + log.total_spools, 0) : jobHistory.length) : 0;
  const targetForJob = currentJob ? (isReelJob ? currentJob.spools_per_pallet : currentJob.pallets_needed) : 0;
  const remainingForJob = currentJob ? targetForJob - completedForJob : 0;
  const currentUnitNum = currentJob ? jobHistory.length + 1 : 1;
  const expectedQty = currentJob ? currentJob.spools_per_pallet : 0;

  const submitPallet = async () => {
    if (!operatorName.trim()) { await showCustomModal("Missing Info", "Please enter the Operator's Name.", "alert"); return; }
    if (!auditStart || !auditEnd) { await showCustomModal("Missing Info", "Please enter both Start and End Audit numbers.", "alert"); return; }

    const startNum = Number(auditStart); const endNum = Number(auditEnd); const span = endNum - startNum + 1; 
    if (span <= 0) { await showCustomModal("Invalid Numbers", "The Audit End number must be greater than or equal to the Audit Start number.\nQuantity cannot be 0 or negative.", "alert"); return; }

    if (jobHistory.length > 0) {
      const overlappingRecord = jobHistory.find(log => startNum <= log.audit_end && endNum >= log.audit_start);
      if (overlappingRecord) {
        await showCustomModal("Duplicate Audit Error!", `The numbers you entered overlap with a previously submitted record for this job (Audit ${overlappingRecord.audit_start} to ${overlappingRecord.audit_end}).\n\nPlease enter a range that has not been used yet.`, "alert");
        return; 
      }
    }

    let finalSpools = span;
    let finalComments = comments;

    if (!isReelJob && currentJob && span !== expectedQty) {
      const result = await showCustomModal("Quantity Variance Detected", "The number of labels you scanned does not match the target quantity. Please select a reason for the variance.", "variance", { span: span, target: expectedQty });
      if (result === false) return; 
      finalSpools = result.spoolsMade;
      finalComments = comments.trim() ? `${result.comments} | Gen Notes: ${comments}` : result.comments;
    }

    if (currentJob && remainingForJob <= 0) {
      const proceed = await showCustomModal("Overproduction Warning", `This job only required ${targetForJob} total and is already complete.\n\nDo you want to submit extra production anyway?`, "confirm");
      if (!proceed) return;
    }
    if (isReelJob && finalSpools > remainingForJob && remainingForJob > 0) {
        const proceed = await showCustomModal("Overproduction Warning", `You are submitting ${finalSpools} reels, but only ${remainingForJob} are needed to finish the order.\n\nDo you want to submit anyway?`, "confirm");
        if (!proceed) return;
    }

    const payload = { 
      line_name: selectedLine, job_id: currentJob.id, operator_name: operatorName, wire_type: currentJob.wire_type,
      comments: finalComments, pallet_num: isReelJob ? 0 : currentUnitNum, audit_start: startNum, audit_end: endNum, 
      total_spools: finalSpools, shift: getCurrentShift(), qty_requested: expectedQty 
    };

    try {
      const response = await fetch('https://pti-cables-system.onrender.com/api/pallets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) {
        setAuditStart(''); setAuditEnd(''); setComments('');
        localStorage.removeItem(`draft_start_${selectedLine}_${selectedJobId}`); localStorage.removeItem(`draft_end_${selectedLine}_${selectedJobId}`); localStorage.removeItem(`draft_comments_${selectedLine}_${selectedJobId}`);
        setActiveWireTab(currentJob.wire_type); setActiveOrderTab(`order_${currentJob.id}`);
        fetchData(selectedLine);
      }
    } catch (error) { console.error(error); }
  };

  const handleQuarantine = async () => {
    if (!operatorName.trim()) { await showCustomModal("Missing Info", "Please enter the Operator's Name.", "alert"); return; }
    if (!currentJob) return;

    // Extract standard length from wire_type to pass to modal
    const targetMatch = currentJob.wire_type.match(/(\d+)m$/i);
    const targetLength = targetMatch ? parseInt(targetMatch[1], 10) : 0;

    const result = await showCustomModal("Log Quarantine / Defect Reel", "This wire will NOT be counted in standard production. It will be sent to the Admin desk for review.", "quarantine", { targetLength });
    if (result === false) return;

    const payload = {
      job_id: currentJob.id, line_name: selectedLine, operator_name: operatorName, wire_type: currentJob.wire_type,
      length: result.length, reason: result.reason, shift: getCurrentShift()
    };

    try {
      const response = await fetch('https://pti-cables-system.onrender.com/api/quarantine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) { printQuarantineLabel(payload); }
    } catch (error) { console.error(error); }
  };

  const closeJob = async () => {
    const proceed = await showCustomModal("Close Work Order?", `Are you sure you want to mark the work order for ${currentJob.wire_type} as complete?\n\nIt will disappear from the active list.`, "confirm");
    if (!proceed) return;
    try { await fetch(`https://pti-cables-system.onrender.com/api/jobs/${currentJob.id}/close`, { method: 'POST' }); setSelectedJobId(''); fetchData(selectedLine); } catch (error) { console.error(error); }
  };

  const activeOrderObj = orderTabs.find(t => t.id === activeOrderTab);
  const isHistoryReel = activeWireTab.match(/(\d+)m$/i) && parseInt(activeWireTab.match(/(\d+)m$/i)[1], 10) > 300;

  return (
    <>
      {!selectedLine ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', animation: 'fadeIn 0.4s' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>🏭</div>
            <h2 style={{ color: '#f8fafc', fontWeight: '800', fontSize: '36px', margin: '0 0 12px 0', letterSpacing: '1px' }}>Terminal Login</h2>
            <p style={{ color: '#94a3b8', fontSize: '18px', margin: 0, fontWeight: '500' }}>Select your active machine to begin production logging.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', width: '100%', maxWidth: '1100px' }}>
            {lines.map(line => (
              <button 
                key={line} 
                onClick={() => setSelectedLine(line)} 
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 0 15px rgba(56, 189, 248, 0.2)';
                  e.currentTarget.style.borderColor = '#38bdf8';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.children[0].style.transform = 'scale(1.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)';
                  e.currentTarget.style.borderColor = '#334155';
                  e.currentTarget.style.color = '#cbd5e1';
                  e.currentTarget.children[0].style.transform = 'scale(1)';
                }}
                style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                  padding: '36px 20px', fontSize: '22px', fontWeight: '800', cursor: 'pointer', 
                  backgroundColor: '#1e293b', border: '2px solid #334155', color: '#cbd5e1', 
                  borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                }}>
                <span style={{ fontSize: '42px', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>⚙️</span>
                {line}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ color: '#f8fafc', margin: 0, fontWeight: '500', fontSize: '28px' }}>{selectedLine} <span style={{ color: '#64748b', fontSize: '18px', marginLeft: '12px', fontWeight: '400' }}>Production Dashboard</span></h2>
            <button onClick={() => setSelectedLine(null)} style={{ padding: '8px 16px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: '0.2s' }}>← Switch Machine</button>
          </div>

          <div style={{ display: 'flex', gap: '32px', alignItems: 'stretch', marginBottom: '32px' }}>
            
            {/* COLUMN 1: THE ACTION CENTER */}
            <div style={{ flex: '0 0 450px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {activeJobs.some(j => j.priority === 1) && (
                <div style={{ backgroundColor: '#fef2f2', border: '2px solid #ef4444', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ fontSize: '32px' }}>🚨</div>
                  <div>
                      <h3 style={{ margin: '0 0 4px 0', color: '#b91c1c', fontSize: '16px', fontWeight: '800', textTransform: 'uppercase' }}>Urgent Priority</h3>
                      <p style={{ margin: 0, color: '#7f1d1d', fontSize: '14px', fontWeight: '600' }}>Run <strong>{activeJobs.find(j => j.priority === 1).wire_type}</strong> immediately.</p>
                  </div>
                </div>
              )}

              {/* Data Entry Card */}
              <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                {activeJobs.length === 0 ? (
                  <div style={{ backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', padding: '30px', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>Awaiting Admin Dispatch. No active job found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <div>
                      <label style={STYLES.label}>
                        Operator Name
                        <span style={{marginLeft: '12px', padding: '4px 8px', borderRadius: '4px', backgroundColor: getCurrentShift() === 'Day' ? '#fef3c7' : '#dbeafe', color: getCurrentShift() === 'Day' ? '#b45309' : '#1e40af', fontSize: '10px', fontWeight: '800'}}>
                          {getCurrentShift() === 'Day' ? '☀️ DAY SHIFT' : '🌙 NIGHT SHIFT'}
                        </span>
                      </label>
                      <input type="text" value={operatorName} onChange={handleOperatorChange} style={STYLES.input} placeholder="Enter your name..." />
                    </div>

                    <div style={{ backgroundColor: isReelJob ? '#fff7ed' : '#eff6ff', border: '1px solid', borderColor: isReelJob ? '#fed7aa' : '#bfdbfe', borderRadius: '8px', padding: '16px' }}>
                      <label style={{...STYLES.label, color: isReelJob ? '#9a3412' : '#1e40af'}}>Active Work Order</label>
                      <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '18px', fontWeight: '800', color: isReelJob ? '#9a3412' : '#1e3a8a', backgroundColor: 'white', border: '1px solid', borderColor: isReelJob ? '#fdba74' : '#93c5fd', borderRadius: '6px', outline: 'none', marginBottom: '16px', cursor: 'pointer' }}>
                        {activeJobs.map(job => <option key={job.id} value={job.id}>{job.priority === 1 ? '⭐ ' : ''}{job.wire_type}</option>)}
                      </select>
                      
                      {currentJob && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `1px dashed ${isReelJob ? '#fdba74' : '#93c5fd'}`, paddingTop: '12px' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: isReelJob ? '#9a3412' : '#1e40af', fontWeight: '800', marginBottom: '4px', backgroundColor: isReelJob ? '#ffedd5' : '#dbeafe', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                              Target: {expectedQty} {isReelJob ? 'Reels' : 'Spools'}
                            </div>
                            <div style={{ fontSize: '12px', color: isReelJob ? '#ea580c' : '#3b82f6', fontWeight: '600', marginTop: '4px' }}>({completedForJob} of {targetForJob} total)</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: isReelJob ? '#9a3412' : '#1e40af', fontWeight: '700', textTransform: 'uppercase' }}>Remaining</div>
                            <div style={{ fontSize: '32px', fontWeight: '900', lineHeight: '1', color: remainingForJob <= 0 ? '#10b981' : (isReelJob ? '#c2410c' : '#1e3a8a') }}>{remainingForJob < 0 ? 0 : remainingForJob}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    {currentJob && (
                       <button onClick={closeJob} style={{ padding: '8px', backgroundColor: 'transparent', color: isReelJob ? '#9a3412' : '#1e3a8a', border: `1px solid ${isReelJob ? '#fdba74' : '#93c5fd'}`, fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', transition: '0.2s' }}>Mark Job Complete Manually</button>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                          <label style={{...STYLES.label, margin: 0}}>Audit Start</label>
                          <button onClick={autoFillStart} style={{ fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: '700' }}>Auto-Fill</button>
                        </div>
                        <input type="number" value={auditStart} onChange={handleStartChange} style={STYLES.input} />
                      </div>
                      <div>
                        <label style={STYLES.label}>Audit End</label>
                        <input type="number" value={auditEnd} onChange={handleEndChange} style={STYLES.input} />
                      </div>
                    </div>

                    <div>
                      <label style={STYLES.label}>Comments (Optional)</label>
                      <input type="text" value={comments} onChange={handleCommentsChange} style={STYLES.input} placeholder="Damaged labels, tension issues..." />
                    </div>

                    {/* ONLY SHOW QUARANTINE BUTTON IF MASTER REEL */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                      <button onClick={submitPallet} disabled={!currentJob} style={{ flex: isReelJob ? 2 : 1, padding: '18px', backgroundColor: remainingForJob <= 0 ? '#f59e0b' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', cursor: currentJob ? 'pointer' : 'not-allowed', boxShadow: '0 4px 6px -1px rgba(0,0,0, 0.1)', transition: '0.2s' }}>
                        {isReelJob ? (remainingForJob <= 0 ? 'Submit Extra' : `Submit Reel Log`) : (remainingForJob <= 0 ? 'Submit Extra' : `Submit Pallet ${currentUnitNum}`)}
                      </button>
                      
                      {isReelJob && (
                        <button onClick={handleQuarantine} disabled={!currentJob} style={{ flex: 1, padding: '18px 12px', backgroundColor: '#fff7ed', color: '#ea580c', border: '2px solid #fdba74', borderRadius: '8px', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', cursor: currentJob ? 'pointer' : 'not-allowed', transition: '0.2s', lineHeight: '1.2' }}>
                          Log Odd / Defect Reel
                        </button>
                      )}
                    </div>

                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: THE LIVE LEDGER */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', overflow: 'hidden', height: '650px' }}>
              <div style={{ padding: '20px 24px 10px 24px', backgroundColor: '#0f172a', flexShrink: 0 }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#cbd5e1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>1. Select Wire Master Database</h3>
                <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
                  {historyWireTypes.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '13px' }}>No production history found.</div> : 
                    historyWireTypes.map(wire => (
                      <button key={wire} onClick={() => setActiveWireTab(wire)} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', transition: '0.2s', border: '1px solid', borderColor: activeWireTab === wire ? '#38bdf8' : '#334155', backgroundColor: activeWireTab === wire ? 'rgba(56, 189, 248, 0.1)' : 'transparent', color: activeWireTab === wire ? '#f8fafc' : '#94a3b8' }}>{wire}</button>
                    ))
                  }
                </div>
              </div>

              {activeWireTab && orderTabs.length > 0 && (
                <div className="hide-scrollbar" style={{ padding: '12px 24px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', display: 'flex', gap: '10px', overflowX: 'auto', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginRight: '4px' }}>2. ORDER:</span>
                  {orderTabs.map(tab => {
                    const startDate = formatDate(tab.logs[tab.logs.length - 1].timestamp);
                    const endDate = formatDate(tab.logs[0].timestamp);
                    const dateStr = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
                    return (
                      <button key={tab.id} onClick={() => setActiveOrderTab(tab.id)} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', transition: '0.2s', border: activeOrderTab === tab.id ? '1px solid #0f172a' : '1px solid #cbd5e1', backgroundColor: activeOrderTab === tab.id ? '#1e293b' : '#ffffff', color: activeOrderTab === tab.id ? '#ffffff' : '#475569', boxShadow: activeOrderTab === tab.id ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>
                        {tab.realId ? `Order #${tab.realId}` : 'Legacy Data'} <span style={{ fontWeight: 'normal', opacity: 0.8, marginLeft: '4px' }}>({dateStr})</span>
                      </button>
                    )
                  })}
                </div>
              )}
              <LogBookTable activeOrderObj={activeOrderObj} isHistoryReel={isHistoryReel} />
            </div>

            {/* COLUMN 3: STICKY NOTES */}
            <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', height: '650px' }}>
              <div style={{ backgroundColor: '#fef08a', padding: '20px 16px 12px 16px', position: 'relative', boxShadow: '3px 6px 15px rgba(0,0,0,0.2)', transform: 'rotate(-1deg)', borderBottomRightRadius: '16px', flexShrink: 0 }}>
                 <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', fontSize: '28px', zIndex: 2, filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.3))' }}>📌</div>
                 <textarea 
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePostNote()}
                    placeholder="Write a handoff note..."
                    style={{ width: '100%', height: '60px', backgroundColor: 'transparent', border: 'none', outline: 'none', resize: 'none', color: '#451a03', fontSize: '14px', fontStyle: 'italic', fontWeight: '500', fontFamily: 'sans-serif' }}
                 />
                 <div style={{ textAlign: 'right', marginTop: '4px' }}>
                   <button onClick={handlePostNote} style={{ background: '#d97706', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}>Pin It</button>
                 </div>
              </div>

              <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px 4px 10px 4px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {shiftNotes.map((note, index) => (
                  <div key={note.id} style={{ backgroundColor: index % 2 === 0 ? '#fef9c3' : '#fef08a', padding: '20px 16px 16px 16px', position: 'relative', boxShadow: '3px 6px 15px rgba(0,0,0,0.2)', transform: `rotate(${index % 2 === 0 ? 2 : -1.5}deg)`, borderBottomRightRadius: '16px' }}>
                      <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', fontSize: '28px', zIndex: 2, filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.3))' }}>📌</div>
                      <button onClick={() => handleDeleteNote(note.id)} style={{ position: 'absolute', top: '8px', right: '4px', background: 'none', border: 'none', color: '#b45309', fontSize: '16px', cursor: 'pointer', opacity: 0.5 }} title="Remove Note">✖</button>
                      <p style={{ margin: '8px 0 12px 0', color: '#451a03', fontSize: '14px', fontStyle: 'italic', fontWeight: '500', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.4' }}>{note.message}</p>
                      <div style={{ borderTop: '1px solid rgba(180, 83, 9, 0.2)', paddingTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '800', display: 'block' }}>{note.author}</span>
                        <span style={{ fontSize: '10px', color: '#d97706', fontWeight: '600' }}>{formatDate(note.timestamp)} {formatClockTime(note.timestamp)}</span>
                      </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <ActionModal config={dialogConfig} onClose={() => setDialogConfig(null)} />
    </>
  );
}
