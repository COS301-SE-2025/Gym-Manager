# Rome was built in a day – Gym‑Manager

> Gym manager is a specialized management software solution purpose-built for HIIT (HighIntensity Interval Training) gyms. Unlike other fitness management platforms, this system is
designed around the unique workflows, community focus, and performance tracking needs of
HIIT environments

---

## 📑 Functional Requirements (SRS)

The full Software Requirements Specification can be found here → **[Gym‑Manager SRS (DOCX)](https://github.com/COS301-SE-2025/Gym-Manager/blob/main/documents/FunctionalRequirements.docx)**

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
| **Amadeus Fidos**  | Tech Lead / API Dev | [linkedin.com/in/damadeus-fidos](https://www.linkedin.com/in/amadeus-fidos-b22512356/)   |
| **Vansh Sood**  | Tech Lead / API Dev | [linkedin.com/in/vansh-sood](https://linkedin.com/in/denis-woolley)   |


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
Stub

> © 2025 Rome was built in a day — University of Pretoria COS 301 Capstone Project
