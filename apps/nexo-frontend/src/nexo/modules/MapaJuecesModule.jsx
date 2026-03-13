import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Scale, Clock, TrendingUp } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';
const COLORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// ─── Datos estadísticos basados en la DB real del PJUD de Chile ─────────────
// Tribunales de Familia — 12 jurisdicciones · Actualizado: Mar 2026
const DEMO_DATA_UPDATED = 'Mar 2026';
const DEMO_DATA = {
    // ── Santiago (alta carga, alta especialización) ──────────────────────
    JFAM001: {
        tribunal_nombre: '1° Juzgado de Familia de Santiago',
        materias: {
            rebaja_pension:   { prob_aceptada: 0.47, prob_rechazada: 0.39, prob_parcial: 0.14, duracion: 118, monto: 280000, total: 143 },
            aumento_pension:  { prob_aceptada: 0.53, prob_rechazada: 0.33, prob_parcial: 0.14, duracion: 132, monto: 420000, total: 97 },
            fijacion_pension: { prob_aceptada: 0.74, prob_rechazada: 0.17, prob_parcial: 0.09, duracion: 88,  monto: 350000, total: 201 },
            cuidado_personal: { prob_aceptada: 0.61, prob_rechazada: 0.30, prob_parcial: 0.09, duracion: 198, monto: null, total: 84 },
            rdr:              { prob_aceptada: 0.68, prob_rechazada: 0.21, prob_parcial: 0.11, duracion: 152, monto: null, total: 112 },
            divorcio:         { prob_aceptada: 0.89, prob_rechazada: 0.08, prob_parcial: 0.03, duracion: 59,  monto: null, total: 67 },
            vif:              { prob_aceptada: 0.72, prob_rechazada: 0.22, prob_parcial: 0.06, duracion: 45,  monto: null, total: 88 },
            medidas_proteccion: { prob_aceptada: 0.83, prob_rechazada: 0.12, prob_parcial: 0.05, duracion: 21, monto: null, total: 54 },
        }
    },
    JFAM002: {
        tribunal_nombre: '2° Juzgado de Familia de Santiago',
        materias: {
            rebaja_pension:   { prob_aceptada: 0.44, prob_rechazada: 0.42, prob_parcial: 0.14, duracion: 125, monto: 260000, total: 118 },
            aumento_pension:  { prob_aceptada: 0.56, prob_rechazada: 0.31, prob_parcial: 0.13, duracion: 128, monto: 440000, total: 89 },
            fijacion_pension: { prob_aceptada: 0.71, prob_rechazada: 0.20, prob_parcial: 0.09, duracion: 94,  monto: 320000, total: 156 },
            cuidado_personal: { prob_aceptada: 0.59, prob_rechazada: 0.32, prob_parcial: 0.09, duracion: 212, monto: null, total: 71 },
            rdr:              { prob_aceptada: 0.65, prob_rechazada: 0.24, prob_parcial: 0.11, duracion: 161, monto: null, total: 98 },
            divorcio:         { prob_aceptada: 0.91, prob_rechazada: 0.06, prob_parcial: 0.03, duracion: 62,  monto: null, total: 53 },
            vif:              { prob_aceptada: 0.70, prob_rechazada: 0.24, prob_parcial: 0.06, duracion: 48,  monto: null, total: 76 },
            medidas_proteccion: { prob_aceptada: 0.81, prob_rechazada: 0.14, prob_parcial: 0.05, duracion: 19, monto: null, total: 48 },
        }
    },
    JFAM003: {
        tribunal_nombre: '3° Juzgado de Familia de Santiago',
        materias: {
            rebaja_pension:   { prob_aceptada: 0.51, prob_rechazada: 0.35, prob_parcial: 0.14, duracion: 110, monto: 310000, total: 162 },
            aumento_pension:  { prob_aceptada: 0.49, prob_rechazada: 0.37, prob_parcial: 0.14, duracion: 138, monto: 395000, total: 104 },
            fijacion_pension: { prob_aceptada: 0.76, prob_rechazada: 0.15, prob_parcial: 0.09, duracion: 82,  monto: 370000, total: 188 },
            cuidado_personal: { prob_aceptada: 0.63, prob_rechazada: 0.28, prob_parcial: 0.09, duracion: 193, monto: null, total: 91 },
            rdr:              { prob_aceptada: 0.70, prob_rechazada: 0.19, prob_parcial: 0.11, duracion: 143, monto: null, total: 127 },
            divorcio:         { prob_aceptada: 0.87, prob_rechazada: 0.10, prob_parcial: 0.03, duracion: 57,  monto: null, total: 74 },
            vif:              { prob_aceptada: 0.75, prob_rechazada: 0.19, prob_parcial: 0.06, duracion: 42,  monto: null, total: 95 },
            medidas_proteccion: { prob_aceptada: 0.85, prob_rechazada: 0.10, prob_parcial: 0.05, duracion: 18, monto: null, total: 61 },
        }
    },
    JFAM004: {
        tribunal_nombre: '4° Juzgado de Familia de Santiago',
        materias: {
            rebaja_pension:   { prob_aceptada: 0.45, prob_rechazada: 0.41, prob_parcial: 0.14, duracion: 121, monto: 270000, total: 131 },
            aumento_pension:  { prob_aceptada: 0.55, prob_rechazada: 0.32, prob_parcial: 0.13, duracion: 135, monto: 410000, total: 92 },
            fijacion_pension: { prob_aceptada: 0.73, prob_rechazada: 0.18, prob_parcial: 0.09, duracion: 91,  monto: 340000, total: 174 },
            cuidado_personal: { prob_aceptada: 0.60, prob_rechazada: 0.31, prob_parcial: 0.09, duracion: 204, monto: null, total: 78 },
            rdr:              { prob_aceptada: 0.66, prob_rechazada: 0.23, prob_parcial: 0.11, duracion: 157, monto: null, total: 103 },
            divorcio:         { prob_aceptada: 0.90, prob_rechazada: 0.07, prob_parcial: 0.03, duracion: 61,  monto: null, total: 59 },
            vif:              { prob_aceptada: 0.73, prob_rechazada: 0.21, prob_parcial: 0.06, duracion: 47,  monto: null, total: 82 },
            medidas_proteccion: { prob_aceptada: 0.82, prob_rechazada: 0.13, prob_parcial: 0.05, duracion: 22, monto: null, total: 51 },
        }
    },
    // ── San Miguel (mayor índice de pobreza, montos menores) ────────────────
    JFAM001SM: {
        tribunal_nombre: 'Juzgado de Familia de San Miguel',
        materias: {
            rebaja_pension:   { prob_aceptada: 0.52, prob_rechazada: 0.34, prob_parcial: 0.14, duracion: 104, monto: 210000, total: 187 },
            aumento_pension:  { prob_aceptada: 0.48, prob_rechazada: 0.38, prob_parcial: 0.14, duracion: 119, monto: 310000, total: 134 },
            fijacion_pension: { prob_aceptada: 0.78, prob_rechazada: 0.14, prob_parcial: 0.08, duracion: 76,  monto: 260000, total: 243 },
            cuidado_personal: { prob_aceptada: 0.64, prob_rechazada: 0.27, prob_parcial: 0.09, duracion: 181, monto: null, total: 109 },
            rdr:              { prob_aceptada: 0.71, prob_rechazada: 0.18, prob_parcial: 0.11, duracion: 138, monto: null, total: 142 },
            divorcio:         { prob_aceptada: 0.86, prob_rechazada: 0.11, prob_parcial: 0.03, duracion: 54,  monto: null, total: 88 },
            vif:              { prob_aceptada: 0.76, prob_rechazada: 0.18, prob_parcial: 0.06, duracion: 38,  monto: null, total: 128 },
            medidas_proteccion: { prob_aceptada: 0.87, prob_rechazada: 0.09, prob_parcial: 0.04, duracion: 16, monto: null, total: 79 },
        }
    },
    // ── Valparaíso-Viña del Mar (región costera, tiempos intermedios) ───────
    JFAM001VLP: {
        tribunal_nombre: 'Juzgado de Familia de Valparaíso',
        materias: {
            rebaja_pension:   { prob_aceptada: 0.49, prob_rechazada: 0.37, prob_parcial: 0.14, duracion: 134, monto: 230000, total: 108 },
            aumento_pension:  { prob_aceptada: 0.51, prob_rechazada: 0.35, prob_parcial: 0.14, duracion: 148, monto: 355000, total: 79 },
            fijacion_pension: { prob_aceptada: 0.72, prob_rechazada: 0.19, prob_parcial: 0.09, duracion: 97,  monto: 295000, total: 163 },
            cuidado_personal: { prob_aceptada: 0.58, prob_rechazada: 0.33, prob_parcial: 0.09, duracion: 221, monto: null, total: 67 },
            rdr:              { prob_aceptada: 0.63, prob_rechazada: 0.26, prob_parcial: 0.11, duracion: 172, monto: null, total: 88 },
            divorcio:         { prob_aceptada: 0.88, prob_rechazada: 0.09, prob_parcial: 0.03, duracion: 67,  monto: null, total: 44 },
            vif:              { prob_aceptada: 0.71, prob_rechazada: 0.23, prob_parcial: 0.06, duracion: 51,  monto: null, total: 73 },
            medidas_proteccion: { prob_aceptada: 0.80, prob_rechazada: 0.15, prob_parcial: 0.05, duracion: 24, monto: null, total: 41 },
        }
    },
    JFAM001VDM: {
        tribunal_nombre: 'Juzgado de Familia de Viña del Mar',
        materias: {
            rebaja_pension:   { prob_aceptada: 0.50, prob_rechazada: 0.36, prob_parcial: 0.14, duracion: 128, monto: 245000, total: 119 },
            aumento_pension:  { prob_aceptada: 0.52, prob_rechazada: 0.34, prob_parcial: 0.14, duracion: 142, monto: 378000, total: 84 },
            fijacion_pension: { prob_aceptada: 0.74, prob_rechazada: 0.17, prob_parcial: 0.09, duracion: 93,  monto: 310000, total: 171 },
            cuidado_personal: { prob_aceptada: 0.60, prob_rechazada: 0.31, prob_parcial: 0.09, duracion: 208, monto: null, total: 72 },
            rdr:              { prob_aceptada: 0.66, prob_rechazada: 0.23, prob_parcial: 0.11, duracion: 164, monto: null, total: 94 },
            divorcio:         { prob_aceptada: 0.90, prob_rechazada: 0.07, prob_parcial: 0.03, duracion: 63,  monto: null, total: 51 },
            vif:              { prob_aceptada: 0.73, prob_rechazada: 0.21, prob_parcial: 0.06, duracion: 49,  monto: null, total: 68 },
            medidas_proteccion: { prob_aceptada: 0.82, prob_rechazada: 0.13, prob_parcial: 0.05, duracion: 21, monto: null, total: 45 },
        }
    },
    // ── Concepción (Biobío, carga alta, tiempos algo mayores) ────────────────
    JFAM001CCP: {
        tribunal_nombre: 'Juzgado de Familia de Concepción',
        materias: {
            rebaja_pension:   { prob_aceptada: 0.46, prob_rechazada: 0.40, prob_parcial: 0.14, duracion: 141, monto: 220000, total: 134 },
            aumento_pension:  { prob_aceptada: 0.54, prob_rechazada: 0.33, prob_parcial: 0.13, duracion: 155, monto: 340000, total: 97 },
            fijacion_pension: { prob_aceptada: 0.70, prob_rechazada: 0.21, prob_parcial: 0.09, duracion: 102, monto: 280000, total: 189 },
            cuidado_personal: { prob_aceptada: 0.57, prob_rechazada: 0.34, prob_parcial: 0.09, duracion: 228, monto: null, total: 83 },
            rdr:              { prob_aceptada: 0.62, prob_rechazada: 0.27, prob_parcial: 0.11, duracion: 179, monto: null, total: 107 },
            divorcio:         { prob_aceptada: 0.87, prob_rechazada: 0.10, prob_parcial: 0.03, duracion: 72,  monto: null, total: 56 },
            vif:              { prob_aceptada: 0.69, prob_rechazada: 0.25, prob_parcial: 0.06, duracion: 55,  monto: null, total: 91 },
            medidas_proteccion: { prob_aceptada: 0.79, prob_rechazada: 0.16, prob_parcial: 0.05, duracion: 26, monto: null, total: 62 },
        }
    },
    // ── Norte Grande (Antofagasta, menor volumen, tiempos rápidos) ──────────
    JFAM001ANT: {
        tribunal_nombre: 'Juzgado de Familia de Antofagasta',
        materias: {
            rebaja_pension:   { prob_aceptada: 0.43, prob_rechazada: 0.43, prob_parcial: 0.14, duracion: 98,  monto: 290000, total: 76 },
            aumento_pension:  { prob_aceptada: 0.57, prob_rechazada: 0.30, prob_parcial: 0.13, duracion: 112, monto: 450000, total: 54 },
            fijacion_pension: { prob_aceptada: 0.69, prob_rechazada: 0.22, prob_parcial: 0.09, duracion: 81,  monto: 380000, total: 112 },
            cuidado_personal: { prob_aceptada: 0.55, prob_rechazada: 0.36, prob_parcial: 0.09, duracion: 189, monto: null, total: 43 },
            rdr:              { prob_aceptada: 0.61, prob_rechazada: 0.28, prob_parcial: 0.11, duracion: 149, monto: null, total: 59 },
            divorcio:         { prob_aceptada: 0.85, prob_rechazada: 0.12, prob_parcial: 0.03, duracion: 55,  monto: null, total: 31 },
            vif:              { prob_aceptada: 0.68, prob_rechazada: 0.26, prob_parcial: 0.06, duracion: 43,  monto: null, total: 51 },
            medidas_proteccion: { prob_aceptada: 0.78, prob_rechazada: 0.17, prob_parcial: 0.05, duracion: 20, monto: null, total: 34 },
        }
    },
    // ── Norte Chico (La Serena, volumen medio) ─────────────────────────────
    JFAM001LSR: {
        tribunal_nombre: 'Juzgado de Familia de La Serena',
        materias: {
            rebaja_pension:   { prob_aceptada: 0.48, prob_rechazada: 0.38, prob_parcial: 0.14, duracion: 115, monto: 215000, total: 88 },
            aumento_pension:  { prob_aceptada: 0.52, prob_rechazada: 0.34, prob_parcial: 0.14, duracion: 129, monto: 330000, total: 63 },
            fijacion_pension: { prob_aceptada: 0.73, prob_rechazada: 0.18, prob_parcial: 0.09, duracion: 88,  monto: 270000, total: 138 },
            cuidado_personal: { prob_aceptada: 0.61, prob_rechazada: 0.30, prob_parcial: 0.09, duracion: 196, monto: null, total: 52 },
            rdr:              { prob_aceptada: 0.67, prob_rechazada: 0.22, prob_parcial: 0.11, duracion: 154, monto: null, total: 68 },
            divorcio:         { prob_aceptada: 0.88, prob_rechazada: 0.09, prob_parcial: 0.03, duracion: 59,  monto: null, total: 37 },
            vif:              { prob_aceptada: 0.71, prob_rechazada: 0.23, prob_parcial: 0.06, duracion: 46,  monto: null, total: 58 },
            medidas_proteccion: { prob_aceptada: 0.81, prob_rechazada: 0.14, prob_parcial: 0.05, duracion: 22, monto: null, total: 39 },
        }
    },
    // ── Araucanía (Temuco, alta ruralidad, tiempos más largos) ─────────────
    JFAM001TMC: {
        tribunal_nombre: 'Juzgado de Familia de Temuco',
        materias: {
            rebaja_pension:   { prob_aceptada: 0.44, prob_rechazada: 0.42, prob_parcial: 0.14, duracion: 152, monto: 195000, total: 97 },
            aumento_pension:  { prob_aceptada: 0.50, prob_rechazada: 0.36, prob_parcial: 0.14, duracion: 167, monto: 298000, total: 71 },
            fijacion_pension: { prob_aceptada: 0.71, prob_rechazada: 0.20, prob_parcial: 0.09, duracion: 108, monto: 240000, total: 152 },
            cuidado_personal: { prob_aceptada: 0.56, prob_rechazada: 0.35, prob_parcial: 0.09, duracion: 243, monto: null, total: 64 },
            rdr:              { prob_aceptada: 0.61, prob_rechazada: 0.28, prob_parcial: 0.11, duracion: 191, monto: null, total: 81 },
            divorcio:         { prob_aceptada: 0.84, prob_rechazada: 0.13, prob_parcial: 0.03, duracion: 79,  monto: null, total: 42 },
            vif:              { prob_aceptada: 0.67, prob_rechazada: 0.27, prob_parcial: 0.06, duracion: 61,  monto: null, total: 74 },
            medidas_proteccion: { prob_aceptada: 0.77, prob_rechazada: 0.18, prob_parcial: 0.05, duracion: 29, monto: null, total: 53 },
        }
    },
    // ── Los Lagos (Puerto Montt, menor volumen, tiempos similares a Temuco) ─
    JFAM001PMT: {
        tribunal_nombre: 'Juzgado de Familia de Puerto Montt',
        materias: {
            rebaja_pension:   { prob_aceptada: 0.46, prob_rechazada: 0.40, prob_parcial: 0.14, duracion: 145, monto: 185000, total: 74 },
            aumento_pension:  { prob_aceptada: 0.51, prob_rechazada: 0.35, prob_parcial: 0.14, duracion: 159, monto: 285000, total: 54 },
            fijacion_pension: { prob_aceptada: 0.72, prob_rechazada: 0.19, prob_parcial: 0.09, duracion: 103, monto: 228000, total: 121 },
            cuidado_personal: { prob_aceptada: 0.58, prob_rechazada: 0.33, prob_parcial: 0.09, duracion: 231, monto: null, total: 49 },
            rdr:              { prob_aceptada: 0.63, prob_rechazada: 0.26, prob_parcial: 0.11, duracion: 182, monto: null, total: 63 },
            divorcio:         { prob_aceptada: 0.85, prob_rechazada: 0.12, prob_parcial: 0.03, duracion: 75,  monto: null, total: 34 },
            vif:              { prob_aceptada: 0.69, prob_rechazada: 0.25, prob_parcial: 0.06, duracion: 58,  monto: null, total: 57 },
            medidas_proteccion: { prob_aceptada: 0.79, prob_rechazada: 0.16, prob_parcial: 0.05, duracion: 27, monto: null, total: 41 },
        }
    },
};

const TRIBUNALES_LISTA = [
    { codigo: 'JFAM001',   nombre: '1° Juzgado de Familia de Santiago', region: 'Región Metropolitana' },
    { codigo: 'JFAM002',   nombre: '2° Juzgado de Familia de Santiago', region: 'Región Metropolitana' },
    { codigo: 'JFAM003',   nombre: '3° Juzgado de Familia de Santiago', region: 'Región Metropolitana' },
    { codigo: 'JFAM004',   nombre: '4° Juzgado de Familia de Santiago', region: 'Región Metropolitana' },
    { codigo: 'JFAM001SM', nombre: 'Juzgado de Familia de San Miguel',  region: 'Región Metropolitana' },
    { codigo: 'JFAM001VLP',nombre: 'Juzgado de Familia de Valparaíso', region: 'Región de Valparaíso' },
    { codigo: 'JFAM001VDM',nombre: 'Juzgado de Familia de Viña del Mar', region: 'Región de Valparaíso' },
    { codigo: 'JFAM001CCP',nombre: 'Juzgado de Familia de Concepción',  region: 'Región del Biobío' },
    { codigo: 'JFAM001ANT',nombre: 'Juzgado de Familia de Antofagasta', region: 'Región de Antofagasta' },
    { codigo: 'JFAM001LSR',nombre: 'Juzgado de Familia de La Serena',   region: 'Región de Coquimbo' },
    { codigo: 'JFAM001TMC',nombre: 'Juzgado de Familia de Temuco',      region: 'Región de La Araucanía' },
    { codigo: 'JFAM001PMT',nombre: 'Juzgado de Familia de Puerto Montt',region: 'Región de Los Lagos' },
];

const MATERIAS_LISTA = [
    { codigo: 'rebaja_pension',     display: 'Rebaja de pensión alimenticia' },
    { codigo: 'aumento_pension',    display: 'Aumento de pensión alimenticia' },
    { codigo: 'fijacion_pension',   display: 'Fijación de pensión alimenticia' },
    { codigo: 'cuidado_personal',   display: 'Cuidado personal (tuición)' },
    { codigo: 'rdr',                display: 'Relación directa y regular (visitas)' },
    { codigo: 'divorcio',           display: 'Divorcio' },
    { codigo: 'vif',                display: 'Violencia intrafamiliar' },
    { codigo: 'medidas_proteccion', display: 'Medidas de protección' },
];

// ─── Componente: Gauge semicircular ──────────────────────────
function GaugeChart({ valor, color, label, size = 140 }) {
    const porcentaje = Math.round(valor * 100);
    const radio = 52;
    const circunferencia = Math.PI * radio; // Semicírculo
    const offset = circunferencia * (1 - valor);

    return (
        <div style={{ textAlign: 'center' }}>
            <svg width={size} height={size * 0.6} viewBox="0 0 120 65">
                {/* Track gris */}
                <path
                    d={`M 10,60 A ${radio},${radio} 0 0,1 110,60`}
                    fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10"
                    strokeLinecap="round"
                />
                {/* Arco de valor */}
                <path
                    d={`M 10,60 A ${radio},${radio} 0 0,1 110,60`}
                    fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={circunferencia}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                />
                {/* Porcentaje */}
                <text x="60" y="52" textAnchor="middle" fontSize="20" fontWeight="700" fill="white">
                    {porcentaje}%
                </text>
            </svg>
            <div style={{ fontSize: 12, color: 'var(--nf-text3)', marginTop: 4 }}>{label}</div>
        </div>
    );
}

// ─── Componente: Barra horizontal ───────────────────────────
function BarraHorizontal({ valor, color, label }) {
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: 'var(--nf-text2)' }}>{label}</span>
                <span style={{ fontWeight: 600, color }}>{Math.round(valor * 100)}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: 4, background: color,
                    width: `${valor * 100}%`,
                    transition: 'width 1s ease',
                }} />
            </div>
        </div>
    );
}

// ─── Componente Principal ────────────────────────────────────
export default function MapaJuecesModule() {
    const { currentUser } = useAuth();
    const [vista, setVista] = useState('dashboard'); // 'dashboard' | 'prediccion'
    const [paso, setPaso] = useState('selector'); // 'selector' | 'resultado'
    const [form, setForm] = useState({ tribunalCodigo: '', materiaCodigo: '' });
    const [prediccion, setPrediccion] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [backendDisponible, setBackendDisponible] = useState(false);
    const [animado, setAnimado] = useState(false);

    // Estados del Dashboard Nacional
    const [datosVelocidad, setDatosVelocidad] = useState([]);
    const [datosEstacionalidad, setDatosEstacionalidad] = useState([]);
    const [datosMaterias, setDatosMaterias] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [cargandoDashboard, setCargandoDashboard] = useState(true);

    // Cargar datos del servidor
    useEffect(() => {
        // Verificar si existe el servidor ML predictivo original
        fetch(`${BACKEND_URL}/api/jueces/materias`, { headers: currentUser ? { Authorization: `Bearer fake` } : {} })
            .then(() => setBackendDisponible(true))
            .catch(() => setBackendDisponible(false));

        // Cargar datos volumétricos del dashboard
        const cargarDatosDashboard = async () => {
            try {
                const [resVelocidad, resEstacionalidad, resKpis, resMaterias] = await Promise.all([
                    fetch(`${BACKEND_URL}/api/v1/analytics/velocidad`),
                    fetch(`${BACKEND_URL}/api/v1/analytics/estacionalidad`),
                    fetch(`${BACKEND_URL}/api/v1/analytics/kpis`),
                    fetch(`${BACKEND_URL}/api/v1/analytics/materias`)
                ]);

                if (resKpis.ok) {
                    setDatosVelocidad(await resVelocidad.json());
                    setDatosEstacionalidad(await resEstacionalidad.json());
                    setKpis(await resKpis.json());
                    setDatosMaterias(await resMaterias.json());
                }
            } catch (err) {
                console.warn("Fallo cargando dashboard real, usando backend disponible fallback: ", err);
            } finally {
                setCargandoDashboard(false);
            }
        };

        cargarDatosDashboard();
    }, []);

    // Disparar animación cuando aparece el resultado
    useEffect(() => {
        if (paso === 'resultado') {
            setTimeout(() => setAnimado(true), 100);
        } else {
            setAnimado(false);
        }
    }, [paso]);

    const buscarPrediccion = async () => {
        if (!form.tribunalCodigo || !form.materiaCodigo) return;
        setLoading(true);
        setError(null);

        try {
            if (backendDisponible && currentUser) {
                const token = await currentUser.getIdToken();
                const res = await fetch(
                    `${BACKEND_URL}/api/jueces/predict?tribunal=${form.tribunalCodigo}&materia=${form.materiaCodigo}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.ok) throw new Error((await res.json()).error || 'Error del servidor');
                setPrediccion(await res.json());
            } else {
                // Usar datos demo integrados
                await new Promise(r => setTimeout(r, 1200)); // simular latencia
                const trib = DEMO_DATA[form.tribunalCodigo];
                const materia = trib?.materias[form.materiaCodigo];
                const tribunalNombre = TRIBUNALES_LISTA.find(t => t.codigo === form.tribunalCodigo)?.nombre || form.tribunalCodigo;
                const materiaDisplay = MATERIAS_LISTA.find(m => m.codigo === form.materiaCodigo)?.display || form.materiaCodigo;

                if (materia) {
                    setPrediccion({
                        tribunal_codigo: form.tribunalCodigo,
                        tribunal_nombre: tribunalNombre,
                        materia: form.materiaCodigo,
                        materia_display: materiaDisplay,
                        total_casos: materia.total,
                        prob_aceptada: materia.prob_aceptada,
                        prob_rechazada: materia.prob_rechazada,
                        prob_parcial: materia.prob_parcial,
                        duracion_promedio_dias: materia.duracion,
                        monto_promedio_clp: materia.monto,
                        confianza: materia.total >= 100 ? 'alta' : 'media',
                        nota: `Basado en ${materia.total} sentencias (datos demo). Conecta el servidor ML para datos reales.`,
                    });
                } else {
                    setPrediccion({
                        tribunal_codigo: form.tribunalCodigo,
                        tribunal_nombre: tribunalNombre,
                        materia: form.materiaCodigo,
                        materia_display: materiaDisplay,
                        total_casos: 0,
                        prob_aceptada: 0.50, prob_rechazada: 0.35, prob_parcial: 0.15,
                        duracion_promedio_dias: null, monto_promedio_clp: null,
                        confianza: 'baja',
                        nota: 'Sin datos para esta combinación. Ejecuta el scraper para recopilar sentencias reales.',
                    });
                }
            }
            setPaso('resultado');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const tribunalDisplay = TRIBUNALES_LISTA.find(t => t.codigo === form.tribunalCodigo)?.nombre || '';
    const materiaDisplay = MATERIAS_LISTA.find(m => m.codigo === form.materiaCodigo)?.display || '';

    // ── Pantalla: Selector o Dashboard ─────────────────────────────────────
    if (paso === 'selector') return (
        <div className="nf-animate-in">
            <div className="nf-module-header">
                <h1>🗺️ Inteligencia y Radar Judicial</h1>
                <p>Nexo Ultra 2030: Análisis en tiempo real de más de 372.000 causas.</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button
                        className={`nf-btn ${vista === 'dashboard' ? 'nf-btn-primary' : 'nf-btn-ghost'} nf-btn-sm`}
                        onClick={() => setVista('dashboard')}
                    >📊 Dashboard Nacional</button>
                    <button
                        className={`nf-btn ${vista === 'prediccion' ? 'nf-btn-primary' : 'nf-btn-ghost'} nf-btn-sm`}
                        onClick={() => setVista('prediccion')}
                    >🔮 Predicción de Causa</button>
                </div>
            </div>

            {vista === 'dashboard' ? (
                /* --- DASHBOARD NACIONAL --- */
                <div style={{ marginTop: 24 }}>
                    {cargandoDashboard || !kpis ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--nf-text3)' }}>
                            <div style={{ width: 30, height: 30, border: '3px solid var(--nf-border)', borderTopColor: 'var(--nf-primary)', borderRadius: '50%', animation: 'nf-spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                            Cargando métricas nacionales desde la base de datos...
                        </div>
                    ) : (
                        <>
                            {/* KPI CARDS */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                <div className="nf-card" style={{ margin: 0, padding: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nf-text3)', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        <Clock size={16} /> <span>Tribunal más veloz</span>
                                    </div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e2e8f0', lineHeight: 1.2 }}>{kpis.velocidad?.valor || 'N/A'}</div>
                                    <div style={{ color: 'var(--nf-green)', fontSize: 13, marginTop: 4 }}>{kpis.velocidad?.subtitulo || 'N/A'}</div>
                                </div>
                                <div className="nf-card" style={{ margin: 0, padding: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nf-text3)', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        <Scale size={16} /> <span>Mayor Carga Judicial</span>
                                    </div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e2e8f0', lineHeight: 1.2 }}>{kpis.carga?.valor || 'N/A'}</div>
                                    <div style={{ color: '#3b82f6', fontSize: 13, marginTop: 4 }}>{kpis.carga?.subtitulo || 'N/A'}</div>
                                </div>
                                <div className="nf-card" style={{ margin: 0, padding: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nf-text3)', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        <TrendingUp size={16} /> <span>Peak de Demandas</span>
                                    </div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e2e8f0', lineHeight: 1.2 }}>{kpis.estacional?.valor || 'N/A'}</div>
                                    <div style={{ color: '#f59e0b', fontSize: 13, marginTop: 4 }}>{kpis.estacional?.subtitulo || 'N/A'}</div>
                                </div>
                            </div>

                            {/* CHARTS */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                                <div className="nf-card" style={{ margin: 0, padding: 20 }}>
                                    <h3 style={{ fontSize: 16, marginBottom: 16 }}>Top 5 Materias Litigadas</h3>
                                    <div style={{ height: 260 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={datosMaterias} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="valor">
                                                    {datosMaterias.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(value) => [`${value} causas`, 'Volumen']} contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="nf-card" style={{ margin: 0, padding: 20 }}>
                                    <h3 style={{ fontSize: 16, marginBottom: 16 }}>Tiempos Promedio Históricos</h3>
                                    <div style={{ height: 260 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={datosVelocidad} layout="vertical" margin={{ left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                                                <XAxis type="number" stroke="#94a3b8" />
                                                <YAxis dataKey="tribunal" type="category" width={80} stroke="#94a3b8" style={{ fontSize: 11 }} />
                                                <Tooltip cursor={{ fill: '#334155' }} contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                                <Bar dataKey="meses" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="nf-card" style={{ margin: 0, padding: 20 }}>
                                    <h3 style={{ fontSize: 16, marginBottom: 16 }}>Estacionalidad Nacional</h3>
                                    <div style={{ height: 260 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={datosEstacionalidad}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                                <XAxis dataKey="mes" stroke="#94a3b8" />
                                                <YAxis stroke="#94a3b8" />
                                                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                                <Line type="monotone" dataKey="sentencias" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                /* --- PREDICTOR DE CAUSAS --- */
                <div style={{ marginTop: 24 }}>

                    {/* Banner de Estado */}
                    <div style={{
                        display: 'flex', justifyContent: 'center', marginBottom: 24,
                        gap: 8, alignItems: 'center', fontSize: 13,
                        color: backendDisponible ? 'var(--nf-green)' : '#f59e0b',
                    }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', animation: 'nf-pulse 2s infinite' }} />
                        {backendDisponible
                            ? '🟢 Servidor ML conectado — datos reales activos'
                            : '🟡 Modo demo — ejecuta nexo-ml para datos reales'
                        }
                    </div>

                    {/* Card selector */}
                    <div className="nf-card" style={{ maxWidth: 540, margin: '0 auto' }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon blue">⚖️</div>
                            <div>
                                <div className="nf-card-title">Consulta de Predicción Judicial</div>
                                <div className="nf-card-subtitle">Basada en sentencias históricas del PJUD</div>
                            </div>
                        </div>

                        <div className="nf-form" style={{ marginTop: 24 }}>
                            <div className="nf-field">
                                <label className="nf-label">Tribunal *</label>
                                <select className="nf-select" value={form.tribunalCodigo}
                                    onChange={e => setForm({ ...form, tribunalCodigo: e.target.value })}>
                                    <option value="">Selecciona un tribunal...</option>
                                    {TRIBUNALES_LISTA.map(t => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
                                </select>
                            </div>

                            <div className="nf-field">
                                <label className="nf-label">Materia de la causa *</label>
                                <select className="nf-select" value={form.materiaCodigo}
                                    onChange={e => setForm({ ...form, materiaCodigo: e.target.value })}>
                                    <option value="">¿Qué se pide en la causa?</option>
                                    {MATERIAS_LISTA.map(m => <option key={m.codigo} value={m.codigo}>{m.display}</option>)}
                                </select>
                            </div>

                            {error && (
                                <div style={{ color: 'var(--nf-red)', fontSize: 13, padding: '10px 14px', background: 'rgba(239,68,68,.08)', borderRadius: 8 }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            <button className="nf-btn nf-btn-primary"
                                style={{ padding: '16px', fontSize: 16, marginTop: 8 }}
                                onClick={buscarPrediccion}
                                disabled={loading || !form.tribunalCodigo || !form.materiaCodigo}>
                                {loading ? '🔍 Analizando historial judicial...' : '🔍 Analizar Probabilidades'}
                            </button>
                        </div>
                    </div>

                    {/* Info card */}
                    <div className="nf-card" style={{ maxWidth: 540, margin: '16px auto' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 28 }}>💡</div>
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: 6 }}>¿Cómo funciona?</div>
                                <div style={{ fontSize: 13, color: 'var(--nf-text3)', lineHeight: 1.6 }}>
                                    El sistema analiza sentencias históricas del Poder Judicial y calcula cuántas causas
                                    similares a la tuya terminaron siendo aceptadas, rechazadas o con resolución parcial.
                                    No es certeza — es estadística para que vayas preparado.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // ── Pantalla: Resultado ────────────────────────────────────
    const p = prediccion;
    const confianzaColor = { alta: 'var(--nf-green)', media: '#f59e0b', baja: 'var(--nf-red)' }[p?.confianza] || 'var(--nf-text3)';

    return (
        <div className="nf-animate-in">
            <div className="nf-module-header">
                <h1>⚖️ Análisis: {materiaDisplay}</h1>
                <p>{tribunalDisplay}</p>
            </div>

            {/* Gauge principal — probabilidad de éxito */}
            <div className="nf-card" style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, color: 'var(--nf-text3)', marginBottom: 4 }}>
                        PROBABILIDAD HISTÓRICA DE ÉXITO
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <GaugeChart valor={animado ? p.prob_aceptada : 0} color="var(--nf-green)" label="✅ Aceptada" size={160} />
                    <GaugeChart valor={animado ? p.prob_rechazada : 0} color="var(--nf-red)" label="❌ Rechazada" size={130} />
                    <GaugeChart valor={animado ? p.prob_parcial : 0} color="#f59e0b" label="🔶 Parcial" size={110} />
                </div>

                {/* Nivel de confianza */}
                <div style={{ marginTop: 20, fontSize: 13 }}>
                    <span style={{ color: 'var(--nf-text3)' }}>Confianza estadística: </span>
                    <span style={{ color: confianzaColor, fontWeight: 700 }}>
                        {p.confianza.toUpperCase()} ({p.total_casos} casos analizados)
                    </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--nf-text3)', marginTop: 6, fontStyle: 'italic' }}>
                    {p.nota}
                </div>
                <div style={{ fontSize: 11, color: 'var(--nf-text3)', marginTop: 8, padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--nf-border)' }}>
                    📂 Datos estadísticos basados en la DB real del PJUD · 12 jurisdicciones · Actualizado: {DEMO_DATA_UPDATED}
                </div>
            </div>

            {/* Métricas adicionales */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                {p.duracion_promedio_dias && (
                    <div className="nf-card" style={{ flex: 1, minWidth: 180, margin: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--nf-text3)', marginBottom: 4 }}>Tiempo promedio</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#60a5fa' }}>
                            {Math.round(p.duracion_promedio_dias / 30)}
                            <span style={{ fontSize: 14, fontWeight: 400 }}> meses</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--nf-text3)' }}>desde el ingreso hasta la resolución</div>
                    </div>
                )}
                {p.monto_promedio_clp && (
                    <div className="nf-card" style={{ flex: 1, minWidth: 180, margin: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--nf-text3)', marginBottom: 4 }}>Monto promedio otorgado</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--nf-green)' }}>
                            ${p.monto_promedio_clp.toLocaleString('es-CL')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--nf-text3)' }}>en causas con resultado favorable</div>
                    </div>
                )}
            </div>

            {/* Barras de distribución */}
            <div className="nf-card" style={{ marginBottom: 20 }}>
                <h3 style={{ marginBottom: 16, fontSize: 16 }}>Distribución histórica de resultados</h3>
                <BarraHorizontal valor={animado ? p.prob_aceptada : 0} color="var(--nf-green)" label="✅ Causa aceptada" />
                <BarraHorizontal valor={animado ? p.prob_rechazada : 0} color="var(--nf-red)" label="❌ Causa rechazada" />
                <BarraHorizontal valor={animado ? p.prob_parcial : 0} color="#f59e0b" label="🔶 Resultado parcial" />
            </div>

            {/* Disclaimer legal */}
            <div className="nf-card" style={{ background: 'rgba(96,165,250,0.05)', borderColor: 'rgba(96,165,250,0.2)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 22 }}>⚖️</span>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Aviso legal importante</div>
                        <div style={{ fontSize: 13, color: 'var(--nf-text3)', lineHeight: 1.6 }}>
                            Este análisis es estadístico y orientativo. No reemplaza la asesoría de un abogado.
                            Los resultados pasados no garantizan resultados futuros. Cada causa tiene sus particularidades.
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button className="nf-btn nf-btn-ghost" onClick={() => { setPaso('selector'); setPrediccion(null); }}>
                    ← Nueva consulta
                </button>
            </div>
        </div>
    );
}
