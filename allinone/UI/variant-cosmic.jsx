/* VARIANT 3 — COSMIC POP
   Bold editorial maximalism. Big serif headlines, color-blocked sections,
   chunky tabs, sticker-like UI elements. Each screen has its own hue.
*/

const cosmicC = {
  bg: '#0a0612',
  ink: '#fef9f0',
  cream: '#f5ecdc',
  shadow: 'rgba(0,0,0,0.6)',
  pink: '#ff4d8f',
  yellow: '#ffd166',
  cyan: '#06d6a0',
  purple: '#9d4edd',
  orange: '#ff7849',
  blue: '#4cc9f0',
};

const cosmicShell = (hue) => ({
  width: '100%', height: '100%', overflow: 'hidden', position: 'relative',
  background: cosmicC.bg, color: cosmicC.ink,
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
});

function CosmicNav({ active }) {
  const items = ['Documents', 'Gallery', 'Users', 'Upload', 'Settings'];
  return (
    <div style={{
      padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'relative', zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          padding: '8px 14px', background: cosmicC.ink, borderRadius: 14,
          transform: 'rotate(-2deg)', boxShadow: `4px 4px 0 ${cosmicC.pink}`,
        }}>
          <AIOLogo size={26} animated={false} />
        </div>
        <div style={{
          padding: '7px 14px', borderRadius: 999,
          background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(255,255,255,0.15)`,
          fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cosmicC.cyan, boxShadow: `0 0 8px ${cosmicC.cyan}` }}></span>
          <span style={{ fontWeight: 500 }}>lieutienthinh03</span>
          <Icon.Chevron style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.5)' }}/>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 0, padding: 5,
        background: 'rgba(255,255,255,0.06)', borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {items.map(it => {
          const isActive = it === active;
          return (
            <div key={it} style={{
              padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
              background: isActive ? cosmicC.ink : 'transparent',
              color: isActive ? cosmicC.bg : cosmicC.ink, cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isActive ? `inset 0 -2px 0 rgba(0,0,0,0.1)` : 'none',
            }}>{it}</div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          padding: '7px 12px', borderRadius: 999, background: cosmicC.yellow, color: cosmicC.bg,
          fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: `2px 2px 0 ${cosmicC.bg}`,
        }}>
          <Icon.Sparkle style={{ width: 12, height: 12 }}/>
          Pro
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `linear-gradient(135deg, ${cosmicC.pink}, ${cosmicC.purple})`,
          display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, color: '#fff',
          border: `2px solid ${cosmicC.ink}`,
        }}>SA</div>
      </div>
    </div>
  );
}

// Decorative shapes scattered in background
function CosmicDecor({ hue }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 80, right: 60, width: 60, height: 60,
        background: cosmicC.yellow, borderRadius: '50%', opacity: 0.9,
        animation: 'float-slow 12s ease-in-out infinite',
      }}></div>
      <div style={{
        position: 'absolute', bottom: 80, left: 80, width: 80, height: 80,
        background: hue, transform: 'rotate(15deg)',
        animation: 'blob 14s ease-in-out infinite',
        opacity: 0.7,
      }}></div>
      <svg style={{ position: 'absolute', top: 200, left: '45%', width: 40, height: 40, animation: 'spin-slow 20s linear infinite' }} viewBox="0 0 40 40">
        <path d="M20 0 L24 16 L40 20 L24 24 L20 40 L16 24 L0 20 L16 16 Z" fill={cosmicC.cyan}/>
      </svg>
      <div style={{
        position: 'absolute', top: 120, left: 240, width: 24, height: 24,
        background: cosmicC.orange, borderRadius: 4, transform: 'rotate(20deg)',
      }}></div>
    </div>
  );
}

// === GALLERY ===
function CosmicGallery() {
  return (
    <div style={cosmicShell(cosmicC.pink)}>
      <CosmicDecor hue={cosmicC.pink}/>
      <CosmicNav active="Gallery"/>
      <div style={{ position: 'relative', zIndex: 5, padding: '8px 48px 48px' }}>

        {/* Big editorial header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, gap: 32 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                padding: '4px 12px', background: cosmicC.cyan, color: cosmicC.bg,
                borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                transform: 'rotate(-2deg)',
              }}>VOL. 04</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>· 142 entries · summer 2026</span>
            </div>
            <h1 style={{
              margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400,
              fontSize: 130, letterSpacing: '-0.05em', lineHeight: 0.85,
            }}>
              The <span style={{ fontStyle: 'italic', color: cosmicC.yellow, position: 'relative' }}>
                gallery
                <svg style={{ position: 'absolute', bottom: -8, left: 0, width: '100%', height: 16 }} viewBox="0 0 200 16" preserveAspectRatio="none">
                  <path d="M2 12 Q 50 2, 100 8 T 198 6" stroke={cosmicC.pink} strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
              <span style={{ display: 'block', marginTop: 4 }}>of <em style={{ fontStyle: 'italic', color: cosmicC.pink }}>everything</em>.</span>
            </h1>
          </div>
          <div style={{
            padding: 16, background: cosmicC.ink, color: cosmicC.bg, borderRadius: 16,
            transform: 'rotate(2deg)', maxWidth: 220, boxShadow: `4px 4px 0 ${cosmicC.purple}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4, color: cosmicC.purple }}>STORAGE</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Instrument Serif', serif", lineHeight: 1 }}>
              4.7 / 10<span style={{ fontSize: 16 }}>GB</span>
            </div>
            <div style={{ height: 6, background: '#e5d5b8', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: '47%', height: '100%', background: `linear-gradient(90deg,${cosmicC.pink},${cosmicC.orange})` }}></div>
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            padding: '8px 16px', background: cosmicC.ink, color: cosmicC.bg,
            borderRadius: 999, fontSize: 13, fontWeight: 700, boxShadow: `3px 3px 0 ${cosmicC.pink}`,
          }}>★ All · 142</div>
          {SAMPLE_TAGS.map((t, i) => {
            const colors = [cosmicC.cyan, cosmicC.yellow, cosmicC.purple, cosmicC.orange, cosmicC.blue];
            return (
              <div key={t.name} style={{
                padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${colors[i]}`,
                color: cosmicC.ink, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i] }}></span>
                #{t.name}
                <span style={{ fontSize: 11, opacity: 0.6, fontFamily: "'Geist Mono', monospace" }}>{t.count}</span>
              </div>
            );
          })}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>view:</span>
            <div style={{ display: 'flex', gap: 4, padding: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 8 }}>
              <button style={{ padding: 6, background: cosmicC.pink, border: 'none', borderRadius: 5, color: cosmicC.ink, cursor: 'pointer' }}><Icon.Grid /></button>
              <button style={{ padding: 6, background: 'transparent', border: 'none', borderRadius: 5, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><Icon.List /></button>
            </div>
          </div>
        </div>

        {/* Big mosaic */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridAutoRows: '160px', gap: 14 }}>
          {SAMPLE_FILES.map((f, i) => {
            const spans = [
              { col: 'span 2', row: 'span 2' },
              { col: 'span 2', row: 'span 1' },
              { col: 'span 2', row: 'span 1' },
              { col: 'span 2', row: 'span 1' },
              { col: 'span 2', row: 'span 1' },
              { col: 'span 4', row: 'span 1' },
            ];
            const s = spans[i] || spans[0];
            const tagColors = { work: cosmicC.cyan, personal: cosmicC.yellow, study: cosmicC.purple, draft: cosmicC.orange, misc: cosmicC.pink };
            return (
              <div key={i} style={{
                gridColumn: s.col, gridRow: s.row,
                borderRadius: 18, overflow: 'hidden', position: 'relative',
                background: imgPlaceholder(i, f.color),
                cursor: 'pointer', transform: i === 0 ? 'rotate(-1deg)' : i === 3 ? 'rotate(1deg)' : 'none',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 30%, ${f.color}55, transparent 60%)` }}></div>
                <div style={{
                  position: 'absolute', top: 12, left: 12,
                  padding: '4px 10px', background: tagColors[f.tag], color: cosmicC.bg,
                  borderRadius: 999, fontSize: 11, fontWeight: 700,
                }}>#{f.tag}</div>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{f.size} · {f.date}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// === DOCUMENTS ===
function CosmicDocuments() {
  return (
    <div style={cosmicShell(cosmicC.blue)}>
      <CosmicDecor hue={cosmicC.blue}/>
      <CosmicNav active="Documents"/>
      <div style={{ position: 'relative', zIndex: 5, padding: '8px 48px 48px' }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{
              padding: '4px 12px', background: cosmicC.blue, color: cosmicC.bg,
              borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              transform: 'rotate(-2deg)',
            }}>10 FILES</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>· text · pdf · 31.2 MB</span>
          </div>
          <h1 style={{
            margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400,
            fontSize: 110, letterSpacing: '-0.04em', lineHeight: 0.9,
          }}>
            Read, review, <span style={{ fontStyle: 'italic', color: cosmicC.cyan }}>repeat.</span>
          </h1>
        </div>

        {/* Folder pills */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {SAMPLE_FOLDERS.map((f, i) => {
            const colors = [cosmicC.pink, cosmicC.cyan, cosmicC.yellow, cosmicC.orange, cosmicC.purple];
            const active = i === 0;
            return (
              <div key={f.name} style={{
                padding: '10px 16px', borderRadius: 14,
                background: active ? colors[i] : 'rgba(255,255,255,0.06)',
                border: active ? 'none' : `1.5px solid ${colors[i]}55`,
                color: active ? cosmicC.bg : cosmicC.ink,
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                fontWeight: 600, fontSize: 13,
                transform: i % 2 === 0 ? 'rotate(-1deg)' : 'rotate(1deg)',
                boxShadow: active ? `3px 3px 0 ${cosmicC.bg}` : 'none',
              }}>
                <span style={{ fontSize: 16 }}>{f.icon}</span>
                {f.name}
                <span style={{
                  padding: '2px 8px', background: active ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)',
                  borderRadius: 999, fontSize: 11, fontFamily: "'Geist Mono', monospace",
                }}>{f.count}</span>
              </div>
            );
          })}
        </div>

        {/* Doc grid as cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          {SAMPLE_DOCS.map((d, i) => {
            const ext = fileExtColor(d.ext);
            const cardColors = [cosmicC.ink, cosmicC.yellow, cosmicC.cyan, cosmicC.pink, cosmicC.orange];
            const cardBg = cardColors[i % cardColors.length];
            const isInk = i % cardColors.length === 0;
            const txt = cosmicC.bg;
            return (
              <div key={i} style={{
                padding: 16, borderRadius: 16, background: cardBg, color: txt,
                cursor: 'pointer', position: 'relative', minHeight: 160,
                transform: `rotate(${(i % 3 - 1) * 0.8}deg)`,
                boxShadow: `4px 4px 0 rgba(0,0,0,0.3)`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 800,
                    background: cosmicC.bg, color: cardBg, letterSpacing: '0.05em',
                  }}>{ext.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.6 }}>{d.size}</div>
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 700, lineHeight: 1.2, marginBottom: 12,
                  fontFamily: "'Instrument Serif', serif", wordBreak: 'break-word',
                  fontStyle: 'italic',
                }}>{d.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'absolute', bottom: 14, left: 14, right: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{d.date}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                    background: cosmicC.bg, color: cardBg,
                  }}>#{d.tag}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// === USERS ===
function CosmicUsers() {
  return (
    <div style={cosmicShell(cosmicC.cyan)}>
      <CosmicDecor hue={cosmicC.cyan}/>
      <CosmicNav active="Users"/>
      <div style={{ position: 'relative', zIndex: 5, padding: '8px 48px 48px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                padding: '4px 12px', background: cosmicC.cyan, color: cosmicC.bg,
                borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                transform: 'rotate(-2deg)',
              }}>4 ACCOUNTS</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>· 1 admin · 3 users</span>
            </div>
            <h1 style={{
              margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400,
              fontSize: 110, letterSpacing: '-0.04em', lineHeight: 0.9,
            }}>
              Your <span style={{ fontStyle: 'italic', color: cosmicC.yellow }}>crew.</span>
            </h1>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 22px', borderRadius: 999, border: 'none',
            background: cosmicC.pink, color: cosmicC.ink,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: `4px 4px 0 ${cosmicC.ink}`,
            transform: 'rotate(-1.5deg)',
          }}>
            <Icon.Plus />
            Invite a friend
          </button>
        </div>

        {/* User cards as polaroids */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, padding: '20px 0' }}>
          {SAMPLE_USERS.map((u, i) => {
            const cardBgs = [cosmicC.yellow, cosmicC.pink, cosmicC.cyan, cosmicC.ink];
            const cardBg = cardBgs[i];
            const tilts = [-3, 2, -2, 3];
            return (
              <div key={i} style={{
                padding: 16, paddingBottom: 20, borderRadius: 6,
                background: cosmicC.cream, color: cosmicC.bg,
                transform: `rotate(${tilts[i]}deg)`,
                boxShadow: `0 12px 40px rgba(0,0,0,0.4)`,
                position: 'relative',
              }}>
                {/* "Tape" */}
                <div style={{
                  position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%) rotate(-2deg)',
                  width: 60, height: 18, background: 'rgba(255,206,86,0.6)',
                  borderRadius: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}></div>
                <div style={{
                  aspectRatio: '1', borderRadius: 4, marginBottom: 14,
                  background: cardBg,
                  display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    fontSize: 80, fontWeight: 800, fontFamily: "'Instrument Serif', serif",
                    fontStyle: 'italic', color: 'rgba(0,0,0,0.85)', lineHeight: 1,
                  }}>{u.initials}</div>
                  {u.you && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      padding: '3px 8px', background: cosmicC.bg, color: cosmicC.ink,
                      borderRadius: 999, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em',
                    }}>YOU</div>
                  )}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700, fontFamily: "'Instrument Serif', serif",
                  fontStyle: 'italic', marginBottom: 4,
                }}>{u.name}</div>
                <div style={{ fontSize: 10.5, opacity: 0.6, marginBottom: 10, wordBreak: 'break-all' }}>{u.email}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                    background: u.role === 'ADMIN' ? cosmicC.purple : cosmicC.bg,
                    color: '#fff',
                  }}>{u.role}</span>
                  <span style={{ fontSize: 10, opacity: 0.5 }}>{u.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// === UPLOAD ===
function CosmicUpload() {
  return (
    <div style={cosmicShell(cosmicC.orange)}>
      <CosmicDecor hue={cosmicC.orange}/>
      <CosmicNav active="Upload"/>
      <div style={{ position: 'relative', zIndex: 5, padding: '24px 48px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <div style={{ textAlign: 'center', marginBottom: 28, maxWidth: 720 }}>
          <div style={{
            display: 'inline-block', padding: '4px 12px', background: cosmicC.orange, color: cosmicC.bg,
            borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            transform: 'rotate(-2deg)', marginBottom: 14,
          }}>UP TO 10 GB</div>
          <h1 style={{
            margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400,
            fontSize: 96, letterSpacing: '-0.04em', lineHeight: 0.9,
          }}>
            Send it <span style={{ fontStyle: 'italic', color: cosmicC.yellow }}>up.</span>
          </h1>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 14 }}>
            Auto-tagged · Auto-organized · Synced to <span style={{ color: cosmicC.cyan, fontWeight: 600 }}>lieutienthinh03</span>
          </div>
        </div>

        {/* Big drop zone */}
        <div style={{
          width: '100%', maxWidth: 760, padding: 40,
          background: cosmicC.ink, color: cosmicC.bg, borderRadius: 24,
          border: `4px dashed ${cosmicC.bg}`, position: 'relative',
          boxShadow: `8px 8px 0 ${cosmicC.pink}`,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center' }}>
            <div>
              <div style={{
                fontSize: 28, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
                marginBottom: 8, fontWeight: 500,
              }}>Drag your stuff here.</div>
              <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 18 }}>or click below · paste with ⌘V · accepts pretty much anything</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{
                  padding: '12px 22px', borderRadius: 999, border: 'none',
                  background: cosmicC.pink, color: cosmicC.ink,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  boxShadow: `3px 3px 0 ${cosmicC.bg}`,
                }}>Choose file</button>
                <button style={{
                  padding: '12px 22px', borderRadius: 999, border: `2px solid ${cosmicC.bg}`,
                  background: 'transparent', color: cosmicC.bg,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>Paste ⌘V</button>
              </div>
            </div>
            <div style={{
              width: 140, height: 140, borderRadius: '50%',
              background: `conic-gradient(from 0deg, ${cosmicC.pink}, ${cosmicC.yellow}, ${cosmicC.cyan}, ${cosmicC.purple}, ${cosmicC.pink})`,
              display: 'grid', placeItems: 'center',
              animation: 'spin-slow 24s linear infinite',
              boxShadow: `0 12px 40px rgba(0,0,0,0.3)`,
            }}>
              <div style={{ width: 110, height: 110, borderRadius: '50%', background: cosmicC.ink, display: 'grid', placeItems: 'center' }}>
                <Icon.Upload style={{ width: 36, height: 36, color: cosmicC.bg }}/>
              </div>
            </div>
          </div>
        </div>

        {/* Tag picker */}
        <div style={{ width: '100%', maxWidth: 760, marginTop: 20, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Tag with →</div>
          {SAMPLE_TAGS.map((t, i) => {
            const colors = [cosmicC.cyan, cosmicC.yellow, cosmicC.purple, cosmicC.orange, cosmicC.pink];
            return (
              <div key={t.name} style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                background: colors[i], color: cosmicC.bg, cursor: 'pointer',
                transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 1.5}deg)`,
                boxShadow: `2px 2px 0 ${cosmicC.bg}`,
              }}>#{t.name}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// === SETTINGS ===
function CosmicSettings() {
  return (
    <div style={cosmicShell(cosmicC.purple)}>
      <CosmicDecor hue={cosmicC.purple}/>
      <CosmicNav active="Settings"/>
      <div style={{ position: 'relative', zIndex: 5, padding: '8px 48px 48px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                padding: '4px 12px', background: cosmicC.purple, color: cosmicC.ink,
                borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                transform: 'rotate(-2deg)',
              }}>1 DRIVE</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>· connected & synced</span>
            </div>
            <h1 style={{
              margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400,
              fontSize: 96, letterSpacing: '-0.04em', lineHeight: 0.9,
            }}>
              Make it <span style={{ fontStyle: 'italic', color: cosmicC.cyan }}>yours.</span>
            </h1>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 999, border: 'none',
            background: cosmicC.yellow, color: cosmicC.bg,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: `3px 3px 0 ${cosmicC.ink}`,
            transform: 'rotate(-1.5deg)',
          }}>
            <Icon.Plus />
            Add drive
          </button>
        </div>

        {/* Tab strip */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['Drives', 'Account', 'Appearance', 'Tags', 'Notifications'].map((t, i) => {
            const colors = [cosmicC.pink, cosmicC.cyan, cosmicC.yellow, cosmicC.orange, cosmicC.purple];
            const active = i === 0;
            return (
              <div key={t} style={{
                padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                background: active ? colors[i] : 'rgba(255,255,255,0.06)',
                color: active ? cosmicC.bg : cosmicC.ink,
                border: active ? 'none' : `1.5px solid rgba(255,255,255,0.15)`,
                cursor: 'pointer',
                boxShadow: active ? `2px 2px 0 ${cosmicC.ink}` : 'none',
                transform: active ? 'rotate(-1deg)' : 'none',
              }}>{t}</div>
            );
          })}
        </div>

        {/* Drive card — chunky */}
        <div style={{
          padding: 28, borderRadius: 22, background: cosmicC.ink, color: cosmicC.bg,
          boxShadow: `6px 6px 0 ${cosmicC.purple}`, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: `linear-gradient(135deg, ${cosmicC.pink}, ${cosmicC.orange})`,
              display: 'grid', placeItems: 'center',
              transform: 'rotate(-4deg)', boxShadow: `3px 3px 0 ${cosmicC.bg}`,
            }}>
              <Icon.Mail style={{ width: 26, height: 26, color: '#fff' }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{
                  fontSize: 26, fontWeight: 700, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
                }}>lieutienthinh03</span>
                <span style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                  background: cosmicC.cyan, color: cosmicC.bg,
                }}>DEFAULT</span>
              </div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>13 files · folder 15MEu0lfBoD5...</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: 10, background: cosmicC.yellow, border: 'none', borderRadius: 10, color: cosmicC.bg, cursor: 'pointer', boxShadow: `2px 2px 0 ${cosmicC.bg}` }}><Icon.Edit /></button>
              <button style={{ padding: 10, background: cosmicC.bg, border: 'none', borderRadius: 10, color: cosmicC.ink, cursor: 'pointer' }}><Icon.Trash /></button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
            {[
              { k: 'Status', v: '✓ Live', color: cosmicC.cyan },
              { k: 'Auth', v: '✓ Verified', color: cosmicC.cyan },
              { k: 'Files', v: '13', color: cosmicC.pink },
              { k: 'Last sync', v: '2m ago', color: cosmicC.purple },
            ].map(s => (
              <div key={s.k} style={{
                padding: 12, borderRadius: 10, background: s.color, color: cosmicC.bg,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 }}>{s.k}</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{
              padding: '10px 18px', borderRadius: 999, border: `2px solid ${cosmicC.bg}`,
              background: 'transparent', color: cosmicC.bg, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>Re-authenticate</button>
            <button style={{
              padding: '10px 18px', borderRadius: 999, border: 'none',
              background: cosmicC.pink, color: cosmicC.ink, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: `2px 2px 0 ${cosmicC.bg}`,
            }}>Sync now ↻</button>
          </div>
        </div>

        {/* Storage breakdown */}
        <div style={{
          padding: 24, borderRadius: 22, background: 'rgba(255,255,255,0.06)',
          border: '1.5px solid rgba(255,255,255,0.12)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 14 }}>STORAGE · 4.7 OF 10 GB</div>
          <div style={{
            height: 44, borderRadius: 12, overflow: 'hidden',
            display: 'flex', background: 'rgba(255,255,255,0.05)', gap: 4, padding: 4,
          }}>
            <div style={{ width: '32%', background: cosmicC.pink, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: cosmicC.bg }}>Images 2.1G</div>
            <div style={{ width: '28%', background: cosmicC.cyan, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: cosmicC.bg }}>Docs 1.8G</div>
            <div style={{ width: '12%', background: cosmicC.yellow, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: cosmicC.bg }}>Misc</div>
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>5.3G free</div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.CosmicScreens = {
  Gallery: CosmicGallery,
  Documents: CosmicDocuments,
  Users: CosmicUsers,
  Upload: CosmicUpload,
  Settings: CosmicSettings,
};
