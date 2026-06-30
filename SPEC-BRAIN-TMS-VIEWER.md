# 🧠 BRAIN TMS VIEWER — SPEC DRIVEN DEVELOPMENT
## Documento de Especificación Completa (30 Páginas)

---

## 📋 ÍNDICE

```
PÁGINA 1-2:   Resumen Ejecutivo + Objetivos
PÁGINA 3-4:   Arquitectura de Sistema
PÁGINA 5-6:   Stack Tecnológico (Minimalista)
PÁGINA 7-8:   Estructura de Datos
PÁGINA 9-10:  Módulos del Sistema
PÁGINA 11-12: Flujo de Usuario
PÁGINA 13-14: Visualización 3D
PÁGINA 15-16: Simulación Neural
PÁGINA 17-18: Protocolo TMS
PÁGINA 19-20: UI/UX Design
PÁGINA 21-22: Las 30 Páginas/Vistas
PÁGINA 23-24: API Endpoints
PÁGINA 25-26: Testing Strategy
PÁGINA 27-28: Deployment
PÁGINA 29-30: Roadmap + Milestones
```

---

## 📄 PÁGINAS 1-2: RESUMEN EJECUTIVO + OBJETIVOS

### 🎯 Visión del Producto

**Sistema web de visualización 3D interactiva para terapia magnética transcraneal (TMS)** que permite a neurólogos y técnicos:

1. **Visualizar** actividad cerebral en tiempo real durante sesiones TMS
2. **Simular** propagación neural y plasticidad sináptica
3. **Monitorear** respuesta clínica del paciente por sesión
4. **Optimizar** protocolos de tratamiento basados en datos

### 🎯 Objetivos SMART

| Objetivo | Métrica | Plazo |
|----------|---------|-------|
| **Funcional** | Sistema 3D opera a 60fps en hardware medio | 2 semanas |
| **Clínico** | 9 regiones cerebrales con datos TMS validados | 1 semana |
| **UX** | Flujo completo en < 3 clicks | 1 semana |
| **Performance** | Carga inicial < 3s, modelo 3D < 5MB | 1 semana |
| **Escalabilidad** | Soporta 100 pacientes concurrentes | 2 semanas |

### 🎯 Alcance del Proyecto

**INCLUYE:**
- ✅ Visualización 3D del cerebro con regiones clickeables
- ✅ Animaciones de actividad neural (pulso, propagación)
- ✅ Simulación de protocolo TMS completo
- ✅ Dashboard clínico con historial y curva de progreso
- ✅ 30 páginas/vistas funcionales
- ✅ API REST para integración con backend

**NO INCLUYE:**
- ❌ Machine learning / IA predictiva
- ❌ Integración con hardware TMS real (solo simulación)
- ❌ Multi-idioma (solo español)
- ❌ Mobile app nativa (solo web responsive)

### 🎯 Principios de Diseño

```
1. SIMPLEZA RADICAL
   - Zero frameworks innecesarios
   - Vanilla JS + React donde aporte valor
   - Three.js solo para 3D (no R3F, no Babylon)

2. PERFORMANCE FIRST
   - 60fps en render loop
   - Web Worker para simulación
   - Lazy loading de assets

3. CLINICAL ACCURACY
   - Regiones anatómicas reales
   - Frecuencias TMS validadas (1Hz, 10Hz, 20Hz)
   - Protocolos basados en literatura médica

4. MAINTAINABILITY
   - Código modular y testeable
   - Documentación inline
   - Sin magic numbers
```

---

## 📄 PÁGINAS 3-4: ARQUITECTURA DE SISTEMA

### 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   UI Layer   │  │  3D Layer    │  │ Simulation   │      │
│  │  (React)     │  │  (Three.js)  │  │  (Worker)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
│                    ┌──────▼───────┐                         │
│                    │  State Mgmt  │                         │
│                    │  (Context)   │                         │
│                    └──────┬───────┘                         │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   API Layer    │
                    │  (REST/JSON)   │
                    └───────┬────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                    BACKEND (Cloudflare Workers)              │
├───────────────────────────┼─────────────────────────────────┤
│                           │                                 │
│  ┌──────────────┐  ┌──────▼───────┐  ┌──────────────┐      │
│  │  D1 Database │  │  KV Cache    │  │  R2 Storage  │      │
│  │  (Patients)  │  │  (Sessions)  │  │  (Assets)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 🏗️ Separación de Responsabilidades

| Capa | Responsabilidad | Tecnología |
|------|-----------------|------------|
| **UI Layer** | Renderizado de componentes, interacción usuario | React 18 + TypeScript |
| **3D Layer** | Renderizado WebGL, animaciones, raycasting | Three.js vanilla |
| **Simulation Layer** | Cálculos neural, propagación, plasticidad | Web Worker + TypeScript |
| **State Management** | Estado global, sincronización | React Context + useReducer |
| **API Layer** | Comunicación frontend-backend | Fetch API + TypeScript |
| **Backend** | Persistencia, lógica de negocio | Cloudflare Workers + D1 |

### 🏗️ Flujo de Datos

```
1. USUARIO interactúa con UI
   ↓
2. UI dispatcha acción a Context
   ↓
3. Context actualiza estado global
   ↓
4. Estado se propaga a:
   - 3D Layer (visualización)
   - Simulation Layer (cálculos)
   ↓
5. Simulation Layer procesa en Web Worker
   ↓
6. Worker postMessage con resultados
   ↓
7. Context actualiza estado con resultados
   ↓
8. UI + 3D Layer re-renderizan
```

### 🏗️ Módulos del Frontend

```
src/
├── brain/
│   ├── render/              ← 3D Layer
│   │   ├── BrainCanvas.tsx
│   │   ├── BrainRenderer.ts
│   │   ├── BrainScene.ts
│   │   ├── RegionMesh.ts
│   │   ├── ConnectionLines.ts
│   │   ├── VolumetricCoil.ts
│   │   ├── CoilField.ts
│   │   ├── MaterialLibrary.ts
│   │   └── HospitalOverlay.tsx
│   │
│   ├── simulation/          ← Simulation Layer
│   │   ├── brain.worker.ts
│   │   ├── PropagationEngine.ts
│   │   ├── ConnectomeEngine.ts
│   │   ├── PlasticityEngine.ts
│   │   ├── ProtocolStateMachine.ts
│   │   └── ProtocolSimulationEngine.ts
│   │
│   └── types/               ← Tipos compartidos
│       ├── BrainTypes.ts
│       └── SimulationTypes.ts
│
├── visual-engine/
│   ├── modules/
│   │   └── brain/
│   │       ├── BrainViewer.tsx
│   │       ├── brain-regions.ts
│   │       ├── brain-animations.ts
│   │       └── useBrainState.ts
│   │
│   └── core/
│       ├── StateMapper.ts
│       └── ClinicalRenderer.ts
│
├── pages/
│   └── app/
│       └── BrainViewerPage.tsx
│
└── components/
    └── ui/
        └── Badge.tsx
```

---

## 📄 PÁGINAS 5-6: STACK TECNOLÓGICO (MINIMALISTA)

### 🛠️ Stack Principal

| Categoría | Tecnología | Versión | Justificación |
|-----------|------------|---------|---------------|
| **Framework UI** | React | 18.2 | Ecosistema maduro, hooks, concurrent features |
| **Lenguaje** | TypeScript | 5.3 | Type safety, mejor DX |
| **Build Tool** | Vite | 5.0 | Rápido, HMR instantáneo, zero config |
| **3D Engine** | Three.js | 0.160 | Estándar de facto, documentación extensa |
| **Styling** | Tailwind CSS | 3.4 | Utility-first, rápido, consistente |
| **State** | React Context | built-in | Simple, sin dependencias extra |
| **Routing** | React Router | 6.20 | Estándar, declarativo |
| **Backend** | Cloudflare Workers | latest | Edge computing, D1/KV/R2 integrados |
| **Database** | Cloudflare D1 | latest | SQL compatible, serverless |
| **Cache** | Cloudflare KV | latest | Key-value, global edge |
| **Storage** | Cloudflare R2 | latest | S3-compatible, zero egress fees |

### 🛠️ Lo que NO usamos (y por qué)

| Tecnología | Razón de exclusión |
|------------|-------------------|
| **Redux** | Overkill. Context + useReducer es suficiente |
| **React Three Fiber** | Abstracción innecesaria. Three.js vanilla da más control |
| **Next.js** | No necesitamos SSR. Vite es más simple y rápido |
| **GraphQL** | REST es suficiente. GraphQL añade complejidad innecesaria |
| **PostgreSQL** | D1 es más simple, serverless, y suficiente |
| **AWS** | Cloudflare es más simple, más barato, mejor DX |
| **Webpack** | Vite es 10x más rápido y zero config |
| **Jest** | Vitest es más rápido y compatible con Vite |

---

## 📄 PÁGINAS 7-8: ESTRUCTURA DE DATOS

### 🗄️ Modelo de Datos — Pacientes

```typescript
export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  diagnosis: string;
  registered_at: string;
  current_state: PatientState;
}

export type PatientState = 
  | 'REGISTERED'
  | 'EVALUATED'
  | 'MT_MEASURED'
  | 'PROTOCOL_ASSIGNED'
  | 'IN_TREATMENT'
  | 'UNDER_OBSERVATION'
  | 'DISCHARGED';
```

### 🗄️ Modelo de Datos — Regiones Cerebrales

```typescript
export interface BrainRegion {
  id: BrainRegionId;
  label: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  side: 'left' | 'right' | 'center';
  brainFunction: string;
  indications: string[];
  tmsFrequency: string;
  description: string;
  position3D: [number, number, number];
  size3D: [number, number, number];
}

export type BrainRegionId = 
  | 'prefrontal_left'
  | 'prefrontal_right'
  | 'dorsal_acc'
  | 'motor_cortex_left'
  | 'motor_cortex_right'
  | 'broca'
  | 'wernicke'
  | 'insula_left'
  | 'insula_right';
```

### 🗄️ Modelo de Datos — Actividad Neural

```typescript
export type BrainActivityLevel = 
  | 'idle'
  | 'low'
  | 'active'
  | 'stimulated'
  | 'high_response'
  | 'risk';

export interface BrainVisualState {
  regionId: BrainRegionId;
  activity: BrainActivityLevel;
  intensity: number;
}

export const BRAIN_ACTIVITY_COLORS: Record<BrainActivityLevel, string> = {
  idle: '#e2e8f0',
  low: '#93c5fd',
  active: '#3b82f6',
  stimulated: '#eab308',
  high_response: '#22c55e',
  risk: '#ef4444'
};
```

### 🗄️ Modelo de Datos — Sesiones TMS

```typescript
export interface TMSSession {
  id: number;
  patient_id: number;
  profile_id: number;
  session_number: number;
  date: string;
  duration_minutes: number;
  pulses_delivered: number;
  intensity_percent: number;
  frequency_hz: number;
  target_region: BrainRegionId;
  notes: string;
}

export interface TMSProfile {
  id: number;
  patient_id: number;
  name: string;
  protocol: string;
  total_sessions: number;
  frequency_hz: number;
  intensity_percent: number;
  target_region: BrainRegionId;
  created_at: string;
}
```

### 🗄️ Modelo de Datos — Respuesta Clínica

```typescript
export interface ClinicalResponse {
  id: number;
  patient_id: number;
  session_id: number;
  session_number: number;
  mood_score: number;
  anxiety_score: number;
  energy_score: number;
  sleep_score: number;
  overall_response: number;
  recorded_at: string;
}

export interface CurvePoint {
  session_number: number;
  mood_score: number;
  anxiety_score: number;
  energy_score: number;
  overall_response: number;
}
```

### 🗄️ Modelo de Datos — Simulación Neural

```typescript
export interface NeuralState {
  activity: Record<BrainRegionId, number>;
  connections: number[][];
  timestamp: number;
}

export interface SimulationConfig {
  dt: number;
  learningRate: number;
  propagationSpeed: number;
  decayRate: number;
}

export interface ProtocolState {
  phase: 'idle' | 'approach' | 'ramp' | 'propagation' | 'peak' | 'cooldown';
  intensity: number;
  frequency: number;
  targetRegion: BrainRegionId;
  elapsed: number;
}
```

### 🗄️ Esquema de Base de Datos (D1)

```sql
CREATE TABLE patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  diagnosis TEXT,
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  current_state TEXT DEFAULT 'REGISTERED'
);

CREATE TABLE tms_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  protocol TEXT,
  total_sessions INTEGER,
  frequency_hz REAL,
  intensity_percent REAL,
  target_region TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE tms_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  session_number INTEGER NOT NULL,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_minutes INTEGER,
  pulses_delivered INTEGER,
  intensity_percent REAL,
  frequency_hz REAL,
  target_region TEXT,
  notes TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (profile_id) REFERENCES tms_profiles(id)
);

CREATE TABLE clinical_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  session_number INTEGER NOT NULL,
  mood_score REAL,
  anxiety_score REAL,
  energy_score REAL,
  sleep_score REAL,
  overall_response REAL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (session_id) REFERENCES tms_sessions(id)
);

CREATE TABLE clinical_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  note_type TEXT,
  therapist_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
```

---

## 📄 PÁGINAS 9-10: MÓDULOS DEL SISTEMA

### 🧩 Módulo 1: Visualización 3D (Three.js Vanilla)

**Archivos:**
- `BrainCanvas.tsx` — Wrapper React
- `BrainRenderer.ts` — Orquestador (escena, cámara, renderer)
- `BrainScene.ts` — Carga modelo GLB, crea regiones
- `RegionMesh.ts` — Esfera + hitbox por región
- `ConnectionLines.ts` — Curvas bezier entre regiones
- `VolumetricCoil.ts` — Bobina TMS figure-8
- `CoilField.ts` — Campo electromagnético
- `MaterialLibrary.ts` — Colores y materiales
- `HospitalOverlay.tsx` — HUD overlay

### 🧩 Módulo 2: Simulación Neural (Web Worker)

**Archivos:**
- `brain.worker.ts` — Worker principal
- `PropagationEngine.ts` — Propagación neural con sigmoid
- `ConnectomeEngine.ts` — Matriz de conectividad
- `PlasticityEngine.ts` — Plasticidad Hebbian
- `ProtocolStateMachine.ts` — Estados del protocolo
- `ProtocolSimulationEngine.ts` — Motor async alternativo

### 🧩 Módulo 3: Estado Global (React Context)

**Archivos:**
- `BrainContext.tsx` — Provider + reducer
- `useBrainState.ts` — Hook para consumir estado

### 🧩 Módulo 4: API Layer

**Archivos:**
- `api.ts` — Cliente API tipado

### 🧩 Módulo 5: UI Components

**Archivos:**
- `Badge.tsx`, `Button.tsx`, `Card.tsx`, `Modal.tsx`, `ProgressBar.tsx`, `Chart.tsx`

---

## 📄 PÁGINAS 11-12: FLUJO DE USUARIO

### 🔄 Flujo Principal: Sesión TMS Completa

1. SELECCIONAR PACIENTE → Grid de pacientes → Click
2. VISUALIZAR CEREBRO → Modelo 3D → Regiones con actividad
3. SELECCIONAR REGIÓN → Click en 3D → Panel clínico
4. CONFIGURAR PROTOCOLO → Intensidad, frecuencia, duración
5. INICIAR SIMULACIÓN → Bobina TMS → Protocolo por fases
6. MONITOREAR EN TIEMPO REAL → HUD overlay → Gráfico
7. REGISTRAR RESPUESTA CLÍNICA → Scores (0-10)
8. VER CURVA DE PROGRESO → Gráfico SVG evolución

### 🔄 Flujo de Error

1. Error en carga 3D → Fallback a SVG 2D → Toast notificación

---

## 📄 PÁGINAS 13-14: VISUALIZACIÓN 3D

### 🎨 Componentes de la Escena 3D

- MODELO CEREBRO (brain_nodraco.glb) — MeshPhysicalMaterial
- REGIONES (esfera + hitbox + ring) — 9 regiones
- CONEXIONES NEURALES (15 curvas bezier) — LineDashedMaterial animado
- BOBINA TMS (VolumetricCoil) — Figure-8 torus
- MARCADORES ORIENTACIÓN (A/P/L/R)
- ILUMINACIÓN — Ambient + Directional + PointLight

### 🎨 Animaciones por Estado

- idle → opacity 0.4, sin animación
- low → opacity 0.6, parpadeo 3s
- active → opacity 0.8, brillo 2s
- stimulated → opacity 0.9, pulso 1.5s
- high_response → opacity 1.0, pulso 1.2s, glow
- risk → opacity 1.0, parpadeo 0.8s, glow rojo

### 🎨 Cámara y Controles

- position: [0, 0, 5], fov: 45
- OrbitControls: autoRotate 0.5, minDistance 3, maxDistance 8
- Click → seleccionar, Hover → glow, Scroll → zoom, Drag → rotar

---

## 📄 PÁGINAS 15-16: SIMULACIÓN NEURAL

### 🧠 PropagationEngine — Sigmoid + decay
### 🧠 PlasticityEngine — Hebb rule: Δw = lr * pre * post
### 🧠 ProtocolStateMachine — 6 fases: idle → approach → ramp → propagation → peak → cooldown
### 🧠 Web Worker Loop — STEP → propagate → plasticity → postMessage

---

## 📄 PÁGINAS 17-18: PROTOCOLO TMS

### ⚡ 6 Fases

1. IDLE → indefinida, 0%
2. APPROACH → 2s, 20%, bobina aparece
3. RAMP → 3s, 20→50%, campo visible
4. PROPAGATION → 5s, 50→80%, pulsos + ondas
5. PEAK → 2s, 100%, máxima intensidad
6. COOLDOWN → 4s, 100→0%, disipa

### ⚡ Frecuencias por Indicación

| Indicación | Frecuencia | Región |
|------------|------------|--------|
| Depresión mayor | 10-20 Hz | DLPFC izquierdo |
| Ansiedad | 1 Hz | DLPFC derecho |
| TOC | 10 Hz | ACC dorsal |
| Dolor crónico | 10-20 Hz | M1 primaria |
| Afasia post-ACV | 1-20 Hz | Broca/Wernicke |
| Adicciones | 10 Hz | Ínsula |
