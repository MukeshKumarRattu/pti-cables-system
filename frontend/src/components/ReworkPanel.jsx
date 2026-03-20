import { useState, useEffect } from 'react';

// =========================================================================
// STYLES FOR REWORK PANEL
// =========================================================================
const STYLES = {
  input: { width: '100%', padding: '12px 16px', fontSize: '16px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', boxSizing: 'border-box', outline: 'none', transition: '0.2s' },
  label: { display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  thExcel: { padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#f8fafc', textTransform: 'uppercase', borderBottom: '2px solid #581c87', borderRight: '1px solid #7e22ce', backgroundColor: '#6b21a8', position: 'sticky', top: 0, zIndex: 10, whiteSpace: 'nowrap' },
  tdExcel: { padding: '10px 16px', fontSize: '13px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle' }
};

const formatClockTime = (utcString) => new Date(utcString.endsWith('Z') ? utcString : utcString + 'Z').toLocaleTimeString('en-CA', { timeZone: 'America/Toronto', hour12: false, hour: '2-digit', minute: '2-digit' });
const formatDate = (utcString) => new Date(utcString.endsWith('Z') ? utcString : utcString + 'Z').toLocaleDateString('en-CA', { timeZone: 'America/Toronto', month: 'short', day: 'numeric' });

const getCurrentShift = () => {
  const currentHour = parseInt(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', hour12: false }).format(new Date()), 10);
  return (currentHour >= 7 && currentHour < 19) ? 'Day' : 'Night';
};

export default function ReworkPanel() {
  const [operatorName, setOperatorName] = useState('');
  const [comments, setComments] = useState('');
  const [qtyProduced, setQtyProduced] = useState('');
  
  const [activeJobs, setActiveJobs] = useState([]); 
  const [selectedJobId, setSelectedJobId] = useState(''); 
  const [reworkHistory, setReworkHistory] = useState([]);
  
  const [dialog, setDialog] = useState(null);

  const showCustomModal = (title, message, type = 'alert') => {
    return new Promise((resolve) => {
      setDialog({ title, message, type, onConfirm: () => { setDialog(null); resolve(true); }, onCancel: () => { setDialog(null); resolve(false); } });
    });
  };

  const fetchData = async () => {
    try {
      const jobRes = await fetch(`https://pti-cables-system.onrender.com/api/rework-jobs`);
      if (jobRes.ok) {
        const jobData = await jobRes.json();
        setActiveJobs(jobData);
        if (jobData.length > 0 && !selectedJobId) setSelectedJobId(jobData[0].id.toString());
        else if (jobData.length === 0) setSelectedJobId('');
      }
      
      const historyRes = await fetch(`https://pti-cables-system.onrender.com/api/rework-history`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setReworkHistory(historyData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (error) { 
      console.error("Fetch Error:", error); 
    }
  };

  useEffect(() => { 
    fetchData(); 
    setOperatorName(localStorage.getItem('draft_rework_operator') || '');
  }, []);

  const handleOperatorChange = (e) => { 
    setOperatorName(e.target.value); 
    localStorage.setItem('draft_rework_operator', e.target.value); 
  };

  // Job Progress Calculations
  const currentJob = activeJobs.find(j => j.id.toString() === selectedJobId);
  const jobHistory = currentJob ? reworkHistory.filter(log => log.job_id === currentJob.id) : [];
  const completedForJob = jobHistory.reduce((sum, log) => sum + log.qty_produced, 0);
  const targetForJob = currentJob ? currentJob.target_qty : 0;
  const remainingForJob = currentJob ? targetForJob - completedForJob : 0;

  const submitRework = async () => {
    if (!operatorName.trim()) { await showCustomModal("Missing Info", "Please enter the Operator's Name.", "alert"); return; }
    if (!qtyProduced || Number(qtyProduced) <= 0) { await showCustomModal("Invalid Quantity", "Please enter a valid Quantity Produced.", "alert"); return; }

    const qty = Number(qtyProduced);

    if (currentJob && remainingForJob <= 0) {
      const proceed = await showCustomModal("Overproduction Warning", `This rework job already met its target of ${targetForJob}.\n\nDo you want to submit extra production anyway?`, "confirm");
      if (!proceed) return;
    } else if (currentJob && qty > remainingForJob) {
      const proceed = await showCustomModal("Overproduction Warning", `You are submitting ${qty} units, but only ${remainingForJob} are needed.\n\nDo you want to submit anyway?`, "confirm");
      if (!proceed) return;
    }

    const payload = { 
      job_id: currentJob.id, 
      operator_name: operatorName, 
      source_wire: currentJob.source_wire,
      instruction: currentJob.instruction,
      qty_produced: qty, 
      comments: comments,
      shift: getCurrentShift() 
    };

    try {
      const response = await fetch('https://pti-cables-system.onrender.com/api/rework-logs', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
      });
      if (response.ok) {
        setQtyProduced(''); setComments('');
        fetchData();
      }
    } catch (error) { console.error(error); }
  };

  const closeJob = async () => {
    const proceed = await showCustomModal("Close Job?", `Are you sure you want to mark this rework job as complete?`, "confirm");
    if (!proceed) return;
    try { 
      await fetch(`https://pti-cables-system.onrender.com/api/rework-jobs/${currentJob.id}/close`, { method: 'POST' }); 
      setSelectedJobId(''); 
      fetchData(); 
    } catch (error) { console.error(error); }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: '#f8fafc', margin: 0, fontWeight: '800', fontSize: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>✂️</span> Rework & Custom Cuts Station
        </h2>
      </div>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'stretch', marginBottom: '32px' }}>
        
        {/* COLUMN 1: THE ACTION CENTER */}
        <div style={{ flex: '0 0 450px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', borderTop: '6px solid #9333ea' }}>
            {activeJobs.length === 0 ? (
              <div style={{ backgroundColor: '#f3e8ff', border: '1px dashed #d8b4fe', padding: '40px 20px', borderRadius: '8px', textAlign: 'center', color: '#7e22ce', fontWeight: '700' }}>
                No active rework jobs currently assigned.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div>
                  <label style={STYLES.label}>
                    Operator Name
                    <span style={{marginLeft: '12px', padding: '4px 8px', borderRadius: '4px', backgroundColor: getCurrentShift() === 'Day' ? '#fef3c7' : '#dbeafe', color: getCurrentShift() === 'Day' ? '#b45309' : '#1e40af', fontSize: '10px', fontWeight: '800'}}>
                      {getCurrentShift() === 'Day' ? '☀️ DAY' : '🌙 NIGHT'}
                    </span>
                  </label>
                  <input type="text" value={operatorName} onChange={handleOperatorChange} style={STYLES.input} placeholder="Enter your name..." />
                </div>

                {/* ACTIVE REWORK JOB SELECTION */}
                <div style={{ backgroundColor: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: '8px', padding: '16px' }}>
                  <label style={{...STYLES.label, color: '#7e22ce'}}>Active Rework Order</label>
                  <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '16px', fontWeight: '800', color: '#581c87', backgroundColor: 'white', border: '1px solid #d8b4fe', borderRadius: '6px', outline: 'none', marginBottom: '16px', cursor: 'pointer' }}>
                    {activeJobs.map(job => <option key={job.id} value={job.id}>{job.source_wire}</option>)}
                  </select>
                  
                  {currentJob && (
                    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '6px', border: '1px dashed #c084fc' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#9333ea', textTransform: 'uppercase', marginBottom: '4px' }}>Admin Instructions:</div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{currentJob.instruction}</div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `1px dashed #d8b4fe`, paddingTop: '12px', marginTop: '12px' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#7e22ce', fontWeight: '800', marginBottom: '4px', backgroundColor: '#f3e8ff', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                              Target Goal: {targetForJob} units
                            </div>
                            <div style={{ fontSize: '12px', color: '#9333ea', fontWeight: '600', marginTop: '4px' }}>({completedForJob} completed)</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: '#7e22ce', fontWeight: '700', textTransform: 'uppercase' }}>Remaining</div>
                            <div style={{ fontSize: '32px', fontWeight: '900', lineHeight: '1', color: remainingForJob <= 0 ? '#10b981' : '#581c87' }}>{remainingForJob < 0 ? 0 : remainingForJob}</div>
                          </div>
                      </div>
                    </div>
                  )}
                </div>

                {currentJob && (
                   <button onClick={closeJob} style={{ padding: '8px', backgroundColor: 'transparent', color: '#9333ea', border: '1px solid #d8b4fe', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', transition: '0.2s' }}>Mark Rework Job Complete</button>
                )}

                <div>
                  <label style={STYLES.label}>Quantity Produced <span style={{color: '#9333ea'}}>(This Entry)</span></label>
                  <input type="number" value={qtyProduced} onChange={(e) => setQtyProduced(e.target.value)} style={{...STYLES.input, fontSize: '20px', fontWeight: 'bold'}} placeholder="e.g. 2" />
                </div>

                <div>
                  <label style={STYLES.label}>Comments (Optional)</label>
                  <input type="text" value={comments} onChange={(e) => setComments(e.target.value)} style={STYLES.input} placeholder="Scrap details, issues..." />
                </div>

                <button onClick={submitRework} disabled={!currentJob} style={{ width: '100%', padding: '18px', marginTop: '8px', backgroundColor: remainingForJob <= 0 ? '#f59e0b' : '#9333ea', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', cursor: currentJob ? 'pointer' : 'not-allowed', boxShadow: '0 4px 6px -1px rgba(147, 51, 234, 0.3)', transition: '0.2s' }}>
                  {remainingForJob <= 0 ? 'Submit Extra Production' : 'Submit Rework Log'}
                </button>

              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: THE REWORK LEDGER */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', overflow: 'hidden', height: '650px' }}>
          <div style={{ padding: '20px 24px', backgroundColor: '#3b0764', flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#e9d5ff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Rework History Ledger</h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={STYLES.thExcel}>Date / Time</th>
                  <th style={STYLES.thExcel}>Operator</th>
                  <th style={STYLES.thExcel}>Original Wire</th>
                  <th style={STYLES.thExcel}>Task Completed</th>
                  <th style={{...STYLES.thExcel, textAlign: 'center'}}>Qty Made</th>
                  <th style={{...STYLES.thExcel, borderRight: 'none'}}>Comments</th>
                </tr>
              </thead>
              <tbody>
                {reworkHistory.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>No rework history logged yet.</td></tr>
                ) : (
                  reworkHistory.map((row, index) => (
                    <tr key={row.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={STYLES.tdExcel}>
                        <div style={{ fontWeight: '800' }}>{formatDate(row.timestamp)}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{formatClockTime(row.timestamp)}</div>
                      </td>
                      <td style={{...STYLES.tdExcel, fontWeight: '700', color: '#7e22ce'}}>{row.operator_name}</td>
                      <td style={{...STYLES.tdExcel, fontWeight: '800', color: '#0f172a'}}>{row.source_wire}</td>
                      <td style={{...STYLES.tdExcel, fontWeight: '600', color: '#475569'}}>{row.instruction}</td>
                      <td style={{...STYLES.tdExcel, fontWeight: '900', color: '#059669', textAlign: 'center', fontSize: '16px'}}>{row.qty_produced}</td>
                      <td style={{...STYLES.tdExcel, borderRight: 'none', color: '#64748b', fontStyle: 'italic'}}>{row.comments || '--'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {dialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{dialog.type === 'alert' ? '🛑' : '⚠️'}</div>
            <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '22px', fontWeight: '800' }}>{dialog.title}</h3>
            <p style={{ margin: '0 0 28px 0', color: '#475569', fontSize: '16px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{dialog.message}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {dialog.type === 'confirm' && (
                <button onClick={dialog.onCancel} style={{ padding: '12px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', flex: 1, transition: '0.2s' }}>Cancel</button>
              )}
              <button onClick={dialog.onConfirm} style={{ padding: '12px 20px', backgroundColor: dialog.type === 'alert' ? '#3b82f6' : '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', flex: 1, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: '0.2s' }}>
                {dialog.type === 'alert' ? 'Understood' : 'Yes, Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
