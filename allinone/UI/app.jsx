/* Main app — Design Canvas with 3 sections, each holding 5 screens */

const { useState, useEffect } = React;

const SCREENS = ['Gallery', 'Documents', 'Users', 'Upload', 'Settings'];

const VARIANTS = [
  {
    id: 'aurora',
    title: '01 — Aurora',
    subtitle: 'Glassmorphic, immersive gradient mesh. Editorial type, soft & dreamy.',
    screens: () => window.AuroraScreens,
  },
  {
    id: 'spectrum',
    title: '02 — Spectrum OS',
    subtitle: 'Dense pro-tool. Three-pane workspace, command palette, mono numerics.',
    screens: () => window.SpectrumScreens,
  },
  {
    id: 'cosmic',
    title: '03 — Cosmic Pop',
    subtitle: 'Maximalist editorial. Big serif, color-blocked stickers, playful tilts.',
    screens: () => window.CosmicScreens,
  },
];

function App() {
  return (
    <DesignCanvas
      title="AIO — 3 enhanced directions"
      subtitle="Each direction shown across all 5 screens. Drag to reorder, double-click to focus, scroll/zoom to pan."
    >
      {VARIANTS.map(v => (
        <DCSection key={v.id} id={v.id} title={v.title} subtitle={v.subtitle}>
          {SCREENS.map(s => {
            const Comp = v.screens()?.[s];
            return (
              <DCArtboard
                key={`${v.id}-${s}`}
                id={`${v.id}-${s}`}
                label={s}
                width={1280}
                height={820}
              >
                {Comp ? <Comp /> : <div style={{ padding: 40, color: '#666' }}>Loading…</div>}
              </DCArtboard>
            );
          })}
        </DCSection>
      ))}
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
