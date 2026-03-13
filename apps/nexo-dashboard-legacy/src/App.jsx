import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Scale, Clock, TrendingUp } from 'lucide-react';

const COLORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function App() {
  // 1. Estados para almacenar los datos que vengan del Backend
  const [datosVelocidad, setDatosVelocidad] = useState([]);
  const [datosEstacionalidad, setDatosEstacionalidad] = useState([]);
  const [datosMaterias, setDatosMaterias] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [cargando, setCargando] = useState(true);

  // 2. Efecto para hacer el Fetch al cargar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Hacemos las llamadas en paralelo
        const [resVelocidad, resEstacionalidad, resKpis, resMaterias] = await Promise.all([
          fetch('http://localhost:8000/api/v1/analytics/velocidad'),
          fetch('http://localhost:8000/api/v1/analytics/estacionalidad'),
          fetch('http://localhost:8000/api/v1/analytics/kpis'),
          fetch('http://localhost:8000/api/v1/analytics/materias')
        ]);

        const dataVelocidad = await resVelocidad.json();
        const dataEstacionalidad = await resEstacionalidad.json();
        const dataKpis = await resKpis.json();
        const dataMaterias = await resMaterias.json();

        setDatosVelocidad(dataVelocidad);
        setDatosEstacionalidad(dataEstacionalidad);
        setKpis(dataKpis);
        setDatosMaterias(dataMaterias);
        setCargando(false);
      } catch (error) {
        console.error("Error conectando con FastAPI:", error);
        setCargando(false);
      }
    };

    cargarDatos();
  }, []); // El array vacío asegura que solo se ejecute una vez al abrir la página

  // Pantalla de carga mientras espera al servidor
  if (cargando || !kpis) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Conectando con el Motor Nexo...</h2></div>;
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>

      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: '#0f172a', margin: 0 }}>Nexo Ultra 2030</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Legal Analytics Engine - Datos en Tiempo Real</p>
      </header>

      {/* KPI CARDS DINÁMICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', marginBottom: '0.5rem' }}>
            <Clock size={20} /> <h3 style={{ margin: 0 }}>Récord Velocidad</h3>
          </div>
          <p style={{ fontSize: '1.8rem', margin: 0, fontWeight: 'bold', color: '#0f172a' }}>{kpis.velocidad.valor}</p>
          <small style={{ color: '#10b981' }}>{kpis.velocidad.subtitulo}</small>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', marginBottom: '0.5rem' }}>
            <Scale size={20} /> <h3 style={{ margin: 0 }}>Mayor Carga</h3>
          </div>
          <p style={{ fontSize: '1.8rem', margin: 0, fontWeight: 'bold', color: '#0f172a' }}>{kpis.carga.valor}</p>
          <small style={{ color: '#3b82f6' }}>{kpis.carga.subtitulo}</small>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', marginBottom: '0.5rem' }}>
            <TrendingUp size={20} /> <h3 style={{ margin: 0 }}>Peak Estacional</h3>
          </div>
          <p style={{ fontSize: '1.8rem', margin: 0, fontWeight: 'bold', color: '#0f172a' }}>{kpis.estacional.valor}</p>
          <small style={{ color: '#f59e0b' }}>{kpis.estacional.subtitulo}</small>
        </div>
      </div>

      {/* GRÁFICOS DINÁMICOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#0f172a' }}>Tiempos de Resolución (Meses)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosVelocidad} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="tribunal" type="category" width={100} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="meses" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#0f172a' }}>Volumen de Sentencias (Estacionalidad)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosEstacionalidad} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sentencias" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#0f172a' }}>Top 5 Materias Litigadas</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosMaterias}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="valor"
                >
                  {datosMaterias.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} causas`, 'Volumen']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
