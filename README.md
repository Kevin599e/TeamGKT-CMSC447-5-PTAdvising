# TeamGKT-CMSC447-5-PTAdvising
UMBC Pre Transferring Advising App, made by TeamGKT, in CMSC447-Section5
Overview
- The Advisor Packet Generator is a web-based tool designed for UMBC academic advisors to streamline the process of generating pre-transfer advising packets.
- Instead of manually copying and formatting information, the tool automates packet creation, section management, and PDF export — reducing time, ensuring consistency, and maintaining data security.

Objectives
- Reduce advisor workload by automating repetitive tasks (copying, formatting, assembling).
- Preserve existing workflows — no need to retrain staff or change the advising process.
- Ensure consistency across all packets.
- Improve turnaround time for student packet delivery.

Functional Requirements

User Management

- Login & Logout
- Users authenticate via email and password.
- Roles: admin or advisor.
- Role-Based Access
- Admin: manages templates and sections.
- Advisor: creates student requests and packets.

Student Request Management

- Advisors can create a new student request with:
- Student name
- Student email
- Source institution
- Target program
- Requests are saved and listed on the dashboard.

Template Management (Admin)

- Admins can:
  - Create new templates.
  - Add sections with title, order, and content.
  - Activate/deactivate templates.
  - Templates serve as blueprints for packet generation.

Packet Creation

  - Advisors select a student request and generate a packet from an existing template.
  - The system auto-populates the packet with template sections.
  - Advisors can edit content in draft mode.

Packet Editing & Finalization

  - Draft packets can be:
  - Edited (content changed or reordered).
  - Finalized (locked and ready for export).
  - Once finalized, the packet becomes read-only.

Packet Export
  - Advisors can export finalized packets as PDFs.
  - PDF includes:
  - Title, student name, program, and section content.

Files are stored and logged in the database for future retrieval.
