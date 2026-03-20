import { useState, useEffect } from 'react';

// =========================================================================
// ULTRA-COMPACT EXCEL STYLES 
// =========================================================================
const STYLES = {
  thExcel: { 
    padding: '6px 12px', fontSize: '11px', fontWeight: '800', color: '#f8fafc', 
    textTransform: 'uppercase', borderBottom: '2px solid #334155', borderRight: '1px solid #1e293b', 
    backgroundColor: '#0f172a', position: 'sticky', top: 0, zIndex: 10, letterSpacing: '0.5px', whiteSpace: 'nowrap' 
  },
  tdExcel: { 
    padding: '4px 12px', fontSize: '13px', color: '#0f172a', 
    borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', 
    verticalAlign: 'middle', whiteSpace: 'nowrap', height: '32px' 
  }
};

const formatClockTime = (utcString) => new Date(utcString.endsWith('Z') ? utcString : utcString + 'Z').toLocaleTimeString('en-CA', { timeZone: 'America/Toronto', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
const formatDate = (utcString) => new Date(utcString.endsWith('Z') ? utcString : utcString + 'Z').toLocaleDateString('en-CA', { timeZone: 'America/Toronto', month: 'short', day: 'numeric', year: 'numeric' });

// Native date picker outputs YYYY-MM-DD. This helper matches that format for our filters.
const getISODateString = (utcString) => new Date(utcString.endsWith('Z') ? utcString : utcString + 'Z').toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });

const printLabel = (row, isReel, type = 'production') => {
  const shiftIcon = row.shift === 'Day' ? '☀️' : '🌙';
  const printWindow = window.open('', '_blank', 'width=600,height=400');
  
  if (type === 'rework') {
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
      <img src="/pti-logo.webp" alt="PTI Cables" style="height: 50px; margin-bottom: 10px;" />
      <div style="font-weight: 900; font-size: 20px; margin-bottom: 10px; color: #581c87;">✂️ REWORK TAG</div>
      <h2>${row.source_wire}</h2><div class="details">
      <div><span class="bold">Operator:</span> ${row.operator_name || 'N/A'} <span style="font-size:16px;">(${shiftIcon} ${row.shift} Shift)</span></div>
      <div><span class="bold">Date:</span> ${formatDate(row.timestamp)} ${formatClockTime(row.timestamp)}</div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #000;">
        <span class="bold">Units Produced:</span> <span style="font-size: 28px; font-weight: bold; background-color: #f0f0f0; padding: 2px 8px; border: 1px solid #ccc;">${row.qty_produced}</span>
      </div>
      <div style="margin-top: 10px; font-size: 16px;"><span class="bold">Instruction:</span> ${row.instruction}</div>
      </div></div><script>setTimeout(() => { window.print(); window.close(); }, 250);</script></body></html>
    `);
  } else {
    const unitLabel = isReel ? "Reel #" : "Pallet #";
    const qtyLabel = isReel ? "Total Reels" : "Total Spools";
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
  }
  printWindow.document.close();
};

export default function FullProductionPanel({ lines }) {
  const safeLines = (lines && lines.length > 0) ? lines : Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`);

  const [allLogs, setAllLogs] = useState([]);
  const [reworkLogs, setReworkLogs] = useState([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  const [activeLineTab, setActiveLineTab] = useState(safeLines[0]); 
  
  const LOGS_PER_PAGE = 20;

  useEffect(() => {
    const fetchMasterLog = async () => {
      try {
        const pRes = await fetch('http://127.0.0.1:8000/api/history');
        if (pRes.ok) {
          const data = await pRes.json();
          setAllLogs(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        }
        
        const rRes = await fetch('http://127.0.0.1:8000/api/rework-history');
        if (rRes.ok) {
          const rData = await rRes.json();
          setReworkLogs(rData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        }
      } catch (error) { console.error("Error fetching master log:", error); }
    };
    fetchMasterLog();
    const interval = setInterval(fetchMasterLog, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeData = activeLineTab === 'Rework' 
    ? reworkLogs 
    : allLogs.filter(log => log.line_name === activeLineTab);

  const filteredLogs = activeData.filter(log => {
    // 1. Calendar Date Filter
    if (filterDate) {
      if (getISODateString(log.timestamp) !== filterDate) return false;
    }
    
    // 2. Text Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (activeLineTab === 'Rework') {
        return (
          (log.operator_name && log.operator_name.toLowerCase().includes(q)) ||
          (log.source_wire && log.source_wire.toLowerCase().includes(q)) ||
          (log.instruction && log.instruction.toLowerCase().includes(q)) ||
          (log.shift && log.shift.toLowerCase().includes(q))
        );
      } else {
        return (
          (log.operator_name && log.operator_name.toLowerCase().includes(q)) ||
          (log.wire_type && log.wire_type.toLowerCase().includes(q)) ||
          (log.shift && log.shift.toLowerCase().includes(q)) ||
          (log.audit_start && log.audit_start.toString().includes(q)) ||
          (log.audit_end && log.audit_end.toString().includes(q))
        );
      }
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
  const displayedLogs = filteredLogs.slice((currentPage - 1) * LOGS_PER_PAGE, currentPage * LOGS_PER_PAGE);

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [filteredLogs.length, totalPages]);
  useEffect(() => { setCurrentPage(1); }, [activeLineTab, filterDate, searchQuery]); 

  const activeTabColor = activeLineTab === 'Rework' ? '#9333ea' : '#3b82f6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s' }}>
      
      {/* HEADER SECTION */}
      <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '800', fontSize: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>🌍</span> Master Production Ledger
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px', fontWeight: '500' }}>Live chronological ledger of all factory activity. Auto-refreshes every 30s.</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* NEW: CALENDAR FILTER */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '14px', fontSize: '18px' }}>📅</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ width: '160px', padding: '14px 16px 14px 44px', fontSize: '15px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none', transition: '0.2s', cursor: 'pointer', fontWeight: '700' }}
            />
          </div>
          {filterDate && (
             <button onClick={() => setFilterDate('')} style={{ padding: '14px 16px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>Clear Date</button>
          )}
          
          {/* SEARCH INPUT */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '14px', fontSize: '18px' }}>🔍</span>
            <input 
              type="text" 
              placeholder="Search operators, wires, or audits..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '320px', padding: '14px 16px 14px 44px', fontSize: '15px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none', transition: '0.2s' }}
            />
          </div>
        </div>
      </div>

      {/* MASTER DATA TABLE CONTAINER */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ backgroundColor: '#f8fafc', paddingTop: '24px', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
          <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '0 32px', borderBottom: `3px solid ${activeTabColor}` }}>
            {safeLines.map(line => (
              <button 
                key={line} 
                onClick={() => setActiveLineTab(line)}
                style={{ 
                  padding: '12px 24px', 
                  borderRadius: '10px 10px 0 0', 
                  fontSize: '14px', 
                  fontWeight: '800', 
                  cursor: 'pointer', 
                  whiteSpace: 'nowrap', 
                  transition: '0.2s', 
                  border: '2px solid',
                  borderColor: activeLineTab === line ? '#3b82f6 #3b82f6 transparent #3b82f6' : 'transparent',
                  backgroundColor: activeLineTab === line ? '#ffffff' : '#e2e8f0', 
                  color: activeLineTab === line ? '#1e3a8a' : '#64748b', 
                  marginBottom: '-3px', 
                  position: 'relative',
                  zIndex: activeLineTab === line ? 10 : 1
                }}>
                {line}
              </button>
            ))}
            <button 
                onClick={() => setActiveLineTab('Rework')}
                style={{ 
                  padding: '12px 24px', 
                  borderRadius: '10px 10px 0 0', 
                  fontSize: '14px', 
                  fontWeight: '800', 
                  cursor: 'pointer', 
                  whiteSpace: 'nowrap', 
                  transition: '0.2s', 
                  border: '2px solid',
                  borderColor: activeLineTab === 'Rework' ? '#9333ea #9333ea transparent #9333ea' : 'transparent',
                  backgroundColor: activeLineTab === 'Rework' ? '#ffffff' : '#f3e8ff', 
                  color: activeLineTab === 'Rework' ? '#581c87' : '#9333ea', 
                  marginBottom: '-3px', 
                  position: 'relative',
                  zIndex: activeLineTab === 'Rework' ? 10 : 1,
                  marginLeft: '12px'
                }}>
                ✂️ Rework Station
            </button>
          </div>
        </div>

        <div className="hide-scrollbar" style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
            <thead>
              {activeLineTab === 'Rework' ? (
                <tr>
                  <th style={STYLES.thExcel}>Timestamp</th>
                  <th style={STYLES.thExcel}>Shift</th>
                  <th style={STYLES.thExcel}>Operator</th>
                  <th style={STYLES.thExcel}>Original Wire Product</th>
                  <th style={STYLES.thExcel}>Admin Instruction</th>
                  <th style={{...STYLES.thExcel, textAlign: 'center'}}>Qty Produced</th>
                  <th style={STYLES.thExcel}>Comments</th>
                  <th style={{...STYLES.thExcel, textAlign: 'center', borderRight: 'none'}}>Action</th>
                </tr>
              ) : (
                <tr>
                  <th style={STYLES.thExcel}>Timestamp</th>
                  <th style={STYLES.thExcel}>Shift</th>
                  <th style={STYLES.thExcel}>Operator</th>
                  <th style={STYLES.thExcel}>Wire Product</th>
                  <th style={{...STYLES.thExcel, textAlign: 'center'}}>Unit #</th>
                  <th style={{...STYLES.thExcel, textAlign: 'center'}}>Target Qty</th>
                  <th style={{...STYLES.thExcel, textAlign: 'center'}}>Actual Qty</th>
                  <th style={STYLES.thExcel}>Audit Range</th>
                  <th style={STYLES.thExcel}>Comments</th>
                  <th style={{...STYLES.thExcel, textAlign: 'center', borderRight: 'none'}}>Action</th>
                </tr>
              )}
            </thead>
            <tbody>
              {/* Data Rows */}
              {displayedLogs.map((log, index) => {
                
                // REWORK RENDER
                if (activeLineTab === 'Rework') {
                  return (
                    <tr key={`rw-${log.id}`} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#faf5ff', transition: '0.1s', ':hover': { backgroundColor: '#f3e8ff' } }}>
                      <td style={STYLES.tdExcel}>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '12px' }}>{formatDate(log.timestamp)}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{formatClockTime(log.timestamp)}</div>
                      </td>
                      <td style={STYLES.tdExcel}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', backgroundColor: log.shift === 'Day' ? '#fef3c7' : '#dbeafe', color: log.shift === 'Day' ? '#b45309' : '#1e40af' }}>
                          {log.shift === 'Day' ? '☀️ DAY' : '🌙 NIGHT'}
                        </span>
                      </td>
                      <td style={{...STYLES.tdExcel, fontWeight: '700', color: '#334155'}}>{log.operator_name || '—'}</td>
                      <td style={{...STYLES.tdExcel, fontWeight: '800', color: '#581c87'}}>{log.source_wire}</td>
                      <td style={{...STYLES.tdExcel, fontWeight: '600', color: '#475569'}}>{log.instruction}</td>
                      <td style={{...STYLES.tdExcel, textAlign: 'center'}}>
                        <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', fontSize: '14px', color: '#059669', backgroundColor: '#dcfce7' }}>
                          {log.qty_produced}
                        </div>
                      </td>
                      <td style={{...STYLES.tdExcel, color: '#64748b', fontStyle: log.comments ? 'normal' : 'italic' }} title={log.comments}>
                        {log.comments || 'none'}
                      </td>
                      <td style={{...STYLES.tdExcel, textAlign: 'center', borderRight: 'none'}}>
                        <button onClick={() => printLabel(log, false, 'rework')} style={{ padding: '4px 10px', backgroundColor: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                          🖨️ Print
                        </button>
                      </td>
                    </tr>
                  )
                }

                // PRODUCTION RENDER
                const isHistoryReel = log.wire_type && log.wire_type.match(/(\d+)m$/i) && parseInt(log.wire_type.match(/(\d+)m$/i)[1], 10) > 300;
                const isShort = !isHistoryReel && log.qty_requested > 0 && log.total_spools < log.qty_requested;
                const isOver = !isHistoryReel && log.qty_requested > 0 && log.total_spools > log.qty_requested;
                
                return (
                  <tr key={`prod-${log.id}`} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc', transition: '0.1s', ':hover': { backgroundColor: '#f1f5f9' } }}>
                    <td style={STYLES.tdExcel}>
                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '12px' }}>{formatDate(log.timestamp)}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{formatClockTime(log.timestamp)}</div>
                    </td>
                    <td style={STYLES.tdExcel}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', backgroundColor: log.shift === 'Day' ? '#fef3c7' : '#dbeafe', color: log.shift === 'Day' ? '#b45309' : '#1e40af' }}>
                        {log.shift === 'Day' ? '☀️ DAY' : '🌙 NIGHT'}
                      </span>
                    </td>
                    <td style={{...STYLES.tdExcel, fontWeight: '700', color: '#334155'}}>{log.operator_name || '—'}</td>
                    <td style={{...STYLES.tdExcel, fontWeight: '800', color: '#0f172a'}}>{log.wire_type}</td>
                    <td style={{...STYLES.tdExcel, fontWeight: '900', color: isHistoryReel ? '#9a3412' : '#475569', textAlign: 'center'}}>
                      {log.pallet_num === 0 ? 'Master' : `${log.pallet_num}`}
                    </td>
                    <td style={{...STYLES.tdExcel, textAlign: 'center', fontWeight: '700', color: '#64748b'}}>
                      {log.qty_requested || '—'}
                    </td>
                    <td style={{...STYLES.tdExcel, textAlign: 'center'}}>
                      <div style={{ 
                        display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', fontSize: '13px',
                        color: isShort ? '#ef4444' : (isOver ? '#b45309' : '#059669'), 
                        backgroundColor: isOver ? '#fef08a' : (isShort ? '#fee2e2' : '#dcfce7') 
                      }}>
                        {log.total_spools}
                      </div>
                    </td>
                    <td style={STYLES.tdExcel}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: '900', fontFamily: 'monospace', color: '#0f172a' }}>
                        <span>{log.audit_start}</span>
                        <span style={{ color: '#94a3b8', margin: '0 6px' }}>➔</span>
                        <span>{log.audit_end}</span>
                      </div>
                    </td>
                    <td style={{...STYLES.tdExcel, color: (isShort || isOver) ? '#b45309' : '#64748b', fontStyle: log.comments ? 'normal' : 'italic', fontWeight: (isShort || isOver) ? 'bold' : 'normal', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.comments}>
                      {log.comments || 'none'}
                    </td>
                    <td style={{...STYLES.tdExcel, textAlign: 'center', borderRight: 'none'}}>
                      <button onClick={() => printLabel(log, isHistoryReel, 'production')} style={{ padding: '4px 10px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        🖨️ Print
                      </button>
                    </td>
                  </tr>
                )
              })}

              {/* Padding Empty Rows - Shrunk to match 32px height */}
              {Array.from({ length: LOGS_PER_PAGE - displayedLogs.length }).map((_, i) => {
                const absoluteIndex = displayedLogs.length + i;
                const isFirstEmptyAndNoData = displayedLogs.length === 0 && i === 0;
                const columnsCount = activeLineTab === 'Rework' ? 8 : 10;
                
                return (
                  <tr key={`empty-${i}`} style={{ backgroundColor: absoluteIndex % 2 === 0 ? '#ffffff' : (activeLineTab === 'Rework' ? '#faf5ff' : '#f8fafc'), height: '33px' }}>
                    {isFirstEmptyAndNoData ? (
                      <td colSpan={columnsCount} style={{...STYLES.tdExcel, textAlign: 'center', color: '#94a3b8', fontWeight: '500', fontStyle: 'italic', borderRight: 'none'}}>
                        {filterDate ? `No data found for ${filterDate}.` : `No records found.`}
                      </td>
                    ) : (
                      Array.from({ length: columnsCount }).map((_, colIndex) => (
                        <td key={colIndex} style={colIndex === columnsCount - 1 ? {...STYLES.tdExcel, borderRight: 'none'} : STYLES.tdExcel}>&nbsp;</td>
                      ))
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PERMANENT PAGINATION CONTROLS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 32px', borderTop: '2px solid #cbd5e1', backgroundColor: '#f1f5f9', borderRadius: '0 0 12px 12px', flexShrink: 0 }}>
          <button 
            disabled={currentPage <= 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            style={{ padding: '6px 16px', backgroundColor: currentPage <= 1 ? '#e2e8f0' : '#0f172a', color: currentPage <= 1 ? '#94a3b8' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', transition: '0.2s' }}
          >
            ← Newer
          </button>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>
            Page <span style={{color: '#0f172a'}}>{currentPage}</span> of {totalPages}
          </span>
          <button 
            disabled={currentPage >= totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            style={{ padding: '6px 16px', backgroundColor: currentPage >= totalPages ? '#e2e8f0' : '#0f172a', color: currentPage >= totalPages ? '#94a3b8' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', transition: '0.2s' }}
          >
            Older →
          </button>
        </div>
      </div>
    </div>
  );
}