# ANTARIS — Bharti Research Station Digital Twin & Automation Engine

**Live deployment:** [https://antaris-1.onrender.com/](https://antaris-1.onrender.com/) — Bharati Station operations dashboard (digital twin, ML health, tickets, and automation).

Integrated **3D digital twin**, **ML-driven remaining useful life (RUL) predictions**, and an **automation engine** for predictive maintenance at a polar research station. The system links facility equipment in a 3D model to live health telemetry, dependency-aware maintenance prioritization, ticketing, SOPs, and policy-governed automation.

---

## Run on localhost (quick start)

**Prerequisites:** [Node.js](https://nodejs.org/) 18+ and npm.

1. From this repository root, open a terminal and go to the application workspace:

   ```bash
   cd automation-engine/automation-engine
   ```

2. Install dependencies (npm workspaces: **backend** + **Dashboard**):

   ```bash
   npm install
   ```

3. (Recommended) Copy environment defaults:

   ```bash
   cp .env.example .env
   ```

   On Windows (PowerShell): `Copy-Item .env.example .env`

   Adjust `ML_API_URL` if you use a different RUL API endpoint.

4. Start **both** the API and the dashboard:

   ```bash
   npm run dev
   ```

5. Open in your browser:

   | Service    | URL |
   |------------|-----|
   | **Dashboard** (React + 3D twin) | [http://localhost:3000](http://localhost:3000) |
   | **Backend API** (Express)       | [http://localhost:4000](http://localhost:4000) |

   The dashboard proxies API calls to `/api` → `http://localhost:4000`. The backend polls the ML RUL API on an interval and runs the automation engine (tickets, policies, personnel assignment).

**Other scripts**

| Command | Description |
|---------|-------------|
| `npm run dev:backend` | API only (port 4000) |
| `npm run dev:frontend` | Dashboard only (port 3000) |
| `npm run build` | Production build for backend + Dashboard |
| `npm start` | Run compiled backend (`node dist/server.js`) |

**Optional — standalone 3D twin** (Vite, no automation UI): `Digital_Twin_Final/Animation` (`npm install` → `npm run dev`, port **8000**).

---

## Architecture (brief)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  ML RUL API     │────▶│  Backend :4000   │────▶│  Dashboard :3000    │
│  (predictions)  │     │  • ML poller     │     │  • Station KPIs     │
└─────────────────┘     │  • Topology graph│     │  • 3D digital twin  │
                        │  • Automation    │     │  • Tickets / alerts │
                        │  • Tickets/SOPs  │     └─────────────────────┘
                        └──────────────────┘
```

- **Dashboard:** React + Three.js cinematic twin (32 monitored assets), component inspection, live ML overlay, maintenance tickets, personnel, procedures, automation events.
- **Backend:** Express API, in-memory/JSON persistence, ML normalization, **facility dependency graph** (internal) for maintenance ordering and priority elevation, WHITELIST/GREYLIST/BLACKLIST automation policies, actuator hooks, energy optimization helpers.
- **ML layer:** External predictions (`component_id`, RUL, state, sensor status) drive health badges, fault detection, and ticket creation.

---

## Round 2 — Prototype & implementation evaluation map

*Purpose: demonstrate a functional, technically sound, and practically viable solution.*

### 1. Prototype / working solution (25)

| What we deliver | Evidence in this repo |
|-----------------|------------------------|
| End-to-end working prototype | `npm run dev` → live dashboard + API; 3D twin loads facility GLB, pick/inspect components, ML-colored health states |
| Demonstrates proposed solution | Station-wide monitoring, fault → ticket → SOP/policy → assign or automate |
| Digital twin fidelity | `Dashboard/src/digitalTwin/` — PBR materials, two-stage picking, blueprint context, generator cover animations |

### 2. Technical complexity & implementation (20)

| Area | Implementation |
|------|----------------|
| 3D & interaction | Three.js, Draco-compressed GLTF, OrbitControls, gamepad navigation (dashboard twin), Anime.js inspection animations |
| ML integration | Poller + schema validation + health/priority normalization (`backend/src/services/ml/`) |
| Dependency graph | Directed graph of ~35 components (`topologyData.ts`); **internal** scoring for operational criticality (`maintenancePriorityService.ts`) |
| Automation | Policy engine, procedure matching, personnel assignment, ticket lifecycle, event log |
| Frontend | React 18, TypeScript, Vite, Tailwind; workspace monorepo |

### 3. Functionality & performance (15)

| Capability | Notes |
|------------|--------|
| Live predictions | Periodic ML poll; components and twin sensor panel reflect RUL and state |
| Fault handling | Degradation/fault → ranked processing → tickets with adjusted priority |
| Reliability | API health endpoint; ML connection status on dashboard; graceful ML fallback paths in twin data layer |
| Performance | Throttled raycasting, quality presets (HIGH/MED/LOW), frustum culling, Draco assets |

### 4. Feasibility & practicability (10)

| Factor | Approach |
|--------|----------|
| Deployability | Static frontend + Node backend; env-based ML URL; documented local run |
| Operations | Ticket queue ranked by automation (ML + internal graph); personnel and SOP catalog in config/DB |
| Polar / remote context | Scenario modeled on Bharti Research Station assets (CHP, water, sewage, telecom) |
| Cost | Open-source stack; ML API can be hosted separately (e.g. Render) |

### 5. Scalability & sustainability (10)

| Dimension | Design |
|-----------|--------|
| Scale-out | Stateless API pattern; ML as external service; component graph versioned (`TOPOLOGY_VERSION`) |
| Maintainability | Separated services (ml, automation, digitalTwin, energy); typed backend; modular twin JS modules |
| Data | JSON store default; `DATABASE_URL` configurable for future DB migration |
| Asset growth | Topology nodes/edges and CAD name mapping extensible without rewriting twin core |

### 6. User experience / usability (10)

| UX element | Where |
|------------|--------|
| Operator dashboard | KPIs, alerts, component detail, ticket tabs with maintenance rank |
| 3D twin | Sidebar asset navigator, hover tooltips, click-to-inspect, ESC reset, controller hints |
| Clarity | Health legend (metallic vs blueprint), selection chip, loading/error overlays |
| Workflows | Create/view tickets; automation timeline; standard procedures linked to component types |

### 7. Real-world impact (10)

| Impact | How the system supports it |
|--------|----------------------------|
| Reduced downtime | Earlier degradation visibility + prioritized maintenance queue |
| Safer operations | Policy-gated automation; escalation when no SOP or BLACKLIST |
| Better resource use | Personnel assignment by procedure; energy optimization API |
| Evidence for decisions | RUL, anomaly counts, sensor failover (primary/backup), audit-style automation events |

---

## Key API surfaces (backend)

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | API + ML connection status |
| `GET /predictions` | Latest normalized predictions |
| `GET /tickets` | Maintenance tickets (includes automation rank metadata) |
| `GET /maintenance/queue` | Open work ordered by composite urgency |
| `GET /digital-twin/topology` | Facility dependency graph (for integrators/API clients) |
| `GET /automation/events` | Automation audit trail |

---

## Repository layout

```
ANTARIS-1/                              ← repository root (this README)
├── automation-engine/automation-engine/   Main app — run npm install & npm run dev here
│   ├── backend/          Express API, ML poller, automation, topology
│   ├── Dashboard/        React UI + embedded 3D digital twin
│   ├── package.json      npm workspaces
│   └── .env.example
└── Digital_Twin_Final/Animation/       Optional standalone Vite twin (port 8000)
```

---

## Team & context

**ANTARIS** — *Bharti Research Station · Antarctica · Digital Twin*  
Combines immersive facility visualization with predictive maintenance automation suitable for isolated, mission-critical infrastructure.

For deployment (e.g. Render), build the Dashboard and run the backend with `PORT` and `ML_API_URL` set; ensure `Dashboard/public/assets/models/DIGITAL_TWIN.glb` (and Draco decoders) are included in the static build.
