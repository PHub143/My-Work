/* VARIANT 2 — SPECTRUM OS
   Dense pro-tool. Sidebar + content + inspector. Command palette feel.
   Mono numerics, tight type, surgical color use, terminal-y.
*/

const spectrumColors = {
  bg: '#0a0e0d',
  panel: '#10161a',
  panel2: '#161e22',
  border: '#1f2a30',
  borderHi: '#2c3a42',
  text: '#e8efe9',
  dim: '#6b7a7e',
  dimmer: '#4a5559',
  accent: '#00ff88',     // mint green primary
  accent2: '#ff5577',    // hot pink secondary
  warn: '#ffaa00',
  blue: '#3ba0ff',
};

const spectrumStyles = {
  shell: {
    width: '100%', height: '100%', overflow: 'hidden', position: 'relative',
    background: spectrumColors.bg, color: spectrumColors.text,
    fontFamily: "'Geist', system-ui, sans-serif", fontSize: 13,
    display: 'grid', gridTemplateColumns: '220px 1fr 280px', gridTemplateRows: '40px 1fr 28px',
  },
};

function SpectrumChrome({ active = 'Gallery', children, headerExtras }) {
  // Returns the full shell with topbar, sidebar, statusbar — main content via children
  return (
    <div style={spectrumStyles.shell}>
      {/* TOP BAR */}
      <div style={{
        gridColumn: '1 / -1', gridRow: 1,
        background: spectrumColors.panel, borderBottom: `1px solid ${spectrumColors.border}`,
        display: 'flex', alignItems: 'center', padding: '0 14px', gap: 14,
      }}>
        <AIOLogo size={18} />
        <div style={{ width: 1, height: 18, background: spectrumColors.border, marginRight: 4 }}></div>
        <div style={{ display: 'flex', gap: 2, fontSize: 12, color: spectrumColors.dim }}>
          <span style={{ color: spectrumColors.text, fontWeight: 500 }}>lieutienthinh03</span>
          <span> / </span>
          <span style={{ color: spectrumColors.text }}>{active.toLowerCase()}</span>
        </div>

        {/* Command bar */}
        <div style={{
          flex: 1, maxWidth: 460, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 12px', background: spectrumColors.bg,
          border: `1px solid ${spectrumColors.border}`, borderRadius: 6,
          fontSize: 12, color: spectrumColors.dim, fontFamily: "'Geist Mono', monospace",
        }}>
          <Icon.Search style={{ width: 12, height: 12, color: spectrumColors.accent }}/>
          <span style={{ color: spectrumColors.dim }}>›</span>
          <span>type a command, file, or tag…</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <kbd style={{ padding: '1px 5px', background: spectrumColors.panel2, border: `1px solid ${spectrumColors.border}`, borderRadius: 3, fontSize: 10 }}>⌘</kbd>
            <kbd style={{ padding: '1px 5px', background: spectrumColors.panel2, border: `1px solid ${spectrumColors.border}`, borderRadius: 3, fontSize: 10 }}>K</kbd>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <div style={{ fontSize: 11, color: spectrumColors.dim, fontFamily: "'Geist Mono', monospace" }}>
            <span style={{ color: spectrumColors.accent }}>●</span> synced 2m ago
          </div>
          <div style={{ width: 1, height: 18, background: spectrumColors.border }}></div>
          <div style={{
            width: 26, height: 26, borderRadius: 4,
            background: spectrumColors.panel2, border: `1px solid ${spectrumColors.border}`,
            display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: spectrumColors.accent,
          }}>SA</div>
        </div>
      </div>

      {/* SIDEBAR */}
      <div style={{
        gridColumn: 1, gridRow: '2 / 4',
        background: spectrumColors.panel, borderRight: `1px solid ${spectrumColors.border}`,
        padding: '12px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: spectrumColors.dimmer, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 10px' }}>Workspace</div>
        {[
          { name: 'Home', icon: <Icon.Bolt /> },
          { name: 'Documents', icon: <Icon.Doc />, count: 124 },
          { name: 'Gallery', icon: <Icon.Image />, count: 142 },
          { name: 'Users', icon: <Icon.Users />, count: 4 },
          { name: 'Upload', icon: <Icon.Upload /> },
          { name: 'Settings', icon: <Icon.Settings /> },
        ].map(it => (
          <div key={it.name} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 10px', borderRadius: 5, fontSize: 12.5,
            background: it.name === active ? `${spectrumColors.accent}18` : 'transparent',
            color: it.name === active ? spectrumColors.accent : spectrumColors.text,
            borderLeft: it.name === active ? `2px solid ${spectrumColors.accent}` : '2px solid transparent',
            paddingLeft: it.name === active ? 12 : 14,
            cursor: 'pointer', fontWeight: 500,
          }}>
            <span style={{ opacity: 0.7 }}>{it.icon}</span>
            <span style={{ flex: 1 }}>{it.name}</span>
            {it.count !== undefined && <span style={{ fontSize: 10.5, color: spectrumColors.dim, fontFamily: "'Geist Mono', monospace" }}>{it.count}</span>}
          </div>
        ))}

        <div style={{ fontSize: 10, fontWeight: 700, color: spectrumColors.dimmer, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 10px 6px' }}>Folders</div>
        {SAMPLE_FOLDERS.map(f => (
          <div key={f.name} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '5px 14px', borderRadius: 5, fontSize: 12, color: spectrumColors.dim, cursor: 'pointer',
          }}>
            <Icon.Folder style={{ width: 12, height: 12, color: spectrumColors.dimmer }}/>
            <span style={{ flex: 1 }}>{f.name}</span>
            <span style={{ fontSize: 10.5, fontFamily: "'Geist Mono', monospace" }}>{f.count}</span>
          </div>
        ))}

        <div style={{ fontSize: 10, fontWeight: 700, color: spectrumColors.dimmer, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 10px 6px' }}>Tags</div>
        {SAMPLE_TAGS.map(t => (
          <div key={t.name} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '5px 14px', borderRadius: 5, fontSize: 12, color: spectrumColors.dim, cursor: 'pointer',
          }}>
            <span style={{ width: 6, height: 6, background: t.color, transform: 'rotate(45deg)' }}></span>
            <span style={{ flex: 1 }}>#{t.name}</span>
            <span style={{ fontSize: 10.5, fontFamily: "'Geist Mono', monospace" }}>{t.count}</span>
          </div>
        ))}

        {/* Storage at bottom */}
        <div style={{ marginTop: 'auto', padding: 10, background: spectrumColors.panel2, borderRadius: 6, border: `1px solid ${spectrumColors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: spectrumColors.dim, marginBottom: 6, fontFamily: "'Geist Mono', monospace" }}>
            <span>STORAGE</span>
            <span style={{ color: spectrumColors.accent }}>4.7 / 10G</span>
          </div>
          <div style={{ height: 4, background: spectrumColors.border, borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: '21%', background: spectrumColors.accent2 }}></div>
            <div style={{ width: '18%', background: spectrumColors.blue }}></div>
            <div style={{ width: '8%', background: spectrumColors.warn }}></div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{
        gridColumn: 2, gridRow: 2, overflowY: 'auto', overflowX: 'hidden',
        background: spectrumColors.bg,
      }}>
        {children}
      </div>

      {/* INSPECTOR */}
      <div style={{
        gridColumn: 3, gridRow: 2, overflowY: 'auto',
        background: spectrumColors.panel, borderLeft: `1px solid ${spectrumColors.border}`,
        padding: 14,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: spectrumColors.dimmer, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Activity</div>
        {SAMPLE_ACTIVITY.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 4 ? `1px solid ${spectrumColors.border}` : 'none' }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', marginTop: 5,
              background: a.type === 'up' ? spectrumColors.accent : a.type === 'tag' ? spectrumColors.warn : a.type === 'share' ? spectrumColors.accent2 : spectrumColors.blue,
            }}></div>
            <div style={{ flex: 1, fontSize: 11.5 }}>
              <div><span style={{ color: spectrumColors.text, fontWeight: 500 }}>{a.who}</span> <span style={{ color: spectrumColors.dim }}>{a.what}</span></div>
              <div style={{ color: spectrumColors.dim, fontFamily: "'Geist Mono', monospace", fontSize: 10.5, marginTop: 2 }}>{a.target}</div>
            </div>
            <div style={{ fontSize: 10.5, color: spectrumColors.dimmer, fontFamily: "'Geist Mono', monospace" }}>{a.when}</div>
          </div>
        ))}

        <div style={{ fontSize: 10, fontWeight: 700, color: spectrumColors.dimmer, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '20px 0 10px' }}>Quick stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { k: 'FILES', v: '170', color: spectrumColors.accent },
            { k: 'TAGS', v: '5', color: spectrumColors.warn },
            { k: 'USERS', v: '4', color: spectrumColors.blue },
            { k: 'DRIVES', v: '1', color: spectrumColors.accent2 },
          ].map(s => (
            <div key={s.k} style={{ padding: 10, background: spectrumColors.bg, border: `1px solid ${spectrumColors.border}`, borderRadius: 4 }}>
              <div style={{ fontSize: 9.5, color: spectrumColors.dim, letterSpacing: '0.1em' }}>{s.k}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color, fontFamily: "'Geist Mono', monospace", lineHeight: 1.1 }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: spectrumColors.dimmer, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '20px 0 10px' }}>Shortcuts</div>
        {[
          ['New upload', '⌘U'], ['Search', '⌘K'], ['New folder', '⌘N'], ['Toggle theme', '⌘\\'],
        ].map(([k,v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 11.5, color: spectrumColors.dim }}>
            <span>{k}</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", color: spectrumColors.text }}>{v}</span>
          </div>
        ))}
      </div>

      {/* STATUS BAR */}
      <div style={{
        gridColumn: '1 / -1', gridRow: 3,
        background: spectrumColors.panel, borderTop: `1px solid ${spectrumColors.border}`,
        display: 'flex', alignItems: 'center', padding: '0 14px', gap: 16,
        fontSize: 10.5, fontFamily: "'Geist Mono', monospace", color: spectrumColors.dim,
      }}>
        <span><span style={{ color: spectrumColors.accent }}>●</span> ONLINE</span>
        <span>·</span>
        <span>Drive: lieutienthinh03</span>
        <span>·</span>
        <span>13 remote / 170 local</span>
        <span style={{ marginLeft: 'auto' }}>v2.4.1</span>
        <span>·</span>
        <span>{active.toLowerCase()}.tsx</span>
      </div>
    </div>
  );
}

// === GALLERY (mosaic + filters) ===
function SpectrumGallery() {
  return (
    <SpectrumChrome active="Gallery">
      <div style={{ padding: 18 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>Gallery</h1>
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: spectrumColors.dim }}>
            142 items · 2.1G · last sync 2m
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: spectrumColors.dim, marginBottom: 16 }}>
          Images & videos on lieutienthinh03 — sortable, taggable, searchable
        </div>

        {/* Filter bar */}
        <div style={{
          display: 'flex', gap: 6, padding: 6, marginBottom: 14,
          background: spectrumColors.panel, border: `1px solid ${spectrumColors.border}`, borderRadius: 6,
          alignItems: 'center', fontSize: 12,
        }}>
          {['All · 142', 'Images · 94', 'Videos · 12', 'Recent · 24', 'Untagged · 8'].map((f,i) => (
            <div key={f} style={{
              padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
              background: i === 0 ? `${spectrumColors.accent}1a` : 'transparent',
              color: i === 0 ? spectrumColors.accent : spectrumColors.text,
              fontWeight: i === 0 ? 600 : 400,
            }}>{f}</div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: spectrumColors.dim }}>sort:</span>
            <span style={{ padding: '4px 8px', background: spectrumColors.bg, border: `1px solid ${spectrumColors.border}`, borderRadius: 4, fontSize: 11, fontFamily: "'Geist Mono', monospace" }}>date_desc ▾</span>
            <div style={{ width: 1, height: 14, background: spectrumColors.border, margin: '0 4px' }}></div>
            <button style={{ padding: 5, background: spectrumColors.bg, border: `1px solid ${spectrumColors.borderHi}`, borderRadius: 4, color: spectrumColors.accent, cursor: 'pointer' }}><Icon.Grid /></button>
            <button style={{ padding: 5, background: 'transparent', border: `1px solid ${spectrumColors.border}`, borderRadius: 4, color: spectrumColors.dim, cursor: 'pointer' }}><Icon.List /></button>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {SAMPLE_FILES.map((f, i) => (
            <div key={i} style={{
              background: spectrumColors.panel, border: `1px solid ${spectrumColors.border}`, borderRadius: 6,
              overflow: 'hidden', cursor: 'pointer', position: 'relative',
            }}>
              <div style={{
                aspectRatio: '4/3', background: imgPlaceholder(i, f.color),
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', bottom: 6, left: 6,
                  padding: '2px 6px', background: 'rgba(0,0,0,0.7)', borderRadius: 3,
                  fontSize: 9.5, fontFamily: "'Geist Mono', monospace", color: '#fff',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: f.color }}></span>
                  {f.tag}
                </div>
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  fontSize: 9.5, fontFamily: "'Geist Mono', monospace", color: '#fff',
                  padding: '2px 5px', background: 'rgba(0,0,0,0.7)', borderRadius: 3,
                }}>{f.size}</div>
              </div>
              <div style={{ padding: '8px 10px', borderTop: `1px solid ${spectrumColors.border}` }}>
                <div style={{ fontSize: 11.5, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div style={{ fontSize: 10, color: spectrumColors.dim, fontFamily: "'Geist Mono', monospace" }}>{f.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SpectrumChrome>
  );
}

// === DOCUMENTS (table + preview) ===
function SpectrumDocuments() {
  return (
    <SpectrumChrome active="Documents">
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>Documents</h1>
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: spectrumColors.dim }}>
            {SAMPLE_DOCS.length} files · 31.2M
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: spectrumColors.dim, marginBottom: 16 }}>
          Files on lieutienthinh03
        </div>

        {/* Table */}
        <div style={{ background: spectrumColors.panel, border: `1px solid ${spectrumColors.border}`, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 80px 110px 110px 90px',
            gap: 12, padding: '8px 14px', background: spectrumColors.panel2,
            borderBottom: `1px solid ${spectrumColors.border}`,
            fontSize: 10, fontWeight: 700, color: spectrumColors.dim, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            <span></span><span>Name</span><span>Size</span><span>Tag</span><span>Modified</span><span style={{ textAlign: 'right' }}>Actions</span>
          </div>
          {SAMPLE_DOCS.map((d, i) => {
            const ext = fileExtColor(d.ext);
            const tagColor = SAMPLE_TAGS.find(t => t.name === d.tag)?.color || spectrumColors.dim;
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '32px 1fr 80px 110px 110px 90px', gap: 12,
                padding: '10px 14px', alignItems: 'center', fontSize: 12.5,
                background: i === 1 ? `${spectrumColors.accent}0d` : 'transparent',
                borderLeft: i === 1 ? `2px solid ${spectrumColors.accent}` : '2px solid transparent',
                paddingLeft: i === 1 ? 12 : 14,
                borderBottom: i < SAMPLE_DOCS.length - 1 ? `1px solid ${spectrumColors.border}` : 'none',
              }}>
                <div style={{
                  width: 22, height: 28, borderRadius: 3, background: ext.bg,
                  display: 'grid', placeItems: 'center', fontSize: 8, fontWeight: 800, color: '#fff',
                }}>{ext.label}</div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11.5, color: spectrumColors.dim }}>{d.size}</div>
                <div>
                  <span style={{
                    padding: '2px 7px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                    background: `${tagColor}22`, color: tagColor, border: `1px solid ${tagColor}44`,
                  }}>#{d.tag}</span>
                </div>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: spectrumColors.dim }}>{d.date}</div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button style={{ padding: 4, background: 'transparent', border: `1px solid ${spectrumColors.border}`, borderRadius: 3, color: spectrumColors.warn, cursor: 'pointer' }}><Icon.Edit /></button>
                  <button style={{ padding: 4, background: 'transparent', border: `1px solid ${spectrumColors.border}`, borderRadius: 3, color: spectrumColors.dim, cursor: 'pointer' }}><Icon.Trash /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SpectrumChrome>
  );
}

// === USERS ===
function SpectrumUsers() {
  return (
    <SpectrumChrome active="Users">
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 4 }}>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>User Management</h1>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: spectrumColors.dim }}>
                {SAMPLE_USERS.length} accounts
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: spectrumColors.dim }}>Create, edit, and manage system accounts</div>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 5, border: `1px solid ${spectrumColors.accent}`,
            background: `${spectrumColors.accent}18`, color: spectrumColors.accent,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <Icon.Plus style={{ width: 12, height: 12 }}/>
            Add User
            <kbd style={{ marginLeft: 6, padding: '1px 5px', background: spectrumColors.bg, border: `1px solid ${spectrumColors.border}`, borderRadius: 2, fontSize: 9.5, color: spectrumColors.dim }}>⌘N</kbd>
          </button>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { k: 'TOTAL', v: 4, sub: '+0 this week', color: spectrumColors.accent },
            { k: 'ADMIN', v: 1, sub: 'system admin', color: spectrumColors.blue },
            { k: 'ACTIVE 24H', v: 3, sub: 'last activity', color: spectrumColors.warn },
            { k: 'PENDING', v: 0, sub: 'invites sent', color: spectrumColors.dim },
          ].map(s => (
            <div key={s.k} style={{ padding: 12, background: spectrumColors.panel, border: `1px solid ${spectrumColors.border}`, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: spectrumColors.dim, letterSpacing: '0.1em' }}>{s.k}</div>
              <div style={{ fontSize: 28, fontWeight: 600, fontFamily: "'Geist Mono', monospace", color: s.color, lineHeight: 1.2 }}>{s.v}</div>
              <div style={{ fontSize: 10.5, color: spectrumColors.dim }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: spectrumColors.panel, border: `1px solid ${spectrumColors.border}`, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 1fr 80px 100px 90px',
            gap: 12, padding: '8px 14px', background: spectrumColors.panel2,
            borderBottom: `1px solid ${spectrumColors.border}`,
            fontSize: 10, fontWeight: 700, color: spectrumColors.dim, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            <span></span><span>Name</span><span>Email</span><span>Role</span><span>Created</span><span style={{ textAlign: 'right' }}>Actions</span>
          </div>
          {SAMPLE_USERS.map((u, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 1fr 80px 100px 90px', gap: 12,
              padding: '12px 14px', alignItems: 'center', fontSize: 12.5,
              borderBottom: i < SAMPLE_USERS.length - 1 ? `1px solid ${spectrumColors.border}` : 'none',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: u.role === 'ADMIN' ? `linear-gradient(135deg,${spectrumColors.accent2},${spectrumColors.blue})` : spectrumColors.panel2,
                border: `1px solid ${spectrumColors.border}`,
                display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700,
              }}>{u.initials}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>{u.name}</span>
                {u.you && <span style={{ fontSize: 9.5, padding: '1px 5px', background: `${spectrumColors.blue}22`, color: spectrumColors.blue, borderRadius: 3, fontWeight: 600 }}>YOU</span>}
              </div>
              <div style={{ fontSize: 11.5, color: spectrumColors.dim, fontFamily: "'Geist Mono', monospace" }}>{u.email}</div>
              <div>
                <span style={{
                  padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                  background: u.role === 'ADMIN' ? `${spectrumColors.blue}22` : `${spectrumColors.accent}22`,
                  color: u.role === 'ADMIN' ? spectrumColors.blue : spectrumColors.accent,
                  border: `1px solid ${u.role === 'ADMIN' ? spectrumColors.blue : spectrumColors.accent}55`,
                }}>{u.role}</span>
              </div>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: spectrumColors.dim }}>{u.date}</div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button style={{ padding: 4, background: 'transparent', border: `1px solid ${spectrumColors.border}`, borderRadius: 3, color: spectrumColors.warn, cursor: 'pointer' }}><Icon.Edit /></button>
                <button style={{ padding: 4, background: 'transparent', border: `1px solid ${spectrumColors.border}`, borderRadius: 3, color: spectrumColors.dim, cursor: 'pointer', opacity: u.you ? 0.4 : 1 }}><Icon.Trash /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SpectrumChrome>
  );
}

// === UPLOAD ===
function SpectrumUpload() {
  return (
    <SpectrumChrome active="Upload">
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>Upload</h1>
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: spectrumColors.dim }}>
            target: lieutienthinh03 · max 10G
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: spectrumColors.dim, marginBottom: 16 }}>Drop, browse, or paste from clipboard</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
          {/* Drop zone */}
          <div style={{
            background: spectrumColors.panel, border: `2px dashed ${spectrumColors.borderHi}`, borderRadius: 6,
            padding: 40, textAlign: 'center', position: 'relative', minHeight: 280,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{
              width: 56, height: 56, margin: '0 auto 16px', borderRadius: 8,
              background: spectrumColors.panel2, border: `1px solid ${spectrumColors.border}`,
              display: 'grid', placeItems: 'center',
            }}>
              <Icon.Upload style={{ width: 22, height: 22, color: spectrumColors.accent }}/>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Drop files to upload</div>
            <div style={{ fontSize: 12, color: spectrumColors.dim, marginBottom: 16, fontFamily: "'Geist Mono', monospace" }}>
              accepted: * · max 10GB · auto-tagged
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button style={{
                padding: '7px 14px', borderRadius: 5, border: `1px solid ${spectrumColors.accent}`,
                background: spectrumColors.accent, color: spectrumColors.bg,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>Choose file</button>
              <button style={{
                padding: '7px 14px', borderRadius: 5, border: `1px solid ${spectrumColors.border}`,
                background: spectrumColors.panel2, color: spectrumColors.text,
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>Paste from clipboard <kbd style={{ marginLeft: 4, padding: '1px 4px', background: spectrumColors.bg, borderRadius: 2, fontSize: 9.5 }}>⌘V</kbd></button>
            </div>

            {/* progress example */}
            <div style={{ marginTop: 24, padding: 12, background: spectrumColors.bg, border: `1px solid ${spectrumColors.border}`, borderRadius: 4, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 6, fontFamily: "'Geist Mono', monospace" }}>
                <span>aurora-mountains.jpg</span>
                <span style={{ color: spectrumColors.accent }}>67%</span>
              </div>
              <div style={{ height: 3, background: spectrumColors.border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: '67%', height: '100%', background: `linear-gradient(90deg,${spectrumColors.accent},${spectrumColors.blue})` }}></div>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: spectrumColors.panel, border: `1px solid ${spectrumColors.border}`, borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: spectrumColors.dim, letterSpacing: '0.1em', marginBottom: 10 }}>TAG WITH</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {SAMPLE_TAGS.map(t => (
                  <div key={t.name} style={{
                    padding: '4px 8px', borderRadius: 3, fontSize: 11,
                    background: spectrumColors.bg, border: `1px solid ${t.color}55`,
                    color: t.color, cursor: 'pointer', fontWeight: 500,
                  }}>#{t.name}</div>
                ))}
              </div>
              <input placeholder="add new tag..." style={{
                width: '100%', marginTop: 10, padding: '6px 10px',
                background: spectrumColors.bg, border: `1px solid ${spectrumColors.border}`, borderRadius: 4,
                color: spectrumColors.text, fontSize: 12, outline: 'none', fontFamily: 'Geist',
              }}/>
            </div>

            <div style={{ background: spectrumColors.panel, border: `1px solid ${spectrumColors.border}`, borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: spectrumColors.dim, letterSpacing: '0.1em', marginBottom: 10 }}>DESTINATION</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: spectrumColors.bg, border: `1px solid ${spectrumColors.border}`, borderRadius: 4 }}>
                <Icon.Folder style={{ width: 14, height: 14, color: spectrumColors.warn }}/>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Photos 2025 / Wallpapers</span>
              </div>
            </div>

            <button disabled style={{
              padding: '10px 16px', borderRadius: 5,
              background: spectrumColors.panel, border: `1px solid ${spectrumColors.border}`,
              color: spectrumColors.dim, fontSize: 13, fontWeight: 600, cursor: 'not-allowed',
            }}>Upload (no file selected)</button>
          </div>
        </div>
      </div>
    </SpectrumChrome>
  );
}

// === SETTINGS ===
function SpectrumSettings() {
  return (
    <SpectrumChrome active="Settings">
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>Settings</h1>
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: spectrumColors.dim }}>drives · auth · sync</span>
        </div>
        <div style={{ fontSize: 12.5, color: spectrumColors.dim, marginBottom: 16 }}>Manage connected Google Drive accounts</div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${spectrumColors.border}`, marginBottom: 14 }}>
          {['Drives', 'Account', 'Appearance', 'Tags', 'API keys'].map((t, i) => (
            <div key={t} style={{
              padding: '8px 14px', fontSize: 12.5, cursor: 'pointer',
              borderBottom: i === 0 ? `2px solid ${spectrumColors.accent}` : '2px solid transparent',
              color: i === 0 ? spectrumColors.text : spectrumColors.dim, fontWeight: i === 0 ? 600 : 400,
              marginBottom: -1,
            }}>{t}</div>
          ))}
        </div>

        {/* Drive card */}
        <div style={{ background: spectrumColors.panel, border: `1px solid ${spectrumColors.border}`, borderRadius: 6, marginBottom: 12 }}>
          <div style={{ padding: 16, borderBottom: `1px solid ${spectrumColors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 6,
                background: `linear-gradient(135deg, ${spectrumColors.accent}, ${spectrumColors.blue})`,
                display: 'grid', placeItems: 'center',
              }}>
                <Icon.Mail style={{ width: 16, height: 16, color: '#000' }}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>lieutienthinh03</span>
                  <span style={{ fontSize: 9.5, padding: '1px 6px', background: `${spectrumColors.blue}22`, color: spectrumColors.blue, borderRadius: 3, fontWeight: 700, letterSpacing: '0.05em' }}>DEFAULT</span>
                </div>
                <div style={{ fontSize: 11, color: spectrumColors.dim, fontFamily: "'Geist Mono', monospace", marginTop: 2 }}>13 files · folder 15MEu0lfBoD5...</div>
              </div>
              <button style={{ padding: '6px 12px', background: spectrumColors.accent, border: 'none', borderRadius: 4, color: spectrumColors.bg, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>Sync now</button>
              <button style={{ padding: 6, background: 'transparent', border: `1px solid ${spectrumColors.border}`, borderRadius: 4, color: spectrumColors.warn, cursor: 'pointer' }}><Icon.Edit /></button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: `1px solid ${spectrumColors.border}` }}>
            {[
              { k: 'STATUS', v: 'CONNECTED', color: spectrumColors.accent, dot: true },
              { k: 'AUTH', v: 'verified', color: spectrumColors.accent },
              { k: 'LAST SYNC', v: '2m ago', color: spectrumColors.text },
              { k: 'NEXT SYNC', v: 'in 13m', color: spectrumColors.dim },
            ].map((s, i) => (
              <div key={s.k} style={{ padding: 14, borderRight: i < 3 ? `1px solid ${spectrumColors.border}` : 'none' }}>
                <div style={{ fontSize: 9.5, color: spectrumColors.dim, letterSpacing: '0.1em', marginBottom: 4 }}>{s.k}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: s.color, fontFamily: "'Geist Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}` }}></span>}
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add another */}
        <button style={{
          width: '100%', padding: 14, borderRadius: 6,
          background: 'transparent', border: `1px dashed ${spectrumColors.border}`,
          color: spectrumColors.dim, fontSize: 12.5, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon.Plus style={{ width: 14, height: 14 }}/>
          Connect another Google Drive
        </button>

        {/* Sync log */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: spectrumColors.dim, letterSpacing: '0.1em', marginBottom: 8 }}>SYNC LOG</div>
          <div style={{ background: spectrumColors.panel, border: `1px solid ${spectrumColors.border}`, borderRadius: 6, padding: 12, fontFamily: "'Geist Mono', monospace", fontSize: 11.5, color: spectrumColors.dim, lineHeight: 1.7 }}>
            <div><span style={{ color: spectrumColors.accent }}>[14:32:01]</span> sync ok · 13 files in 0.6s</div>
            <div><span style={{ color: spectrumColors.accent }}>[14:30:55]</span> auth ok · token refresh</div>
            <div><span style={{ color: spectrumColors.warn }}>[14:18:03]</span> rate limit 429 → backoff 10s</div>
            <div><span style={{ color: spectrumColors.accent }}>[14:18:14]</span> recovered · 3 files queued</div>
            <div><span style={{ color: spectrumColors.accent }}>[14:00:00]</span> sync ok · 13 files in 0.4s</div>
          </div>
        </div>
      </div>
    </SpectrumChrome>
  );
}

window.SpectrumScreens = {
  Gallery: SpectrumGallery,
  Documents: SpectrumDocuments,
  Users: SpectrumUsers,
  Upload: SpectrumUpload,
  Settings: SpectrumSettings,
};
