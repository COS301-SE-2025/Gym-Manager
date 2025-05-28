# Rome was built in a day – Gym‑Manager

![Gym-Manager Banner](banner.png)

> Gym manager is a specialized management software solution purpose-built for HIIT (HighIntensity Interval Training) gyms. Unlike other fitness management platforms, this system is
designed around the unique workflows, community focus, and performance tracking needs of
HIIT environments

---

## 📑 Functional Requirements (SRS)

The full Software Requirements Specification can be found here → **[Gym‑Manager SRS (PDF)](https://github.com/COS301-SE-2025/Gym-Manager/blob/main/documents/SRS.pdf)**

---

## 📋 Project Board

We use a GitHub Project board to track epics, user stories, bugs and QA tasks.

🔗 **[View the Board](https://github.com/orgs/COS301-SE-2025/projects/218/views/2)**

---

## 👥 Team Members

| Name               | Role                | LinkedIn                                                                 |
| - | - | - |
| **Vansh Sood**  | Tech Lead / API Dev | [linkedin.com/in/vansh-sood](https://www.linkedin.com/in/vansh-sood-783519352/)   |
| **Jason Mayo**  | Tech Lead / API Dev | [linkedin.com/in/jason-mayo](http://linkedin.com/in/jason-mayo-7a8063210)   |
| **Denis Woolley**  | Tech Lead / API Dev | [linkedin.com/in/denis‑woolley](https://www.linkedin.com/in/denis-woolley-981aa6202/)   |
| **Amadeus Fidos**  | Tech Lead / API Dev | [linkedin.com/in/amadeus-fidos](https://www.linkedin.com/in/amadeus-fidos-b22512356/)   |
| **Jared Hürlimann**  | Tech Lead / API Dev | [linkedin.com/in/jared-hurlimann](https://www.linkedin.com/in/jared-h%C3%BCrlimann-695ba82a4/)  |


---

## 🗂️ Repository Structure & Branching

```
Gym-Manager/
├── apps/
│   ├── mobile/        <-- Expo React Native client (App Store & Play Store)
│   └── web/           <-- Next.js web front‑end (Vercel)
├── documents/         <-- SRS, mock‑ups, domain model, user‑stories
├── infra/
│   └── postgres/      <-- DDL scripts, seed data, DB README
├── packages/
│   └── js-library/    <-- Shared TypeScript utils + Zod schemas
├── services/
│   └── api/           <-- Node + Express REST API (Drizzle ORM, Jest)
└── README.md
```

* **Mono‑repo** managed with Git workspaces.
* **Main ↔ dev ↔ feature/** branching model.

  * `main` = production‑ready code.
  * `dev` = integration branch.
  * `feature/` branches for day‑to‑day work.

---

## 🏗️ CI / CD & Quality Gates *(coming soon)*
| Badge | Purpose | Live Status |
|-------|---------|-------------|
| ![Build](https://img.shields.io/github/actions/workflow/status/COS301-SE-2025/Gym-Manager/ci.yml?label=Build&logo=github) | **Build** & unit‑test pipeline (GitHub Actions) | `ci.yml` checks lint → test → build on every push & PR |
| ![Coverage](https://img.shields.io/codecov/c/github/COS301-SE-2025/Gym-Manager?label=Coverage&logo=codecov) | Jest **code coverage** via Codecov | Target ≥ 80 % |
| ![Requirements](https://img.shields.io/badge/requirements-track--passed-brightgreen) | **Requirements** checklist completeness | Linked to SRS table |
| ![Open Issues](https://img.shields.io/github/issues/COS301-SE-2025/Gym-Manager?logo=github) | Active **GitHub Issues** | Auto‑updates |
| ![Uptime](https://img.shields.io/uptimerobot/ratio/m793620257-fa7567f6c9f1e2282d9efa97?label=API%20Uptime) | **Monitoring** (UptimeRobot) for `/api/health` | 30‑day ratio |

> © 2025 Rome was built in a day — University of Pretoria COS 301 Capstone Project
