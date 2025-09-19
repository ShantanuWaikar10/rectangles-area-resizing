import React, { useMemo, useRef, useState } from "react";

// === Helper Types ===
type Rect = {
  id: string;
  cx: number; // center x
  cy: number; // center y
  w: number;  // width
  h: number;  // height
  area: number; // constant area target
  color: string;
};

// Clamp utility
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Keep rectangle inside an oval bounds (approximate):
// returns true if (x,y) is inside ellipse centered at (cx,cy) with radii rx, ry
const insideEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return (dx * dx + dy * dy) <= 1;
};

export default function OvalConstantAreaRects() {
  // Canvas size
  const [W, H] = [960, 560];
  // Oval center and radii
  const [oval, setOval] = useState({ cx: W / 2, cy: H / 2, rx: 320, ry: 200 });

  // Initialize 4 rectangles evenly placed inside the oval
  const initialRects: Rect[] = useMemo(() => {
    const colors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"]; // blue/green/amber/red
    const positions = [
      { cx: oval.cx - oval.rx / 2.2, cy: oval.cy - oval.ry / 3 },
      { cx: oval.cx + oval.rx / 2.2, cy: oval.cy - oval.ry / 3 },
      { cx: oval.cx - oval.rx / 2.2, cy: oval.cy + oval.ry / 3 },
      { cx: oval.cx + oval.rx / 2.2, cy: oval.cy + oval.ry / 3 },
    ];
    return positions.map((p, i) => {
      const w = 120, h = 60;
      return {
        id: `R${i + 1}`,
        cx: p.cx,
        cy: p.cy,
        w,
        h,
        area: w * h, // constant area target
        color: colors[i % colors.length],
      } as Rect;
    });
  }, []);

  const [rects, setRects] = useState<Rect[]>(initialRects);

  // Dragging state
  const dragRef = useRef<null | {
    type: "moveRect" | "resizeRectW" | "resizeRectH" | "resizeOvalRX" | "resizeOvalRY";
    id?: string;
    startX: number;
    startY: number;
    orig?: any;
  }>(null);

  const onMouseDownRectMove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dragRef.current = {
      type: "moveRect",
      id,
      startX: e.clientX,
      startY: e.clientY,
      orig: rects.find(r => r.id === id),
    };
  };

  // Resize width handle: adjust width by dx, then recompute height = area / width to keep area constant
  const onMouseDownRectW = (e: React.MouseEvent, id: string, direction: 1 | -1) => {
    e.stopPropagation();
    dragRef.current = {
      type: "resizeRectW",
      id,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...rects.find(r => r.id === id)!, dir: direction },
    };
  };

  // Resize height handle: adjust height by dy, then recompute width = area / height
  const onMouseDownRectH = (e: React.MouseEvent, id: string, direction: 1 | -1) => {
    e.stopPropagation();
    dragRef.current = {
      type: "resizeRectH",
      id,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...rects.find(r => r.id === id)!, dir: direction },
    };
  };

  // Oval resize handles (right/left control rx, top/bottom control ry)
  const onMouseDownOvalRX = (e: React.MouseEvent, direction: 1 | -1) => {
    e.stopPropagation();
    dragRef.current = {
      type: "resizeOvalRX",
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...oval, dir: direction },
    };
  };

  const onMouseDownOvalRY = (e: React.MouseEvent, direction: 1 | -1) => {
    e.stopPropagation();
    dragRef.current = {
      type: "resizeOvalRY",
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...oval, dir: direction },
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (d.type === "moveRect" && d.id && d.orig) {
      setRects(prev => prev.map(r => {
        if (r.id !== d.id) return r;
        const nx = r.cx + dx;
        const ny = r.cy + dy;
        // keep center inside oval
        const cx = clamp(nx, 0, W);
        const cy = clamp(ny, 0, H);
        return { ...r, cx, cy };
      }));
      return;
    }

    if (d.type === "resizeRectW" && d.id && d.orig) {
      const { w: w0, area, cx, cy, dir } = d.orig as Rect & { dir: 1 | -1 };
      let w = Math.max(20, w0 + dir * dx); // min width
      let h = clamp(area / w, 10, 600);    // recompute height to keep area constant
      // Optional: bound by oval — ensure rectangle corners stay reasonably within ellipse
      setRects(prev => prev.map(r => (r.id === d.id ? { ...r, w, h } : r)));
      return;
    }

    if (d.type === "resizeRectH" && d.id && d.orig) {
      const { h: h0, area, dir } = d.orig as Rect & { dir: 1 | -1 };
      let h = Math.max(10, h0 + dir * dy);
      let w = clamp(area / h, 20, 900);
      setRects(prev => prev.map(r => (r.id === d.id ? { ...r, w, h } : r)));
      return;
    }

    if (d.type === "resizeOvalRX" && d.orig) {
      const { rx: rx0, dir } = d.orig as typeof oval & { dir: 1 | -1 };
      const rx = clamp(rx0 + dir * dx, 60, W / 2 - 40);
      setOval(o => ({ ...o, rx }));
      return;
    }

    if (d.type === "resizeOvalRY" && d.orig) {
      const { ry: ry0, dir } = d.orig as typeof oval & { dir: 1 | -1 };
      const ry = clamp(ry0 + dir * dy, 60, H / 2 - 40);
      setOval(o => ({ ...o, ry }));
      return;
    }
  };

  const onMouseUp = () => {
    dragRef.current = null;
    // After finishing a drag, re-center any rect whose edges escaped the oval by clipping center back in
    setRects(prev => prev.map(r => {
      // Try to keep center inside ellipse bounds visually (soft constraint)
      const inEll = insideEllipse(r.cx, r.cy, oval.cx, oval.cy, oval.rx, oval.ry);
      if (inEll) return r;
      // Pull center toward ellipse center if outside
      const nx = clamp(r.cx, oval.cx - oval.rx + r.w / 2, oval.cx + oval.rx - r.w / 2);
      const ny = clamp(r.cy, oval.cy - oval.ry + r.h / 2, oval.cy + oval.ry - r.h / 2);
      return { ...r, cx: nx, cy: ny };
    }));
  };

  // Side panel info
  const InfoRow = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex justify-between text-sm"><span className="text-slate-500">{label}</span><span className="font-medium">{value}</span></div>
  );

  return (
    <div className="w-full h-full p-6 grid grid-cols-12 gap-4 font-sans">
      {/* Canvas */}
      <div className="col-span-8 bg-white rounded-2xl shadow p-4">
        <div className="text-lg font-semibold mb-2">Oval workspace</div>
        <svg
          width={W}
          height={H}
          className="w-full h-auto border rounded-xl"
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Oval */}
          <ellipse cx={oval.cx} cy={oval.cy} rx={oval.rx} ry={oval.ry} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={2} />

          {/* Oval resize handles */}
          {/* Right */}
          <circle cx={oval.cx + oval.rx} cy={oval.cy} r={8} fill="#0ea5e9" onMouseDown={(e) => onMouseDownOvalRX(e, +1)} />
          {/* Left */}
          <circle cx={oval.cx - oval.rx} cy={oval.cy} r={8} fill="#0ea5e9" onMouseDown={(e) => onMouseDownOvalRX(e, -1)} />
          {/* Top */}
          <circle cx={oval.cx} cy={oval.cy - oval.ry} r={8} fill="#10b981" onMouseDown={(e) => onMouseDownOvalRY(e, -1)} />
          {/* Bottom */}
          <circle cx={oval.cx} cy={oval.cy + oval.ry} r={8} fill="#10b981" onMouseDown={(e) => onMouseDownOvalRY(e, +1)} />

          {/* Rectangles */}
          {rects.map((r) => {
            const x = r.cx - r.w / 2;
            const y = r.cy - r.h / 2;
            return (
              <g key={r.id}>
                <rect x={x} y={y} width={r.w} height={r.h} fill={r.color + "20"} stroke={r.color} strokeWidth={2}
                      onMouseDown={(e) => onMouseDownRectMove(e, r.id)} />
                {/* Move handle (center dot) */}
                <circle cx={r.cx} cy={r.cy} r={4} fill={r.color} onMouseDown={(e) => onMouseDownRectMove(e, r.id)} />
                {/* Width handles */}
                <circle cx={x + r.w} cy={r.cy} r={6} fill="#334155" onMouseDown={(e) => onMouseDownRectW(e, r.id, +1)} />
                <circle cx={x} cy={r.cy} r={6} fill="#334155" onMouseDown={(e) => onMouseDownRectW(e, r.id, -1)} />
                {/* Height handles */}
                <circle cx={r.cx} cy={y} r={6} fill="#475569" onMouseDown={(e) => onMouseDownRectH(e, r.id, -1)} />
                <circle cx={r.cx} cy={y + r.h} r={6} fill="#475569" onMouseDown={(e) => onMouseDownRectH(e, r.id, +1)} />

                {/* Label */}
                <text x={r.cx} y={y - 8} textAnchor="middle" fontSize={12} fill="#0f172a">{r.id}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Sidebar */}
      <div className="col-span-4 space-y-4">
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="text-lg font-semibold mb-2">Live values</div>
          <div className="space-y-3">
            <div>
              <div className="text-slate-700 font-medium mb-1">Oval</div>
              <InfoRow label="Center" value={`(${Math.round(oval.cx)}, ${Math.round(oval.cy)})`} />
              <InfoRow label="rx" value={Math.round(oval.rx)} />
              <InfoRow label="ry" value={Math.round(oval.ry)} />
              <div className="mt-2 text-xs text-slate-500">Drag the blue (rx) and green (ry) dots on the oval to resize.</div>
            </div>
            <hr className="border-slate-200" />
            {rects.map(r => (
              <div key={`info-${r.id}`} className="bg-slate-50 rounded-xl p-3">
                <div className="font-semibold text-slate-800">{r.id}</div>
                <InfoRow label="Center" value={`(${Math.round(r.cx)}, ${Math.round(r.cy)})`} />
                <InfoRow label="Width" value={r.w.toFixed(1)} />
                <InfoRow label="Height" value={r.h.toFixed(1)} />
                <InfoRow label="Area (constant)" value={Math.round(r.area)} />
                <div className="mt-1 text-xs text-slate-500">Drag dark handles to change width/height. The other dimension auto-adjusts to keep area constant.</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <div className="text-lg font-semibold mb-2">Options</div>
          <button
            className="px-3 py-2 rounded-xl shadow text-sm border hover:shadow-md"
            onClick={() => {
              // Reset rectangles (preserve oval)
              setRects(rects.map(r => {
                const w = Math.sqrt(r.area * (r.w / r.h)); // keep same aspect-area relation roughly
                const h = r.area / w;
                return { ...r, w, h };
              }));
            }}
          >Normalize sizes</button>
          <button
            className="ml-2 px-3 py-2 rounded-xl shadow text-sm border hover:shadow-md"
            onClick={() => {
              // Randomize aspect while keeping area constant
              setRects(rects.map(r => {
                const aspect = clamp(Math.random() * 3 + 0.5, 0.5, 3.5);
                const h = Math.sqrt(r.area / aspect);
                const w = r.area / h;
                return { ...r, w, h };
              }));
            }}
          >Randomize aspect</button>
        </div>
      </div>
    </div>
  );
}
