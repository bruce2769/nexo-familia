import React, { useRef, useEffect } from 'react';

export const RulerLeft = ({ zoom = 0.3, height = 2350, offset = 0 }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const w = 32;
        const h = canvas.clientHeight;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, w, h);

        // Border right
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w - 0.5, 0);
        ctx.lineTo(w - 0.5, h);
        ctx.stroke();

        // Ticks
        const pxPerMm = zoom;
        const startMm = Math.floor((-offset) / pxPerMm);
        const endMm = Math.ceil((h - offset) / pxPerMm);

        let minorStep = 10, majorStep = 100, midStep = 50;
        if (zoom > 0.5) { minorStep = 5; majorStep = 50; midStep = 25; }
        if (zoom < 0.15) { minorStep = 50; majorStep = 500; midStep = 100; }

        const alignedStart = Math.floor(startMm / minorStep) * minorStep;

        for (let mm = alignedStart; mm <= endMm; mm += minorStep) {
            const y = mm * pxPerMm + offset;
            if (y < 0 || y > h) continue;

            const isMajor = mm % majorStep === 0;
            const isMid = mm % midStep === 0;

            let tickW = 5;
            if (isMajor) tickW = 18;
            else if (isMid) tickW = 10;

            ctx.strokeStyle = isMajor ? '#64748b' : '#9ca3af';
            ctx.lineWidth = isMajor ? 1.5 : 0.8;
            ctx.beginPath();
            ctx.moveTo(w, Math.round(y) + 0.5);
            ctx.lineTo(w - tickW, Math.round(y) + 0.5);
            ctx.stroke();

            if (isMajor && mm > 0) {
                ctx.save();
                ctx.fillStyle = '#475569';
                ctx.font = '500 10px Inter, sans-serif';
                ctx.translate(10, y);
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(mm.toString(), 0, 0);
                ctx.restore();
            }
        }
    }, [zoom, height, offset]);

    return (
        <canvas
            ref={canvasRef}
            className="ruler-left-canvas"
            style={{ width: 32, height: '100%', display: 'block' }}
        />
    );
};
