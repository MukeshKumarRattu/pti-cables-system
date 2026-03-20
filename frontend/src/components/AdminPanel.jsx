import { useState, useEffect, useRef } from 'react';

const TYPE_OPTIONS = ["NMD90", "NMWU", "T90", "RW90", "RWU90", "TWU", "TRACER WIRE", "BARE COPPER"];
const SIZE_OPTIONS = [
  "14/2", "14/3", "12/2", "12/3", "10/2", "10/3", "8/2", "8/3", "6/2", "6/3", "4/3", 
  "16 AWG", "14 AWG", "12 AWG", "10 AWG", "8 AWG", "6 AWG", "4 AWG", "3 AWG", "2 AWG", "1/0 AWG", "2/0 AWG", "3/0 AWG", "4/0 AWG",
  "14/19", "12/19", "10/19", "8/19", "6/19", "4/19", "3/19", "2/19",
  "14/7", "12/7", "10/7", "8/7", "6/7", "4/7", "3/7", "2/7", "1/7"
];
const CONDUCTOR_OPTIONS = ["N/A", "Solid", "Stranded", "Coils"];
const COLOR_OPTIONS = ["None", "Red", "Black", "White", "Blue", "Green", "Yellow", "Brown", "Orange", "Cyan", "Grey", "Pink", "Purple"];

export default function AdminPanel({ lines }) {
  const safeLines = Array.isArray(lines) && lines.length > 0 ? lines : Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`);

  const leftColumnRef = useRef(null);
  const [syncedHeight, setSyncedHeight] = useState('700px'); 

  const [inventory, setInventory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [buildType, setBuildType] = useState(TYPE_OPTIONS[0]);
  const [buildSize, setBuildSize] = useState(SIZE_OPTIONS[0]);
  const [buildConductor, setBuildConductor] = useState(CONDUCTOR_OPTIONS[0]);
  const [buildColor, setBuildColor] = useState(COLOR_OPTIONS[0]);
  const [buildLength, setBuildLength] = useState('');

  const [adminLine, setAdminLine] = useState(safeLines[0]);
  const [wireType, setWireType] = useState('');
  const [palletsNeeded, setPalletsNeeded] = useState('');
  const [spoolsPerPallet, setSpoolsPerPallet] = useState('');
  const [targetReels, setTargetReels] = useState('');

  const [reworkWire, setReworkWire] = useState('');
  const [reworkInstruction, setReworkInstruction] = useState('');
  const [reworkTargetQty, setReworkTargetQty] = useState('');

  const [allActiveJobs, setAllActiveJobs] = useState([]);
  const [activeReworkJobs, setActiveReworkJobs] = useState([]); 
  const [activeQuarantine, setActiveQuarantine] = useState([]); 

  const [activeOrderTab, setActiveOrderTab] = useState('Production'); 
  
  const [completedJobs, setCompletedJobs] = useState([]); 
  const [allPallets, setAllPallets] = useState([]);
  
  const [closedReworkJobs, setClosedReworkJobs] = useState([]);
  const [reworkHistory, setReworkHistory] = useState([]);
  const [completedTab, setCompletedTab] = useState(safeLines[0]); 
  
  const [dialog, setDialog] = useState(null);
  const [qReworkModal, setQReworkModal] = useState(null); 

  const [completedPage, setCompletedPage] = useState(1);
  const COMPLETED_PER_PAGE = 15;

  const showCustomModal = (title, message, type = 'alert') => {
    return new Promise((resolve) => {
      setDialog({ title, message, type, onConfirm: () => { setDialog(null); resolve(true); }, onCancel: () => { setDialog(null); resolve(false); } });
    });
  };

  const isReelJob = (wireName) => {
    if (!wireName) return false;
    const match = wireName.match(/(\d+)m$/i);
    return match ? parseInt(match[1], 10) > 300 : false;
  };
  const isCurrentlyReel = isReelJob(wireType);

  const fetchAdminData = async () => {
    try {
      const invRes = await fetch('https://pti-cables-system.onrender.com/api/custom-wires'); 
      const invData = await invRes.json();
      setInventory(Array.isArray(invData) ? invData : []);
      
      const jobsRes = await fetch('https://pti-cables-system.onrender.com/api/jobs'); 
      const jobsData = await jobsRes.json();
      setAllActiveJobs(Array.isArray(jobsData) ? jobsData : []);

      const reworkRes = await fetch('https://pti-cables-system.onrender.com/api/rework-jobs');
      const reworkData = await reworkRes.json();
      setActiveReworkJobs(Array.isArray(reworkData) ? reworkData : []);

      const quarRes = await fetch('https://pti-cables-system.onrender.com/api/quarantine');
      const quarData = await quarRes.json();
      setActiveQuarantine(Array.isArray(quarData) ? quarData : []);
      
      const compRes = await fetch('https://pti-cables-system.onrender.com/api/jobs/closed'); 
      const compData = await compRes.json();
      setCompletedJobs(Array.isArray(compData) ? compData : []); 
      
      const palletsRes = await fetch('https://pti-cables-system.onrender.com/api/history'); 
      const palletsData = await palletsRes.json();
      setAllPallets(Array.isArray(palletsData) ? palletsData : []);
      
      const compReworkRes = await fetch('https://pti-cables-system.onrender.com/api/rework-jobs/closed'); 
      const compReworkData = await compReworkRes.json();
      setClosedReworkJobs(Array.isArray(compReworkData) ? compReworkData : []); 
      
      const reworkHistRes = await fetch('https://pti-cables-system.onrender.com/api/rework-history'); 
      const reworkHistData = await reworkHistRes.json();
      setReworkHistory(Array.isArray(reworkHistData) ? reworkHistData : []);

    } catch (error) { 
      console.error("Could not load admin data:", error); 
    }
  };

  useEffect(() => { 
    fetchAdminData(); 
    const interval = setInterval(fetchAdminData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setCompletedPage(1); }, [completedTab]);

  useEffect(() => {
    if (!leftColumnRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setSyncedHeight(`${entry.contentRect.height}px`);
      }
    });
    resizeObserver.observe(leftColumnRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const adjustJobTarget = async (job, increment) => {
    const isReel = job.pallets_needed === 0;
    const currentTarget = isReel ? job.spools_per_pallet : job.pallets_needed;
    const newTarget = currentTarget + increment;

    if (newTarget < 1) {
      await showCustomModal("Minimum Target Reached", "The target cannot be set to 0.", "alert");
      return;
    }
    try {
      await fetch(`https://pti-cables-system.onrender.com/api/jobs/${job.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_amount: newTarget }) });
      fetchAdminData();
    } catch (error) {}
  };

  const handleTogglePriority = async (jobId) => {
    try { await fetch(`https://pti-cables-system.onrender.com/api/jobs/${jobId}/priority`, { method: 'PUT' }); fetchAdminData(); } catch (error) {}
  };

  const handleCancelJob = async (jobId, lineName, wire) => {
    const proceed = await showCustomModal("Cancel Work Order?", `Are you sure you want to cancel the order for ${wire} on ${lineName}?`, "confirm");
    if (!proceed) return;
    try { await fetch(`https://pti-cables-system.onrender.com/api/jobs/${jobId}`, { method: 'DELETE' }); fetchAdminData(); } catch (error) {}
  };

  const handleCancelReworkJob = async (jobId, wire) => {
    const proceed = await showCustomModal("Cancel Rework Order?", `Are you sure you want to cancel the rework order for ${wire}?`, "confirm");
    if (!proceed) return;
    try { await fetch(`https://pti-cables-system.onrender.com/api/rework-jobs/${jobId}`, { method: 'DELETE' }); fetchAdminData(); } catch (error) {}
  };

  const handleScrapQuarantine = async (qId) => {
    const proceed = await showCustomModal("Scrap Wire?", "Are you sure you want to send this wire to the Rework Station to be physically scrapped and processed?", "confirm");
    if (!proceed) return;
    try {
      await fetch(`https://pti-cables-system.onrender.com/api/quarantine/${qId}/scrap`, { method: 'POST' });
      setActiveOrderTab('Rework'); 
      fetchAdminData();
    } catch (error) {}
  };

  const submitQuarantineToRework = async () => {
    if (!qReworkModal.instruction || !qReworkModal.target_qty) return;
    try {
      await fetch(`https://pti-cables-system.onrender.com/api/quarantine/${qReworkModal.id}/rework`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ instruction: qReworkModal.instruction, target_qty: Number(qReworkModal.target_qty) }) 
      });
      setQReworkModal(null);
      setActiveOrderTab('Rework');
      fetchAdminData();
    } catch (error) {}
  };

  const handleShipQuarantine = async (qId, length) => {
    const proceed = await showCustomModal("Ship Odd Length Reel?", `Are you sure you want to pass this ${length} reel directly to Shipping?\n\nIt will be removed from Quarantine and officially logged into the Production Ledger.`, "confirm");
    if (!proceed) return;
    try {
      await fetch(`https://pti-cables-system.onrender.com/api/quarantine/${qId}/ship`, { method: 'POST' });
      fetchAdminData();
    } catch (error) {}
  };

  const handleAddNewWire = async () => {
    if (!buildLength.trim()) { await showCustomModal("Missing Info", "Please enter a wire length.", "alert"); return; }
    const parts = [buildSize, buildType];
    if (buildConductor !== "N/A") parts.push(buildConductor.toUpperCase());
    if (buildColor !== "None") parts.push(buildColor.toUpperCase());
    parts.push(buildLength.trim());
    const finalWireName = parts.join(' ');

    try {
      const response = await fetch('https://pti-cables-system.onrender.com/api/custom-wires', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: finalWireName }) });
      if (response.ok) {
        setWireType(finalWireName); setBuildType(TYPE_OPTIONS[0]); setBuildSize(SIZE_OPTIONS[0]); setBuildConductor(CONDUCTOR_OPTIONS[0]); setBuildColor(COLOR_OPTIONS[0]); setBuildLength('');
        setIsModalOpen(false); fetchAdminData();
      }
    } catch (error) {}
  };

  const handleDeleteWire = async () => {
    if (!wireType) return;
    const proceed = await showCustomModal("Delete Wire Type?", `Permanently delete "${wireType}"?`, "confirm");
    if (!proceed) return;
    try {
      const response = await fetch(`https://pti-cables-system.onrender.com/api/custom-wires?name=${encodeURIComponent(wireType)}`, { method: 'DELETE' });
      if (response.ok) { setWireType(''); fetchAdminData(); }
    } catch (error) {}
  };

  const dispatchJob = async () => {
    if (!wireType) { await showCustomModal("Missing Info", "Please select a wire type.", "alert"); return; }
    
    let payload;
    if (isCurrentlyReel) {
      if (Number(targetReels) <= 0) { await showCustomModal("Invalid Input", "Target Reels must be > 0.", "alert"); return; }
      payload = { line_name: adminLine, wire_type: wireType, pallets_needed: 0, spools_per_pallet: Number(targetReels) };
    } else {
      if (!palletsNeeded || !spoolsPerPallet) { await showCustomModal("Missing Info", "Please fill out details.", "alert"); return; }
      payload = { line_name: adminLine, wire_type: wireType, pallets_needed: Number(palletsNeeded), spools_per_pallet: Number(spoolsPerPallet) };
    }

    try {
      const response = await fetch('https://pti-cables-system.onrender.com/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) { 
        setWireType(''); setPalletsNeeded(''); setSpoolsPerPallet(''); setTargetReels(''); 
        setActiveOrderTab('Production'); 
        fetchAdminData(); 
      }
    } catch (error) {}
  };

  const dispatchReworkJob = async () => {
    if (!reworkWire || !reworkInstruction || !reworkTargetQty) {
      await showCustomModal("Missing Info", "Please fill out all Rework details.", "alert"); return;
    }
    const payload = { source_wire: reworkWire, instruction: reworkInstruction, target_qty: Number(reworkTargetQty) };
    try {
      const response = await fetch('https://pti-cables-system.onrender.com/api/rework-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) { 
        setReworkWire(''); setReworkInstruction(''); setReworkTargetQty(''); 
        setActiveOrderTab('Rework'); 
        fetchAdminData(); 
        await showCustomModal("Success", `Rework job dispatched!`, "alert");
      }
    } catch (error) {}
  };

  const now = new Date();
  let prodStart = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
  if (prodStart.getHours() < 7) { prodStart.setDate(prodStart.getDate() - 1); } 
  prodStart.setHours(7, 0, 0, 0); 
  const prodStartTime = prodStart.getTime();

  const calcStats = (logs) => {
    if (!logs || logs.length === 0) return null;
    const spools = logs.reduce((sum, p) => sum + (p.total_spools || 0), 0);
    const pallets = logs.length;
    const times = logs.map(p => new Date(p.timestamp.endsWith('Z') ? p.timestamp : p.timestamp + 'Z').getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    let activeHours = (maxTime - minTime) / (1000 * 60 * 60);
    if (activeHours < 1) activeHours = 1; 
    return { pallets, spools, avgPalletsPerHour: (pallets / activeHours).toFixed(1), avgSpoolsPerHour: Math.round(spools / activeHours) };
  };

  const liveStats = safeLines.map(line => {
    const currentShiftLogs = allPallets.filter(p => {
      if (p.line_name !== line) return false;
      const pTime = new Date(p.timestamp.endsWith('Z') ? p.timestamp : p.timestamp + 'Z').getTime();
      return pTime >= prodStartTime;
    });
    const dayLogs = currentShiftLogs.filter(p => p.shift === 'Day');
    const nightLogs = currentShiftLogs.filter(p => p.shift === 'Night');
    return { line, day: calcStats(dayLogs), night: calcStats(nightLogs), logsCount: currentShiftLogs.length };
  });

  const isReworkTab = completedTab === 'Rework';
  const filteredCompletedJobs = isReworkTab 
    ? closedReworkJobs 
    : completedJobs.filter(j => j.line_name === completedTab);

  const totalCompletedPages = Math.max(1, Math.ceil(filteredCompletedJobs.length / COMPLETED_PER_PAGE));
  const displayedCompletedJobs = filteredCompletedJobs.slice((completedPage - 1) * COMPLETED_PER_PAGE, completedPage * COMPLETED_PER_PAGE);
  const completedTabColor = isReworkTab ? '#9333ea' : '#3b82f6';

  const inputStyle = { width: '100%', padding: '10px 14px', fontSize: '14px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const thStyle = { padding: '8px 12px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #cbd5e1', textAlign: 'left', backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 10 };
  const tdStyle = { padding: '4px 12px', fontSize: '13px', color: '#0f172a', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', textAlign: 'left', verticalAlign: 'middle', whiteSpace: 'nowrap', height: '42px' };
  const stepperBtnStyle = { padding: '2px 8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '900', fontSize: '12px', color: '#334155' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.3s' }}>
      
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* --- COLUMN 1 --- */}
        <div ref={leftColumnRef} style={{ flex: '0 0 380px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px' }}>
               <div style={{ fontSize: '20px' }}>⚙️</div>
               <h2 style={{ margin: 0, color: '#0f172a', fontWeight: '800', fontSize: '18px' }}>Job Dispatch Hub</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><label style={labelStyle}>Target Machine</label><select value={adminLine} onChange={(e) => setAdminLine(e.target.value)} style={inputStyle}>{safeLines.map(l => <option key={l}>{l}</option>)}</select></div>
              <div>
                  <label style={labelStyle}>Wire Type / SKU</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select value={wireType} onChange={(e) => setWireType(e.target.value)} style={{ flex: 1, ...inputStyle }}><option value="">-- Select Wire Type --</option>{inventory.map(wire => <option key={wire} value={wire}>{wire}</option>)}</select>
                    <button onClick={() => setIsModalOpen(true)} title="Build Custom Wire" style={{ padding: '0 12px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                    <button onClick={handleDeleteWire} title="Delete Selected Wire" style={{ padding: '0 12px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}>🗑️</button>
                  </div>
              </div>
              {isCurrentlyReel ? (
                <div style={{ padding: '12px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '6px' }}>
                    <label style={{...labelStyle, color: '#c2410c'}}>Total Master Reels Needed</label>
                    <input type="number" value={targetReels} onChange={(e) => setTargetReels(e.target.value)} placeholder="e.g. 15" style={inputStyle} />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}><label style={labelStyle}>Total Pallets</label><input type="number" value={palletsNeeded} onChange={(e) => setPalletsNeeded(e.target.value)} placeholder="e.g. 5" style={inputStyle} /></div>
                  <div style={{ flex: 1 }}><label style={labelStyle}>Spools / Pallet</label><input type="number" value={spoolsPerPallet} onChange={(e) => setSpoolsPerPallet(e.target.value)} placeholder="e.g. 100" style={inputStyle} /></div>
                </div>
              )}
              <button onClick={dispatchJob} style={{ marginTop: '4px', padding: '14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)', transition: '0.2s' }}>DISPATCH JOB</button>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', borderTop: '5px solid #9333ea' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #f3e8ff', paddingBottom: '12px', marginBottom: '20px' }}>
               <div style={{ fontSize: '20px' }}>✂️</div>
               <h2 style={{ margin: 0, color: '#581c87', fontWeight: '800', fontSize: '18px' }}>Rework Dispatch</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                  <label style={{...labelStyle, color: '#6b21a8'}}>Original Wire Source</label>
                  <select value={reworkWire} onChange={(e) => setReworkWire(e.target.value)} style={{ ...inputStyle, border: '1px solid #d8b4fe' }}>
                    <option value="">-- Select Wire Type --</option>
                    {inventory.map(wire => <option key={wire} value={wire}>{wire}</option>)}
                  </select>
              </div>
              <div>
                  <label style={{...labelStyle, color: '#6b21a8'}}>Instructions</label>
                  <input type="text" value={reworkInstruction} onChange={(e) => setReworkInstruction(e.target.value)} placeholder="e.g. Cut 150m spool into 2 x 75m" style={{ ...inputStyle, border: '1px solid #d8b4fe' }} />
              </div>
              <div>
                  <label style={{...labelStyle, color: '#6b21a8'}}>Target Goal (Qty)</label>
                  <input type="number" value={reworkTargetQty} onChange={(e) => setReworkTargetQty(e.target.value)} placeholder="e.g. 5" style={{ ...inputStyle, border: '1px solid #d8b4fe' }} />
              </div>
              <button onClick={dispatchReworkJob} style={{ marginTop: '4px', padding: '14px', backgroundColor: '#9333ea', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(147, 51, 234, 0.3)', transition: '0.2s' }}>DISPATCH REWORK</button>
            </div>
          </div>
        </div>

        {/* --- COLUMN 2: LIVE AVERAGES --- */}
        <div style={{ flex: '0 0 380px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', height: syncedHeight }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📊</span> Current Production Averages
            </h3>
          </div>
          
          <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {liveStats.map(stat => (
              <div key={stat.line} style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px', borderTop: stat.logsCount > 0 ? '4px solid #10b981' : '4px solid #cbd5e1', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '14px', fontWeight: '800' }}>{stat.line}</h3>
                {stat.logsCount === 0 ? (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>Awaiting data for today...</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#f59e0b', marginBottom: '6px' }}>☀️ DAY SHIFT</div>
                      {stat.day ? (
                        <>
                          <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>{stat.day.pallets} <span style={{fontSize:'10px', fontWeight:'600', color:'#64748b'}}>Pallets</span></div>
                          <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px' }}>({stat.day.spools} Spools)</div>
                          <div style={{ paddingTop: '6px', borderTop: '1px dashed #cbd5e1' }}>
                            <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Avg Pace</div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#059669' }}>{stat.day.avgPalletsPerHour} <span style={{fontSize:'9px', color: '#64748b'}}>Pallets/hr</span></div>
                          </div>
                        </>
                      ) : (<div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>No data</div>)}
                    </div>
                    <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#38bdf8', marginBottom: '6px' }}>🌙 NIGHT SHIFT</div>
                      {stat.night ? (
                        <>
                          <div style={{ fontSize: '16px', fontWeight: '900', color: '#f8fafc' }}>{stat.night.pallets} <span style={{fontSize:'10px', fontWeight:'600', color:'#94a3b8'}}>Pallets</span></div>
                          <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '8px' }}>({stat.night.spools} Spools)</div>
                          <div style={{ paddingTop: '6px', borderTop: '1px dashed #334155' }}>
                            <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Avg Pace</div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#34d399' }}>{stat.night.avgPalletsPerHour} <span style={{fontSize:'9px', color: '#94a3b8'}}>Pallets/hr</span></div>
                          </div>
                        </>
                      ) : (<div style={{ fontSize: '10px', color: '#475569', fontStyle: 'italic' }}>No data</div>)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* --- COLUMN 3: TABBED ACTIVE WORK ORDERS --- */}
        <div style={{ flex: '1 1 500px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', height: syncedHeight }}>
          
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
            <button 
              onClick={() => setActiveOrderTab('Production')} 
              style={{ flex: 1, padding: '18px 16px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', border: 'none', borderBottom: activeOrderTab === 'Production' ? '3px solid #3b82f6' : '3px solid transparent', backgroundColor: activeOrderTab === 'Production' ? '#ffffff' : 'transparent', color: activeOrderTab === 'Production' ? '#1e3a8a' : '#64748b', transition: '0.2s', borderRadius: '12px 0 0 0' }}>
              🏭 Production Orders
            </button>
            <button 
              onClick={() => setActiveOrderTab('Rework')} 
              style={{ flex: 1, padding: '18px 16px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', border: 'none', borderBottom: activeOrderTab === 'Rework' ? '3px solid #9333ea' : '3px solid transparent', backgroundColor: activeOrderTab === 'Rework' ? '#ffffff' : 'transparent', color: activeOrderTab === 'Rework' ? '#581c87' : '#64748b', transition: '0.2s', borderRadius: '0 0 0 0' }}>
              ✂️ Rework Orders
            </button>
            <button 
              onClick={() => setActiveOrderTab('Quarantine')} 
              style={{ flex: 1, padding: '18px 16px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', border: 'none', borderBottom: activeOrderTab === 'Quarantine' ? '3px solid #ea580c' : '3px solid transparent', backgroundColor: activeOrderTab === 'Quarantine' ? '#ffffff' : 'transparent', color: activeOrderTab === 'Quarantine' ? '#c2410c' : '#64748b', transition: '0.2s', borderRadius: '0 12px 0 0' }}>
              ⚠️ Quarantine {activeQuarantine.length > 0 && <span style={{backgroundColor: '#ea580c', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '11px', marginLeft: '6px'}}>{activeQuarantine.length}</span>}
            </button>
          </div>
          
          <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
            
            {/* TAB: PRODUCTION */}
            {activeOrderTab === 'Production' && (
              allActiveJobs.length === 0 ? <div style={{ padding: '60px 40px', textAlign: 'center', color: '#94a3b8', fontWeight: '500' }}>No active production jobs.</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
                  <thead>
                    <tr>
                      <th style={{...thStyle, textAlign: 'center', width: '110px'}}>Status</th>
                      <th style={thStyle}>Machine</th>
                      <th style={thStyle}>Wire Product</th>
                      <th style={thStyle}>Target</th>
                      <th style={{...thStyle, textAlign: 'right'}}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allActiveJobs.map((job, index) => {
                      const isReel = job.pallets_needed === 0;
                      const jobLogs = allPallets.filter(p => p.job_id === job.id);
                      const inProgress = jobLogs.length > 0;
                      
                      return (
                        <tr key={job.id} style={{ backgroundColor: job.priority === 1 ? '#fefce8' : (index % 2 === 0 ? '#ffffff' : '#f8fafc'), transition: '0.2s' }}>
                          <td style={{...tdStyle, textAlign: 'center'}}>
                             {inProgress ? (
                               <span style={{ backgroundColor: '#dcfce7', color: '#059669', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' }}>⏳ IN PROGRESS</span>
                             ) : (
                               <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' }}>⏸️ QUEUED</span>
                             )}
                          </td>
                          <td style={{...tdStyle, fontWeight: '800', color: '#1e3a8a'}}>{job.line_name}</td>
                          <td style={{...tdStyle, fontWeight: '700', color: '#0f172a'}}>
                            {job.priority === 1 && <span style={{backgroundColor: '#fef08a', color: '#b45309', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', marginRight: '8px', fontWeight: '800', letterSpacing: '0.5px'}}>⭐ URGENT</span>}
                            {job.wire_type}
                          </td>
                          <td style={{...tdStyle, color: isReel ? '#ea580c' : '#334155'}}>
                            {isReel ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold' }}>
                                <span>{job.spools_per_pallet} Reels</span>
                                <div style={{display:'flex', gap:'4px'}}>
                                  <button onClick={() => adjustJobTarget(job, -1)} style={stepperBtnStyle}>-</button>
                                  <button onClick={() => adjustJobTarget(job, 1)} style={stepperBtnStyle}>+</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>{job.pallets_needed} Pallets <span style={{fontSize:'11px', color:'#64748b'}}>({job.spools_per_pallet}/pl)</span></span>
                                <div style={{display:'flex', gap:'4px'}}>
                                  <button onClick={() => adjustJobTarget(job, -1)} style={stepperBtnStyle}>-</button>
                                  <button onClick={() => adjustJobTarget(job, 1)} style={stepperBtnStyle}>+</button>
                                </div>
                              </div>
                            )}
                          </td>
                          <td style={{...tdStyle, textAlign: 'right'}}>
                            <button onClick={() => handleTogglePriority(job.id)} style={{ padding: '6px 10px', backgroundColor: job.priority === 1 ? '#fef08a' : '#f8fafc', color: job.priority === 1 ? '#b45309' : '#64748b', border: `1px solid ${job.priority === 1 ? '#fde047' : '#cbd5e1'}`, borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', marginRight: '6px', transition: '0.2s' }}>
                              {job.priority === 1 ? 'Demote' : '⭐ Priority'}
                            </button>
                            <button onClick={() => handleCancelJob(job.id, job.line_name, job.wire_type)} style={{ padding: '6px 10px', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: '0.2s' }}>Cancel</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            )}

            {/* TAB: REWORK */}
            {activeOrderTab === 'Rework' && (
              activeReworkJobs.length === 0 ? <div style={{ padding: '60px 40px', textAlign: 'center', color: '#94a3b8', fontWeight: '500' }}>No active rework jobs currently dispatched.</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th style={{...thStyle, textAlign: 'center', width: '110px'}}>Status</th>
                      <th style={thStyle}>Original Wire</th>
                      <th style={thStyle}>Instructions</th>
                      <th style={{...thStyle, textAlign: 'center'}}>Target</th>
                      <th style={{...thStyle, textAlign: 'right'}}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeReworkJobs.map((job, index) => {
                      const rLogs = reworkHistory.filter(p => p.job_id === job.id);
                      const inProgress = rLogs.length > 0;
                      
                      return (
                      <tr key={job.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#faf5ff', transition: '0.2s' }}>
                        <td style={{...tdStyle, textAlign: 'center'}}>
                             {inProgress ? (
                               <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' }}>⏳ IN PROGRESS</span>
                             ) : (
                               <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' }}>⏸️ QUEUED</span>
                             )}
                        </td>
                        <td style={{...tdStyle, fontWeight: '800', color: '#581c87'}}>{job.source_wire}</td>
                        <td style={{...tdStyle, fontWeight: '600', color: '#475569'}}>{job.instruction}</td>
                        <td style={{...tdStyle, fontWeight: '900', color: '#d97706', textAlign: 'center'}}>{job.target_qty}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>
                          <button onClick={() => handleCancelReworkJob(job.id, job.source_wire)} style={{ padding: '6px 10px', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: '0.2s' }}>Cancel</button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )
            )}

            {/* TAB: QUARANTINE */}
            {activeOrderTab === 'Quarantine' && (
              activeQuarantine.length === 0 ? <div style={{ padding: '60px 40px', textAlign: 'center', color: '#94a3b8', fontWeight: '500' }}>No items in quarantine triage!</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Machine / Operator</th>
                      <th style={thStyle}>Odd Wire Logged</th>
                      <th style={thStyle}>Reason</th>
                      <th style={{...thStyle, textAlign: 'right', minWidth: '260px'}}>Admin Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeQuarantine.map((q, index) => (
                      <tr key={q.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#fff7ed', transition: '0.2s' }}>
                        <td style={tdStyle}>
                          <div style={{fontWeight: '800', color: '#1e3a8a'}}>{q.line_name}</div>
                          <div style={{fontSize: '11px', color: '#64748b'}}>{q.operator_name}</div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{fontWeight: '800', color: '#9a3412'}}>{q.wire_type}</div>
                          <div style={{fontSize: '11px', color: '#ea580c', fontWeight: 'bold'}}>Est. Length: {q.length}</div>
                        </td>
                        <td style={{...tdStyle, fontWeight: '600', color: '#475569'}}>{q.reason}</td>
                        <td style={{...tdStyle, textAlign: 'right'}}>
                          {/* Conditionally show Ship button to prevent crashes if reason is null! */}
                          {(q.reason || '').includes('ODD Length') && (
                             <button onClick={() => handleShipQuarantine(q.id, q.length)} style={{ padding: '6px 10px', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', marginRight: '6px', transition: '0.2s' }}>🚢 Ship</button>
                          )}
                          <button onClick={() => handleScrapQuarantine(q.id)} style={{ padding: '6px 10px', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', marginRight: '6px', transition: '0.2s' }}>🗑️ Scrap It</button>
                          <button onClick={() => setQReworkModal({ id: q.id, instruction: '', target_qty: '' })} style={{ padding: '6px 10px', backgroundColor: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: '0.2s' }}>✂️ Rework</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* BOTTOM SECTION: FIXED HEIGHT COMPLETED JOBS DASHBOARD                     */}
      {/* ========================================================================= */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
          <div style={{ padding: '20px 24px 12px 24px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>✅</span> Completed Job Review
            </h3>
          </div>
          
          <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '0 24px', borderBottom: `3px solid ${completedTabColor}` }}>
            {safeLines.map(line => (
              <button 
                key={line} 
                onClick={() => setCompletedTab(line)}
                style={{ 
                  padding: '10px 20px', borderRadius: '10px 10px 0 0', fontSize: '13px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', transition: '0.2s', border: '2px solid',
                  borderColor: completedTab === line ? '#3b82f6 #3b82f6 transparent #3b82f6' : 'transparent',
                  backgroundColor: completedTab === line ? '#ffffff' : '#e2e8f0', 
                  color: completedTab === line ? '#1e3a8a' : '#64748b', 
                  marginBottom: '-3px', position: 'relative', zIndex: completedTab === line ? 10 : 1
                }}>
                {line}
              </button>
            ))}
            <button 
                key="Rework" 
                onClick={() => setCompletedTab('Rework')}
                style={{ 
                  padding: '10px 20px', borderRadius: '10px 10px 0 0', fontSize: '13px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', transition: '0.2s', border: '2px solid',
                  borderColor: completedTab === 'Rework' ? '#9333ea #9333ea transparent #9333ea' : 'transparent',
                  backgroundColor: completedTab === 'Rework' ? '#ffffff' : '#e2e8f0', 
                  color: completedTab === 'Rework' ? '#581c87' : '#64748b', 
                  marginBottom: '-3px', position: 'relative', zIndex: completedTab === 'Rework' ? 10 : 1
                }}>
                ✂️ Rework
            </button>
          </div>
        </div>
        
        <div className="hide-scrollbar" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>{isReworkTab ? 'Station' : 'Machine'}</th>
                  <th style={thStyle}>{isReworkTab ? 'Original Wire Product' : 'Wire Product'}</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Target Request</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Actual Produced</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Final Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedCompletedJobs.map((job, index) => {
                  if (isReworkTab) {
                    const logs = reworkHistory.filter(p => p.job_id === job.id);
                    const actual = logs.reduce((sum, p) => sum + p.qty_produced, 0);
                    const target = job.target_qty;
                    const isShort = actual < target;
                    const isOver = actual > target;
                    const diffText = `${Math.abs(actual - target)} Units`;

                    let statusColor = '#059669'; let statusBg = '#dcfce7'; let statusText = '🎯 Perfect Match';
                    if (isShort) { statusColor = '#dc2626'; statusBg = '#fee2e2'; statusText = `📉 Short (-${diffText})`; } 
                    else if (isOver) { statusColor = '#b45309'; statusBg = '#fef08a'; statusText = `📈 Over (+${diffText})`; }

                    return (
                      <tr key={`rw-${job.id}`} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#faf5ff' }}>
                        <td style={{...tdStyle, fontWeight: '800', color: '#581c87'}}>Rework Station</td>
                        <td style={{...tdStyle, fontWeight: '700', color: '#0f172a'}}>{job.source_wire}</td>
                        <td style={{...tdStyle, color: '#475569', fontWeight: '600', textAlign: 'center'}}>{target} Units</td>
                        <td style={{...tdStyle, color: '#0f172a', fontWeight: '900', textAlign: 'center'}}>{actual} Units</td>
                        <td style={{...tdStyle, textAlign: 'center'}}>
                          <span style={{ backgroundColor: statusBg, color: statusColor, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>{statusText}</span>
                        </td>
                      </tr>
                    );
                  } else {
                    const isReel = job.pallets_needed === 0;
                    const jobLogs = allPallets.filter(p => p.job_id === job.id);
                    let targetText = ''; let actualText = ''; let isShort = false; let isOver = false; let diffText = '';

                    if (isReel) {
                      const targetReels = job.spools_per_pallet;
                      const actualReels = jobLogs.reduce((sum, p) => sum + p.total_spools, 0);
                      targetText = `${targetReels} Reels`; actualText = `${actualReels} Reels`;
                      isShort = actualReels < targetReels; isOver = actualReels > targetReels;
                      diffText = `${Math.abs(actualReels - targetReels)} Reels`;
                    } else {
                      const targetPallets = job.pallets_needed;
                      const targetSpools = job.pallets_needed * job.spools_per_pallet;
                      const actualPallets = jobLogs.length;
                      const actualSpools = jobLogs.reduce((sum, p) => sum + p.total_spools, 0);
                      targetText = `${targetPallets} Pallets (${targetSpools} Spools)`;
                      actualText = `${actualPallets} Pallets (${actualSpools} Spools)`;
                      isShort = actualSpools < targetSpools; isOver = actualSpools > targetSpools;
                      diffText = `${Math.abs(actualSpools - targetSpools)} Spools`;
                    }

                    let statusColor = '#059669'; let statusBg = '#dcfce7'; let statusText = '🎯 Perfect Match';
                    if (isShort) { statusColor = '#dc2626'; statusBg = '#fee2e2'; statusText = `📉 Short (-${diffText})`; } 
                    else if (isOver) { statusColor = '#b45309'; statusBg = '#fef08a'; statusText = `📈 Over (+${diffText})`; }

                    return (
                      <tr key={`prod-${job.id}`} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{...tdStyle, fontWeight: '800', color: '#1e3a8a'}}>{job.line_name}</td>
                        <td style={{...tdStyle, fontWeight: '700', color: '#0f172a'}}>{job.wire_type}</td>
                        <td style={{...tdStyle, color: '#475569', fontWeight: '600', textAlign: 'center'}}>{targetText}</td>
                        <td style={{...tdStyle, color: '#0f172a', fontWeight: '900', textAlign: 'center'}}>{actualText}</td>
                        <td style={{...tdStyle, textAlign: 'center'}}>
                          <span style={{ backgroundColor: statusBg, color: statusColor, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>{statusText}</span>
                        </td>
                      </tr>
                    );
                  }
                })}

                {Array.from({ length: COMPLETED_PER_PAGE - displayedCompletedJobs.length }).map((_, i) => {
                  const absoluteIndex = displayedCompletedJobs.length + i;
                  const isFirstEmptyAndNoData = displayedCompletedJobs.length === 0 && i === 0;
                  
                  return (
                    <tr key={`empty-${i}`} style={{ backgroundColor: absoluteIndex % 2 === 0 ? '#ffffff' : (isReworkTab ? '#faf5ff' : '#f8fafc'), height: '42px' }}>
                      {isFirstEmptyAndNoData ? (
                        <td colSpan="5" style={{...tdStyle, textAlign: 'center', color: '#94a3b8', fontWeight: '500'}}>
                          No completed jobs recorded for {completedTab}.
                        </td>
                      ) : (
                        <>
                          <td style={tdStyle}>&nbsp;</td>
                          <td style={tdStyle}>&nbsp;</td>
                          <td style={tdStyle}>&nbsp;</td>
                          <td style={tdStyle}>&nbsp;</td>
                          <td style={tdStyle}>&nbsp;</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '0 0 12px 12px', flexShrink: 0 }}>
          <button disabled={completedPage <= 1} onClick={() => setCompletedPage(p => p - 1)} style={{ padding: '8px 20px', backgroundColor: completedPage <= 1 ? '#e2e8f0' : '#3b82f6', color: completedPage <= 1 ? '#94a3b8' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: completedPage <= 1 ? 'not-allowed' : 'pointer', transition: '0.2s' }}>
            ← Previous
          </button>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>
            Page {completedPage} of {totalCompletedPages}
          </span>
          <button disabled={completedPage >= totalCompletedPages} onClick={() => setCompletedPage(p => p + 1)} style={{ padding: '8px 20px', backgroundColor: completedPage >= totalCompletedPages ? '#e2e8f0' : '#3b82f6', color: completedPage >= totalCompletedPages ? '#94a3b8' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: completedPage >= totalCompletedPages ? 'not-allowed' : 'pointer', transition: '0.2s' }}>
            Next →
          </button>
        </div>
      </div>

      {/* --- NEW REWORK CONVERSION MODAL --- */}
      {qReworkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#0f172a', fontSize: '22px', fontWeight: '800' }}>Send to Rework</h3>
            <p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: '15px' }}>Convert this quarantined wire into an actionable rework task.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div>
                <label style={labelStyle}>Instructions</label>
                <input type="text" value={qReworkModal.instruction} onChange={(e) => setQReworkModal({...qReworkModal, instruction: e.target.value})} placeholder="e.g. Cut into 75m spools" style={{...inputStyle, border: '2px solid #d8b4fe'}} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Target Goal (Qty)</label>
                <input type="number" value={qReworkModal.target_qty} onChange={(e) => setQReworkModal({...qReworkModal, target_qty: e.target.value})} placeholder="e.g. 5" style={{...inputStyle, border: '2px solid #d8b4fe'}} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '2px solid #f1f5f9', paddingTop: '20px' }}>
              <button onClick={() => setQReworkModal(null)} style={{ padding: '12px 20px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: '0.2s', flex: 1 }}>Cancel</button>
              <button disabled={!qReworkModal.instruction || !qReworkModal.target_qty} onClick={submitQuarantineToRework} style={{ padding: '12px 24px', backgroundColor: (!qReworkModal.instruction || !qReworkModal.target_qty) ? '#d8b4fe' : '#9333ea', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: (!qReworkModal.instruction || !qReworkModal.target_qty) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(147, 51, 234, 0.3)', transition: '0.2s', flex: 2 }}>Dispatch to Rework</button>
            </div>
          </div>
        </div>
      )}

      {/* --- BUILDER MODAL --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', color: '#0f172a', fontSize: '22px', fontWeight: '800' }}>Wire Builder</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
              <div><label style={labelStyle}>1. Wire Type</label><select value={buildType} onChange={(e) => setBuildType(e.target.value)} style={inputStyle}>{TYPE_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}</select></div>
              <div><label style={labelStyle}>2. Wire Size</label><select value={buildSize} onChange={(e) => setBuildSize(e.target.value)} style={inputStyle}>{SIZE_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}</select></div>
              <div><label style={labelStyle}>3. Solid / Stranded</label><select value={buildConductor} onChange={(e) => setBuildConductor(e.target.value)} style={inputStyle}>{CONDUCTOR_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}</select></div>
              <div><label style={labelStyle}>4. Jacket Color</label><select value={buildColor} onChange={(e) => setBuildColor(e.target.value)} style={inputStyle}>{COLOR_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}</select></div>
              <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>5. Length (Writable)</label><input type="text" value={buildLength} onChange={(e) => setBuildLength(e.target.value)} placeholder="e.g. 75m, 1500m" style={inputStyle} autoFocus /></div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '2px solid #f1f5f9', paddingTop: '20px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '12px 20px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}>Cancel</button>
              <button onClick={handleAddNewWire} style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)', transition: '0.2s' }}>Save to Database</button>
            </div>
          </div>
        </div>
      )}

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
