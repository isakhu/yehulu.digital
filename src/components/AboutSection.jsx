import React, { useState } from 'react';

/**
 * AboutSection Component for Yehulu Digital
 * Typography: 'Bricolage Grotesque'
 * Accent Color: #bcff00
 */
export default function AboutSection() {
  const [activeBg, setActiveBg] = useState('#050505');
  const [typeInput, setTypeInput] = useState('YEHULU DIGITAL');
  const [isDisplayType, setIsDisplayType] = useState(true);

  const colorSwatches = [
    { hex: '#050505', label: '#050505', textColor: 'text-white' },
    { hex: '#202020', label: '#202020', textColor: 'text-white' },
    { hex: '#bcff00', label: '#bcff00', textColor: 'text-black' },
    { hex: '#ffffff', label: '#ffffff', textColor: 'text-black' },
  ];

  const brandValues = [
    {
      title: 'CREATE.',
      subtitle: 'BOLD VISUALS',
      desc: 'We produce striking, modern aesthetics that demand immediate visual curiosity.'
    },
    {
      title: 'CONNECT.',
      subtitle: 'DEEP RESONANCE',
      desc: 'We bridge the gap between brands and audiences with authentic storytelling.'
    },
    {
      title: 'GROW.',
      subtitle: 'MEASURABLE IMPACT',
      desc: 'Every visual and campaign is engineered to drive tangible business metrics.'
    }
  ];

  const metrics = [
    { value: '2+', label: 'YEARS EXPERIENCE' },
    { value: '30+', label: 'PROJECTS COMPLETED' },
    { value: '5+', label: 'CORE SERVICES' },
    { value: '∞', label: 'CREATIVE IDEAS' }
  ];

  return (
    <section className="bg-[#050505] text-white py-24 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#bcff00] selection:text-black">
      <div className="max-w-7xl mx-auto space-y-24">


        {/* ---------------- 01. WHO WE ARE & BRAND SYSTEM ---------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Who We Are */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <span className="text-xs font-black tracking-[0.3em] text-[#bcff00] uppercase block">
                WHO WE ARE
              </span>
              <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white font-['Bricolage_Grotesque'] leading-none">
                THIS IS <br />
                <span className="text-[#bcff00]">YEHULU.</span>
              </h2>
            </div>

            <div className="space-y-4 text-gray-300 text-sm sm:text-base leading-relaxed">
              <p>
                Yehulu Digital is a creative digital agency focused on branding, visual content,
                video production, social media campaigns, and digital product experiences.
              </p>
              <p className="text-gray-400 text-xs sm:text-sm">
                We combine sharp visual design, cinematic storytelling, and digital precision to build enduring
                brand assets for forward-thinking clients worldwide.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10 text-xs font-mono">
              <div>
                <span className="text-gray-500 uppercase tracking-widest block text-[10px]">HEADQUARTERS</span>
                <span className="text-white font-bold tracking-wider mt-1 block">ADDIS ABABA, ETHIOPIA</span>
              </div>
              <div>
                <span className="text-gray-500 uppercase tracking-widest block text-[10px]">CLIENT SCOPE</span>
                <span className="text-[#bcff00] font-bold tracking-wider mt-1 block">GLOBAL DIGITAL</span>
              </div>
            </div>
          </div>

          {/* Right Column: Brand System // 01 */}
          <div className="lg:col-span-7 bg-[#0a0a0a] border border-white/10 p-6 sm:p-8 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between text-[11px] font-mono tracking-widest border-b border-white/10 pb-4">
              <span className="text-gray-400 uppercase">BRAND SYSTEM // 01</span>
              <span className="text-[#bcff00] font-bold uppercase">YEHULU DIGITAL</span>
            </div>

            {/* Dynamic Logo Preview Box */}
            <div 
              className="w-full h-56 sm:h-64 flex items-center justify-center p-8 transition-colors duration-300 relative border border-white/5"
              style={{ backgroundColor: activeBg }}
            >
              <img 
                src="/assets/logopng-BhI97nKv.png" 
                alt="Yehulu Digital Logo" 
                className="max-h-24 sm:max-h-28 max-w-full object-contain filter drop-shadow-[0_4px_24px_rgba(188,255,0,0.2)]"
              />
              <span className="absolute bottom-2 right-3 text-[9px] font-mono uppercase tracking-wider text-gray-500">
                BG: {activeBg}
              </span>
            </div>

            {/* Color Palette Switcher */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-400 uppercase tracking-widest">
                  COLOR PALETTE (CLICK TO CHANGE LOGO BG)
                </span>
                <span className="text-[#bcff00] font-bold">
                  ACTIVE: {activeBg.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {colorSwatches.map((swatch) => {
                  const isActive = activeBg.toLowerCase() === swatch.hex.toLowerCase();
                  return (
                    <button
                      key={swatch.hex}
                      onClick={() => setActiveBg(swatch.hex)}
                      style={{ backgroundColor: swatch.hex }}
                      className={`h-12 border transition-all flex flex-col items-center justify-center text-[10px] font-bold font-mono ${swatch.textColor} ${
                        isActive 
                          ? 'border-[#bcff00] ring-2 ring-[#bcff00]/40 scale-[1.02]' 
                          : 'border-white/20 hover:border-white/60'
                      }`}
                    >
                      <span>{swatch.label}</span>
                      {isActive && <span className="text-[9px] tracking-wider">✓ ACTIVE</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography Preview */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
                TYPOGRAPHY SYSTEM
              </span>
              <p className="text-2xl sm:text-3xl font-black text-white font-['Bricolage_Grotesque'] tracking-tight">
                WE CREATE <span className="text-[#bcff00]">BRANDS.</span>
              </p>
            </div>
          </div>
        </div>


        {/* ---------------- 02. TYPOGRAPHY SCALE & BRAND PHILOSOPHY ---------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Card 03: Typography Scale */}
          <div className="lg:col-span-6 bg-[#0a0a0a] border border-white/10 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-xs font-mono font-bold text-[#bcff00] tracking-widest uppercase">
                  03 — TYPOGRAPHY SCALE
                </span>
                <button 
                  onClick={() => setIsDisplayType(!isDisplayType)}
                  className="px-2.5 py-1 text-[10px] font-mono font-bold border border-white/20 hover:border-[#bcff00] text-gray-300 uppercase transition"
                >
                  {isDisplayType ? 'DISPLAY MODE' : 'BODY MODE'}
                </button>
              </div>

              {/* Interactive Type Tester Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
                  INTERACTIVE TYPE TESTER
                </label>
                <input
                  type="text"
                  value={typeInput}
                  onChange={(e) => setTypeInput(e.target.value)}
                  placeholder="Type anything..."
                  className="w-full bg-[#111111] border border-white/15 px-4 py-2.5 text-xs text-[#bcff00] font-mono focus:outline-none focus:border-[#bcff00] transition"
                />
              </div>

              {/* Preview Window */}
              <div className="bg-[#111111] border border-white/10 p-6 min-h-[140px] flex items-center justify-center">
                <h3 
                  className={`text-center font-['Bricolage_Grotesque'] text-white transition-all break-words max-w-full ${
                    isDisplayType 
                      ? 'text-3xl sm:text-5xl font-black uppercase tracking-tight' 
                      : 'text-lg sm:text-2xl font-bold tracking-normal'
                  }`}
                >
                  {typeInput || 'YEHULU DIGITAL'}
                </h3>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed border-t border-white/10 pt-4">
              Bold, high contrast display typography engineered for modern digital touchpoints, 
              advertising, and high impact brand storytelling.
            </p>
          </div>

          {/* Card 04: Brand Philosophy */}
          <div className="lg:col-span-6 bg-[#0a0a0a] border border-white/10 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-xs font-mono font-bold text-[#bcff00] tracking-widest uppercase">
                  04 — BRAND PHILOSOPHY
                </span>
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                  CORE VALUES
                </span>
              </div>

              {/* 3 Step Philosophy Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {brandValues.map((val) => (
                  <div 
                    key={val.title}
                    className="bg-[#111111] border border-white/10 p-5 space-y-3 hover:border-[#bcff00] transition-colors group flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-black font-['Bricolage_Grotesque'] text-white group-hover:text-[#bcff00] transition-colors uppercase">
                        {val.title} <br />
                        <span className="text-gray-400 group-hover:text-white text-xs">{val.subtitle}</span>
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed mt-2">
                        {val.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 uppercase tracking-widest border-t border-white/10 pt-4">
              <span>YEHULU CREATIVE FRAMEWORK</span>
              <span>3-STEP METHODOLOGY</span>
            </div>
          </div>

        </div>


        {/* ---------------- 03. PROVEN IMPACT / BUILT FOR GROWTH ---------------- */}
        <div className="space-y-8 pt-8 border-t border-white/10">
          <div className="text-center sm:text-left space-y-2">
            <span className="text-xs font-mono font-black tracking-[0.3em] text-[#bcff00] uppercase block">
              PROVEN IMPACT
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-['Bricolage_Grotesque']">
              BUILT FOR <span className="text-[#bcff00]">GROWTH.</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {metrics.map((m) => (
              <div 
                key={m.label}
                className="bg-[#0a0a0a] border border-white/10 p-6 sm:p-8 space-y-2 hover:border-[#bcff00] transition-all group"
              >
                <span className="text-4xl sm:text-6xl font-black text-[#bcff00] font-['Bricolage_Grotesque'] block tracking-tight group-hover:scale-105 transition-transform origin-left">
                  {m.value}
                </span>
                <span className="text-xs font-bold tracking-widest text-white uppercase block font-mono">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>


        {/* ---------------- 04. HAVE A PROJECT? / LET'S TALK BANNER ---------------- */}
        <div className="bg-[#bcff00] text-black p-8 sm:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <span className="text-xs font-black uppercase tracking-widest bg-black text-[#bcff00] px-3 py-1 inline-block font-mono">
              LET'S TALK
            </span>
            <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tight font-['Bricolage_Grotesque'] leading-none">
              HAVE A PROJECT?
            </h3>
            <p className="text-xs sm:text-sm font-bold tracking-wider uppercase text-black/80">
              LET'S BUILD SOMETHING GREAT TOGETHER.
            </p>
          </div>

          <a 
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white hover:bg-zinc-900 font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 shadow-2xl shrink-0"
          >
            <span>START A PROJECT</span>
            <span>↗</span>
          </a>
        </div>

      </div>
    </section>
  );
}
