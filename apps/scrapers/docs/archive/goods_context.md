# Goods + Pipedream Context Overview

## 🏗️ Pipedream Labs Overview
**Headquarters:** Austin, Texas  
**Mission:** Build a city-scale, underground delivery infrastructure using autonomous, rail-guided robotic carts that carry totes through tubes (“hyperlogistics”).  
**Vision:** Replace short-haul delivery traffic (Amazon, DoorDash, Uber Eats, Instacart) with underground routes connecting warehouses, retail hubs, and residential pickup portals.  
**Business Model:**
- Partner with cities and major logistics players.  
- Develop “portal nodes” for customers and couriers.  
- Monetize via *city franchise agreements* and network fees once reliability and throughput are proven.  
- Proofs of concept in Austin and Dallas (2023–2025).  
- Prior QSR pilot with **Wendy’s** (drive-thru robot handoff).  
- Demonstrations show <15-second delivery from kitchen to portal.

---

## 🛒 Goods Grocery: Pipedream’s Proof-of-Concept Node
**Purpose:** Goods is *not* a grocery business — it’s an operational testbed for Pipedream’s infrastructure and software ecosystem.

**Location:** 6500 North Lamar Blvd, Austin, TX  
**Launch:** Soft launch (December, F&F) → Public launch (January)

**Core Model:**
- Pickup-only grocery service with 2-minute delivery guarantee (order → pickup).  
- Combines on-site stocked goods (~10,000 SKUs) with daily “sweep” pickups from partner grocers (HEB, Whole Foods, Trader Joe’s).  
- Robots shuttle totes underground from warehouse → pickup portals.  
- RFID-tag car arrivals trigger the correct tote delivery.  

**Revenue Model:** Small markup per item, no fees, not built for profit.  
**Primary Goals:** Prove reliability, throughput, and customer adoption. Build a repeatable model for future nodes.

---

## ⚙️ Infrastructure & Flow
1. **Inbound Supply:** Owned SKUs replenished via distributors; partner SKUs collected in daily sweeps (e.g., HEB pre-12 PM → available post-5 PM).  
2. **Warehouse Layout:** Temperature-zoned, ABC-tiered by velocity, cross-dock for partner goods.  
3. **Automation Loop:** Pick → pack → verify → robot input → tote delivery → portal pickup.  
4. **Customer Experience:** RFID vehicle detection, automatic tote surfacing, 2-minute window.

---

## 📊 Success Metrics
| Category | KPI | Target/Use |
|-----------|-----|------------|
| Throughput | Orders/day | 50 → 300 |
| Reliability | % under 2-min | Benchmark for city franchising |
| Accuracy | % correct SKUs | Core UX metric |
| Partner Sweep | % complete | Multi-vendor validation |
| Customer Sat | NPS | UX adoption metric |
| Neighborhood | Event & traffic mgmt | City relation metric |

---

## 🧩 Operational Framework (Phase Roadmap)
### **Phase 1 — Stabilization (Pre-launch → Jan)**
- Map full order flow, identify bottlenecks.  
- Define reliability budgets (error/delay %).  
- Run synthetic stress tests.  
- Write triage & launch SOPs.

### **Phase 2 — Launch Execution (Jan)**
- Activate live order tracking dashboards.  
- Manage exception handling (missing items, delays).  
- Focus on portal experience & lane flow.

### **Phase 3 — Scaling & Standardization (Q1–Q2)**
- Refine SKU zoning via velocity analysis.  
- Separate partner vs owned inventory.  
- Build shift models & incentive loops.  
- Codify SOPs → *Goods Playbook 1.0*.

### **Phase 4 — System Maturity (Q2+)**
- Define SLAs for partners (Amazon, DoorDash).  
- Build node-to-node reliability network.  
- Prepare for city/investor demos.  
- Use ops data for ROI + throughput validation.

---

## 💡 Analytical & Data Science Goals
**Initial Project:** Demand estimation for 10,000+ SKUs.  
**Inputs:** SKU metadata (category, perishability, source).  
**Outputs:** Velocity tiers → shelf space allocation → reorder cadence.

**Next Steps:**
1. Integrate partner sweep manifests.  
2. Build velocity models (A/B/C-tier).  
3. Create daily forecasting dashboard.  
4. Use time-series models (Prophet/ARIMA).  
5. Optimize warehouse zoning via predicted velocity.

---

## 🚀 End-State Vision
- **Goods:** Operational prototype validating the model.  
- **Pipedream:** Infrastructure company scaling underground logistics.  
- **Success hierarchy:** Reliability → Speed → Cost → Experience.  
- **Goal:** Replicable, high-reliability nodes that reduce last-mile cost, congestion, and carbon footprint.

---

**File generated for: Goods Data Science / Operations Environment Setup**  
**Use:** Context for modeling, forecasting, and system optimization tasks.
