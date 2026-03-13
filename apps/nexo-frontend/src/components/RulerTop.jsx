import React, { useRef, useEffect } from 'react';

export const RulerTop = ({ zoom = 0.3, width = 2100, offset = 0 }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth;
        const h = 24;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, w, h);

        // Border bottom
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h - 0.5);
        ctx.lineTo(w, h - 0.5);
        ctx.stroke();

        // Ticks
        const pxPerMm = zoom;
        const startMm = Math.floor((-offset) / pxPerMm);
        const endMm = Math.ceil((w - offset) / pxPerMm);

        // Choose tick spacing based on zoom
        let minorStep = 10, majorStep = 100, midStep = 50;
        if (zoom > 0.5) { minorStep = 5; majorStep = 50; midStep = 25; }
        if (zoom < 0.15) { minorStep = 50; majorStep = 500; midStep = 100; }

        const alignedStart = Math.floor(startMm / minorStep) * minorStep;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let mm = alignedStart; mm <= endMm; mm += minorStep) {
            const x = 32 + mm * pxPerMm + offset; // 32px ruler-left offset
            if (x < 0 || x > w) continue;

            const isMajor = mm % majorStep === 0;
            const isMid = mm % midStep === 0;

            let tickH = 5;
            if (isMajor) tickH = 16;
            else if (isMid) tickH = 10;

            ctx.strokeStyle = isMajor ? '#64748b' : '#9ca3af';
            ctx.lineWidth = isMajor ? 1.5 : 0.8;
            ctx.beginPath();
            ctx.moveTo(Math.round(x) + 0.5, h);
            ctx.lineTo(Math.round(x) + 0.5, h - tickH);
            ctx.stroke();

            if (isMajor && mm > 0) {
                ctx.fillStyle = '#475569';
                ctx.font = '500 10px Inter, sans-serif';
                ctx.fillText(mm.toString(), x, 2);
            }
        }
    }, [zoom, width, offset]);

    return (
        <canvas
            ref={canvasRef}
            className="ruler-top-canvas"
            style={{ width: '100%', height: 24, display: 'block' }}
        />
    );
};
