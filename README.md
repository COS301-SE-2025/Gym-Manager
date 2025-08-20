<p align="center">
  <img src="banner.png" alt="Gym-Manager Banner" width="300">
</p>

<div align="center">

# TRAINWISE: The HIIT Gym‑Manager

![Build](https://img.shields.io/github/actions/workflow/status/COS301-SE-2025/Gym-Manager/ci.yml?label=Build&logo=github)
[![Coverage](https://codecov.io/gh/COS301-SE-2025/Gym-Manager/branch/main/graph/badge.svg)](https://codecov.io/gh/COS301-SE-2025/Gym-Manager)
![Open Issues](https://img.shields.io/github/issues/COS301-SE-2025/Gym-Manager?logo=github)
![Uptime](https://img.shields.io/uptimerobot/ratio/m793620257-fa7567f6c9f1e2282d9efa97?label=API%20Uptime)

> Gym manager is a specialized management software solution purpose-built for HIIT (HighIntensity Interval Training) gyms. Unlike other fitness management platforms, this system is designed around the unique workflows, community focus, and performance tracking needs of
HIIT environments

<img src="jumping_jack.gif" alt="Animated GIF" width="200">

---

  ## 📑 Documentation

  | Document Type             | Link |
  |---------------------------|------|
  | SRS                       | [Gym‑Manager SRS (PDF)](https://github.com/COS301-SE-2025/Gym-Manager/blob/main/documents/v3/SRSv3.pdf) |
  | Architectural Requirements| [Gym‑Manager Architectural Requirements (PDF)](https://github.com/COS301-SE-2025/Gym-Manager/blob/main/documents/v3/ArchitecturalRequirementsAndDesign.pdf) |
  | User Manual               | [Gym‑Manager User Manual (PDF)](https://github.com/COS301-SE-2025/Gym-Manager/blob/main/documents/v2/TRAINWISE%20USER%20MANUAL%20.pdf) |
  | Coding Standards             | [Gym‑Manager Coding Standards (PDF)](https://github.com/COS301-SE-2025/Gym-Manager/blob/main/documents/v3/CodingStandardsDocument.pdf) |
  | Service Contracts            | [Gym‑Manager Service Contracts (MD)](https://github.com/COS301-SE-2025/Gym-Manager/blob/main/documents/v3/ServiceContracts.md) |
  | Technical Installation Manual| [Gym‑Manager Technical Installation Manual (PDF)](https://github.com/COS301-SE-2025/Gym-Manager/blob/main/documents/v3/TechnicalInstallationManual.pdf) |

---

## 📋 Project Board

We use a GitHub Project board to track epics, user stories, bugs and QA tasks.

🔗 **[View the Board](https://github.com/orgs/COS301-SE-2025/projects/218/views/2)**

---
## 👥 Team Members

|  |  |
|--------|-------------|
| <img src="Vansh.jpeg" alt="Vansh Sood" width="200" height="200" style="border-radius:50%; object-fit:cover;"> | **Vansh Sood**<br>Architect, Services Engineer, Data Engineer<br><br><a href="https://github.com/yourusername" target="_blank">![GitHub](https://img.icons8.com/material-outlined/24/github.png)</a> <a href="https://www.linkedin.com/in/vansh-sood-783519352/" target="_blank">![LinkedIn](https://img.icons8.com/material-outlined/24/linkedin.png)</a> |
| <img src="Jason.jpeg" alt="Jason Mayo" width="200" height="200" style="border-radius:50%; object-fit:cover;"> | **Jason Mayo**<br>Designer, UI Engineer, Integration Engineer<br><br><a href="https://github.com/yourusername" target="_blank">![GitHub](https://img.icons8.com/material-outlined/24/github.png)</a> <a href="http://linkedin.com/in/jason-mayo-7a8063210" target="_blank">![LinkedIn](https://img.icons8.com/material-outlined/24/linkedin.png)</a> |
| <img src="Denis.jpeg" alt="Denis Woolley" width="200" height="200" style="border-radius:50%; object-fit:cover;"> | **Denis Woolley**<br>DevOps, Services Engineer, Architect<br><br><a href="https://github.com/yourusername" target="_blank">![GitHub](https://img.icons8.com/material-outlined/24/github.png)</a> <a href="https://www.linkedin.com/in/denis-woolley-981aa6202/" target="_blank">![LinkedIn](https://img.icons8.com/material-outlined/24/linkedin.png)</a> |
| <img src="Amadeus.jpg" alt="Amadeus Fidos" width="200" height="200" style="border-radius:50%; object-fit:cover;"> | **Amadeus Fidos**<br>Architect, Designer, UI Engineer<br><br><a href="https://github.com/yourusername" target="_blank">![GitHub](https://img.icons8.com/material-outlined/24/github.png)</a> <a href="https://www.linkedin.com/in/amadeus-fidos-b22512356/" target="_blank">![LinkedIn](https://img.icons8.com/material-outlined/24/linkedin.png)</a> |
| <img src="Jared.jpeg" alt="Jared Hürlimann" width="200" height="200" style="border-radius:50%; object-fit:cover;"> | **Jared Hürlimann**<br>DevOps, Services Engineer, Integration Engineer<br><br><a href="https://github.com/yourusername" target="_blank">![GitHub](https://img.icons8.com/material-outlined/24/github.png)</a> <a href="https://www.linkedin.com/in/jared-h%C3%BCrlimann-695ba82a4/" target="_blank">![LinkedIn](https://img.icons8.com/material-outlined/24/linkedin.png)</a> |

---


---

## 🗂️ Repository Structure & Branching

</div>



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

* **Mono-repo** managed with Git workspaces.
* **Main ↔ dev ↔ sub-dev ↔ feature/** branching model.

  * `main` = production-ready code.
  * `dev` = integration branch for general development.
  * `sub-dev/*` branches = specialized development streams, e.g.:
    * `dev-api` = backend/API development
    * `dev-mobile` = mobile app development
    * `dev-web` = web frontend development
  * `feature/` branches = day-to-day task-specific work, usually branched off the relevant sub-dev branch.


> © 2025 Rome was built in a day — University of Pretoria COS 301 Capstone Project


