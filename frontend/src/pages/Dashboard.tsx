import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import '../pages/Dashboard.css'

const statusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'OK': case 'HEALTHY': case 'SUCCESS': return 'status-ok'
    case 'WARNING': case 'DEGRADED': return 'status-warning'
    case 'ERROR': case 'FAILED': case 'UNHEALTHY': return 'status-error'
    default: return 'status-unknown'
  }
}

function Dashboard() {
  const { token: _token } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [health, security, performance, cron] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || ''}/api/health`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
          fetch(`${import.meta.env.VITE_API_URL || ''}/api/security/dashboard`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
          fetch(`${import.meta.env.VITE_API_URL || ''}/api/performance/dashboard`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
          fetch(`${import.meta.env.VITE_API_URL || ''}/api/cron/dashboard`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
        ])
        setData({ api: health.data, security: security.data, performance: performance.data, cron: cron.data })
      } catch (err) {
        setError('Error cargando dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const api = data?.api || {}
  const apiSystems = api?.systems || {}

  if (loading) return <div className="loading">Cargando dashboard...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-left">
          <h1>Clínica TMS</h1>
          <span className="badge">Sistema Operativo</span>
        </div>
        <div className="header-right">
          <button onClick={handleLogout} className="btn-logout">Cerrar Sesión</button>
        </div>
      </header>
      <main className="main">
        <section className="grid">
          <div className="card">
            <h3>Salud del Sistema</h3>
            <div className="status-row">
              <span>API</span>
              <span className={`status ${statusColor(api?.overall || api?.status)}`}>{api?.overall || api?.status}</span>
            </div>
            <div className="status-row">
              <span>Base de Datos</span>
              <span className={`status ${statusColor(apiSystems?.database?.status)}`}>{apiSystems?.database?.status}</span>
            </div>
            <div className="status-row">
              <span>Compliance</span>
              <span className={`status ${statusColor(apiSystems?.compliance?.status)}`}>{apiSystems?.compliance?.status}</span>
            </div>
            <div className="status-row">
              <span>Seguridad</span>
              <span className={`status ${statusColor(apiSystems?.security?.status)}`}>{apiSystems?.security?.status}</span>
            </div>
          </div>
          
          <div className="card">
            <h3>Seguridad</h3>
            <div className="metric">
              <span>Eventos 24h</span>
              <strong>{data?.security?.totalEvents || 0}</strong>
            </div>
            <div className="metric">
              <span>Alertas activas</span>
              <strong>{data?.security?.activeAlerts || 0}</strong>
            </div>
            <div className="metric">
              <span>IPs bloqueadas</span>
              <strong>{data?.security?.blockedIPs || 0}</strong>
            </div>
            <div className="metric">
              <span>Sesiones activas</span>
              <strong>{data?.security?.activeSessions || 0}</strong>
            </div>
          </div>

          <div className="card">
            <h3>Performance</h3>
            <div className="metric">
              <span>Latencia promedio</span>
              <strong>{data?.performance?.api?.avg_duration_ms || 0} ms</strong>
            </div>
            <div className="metric">
              <span>P95</span>
              <strong>{data?.performance?.api?.p95_duration_ms || 0} ms</strong>
            </div>
            <div className="metric">
              <span>Error rate</span>
              <strong>{((data?.performance?.api?.error_rate || 0) * 100).toFixed(2)}%</strong>
            </div>
            <div className="metric">
              <span>Requests/min</span>
              <strong>{data?.performance?.api?.requests_per_minute || 0}</strong>
            </div>
          </div>

          <div className="card">
            <h3>Cron Manager</h3>
            <div className="metric">
              <span>Jobs totales</span>
              <strong>{data?.cron?.jobs || 0}</strong>
            </div>
            <div className="metric">
              <span>Activos</span>
              <strong>{data?.cron?.enabled_jobs || 0}</strong>
            </div>
            <div className="metric">
              <span>Fallos recientes</span>
              <strong>{data?.cron?.recent_failures || 0}</strong>
            </div>
          </div>

          <div className="card full-width">
            <h3>Accesos Rápidos</h3>
            <div className="quick-links">
              <a href="/api/health" target="_blank" className="link-btn">Health Check</a>
              <a href="/api/compliance/dashboard" target="_blank" className="link-btn">Compliance Dashboard</a>
              <a href="/api/security/dashboard" target="_blank" className="link-btn">Security Dashboard</a>
              <a href="/api/observability/dashboard" target="_blank" className="link-btn">Observabilidad</a>
              <a href="/api/performance/dashboard" target="_blank" className="link-btn">Performance</a>
              <a href="/api/cron/dashboard" target="_blank" className="link-btn">Cron Manager</a>
              <a href="/api/security/dashboard" target="_blank" className="link-btn">Security Events</a>
              <a href="/api/cron/executions" target="_blank" className="link-btn">Cron Executions</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Dashboard