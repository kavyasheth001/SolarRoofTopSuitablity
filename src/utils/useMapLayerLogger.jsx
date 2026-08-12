import { useEffect, useRef, useState } from 'react';

// ── helpers ───────────────────────────────────────────────

function buildLayerTree(layers) {
  const items = layers?.items ?? layers ?? [];
  return items.map((layer) => ({
    id: layer.id,
    title: layer.title || '(untitled)',
    type: layer.type || 'unknown',
    visible: layer.visible,
    opacity: layer.opacity,
    minScale: layer.minScale,
    maxScale: layer.maxScale,
    listMode: layer.listMode,
    children:
      layer.type === 'group' && layer.layers
        ? buildLayerTree(layer.layers)
        : [],
    _ref: layer,
  }));
}

function countAll(nodes) {
  return nodes.reduce((acc, n) => acc + 1 + countAll(n.children), 0);
}

function printTree(nodes, depth = 0) {
  const indent = '  '.repeat(depth);
  nodes.forEach((n) => {
    const vis = n.visible ? '👁 visible' : '🚫 hidden';
    const meta = [
      n.opacity !== undefined ? `opacity: ${n.opacity}` : '',
      n.minScale ? `minScale: ${n.minScale}` : '',
      n.maxScale ? `maxScale: ${n.maxScale}` : '',
      n.listMode ? `listMode: ${n.listMode}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    if (n.type === 'group') {
      console.group(
        `%c${indent}📁 [group] "${n.title}"  ${vis}  [id: ${n.id}]  (${n.children.length} children)`,
        'color:#6366f1;font-weight:bold;'
      );
      printTree(n.children, depth + 1);
      console.groupEnd();
    } else {
      const color =
        n.type === 'feature'
          ? '#16a34a'
          : n.type === 'integrated-mesh' || n.type === 'scene'
            ? '#db2777'
            : n.type === 'tile' || n.type === 'map-image'
              ? '#d97706'
              : '#64748b';
      console.log(
        `%c${indent}🗂 [${n.type}] "${n.title}"  ${vis}  [id: ${n.id}]\n%c${indent}   ${meta}`,
        `color:${color};font-weight:bold;`,
        'color:#94a3b8;font-size:11px;'
      );
    }
  });
}

// ── sub-components ────────────────────────────────────────

const TYPE_COLOR = {
  feature: '#16a34a',
  group: '#6366f1',
  'integrated-mesh': '#db2777',
  scene: '#db2777',
  tile: '#d97706',
  'map-image': '#d97706',
};

function LayerRow({ node, depth }) {
  const [open, setOpen] = useState(depth < 2);
  const isGroup = node.type === 'group';
  const color = TYPE_COLOR[node.type] || '#64748b';

  return (
    <div style={{ marginLeft: depth * 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 6,
          padding: '3px 4px',
          borderRadius: 4,
          cursor: isGroup ? 'pointer' : 'default',
          background: 'transparent',
        }}
        onClick={() => isGroup && setOpen((o) => !o)}
      >
        {/* expand/collapse arrow */}
        <span
          style={{
            fontSize: 9,
            color: '#94a3b8',
            marginTop: 3,
            minWidth: 10,
            userSelect: 'none',
          }}
        >
          {isGroup ? (open ? '▼' : '▶') : ''}
        </span>

        {/* icon */}
        <span style={{ fontSize: 12, marginTop: 1 }}>
          {isGroup ? '📁' : '🗂'}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* title row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                wordBreak: 'break-all',
              }}
            >
              {node.title}
            </span>

            {/* type badge */}
            <span
              style={{
                fontSize: 9,
                padding: '1px 5px',
                borderRadius: 3,
                background: color + '22',
                color,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {node.type}
            </span>

            {/* visibility badge — live */}
            <span
              style={{
                fontSize: 9,
                padding: '1px 5px',
                borderRadius: 3,
                background: node.visible ? '#dcfce7' : '#fee2e2',
                color: node.visible ? '#15803d' : '#b91c1c',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {node.visible ? '👁 visible' : '🚫 hidden'}
            </span>

            {isGroup && (
              <span
                style={{
                  fontSize: 9,
                  color: '#94a3b8',
                  whiteSpace: 'nowrap',
                }}
              >
                {node.children.length} children
              </span>
            )}
          </div>

          {/* meta row */}
          <div
            style={{
              fontSize: 10,
              color: 'var(--color-text-secondary)',
              marginTop: 1,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span>id: {node.id}</span>
            {node.opacity !== undefined && (
              <span>opacity: {node.opacity}</span>
            )}
            {!!node.minScale && <span>minScale: {node.minScale}</span>}
            {!!node.maxScale && <span>maxScale: {node.maxScale}</span>}
            {node.listMode && <span>listMode: {node.listMode}</span>}
          </div>
        </div>
      </div>

      {/* children */}
      {isGroup && open && (
        <div
          style={{
            borderLeft: '1px solid var(--color-border-tertiary)',
            marginLeft: 14,
            paddingLeft: 2,
          }}
        >
          {node.children.map((child) => (
            <LayerRow key={child.id} node={child} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────

export function MapLayerLogger({ view }) {
  const [tree, setTree] = useState([]);
  const [visible, setVisible] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [tick, setTick] = useState(0);
  const [position, setPosition] = useState({ bottom: 24, right: 24 });
  const watchHandlesRef = useRef([]);
  const panelRef = useRef(null);
  const dragStartRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const resizeStartRef = useRef(null);
  const [size, setSize] = useState({ width: 380, height: 400 });
  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    if (!view?.map) return;

    const rebuild = () => {
      const nodes = buildLayerTree(view.map.layers);
      setTree(nodes);

      const total = countAll(nodes);
      console.group(
        '%c🗺  Map Layer Tree',
        'color:#1a73e8;font-size:14px;font-weight:bold;'
      );
      console.log(`Top-level layers: ${view.map.layers.length}`);
      console.log(`Total layers (all depths): ${total}`);
      console.log('Legend:  👁 visible   🚫 hidden   📁 group   🗂 layer');
      console.log('─────────────────────────────────────────────────');
      printTree(nodes);
      console.groupEnd();
    };

    const attachWatchers = (layers) => {
      const items = layers?.items ?? layers ?? [];
      items.forEach((layer) => {
        const h = layer.watch('visible', () => setTick((t) => t + 1));
        watchHandlesRef.current.push(h);
        if (layer.type === 'group' && layer.layers) {
          attachWatchers(layer.layers);
        }
      });
    };

    watchHandlesRef.current.forEach((h) => h.remove());
    watchHandlesRef.current = [];

    if (view.ready) {
      rebuild();
      attachWatchers(view.map.layers);
    } else {
      view.when(() => {
        rebuild();
        attachWatchers(view.map.layers);
      });
    }

    return () => {
      watchHandlesRef.current.forEach((h) => h.remove());
      watchHandlesRef.current = [];
    };
  }, [view, tick]);

  if (!visible) return null;

  const total = countAll(tree);

  const handleHeaderMouseDown = (e) => {
    if (
      e.target.dataset.role === 'close-btn' ||
      e.target.dataset.role === 'collapse-btn'
    )
      return;
    e.preventDefault();
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      right: window.innerWidth - rect.right,
      bottom: window.innerHeight - rect.bottom,
    };
    const onMove = (me) => {
      const dx = dragStartRef.current.mouseX - me.clientX;
      const dy = dragStartRef.current.mouseY - me.clientY;
      setPosition({
        right: Math.max(0, dragStartRef.current.right + dx),
        bottom: Math.max(0, dragStartRef.current.bottom + dy),
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom: position.bottom,
        right: position.right,
        width: minimized ? 220 : size.width,
        height: minimized ? 'auto' : size.height,
        background: 'rgba(255,255,255,0.97)',
        border: '0.5px solid var(--color-border-secondary)',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 10px',
          borderBottom: minimized
            ? 'none'
            : '0.5px solid var(--color-border-tertiary)',
          background: '#1a73e8',
          gap: 8,
          cursor: 'move',
          userSelect: 'none',
          flexShrink: 0,
        }}
        onMouseDown={handleHeaderMouseDown}
      >
        <span style={{ fontSize: 14 }}>🗺</span>
        <span
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 500,
            color: 'white',
          }}
        >
          Map Layer Tree
        </span>
        <span
          style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
          }}
        >
          {total} layers
        </span>
        <button
          data-role="collapse-btn"
          onClick={(e) => {
            e.stopPropagation();
            setMinimized((m) => !m);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            color: 'white',
            padding: '0 2px',
          }}
          title={minimized ? 'Expand' : 'Collapse'}
        >
          {minimized ? '▲' : '▼'}
        </button>
        <button
          data-role="close-btn"
          onClick={(e) => {
            e.stopPropagation();
            setVisible(false);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: 'white',
            padding: '0 2px',
            lineHeight: 1,
          }}
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* stats bar + search */}
      {!minimized && (
        <div
          style={{
            borderBottom: '0.5px solid var(--color-border-tertiary)',
            background: 'var(--color-background-secondary)',
            flexShrink: 0,
          }}
        >
          {/* counts row */}
          <div style={{ display: 'flex', gap: 12, padding: '5px 10px' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
              Top-level: {view?.map?.layers?.length ?? 0}
            </span>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
              Total: {total}
            </span>
            <span
              style={{
                fontSize: 10,
                color: 'var(--color-text-secondary)',
                marginLeft: 'auto',
                fontStyle: 'italic',
              }}
            >
              live
            </span>
          </div>

          {/* search row */}
          <div style={{ padding: '0 8px 8px' }}>
            <input
              type="search"
              placeholder="Search layers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px',
                fontSize: 11,
                border: '0.5px solid var(--color-border-secondary)',
                borderRadius: 6,
                outline: 'none',
                background: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* scrollable tree */}
      {!minimized && (
        <div
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            flex: 1,
            padding: '6px 4px',
          }}
        >
          {tree.length === 0 ? (
            <p
              style={{
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
                padding: '16px',
              }}
            >
              Loading layers…
            </p>
          ) : (
            tree
              .filter((node) =>
                searchTerm.trim() === '' ||
                node.title.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((node) => (
                <LayerRow key={node.id} node={node} depth={0} />
              ))
          )}
        </div>
      )}
      {/* resize handle */}
      {!minimized && (
        <div
          ref={resizeHandleRef}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            resizeStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              width: size.width,
              height: size.height,
            };
            const onMove = (me) => {
              const dx = me.clientX - resizeStartRef.current.x;
              const dy = me.clientY - resizeStartRef.current.y;
              const newWidth = Math.max(280, resizeStartRef.current.width + dx);
              const newHeight = Math.max(200, resizeStartRef.current.height + dy);
              // compensate position so bottom-right anchor stays fixed
              const widthDiff = newWidth - resizeStartRef.current.width;
              const heightDiff = newHeight - resizeStartRef.current.height;
              setSize({ width: newWidth, height: newHeight });
              setPosition((prev) => ({
                right: prev.right - widthDiff,
                bottom: prev.bottom - heightDiff,
              }));
              // update the start ref so delta is relative to last frame
              resizeStartRef.current = {
                ...resizeStartRef.current,
                x: me.clientX,
                y: me.clientY,
                width: newWidth,
                height: newHeight,
              };
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 18,
            height: 18,
            cursor: 'nwse-resize',
            background: 'transparent',
            zIndex: 10000,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M16 2L2 16M12 16H16V12M8 16H4V12"
              stroke="#aaa"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export default MapLayerLogger;