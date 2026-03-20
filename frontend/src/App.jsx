import { useState } from 'react';
import AdminPanel from './components/AdminPanel';
import OperatorPanel from './components/OperatorPanel';
import FullProductionPanel from './components/FullProductionPanel';
import ReworkPanel from './components/ReworkPanel'; 

export default function App() {
  const [activePanel, setActivePanel] = useState('operator'); 
  const allLines = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`);

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: '"Inter", system-ui, sans-serif', color: '#334155' }}>
      
      {/* GLOBAL CSS TO HIDE UGLY WINDOWS SCROLLBARS EVERYWHERE */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <header style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        
        {/* --- PAPER TAG LOGO SECTION --- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          {/* REDUCED WIDTH: Changed from 190px to 140px */}
          <div style={{ 
            position: 'relative', 
            width: '140px', 
            height: '60px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
          }}>
            {/* Background: Ripped Paper Tag */}
            <img 
              src="/paper-tag.png" 
              alt="Paper Tag Background" 
              style={{ position: 'absolute', top: -27, left: 10, width: '90%', height: '190%', objectFit: 'fill', zIndex: 1 }} 
            />
            {/* Foreground: PTI Cables Logo */}
            <img 
              src="/pti-logo.webp" 
              alt="PTI Cables Logo" 
              style={{ height: '36px', width: 'auto', objectFit: 'contain', zIndex: 2, position: 'relative', marginLeft: '5px' }} 
            />
          </div>

          <h1 style={{ margin: 0, fontSize: '22px', color: '#f8fafc', fontWeight: '600', letterSpacing: '0.5px' }}>
            Production Log System
          </h1>
        </div>

        <nav style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setActivePanel('admin')} style={{ padding: '8px 16px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', transition: '0.2s', backgroundColor: activePanel === 'admin' ? '#3b82f6' : 'transparent', color: activePanel === 'admin' ? 'white' : '#94a3b8' }}>
            ADMIN COMMAND
          </button>
          
          <button onClick={() => setActivePanel('fulllog')} style={{ padding: '8px 16px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', transition: '0.2s', backgroundColor: activePanel === 'fulllog' ? '#3b82f6' : 'transparent', color: activePanel === 'fulllog' ? 'white' : '#94a3b8' }}>
            PRODUCTION LOG
          </button>

          <button onClick={() => setActivePanel('rework')} style={{ padding: '8px 16px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', transition: '0.2s', backgroundColor: activePanel === 'rework' ? '#9333ea' : 'transparent', color: activePanel === 'rework' ? 'white' : '#94a3b8' }}>
            REWORK STATION
          </button>
          
          <button onClick={() => setActivePanel('operator')} style={{ padding: '8px 16px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', transition: '0.2s', backgroundColor: activePanel === 'operator' ? '#3b82f6' : 'transparent', color: activePanel === 'operator' ? 'white' : '#94a3b8' }}>
            LINE OPERATOR
          </button>
        </nav>
      </header>
      
      <main style={{ padding: '32px', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {activePanel === 'admin' && <AdminPanel lines={allLines} />}
        {activePanel === 'operator' && <OperatorPanel lines={allLines} />}
        {activePanel === 'fulllog' && <FullProductionPanel lines={allLines} />}
        {activePanel === 'rework' && <ReworkPanel />}
      </main>
    </div>
  );
}