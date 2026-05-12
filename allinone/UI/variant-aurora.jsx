/* VARIANT 1 — AURORA
   Soft immersive gradient mesh. Glass cards on a living aurora background.
   Big editorial type, rounded everything, color = mood.
*/

const auroraStyles = {
  shell: {
    width: '100%', height: '100%', overflow: 'hidden', position: 'relative',
    background: '#05050a',
    fontFamily: "'Geist', system-ui, sans-serif",
    color: '#f5f5fa',
  },
  bg: {
    position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
  },
  blob: (color, x, y, delay = 0) => ({
    position: 'absolute', width: 600, height: 600, left: x, top: y,
    background: `radial-gradient(circle at center, ${color} 0%, transparent 60%)`,
    filter: 'blur(80px)', opacity: 0.55,
    animation: `drift ${18 + delay * 3}s ease-in-out infinite`,
    animationDelay: `${delay}s`,
  }),
  noise: {
    position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.4,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
  },
};

function AuroraBG() {
  return (
    <div style={auroraStyles.bg}>
      <div style={auroraStyles.blob('#ec4899', '-10%', '-15%', 0)}></div>
      <div style={auroraStyles.blob('#3b82f6', '60%', '10%', 2)}></div>
      <div style={auroraStyles.blob('#a855f7', '20%', '70%', 4)}></div>
      <div style={auroraStyles.blob('#06b6d4', '70%', '60%', 6)}></div>
      <div style={auroraStyles.noise}></div>
    </div>
  );
}

function AuroraNav({ active = 'Gallery' }) {
  const items = [
    { name: 'Home', icon: <Icon.Bolt /> },
    { name: 'Documents', icon: <Icon.Doc /> },
    { name: 'Gallery', icon: <Icon.Image /> },
    { name: 'Users', icon: <Icon.Users /> },
    { name: 'Upload', icon: <Icon.Upload /> },
    { name: 'Settings', icon: <Icon.Settings /> },
  ];
  return (
    <div style={{
      position: 'relative', zIndex: 10, padding: '20px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <AIOLogo size={32} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px 6px 8px',
          background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, fontSize: 13,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'linear-gradient(135deg,#f59e0b,#ec4899)',
            display: 'grid', placeItems: 'center', fontSize: 11,
          }}><Icon.Mail style={{ width: 12, height: 12 }}/></div>
          <span style={{ color: '#e5e7eb', fontWeight: 500 }}>lieutienthinh03</span>
          <Icon.Chevron style={{ width: 12, height: 12, color: '#9ca3af' }}/>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: 4, background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 999,
      }}>
        {items.map(it => (
          <div key={it.name} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 999, fontSize: 13.5, fontWeight: 500,
            color: it.name === active ? '#fff' : '#9ca3af',
            background: it.name === active ? 'linear-gradient(135deg, rgba(236,72,153,0.4), rgba(168,85,247,0.4))' : 'transparent',
            boxShadow: it.name === active ? '0 4px 20px rgba(236,72,153,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {it.icon}<span>{it.name}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={{
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          boxShadow: '0 0 20px rgba(245,158,11,0.4)',
        }}>
          <Icon.Sun style={{ color: '#fff' }}/>
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg,#1f2937,#374151)',
          display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>SA</div>
        <button style={{
          width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)', display: 'grid', placeItems: 'center',
          color: '#9ca3af', cursor: 'pointer',
        }}><Icon.Logout /></button>
      </div>
    </div>
  );
}

function GlassCard({ children, style, ...rest }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 24,
      boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
      ...style,
    }} {...rest}>{children}</div>
  );
}

// === GALLERY ===
function AuroraGallery() {
  return (
    <div style={auroraStyles.shell}>
      <AuroraBG />
      <AuroraNav active="Gallery" />
      <div style={{ position: 'relative', zIndex: 5, padding: '8px 48px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 13, color: '#f9a8d4', fontWeight: 500, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Your visual memory
            </div>
            <h1 style={{
              margin: 0, fontSize: 72, fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 0.95,
              fontFamily: "'Instrument Serif', serif",
            }}>
              <span style={{ fontStyle: 'italic',
                background: 'linear-gradient(135deg,#fbbf24,#ec4899,#a855f7)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>Gallery</span>
              <span style={{ color: '#6b7280', fontStyle: 'normal', fontSize: 32, fontFamily: "'Geist', sans-serif", fontWeight: 300, marginLeft: 16 }}>
                — 142 moments
              </span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <GlassCard style={{ padding: '10px 16px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <Icon.Search style={{ color: '#9ca3af', width: 14, height: 14 }}/>
              <span style={{ color: '#9ca3af' }}>Find by mood, color, scene…</span>
              <span style={{ marginLeft: 24, padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: 4, fontSize: 11, color: '#d1d5db', fontFamily: 'Geist Mono' }}>⌘K</span>
            </GlassCard>
          </div>
        </div>

        {/* Tag chips */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
            background: 'linear-gradient(135deg,#ec4899,#a855f7)', color: '#fff',
            boxShadow: '0 4px 16px rgba(236,72,153,0.4)',
          }}>All · 142</div>
          {SAMPLE_TAGS.map(t => (
            <div key={t.name} style={{
              padding: '8px 14px 8px 10px', borderRadius: 999, fontSize: 13,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)', color: '#d1d5db',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }}></span>
              <span>{t.name}</span>
              <span style={{ color: '#6b7280', fontSize: 11 }}>{t.count}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, padding: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
            <button style={{ padding: 8, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}><Icon.Grid /></button>
            <button style={{ padding: 8, background: 'transparent', border: 'none', borderRadius: 8, color: '#6b7280', cursor: 'pointer' }}><Icon.List /></button>
          </div>
        </div>

        {/* Masonry grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {SAMPLE_FILES.map((f, i) => {
            const heights = [280, 360, 240, 320, 300, 260];
            return (
              <GlassCard key={i} style={{
                gridRow: i === 1 ? 'span 2' : 'auto',
                height: i === 1 ? 540 : heights[i % heights.length],
                padding: 0, overflow: 'hidden', cursor: 'pointer',
                transition: 'transform 0.3s, box-shadow 0.3s',
              }}>
                <div style={{
                  width: '100%', height: 'calc(100% - 64px)',
                  background: imgPlaceholder(i, f.color),
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `radial-gradient(circle at 30% 30%, ${f.color}55, transparent 60%)`,
                  }}></div>
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
                    color: '#fff', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.color }}></span>
                    {f.tag}
                  </div>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#f5f5fa', marginBottom: 2 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{f.size} · {f.date}</div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// === DOCUMENTS ===
function AuroraDocuments() {
  return (
    <div style={auroraStyles.shell}>
      <AuroraBG />
      <AuroraNav active="Documents" />
      <div style={{ position: 'relative', zIndex: 5, padding: '8px 48px 48px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>

        {/* Sidebar — folder tree */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14, padding: '0 8px' }}>
            Folders
          </div>
          <GlassCard style={{ padding: 8 }}>
            {SAMPLE_FOLDERS.map((f, i) => (
              <div key={f.name} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 12, fontSize: 13.5,
                background: i === 0 ? 'rgba(236,72,153,0.15)' : 'transparent',
                color: i === 0 ? '#fff' : '#d1d5db', cursor: 'pointer',
                border: i === 0 ? '1px solid rgba(236,72,153,0.3)' : '1px solid transparent',
              }}>
                <span style={{ fontSize: 16 }}>{f.icon}</span>
                <span style={{ flex: 1, fontWeight: 500 }}>{f.name}</span>
                <span style={{ fontSize: 11, color: '#6b7280', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}>{f.count}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, fontSize: 13.5, color: '#9ca3af', cursor: 'pointer' }}>
              <Icon.Plus style={{ width: 14, height: 14 }}/>
              <span>New folder</span>
            </div>
          </GlassCard>

          {/* Storage */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 28, marginBottom: 14, padding: '0 8px' }}>
            Storage
          </div>
          <GlassCard style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>4.7 GB <span style={{ color: '#6b7280', fontWeight: 400 }}>of 10 GB</span></span>
              <span style={{ fontSize: 12, color: '#f9a8d4' }}>47%</span>
            </div>
            <div style={{
              width: '100%', height: 8, borderRadius: 999,
              background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative',
            }}>
              <div style={{
                width: '47%', height: '100%',
                background: 'linear-gradient(90deg,#ec4899,#a855f7,#3b82f6)',
                borderRadius: 999, boxShadow: '0 0 12px rgba(236,72,153,0.6)',
              }}></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 11, color: '#9ca3af' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#ec4899' }}></span>Images 2.1G</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#a855f7' }}></span>Docs 1.8G</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Main */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 500, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                On lieutienthinh03
              </div>
              <h1 style={{
                margin: 0, fontSize: 64, fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 0.95,
                fontFamily: "'Instrument Serif', serif",
              }}>
                <span style={{ fontStyle: 'italic',
                  background: 'linear-gradient(135deg,#a5b4fc,#3b82f6)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                }}>Documents</span>
              </h1>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {SAMPLE_DOCS.slice(0, 8).map((d, i) => {
              const ext = fileExtColor(d.ext);
              return (
                <GlassCard key={i} style={{ padding: 18, cursor: 'pointer', transition: 'transform 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{
                      width: 44, height: 56, borderRadius: 8, background: ext.bg,
                      display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color: '#fff',
                      letterSpacing: '0.05em', boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                      position: 'relative',
                    }}>
                      {ext.label}
                      <div style={{ position: 'absolute', top: 0, right: 0, width: 12, height: 12,
                        background: 'rgba(255,255,255,0.3)',
                        clipPath: 'polygon(0 0, 100% 100%, 100% 0)' }}></div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{d.size}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, lineHeight: 1.3, wordBreak: 'break-word' }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{d.date}</span>
                    <span>·</span>
                    <span style={{ color: SAMPLE_TAGS.find(t=>t.name===d.tag)?.color }}>{d.tag}</span>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// === USERS ===
function AuroraUsers() {
  return (
    <div style={auroraStyles.shell}>
      <AuroraBG />
      <AuroraNav active="Users" />
      <div style={{ position: 'relative', zIndex: 5, padding: '8px 48px 48px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 13, color: '#86efac', fontWeight: 500, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              4 humans · 1 admin
            </div>
            <h1 style={{
              margin: 0, fontSize: 64, fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 0.95,
              fontFamily: "'Instrument Serif', serif",
            }}>
              <span style={{ fontStyle: 'italic',
                background: 'linear-gradient(135deg,#86efac,#06b6d4)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>People</span>
              <span style={{ color: '#6b7280', fontStyle: 'normal', fontSize: 28, fontFamily: "'Geist', sans-serif", fontWeight: 300, marginLeft: 14 }}>
                with access
              </span>
            </h1>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 999, border: 'none',
            background: 'linear-gradient(135deg,#10b981,#06b6d4)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
          }}>
            <Icon.Plus style={{ width: 14, height: 14 }}/>
            Invite human
          </button>
        </div>

        {/* User cards as garden of orbs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {SAMPLE_USERS.map((u, i) => (
            <GlassCard key={i} style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
              {u.you && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  background: 'rgba(59,130,246,0.2)', color: '#60a5fa',
                  border: '1px solid rgba(59,130,246,0.4)',
                }}>YOU</div>
              )}
              <div style={{
                width: 64, height: 64, borderRadius: '50%', marginBottom: 16,
                background: u.role === 'ADMIN'
                  ? 'linear-gradient(135deg,#3b82f6,#a855f7,#ec4899)'
                  : 'linear-gradient(135deg,#10b981,#06b6d4)',
                display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 700,
                boxShadow: u.role === 'ADMIN' ? '0 8px 24px rgba(168,85,247,0.4)' : '0 8px 24px rgba(16,185,129,0.3)',
                position: 'relative',
              }}>
                {u.initials}
                <div style={{
                  position: 'absolute', inset: -3, borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}></div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16, wordBreak: 'break-all' }}>{u.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                  background: u.role === 'ADMIN' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                  color: u.role === 'ADMIN' ? '#60a5fa' : '#34d399',
                  border: `1px solid ${u.role === 'ADMIN' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'}`,
                }}>{u.role}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ padding: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fbbf24', cursor: 'pointer' }}><Icon.Edit /></button>
                  {!u.you && <button style={{ padding: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#9ca3af', cursor: 'pointer' }}><Icon.Trash /></button>}
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 12 }}>Joined {u.date}</div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

// === UPLOAD ===
function AuroraUpload() {
  return (
    <div style={auroraStyles.shell}>
      <AuroraBG />
      <AuroraNav active="Upload" />
      <div style={{ position: 'relative', zIndex: 5, padding: '24px 48px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100% - 100px)' }}>

        <div style={{ width: '100%', maxWidth: 720 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{
              margin: 0, fontSize: 56, fontWeight: 300, letterSpacing: '-0.04em',
              fontFamily: "'Instrument Serif', serif",
            }}>
              <span style={{ fontStyle: 'italic',
                background: 'linear-gradient(135deg,#fbbf24,#ec4899)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>Drop something beautiful</span>
            </h1>
            <div style={{ fontSize: 14, color: '#9ca3af', marginTop: 8 }}>
              Up to 10 GB · Auto-tagged with AI · Synced everywhere
            </div>
          </div>

          {/* Drop zone */}
          <GlassCard style={{
            padding: 56, textAlign: 'center', position: 'relative', overflow: 'hidden',
            border: '2px dashed rgba(236,72,153,0.3)',
          }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.4,
              background: 'radial-gradient(circle at center, rgba(236,72,153,0.2), transparent 60%)',
              animation: 'pulse-glow 3s ease-in-out infinite',
            }}></div>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 96, height: 96, margin: '0 auto 20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#ec4899,#a855f7,#3b82f6)',
                display: 'grid', placeItems: 'center',
                boxShadow: '0 16px 48px rgba(236,72,153,0.4)',
                animation: 'blob 8s ease-in-out infinite',
              }}>
                <Icon.Upload style={{ width: 36, height: 36, color: '#fff' }}/>
              </div>
              <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Drag files here</div>
              <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>or click to browse · paste from clipboard · ⌘V</div>
              <button style={{
                padding: '14px 32px', borderRadius: 999, border: 'none',
                background: 'linear-gradient(135deg,#ec4899,#a855f7)',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(236,72,153,0.4)',
              }}>Choose files</button>
            </div>
          </GlassCard>

          {/* Tag suggestions + recent */}
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <GlassCard style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                Suggested tags
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SAMPLE_TAGS.map(t => (
                  <div key={t.name} style={{
                    padding: '6px 12px', borderRadius: 999, fontSize: 12,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color }}></span>
                    {t.name}
                  </div>
                ))}
                <div style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <Icon.Plus style={{ width: 12, height: 12 }}/>new
                </div>
              </div>
            </GlassCard>
            <GlassCard style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                Recent uploads
              </div>
              {SAMPLE_FILES.slice(0,2).map((f,i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: imgPlaceholder(i, f.color) }}></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{f.date}</div>
                  </div>
                  <Icon.Check style={{ color: '#34d399', width: 14, height: 14 }}/>
                </div>
              ))}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

// === SETTINGS ===
function AuroraSettings() {
  return (
    <div style={auroraStyles.shell}>
      <AuroraBG />
      <AuroraNav active="Settings" />
      <div style={{ position: 'relative', zIndex: 5, padding: '8px 48px 48px',
        display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32 }}>

        {/* Settings nav */}
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: '-0.03em', margin: '20px 0 28px',
            fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
            background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>Settings</h1>
          {['Drives', 'Account', 'Appearance', 'Tags', 'Notifications', 'API keys'].map((s,i) => (
            <div key={s} style={{
              padding: '10px 14px', borderRadius: 12, fontSize: 13.5, marginBottom: 4,
              background: i === 0 ? 'rgba(251,191,36,0.12)' : 'transparent',
              color: i === 0 ? '#fff' : '#9ca3af', cursor: 'pointer', fontWeight: 500,
              border: i === 0 ? '1px solid rgba(251,191,36,0.25)' : '1px solid transparent',
            }}>{s}</div>
          ))}
        </div>

        {/* Main */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Connected drives</div>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>Manage Google Drive accounts and sync rules</div>
            </div>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 999, border: 'none',
              background: 'linear-gradient(135deg,#fbbf24,#ec4899)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(251,191,36,0.3)',
            }}>
              <Icon.Plus style={{ width: 14, height: 14 }}/>
              Add drive
            </button>
          </div>

          <GlassCard style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg,#fbbf24,#ec4899)',
                display: 'grid', placeItems: 'center',
                boxShadow: '0 8px 24px rgba(251,191,36,0.3)',
              }}>
                <Icon.Mail style={{ width: 24, height: 24, color: '#fff' }}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>lieutienthinh03</div>
                  <div style={{ padding: '2px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>DEFAULT</div>
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>13 files · folder 15MEu0l...</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#fbbf24', cursor: 'pointer' }}><Icon.Edit /></button>
                <button style={{ padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#9ca3af', cursor: 'pointer' }}><Icon.Trash /></button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Credentials', val: 'Active', color: '#34d399' },
                { label: 'Auth', val: 'Verified', color: '#34d399' },
                { label: 'Last sync', val: '2m ago', color: '#60a5fa' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: s.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}` }}></span>
                    {s.val}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                padding: '10px 18px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>Re-authenticate</button>
              <button style={{
                padding: '10px 18px', borderRadius: 10,
                background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', border: 'none',
                color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>Sync now</button>
            </div>
          </GlassCard>

          {/* Storage breakdown */}
          <GlassCard style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Storage breakdown</div>
            <div style={{
              height: 36, borderRadius: 999, overflow: 'hidden',
              display: 'flex', background: 'rgba(255,255,255,0.04)',
            }}>
              <div style={{ width: '32%', background: 'linear-gradient(90deg,#ec4899,#f9a8d4)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, color: '#fff' }}>Images 2.1G</div>
              <div style={{ width: '28%', background: 'linear-gradient(90deg,#a855f7,#c084fc)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, color: '#fff' }}>Docs 1.8G</div>
              <div style={{ width: '12%', background: 'linear-gradient(90deg,#3b82f6,#60a5fa)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, color: '#fff' }}>Other</div>
              <div style={{ flex: 1, background: 'transparent', display: 'grid', placeItems: 'center', fontSize: 11, color: '#6b7280' }}>5.3G free</div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

window.AuroraScreens = {
  Gallery: AuroraGallery,
  Documents: AuroraDocuments,
  Users: AuroraUsers,
  Upload: AuroraUpload,
  Settings: AuroraSettings,
};
