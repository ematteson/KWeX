# **KWeX — Knowledge Worker Experience**

### **Product Requirements Document (PRD)**

**Version:** MVP  
**Audience:** Pearson internal  
**Source Inputs:** [KWeX\_WorkingDoc.docx](https://pearsoneducationinc-my.sharepoint.com/personal/eric_matteson_pearson_com/_layouts/15/Doc.aspx?sourcedoc=%7BE5E5EFE9-1A47-4E51-B03F-D9E0F3F89809%7D\&file=KWeX_WorkingDoc.docx\&action=default\&mobileredirect=true\&EntityRepresentationId=a4a0be63-7ff5-441f-8e55-d870bb1b7146) (), Faethm API (OpenAPI) [\[KWeX_WorkingDoc | Word\]](https://pearsoneducationinc-my.sharepoint.com/personal/eric_matteson_pearson_com/_layouts/15/Doc.aspx?sourcedoc=%7BE5E5EFE9-1A47-4E51-B03F-D9E0F3F89809%7D&file=KWeX_WorkingDoc.docx&action=default&mobileredirect=true)

***

## **1. Overview**

### **1.1 Product Summary**

**KWeX (Knowledge Worker Experience)** is a Pearson‑developed **knowledge‑work observability system** designed to measure, diagnose, and improve knowledge‑worker productivity, friction, and workflow health across the organization. It extends principles from **Developer Experience (DX)** into all knowledge‑work disciplines.

The MVP focuses on **survey‑based measurement** for a **small set of target occupations inside Pearson**, leveraging:

*   **Faethm skills ontology** (core tasks, competencies, work activities)
*   **Pearson Career Architecture**
*   **Kaizen‑style continuous improvement loops**
*   **DEEP framework (Diagnose → Embed → Evaluate → Prioritize)**

KWeX helps Pearson systematically identify and reduce organizational friction, generating clear, actionable insights for improvement.

***

## **2. Goals & Objectives**

### **2.1 Primary Goals (MVP)**

1.  **Measure Knowledge Worker Experience** across selected roles using a validated KWeX survey.
2.  **Identify high-friction tasks and workflows** using a Faethm‑based task model.
3.  Provide **a clear dashboard** of the *Core 4 Metrics*:
    *   Flow
    *   Friction
    *   Safety
    *   Portfolio Balance
4.  **Enable targeted improvements** using a RICE‑scored opportunity list.
5.  Establish KWeX as the **operational system** that powers Pearson’s DEEP transformation strategy.

### **2.2 Non‑Goals (MVP)**

*   Not intended as an **employee performance system**.
*   Not designed for **OKRs or target‑based incentives** (avoids Goodhart’s law).
*   Does not include **automated process mining**, **agentic automation**, or **behavioral telemetry** (future phases).

***

## **3. Problem Statement**

Knowledge workers at Pearson face significant friction caused by:

*   Legacy systems
*   Unclear workflows
*   Misaligned responsibilities
*   Tooling complexity
*   High coordination overhead

These issues create **invisible productivity losses** that are neither measured nor systematically addressed. Existing tools (including Faethm) diagnose *structural* problems but not *operational* workflow inefficiencies.

KWeX fills this gap by providing a measurable, repeatable system for improving knowledge‑worker flow.

***

## **4. Users & Scope (MVP)**

### **4.1 Primary Users**

*   **Knowledge workers** in selected pilot functions (2–4 teams)
*   **Functional leaders** (e.g., Product, Design, Sales, Finance)
*   **Transformation, EX, and Workforce teams**
*   **KWeX deployment team**

### **4.2 Suggested MVP Occupations**

Selected based on density + known friction areas + maturity of task modeling in Faethm.

**Candidates:**

*   Product Managers
*   Designers
*   Sales Operations
*   Finance Analysts
*   Customer Experience Specialists

These roles have clear task taxonomies in Faethm and exhibit quantifiable friction.

***

## **5. Core Functional Requirements (MVP)**

### **5.1 KWeX Survey Engine**

#### **5.1.1 Survey Generation**

*   Pull tasks for selected occupations from Faethm (via API).
*   Map tasks → friction signals → workflow questions.
*   Autogenerate a **Dx‑style survey** with:
    *   Task clarity
    *   Tooling friction
    *   Process and workflow barriers
    *   Rework frequency
    *   Delay sources
    *   Psychological safety indicators (qualitative only)

#### **5.1.2 Delivery**

*   Survey delivered via web UI or email link.
*   Anonymous or anonymized mode configurable per team.
*   Expected time ≤ 7 minutes.

#### **5.1.3 Response Handling**

*   Responses stored securely.
*   Aggregation at team/function level (not individual).

***

### **5.2 Core 4 Metric Calculation**

MVP must compute the four adapted GetDx metrics (): [\[KWeX_WorkingDoc | Word\]](https://pearsoneducationinc-my.sharepoint.com/personal/eric_matteson_pearson_com/_layouts/15/Doc.aspx?sourcedoc=%7BE5E5EFE9-1A47-4E51-B03F-D9E0F3F89809%7D&file=KWeX_WorkingDoc.docx&action=default&mobileredirect=true)

#### **5.2.1 Flow (Throughput)**

Measures value‑adding completion of *work units*.

Examples:

*   PM: decisions closed, roadmap items shipped
*   Sales: proposals sent, deals progressed
*   Finance: forecasts delivered

MVP Input: *Survey responses on time allocation + self‑reported throughput indicators.*

***

#### **5.2.2 Friction (Workflow Effectiveness)**

Signal of workflow inefficiency.

Examples:

*   Dependency wait time
*   Approval latency
*   Rework due to unclear requirements
*   Tooling pain

MVP Input: *Survey‑based friction scoring model.*

***

#### **5.2.3 Safety (Risk/Quality Impact)**

Negative work outcomes.

Examples:

*   Rework events
*   Audit issues
*   Forecast misses
*   Decision reversals

MVP Input: *Survey frequency questions (self‑reported).*

***

#### **5.2.4 Portfolio Balance (Now vs. New)**

The ratio of “keep system running” work vs “create new value” work.

MVP Input: *Survey-based time distribution model.*

***

### **5.3 Insights & Prioritization Engine**

#### **5.3.1 RICE Scoring**

Each friction signal converts into a RICE score (Reach × Impact × Confidence ÷ Effort).

#### **5.3.2 Opportunity List**

A ranked list of “improvement opportunities” displayed in the dashboard.

***

### **5.4 Dashboard & Reporting**

#### **5.4.1 Team Dashboard**

*   Core 4 metrics overview
*   Friction heatmap across tasks
*   Top opportunities (RICE‑ranked)
*   “Run vs Change” portfolio chart

#### **5.4.2 Executive Dashboard**

*   Cross‑team comparison (non‑identifying)
*   Trend lines over measurement cycles

***

### **5.5 DEEP Framework Alignment**

KWeX must operationalize the DEEP model (): [\[KWeX_WorkingDoc | Word\]](https://pearsoneducationinc-my.sharepoint.com/personal/eric_matteson_pearson_com/_layouts/15/Doc.aspx?sourcedoc=%7BE5E5EFE9-1A47-4E51-B03F-D9E0F3F89809%7D&file=KWeX_WorkingDoc.docx&action=default&mobileredirect=true)

| DEEP Phase     | KWeX MVP Capability                 |
| -------------- | ----------------------------------- |
| **Diagnose**   | KWeX survey + friction detection    |
| **Embed**      | Kaizen cycle & opportunity tracking |
| **Evaluate**   | Core 4 metrics tracking             |
| **Prioritize** | RICE scoring + dashboards           |

***

## **6. Technical Requirements**

### **6.1 Integrations**

*   **Faethm API**
    *   Retrieve tasks, skills, work activities
    *   No write‑back required
*   Pearson SSO (optional for MVP)

### **6.2 Architecture (MVP)**

*   Lightweight backend (Python/Node)
*   Simple relational datastore
*   Frontend: React or lightweight static UI
*   Analytics: basic hosted charting libraries
*   Security: 100% anonymized survey storage

***

## **7. Non‑Functional Requirements**

*   Survey completion: < 7 minutes
*   Dashboard loading: < 3 seconds
*   No PII exposure
*   Minimum aggregation threshold: 7 respondents
*   Full compliance with Pearson assessment/psychometric standards () [\[KWeX_WorkingDoc | Word\]](https://pearsoneducationinc-my.sharepoint.com/personal/eric_matteson_pearson_com/_layouts/15/Doc.aspx?sourcedoc=%7BE5E5EFE9-1A47-4E51-B03F-D9E0F3F89809%7D&file=KWeX_WorkingDoc.docx&action=default&mobileredirect=true)

***

## **8. Success Metrics (MVP)**

### **8.1 Product Metrics**

*   ≥ 60% survey response rate
*   ≥ 80% of participants agree survey reflects their work
*   At least 3 “early win” improvements identified per pilot team
*   Positive qualitative feedback from functional leaders

### **8.2 Business/Outcome Metrics**

*   Reduction in top friction sources (survey cycles 1 → 2)
*   Clear evidence of workflow constraints surfaced
*   KWeX adopted by at least one additional Pearson function

***

## **9. Risks & Mitigations**

| Risk                                 | Mitigation                                                       |
| ------------------------------------ | ---------------------------------------------------------------- |
| Goodhart’s Law (metric gaming)       | No individual‑level data; metrics used only for system diagnosis |
| Low trust / psychological safety     | Anonymity; communication plan; leadership alignment              |
| Insufficient task detail from Faethm | Manual augmentation in MVP                                       |
| Survey fatigue                       | Short survey; rotate question sets                               |

***

## **10. Roadmap (High‑Level)**

### **Phase 0 — Setup (2–3 weeks)**

*   Confirm pilot occupations
*   Connect to Faethm API
*   Build survey templates

### **Phase 1 — MVP Release (4–6 weeks)**

*   Run survey
*   Produce dashboards
*   Generate RICE opportunity list

### **Phase 2 — Post‑MVP Extensions**

*   Direct system telemetry
*   Automated workflow agent suggestions
*   Real‑time task‑level friction detection
*   Integration with Pearson learning pathways (personalized upskilling)

***

# **Appendix**

### **A. Principles from Source Document**

Pulled from [KWeX\_WorkingDoc.docx](https://pearsoneducationinc-my.sharepoint.com/personal/eric_matteson_pearson_com/_layouts/15/Doc.aspx?sourcedoc=%7BE5E5EFE9-1A47-4E51-B03F-D9E0F3F89809%7D\&file=KWeX_WorkingDoc.docx\&action=default\&mobileredirect=true\&EntityRepresentationId=a4a0be63-7ff5-441f-8e55-d870bb1b7146) (): [\[KWeX_WorkingDoc | Word\]](https://pearsoneducationinc-my.sharepoint.com/personal/eric_matteson_pearson_com/_layouts/15/Doc.aspx?sourcedoc=%7BE5E5EFE9-1A47-4E51-B03F-D9E0F3F89809%7D&file=KWeX_WorkingDoc.docx&action=default&mobileredirect=true)

*   Start with survey‑based measurement
*   Layer in direct outcome measurement later
*   Kaizen over big‑bang
*   Respect for people
*   Start with value, not technology
*   “Go see, ask why” + AI for pattern recognition

