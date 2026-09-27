# Tribhashniya — Frontend Prototype Roadmap

Design direction: warm "Notebook Ledger" — clean, premium, high-readability,
suitable for daily classroom use by teachers and students. (User request, 16:52)

Selected classroom direction: premium mobile cards with Ink & Marigold colors,
Sora headings, Manrope body text, and a large classroom card grid.

## Done
- [x] Design system tokens + fonts (src/styles.css, __root.tsx)
- [x] Mock data layer (src/lib/mock/*)
- [x] App state provider (localStorage-backed)
- [x] Shared UI kit (shell, nav, cards, badges, charts)
- [x] Entry flow: splash → login → OTP → role select → onboarding (teacher/institute/parent)
- [x] Teacher dashboard + product loop visual
- [x] Classrooms + classroom dashboard (previous / upcoming / curriculum / assessments / progress)
- [x] AI Period Planner wizard + simulated generation + full period plan
- [x] Live lecture cockpit + language bridge + student response + adaptive teaching
- [x] Worksheet generator, assessments, progress, student detail
- [x] Curriculum library, resources, offline + sync, corrections, vocabulary
- [x] Institute dashboard, parent dashboard, student learning area
- [x] Notifications, settings, help

## Notes for backend integration
All AI/API/auth/database calls are stubbed in `src/lib/services/*` with typed
interfaces so a developer can swap the simulated implementation for real ones.

## Full-stack upgrade (phased)
- [x] Phase 1 — Backend foundation: database schema (schools, profiles, roles, classrooms,
      students, curriculum, lesson plans, lectures, assessments, progress, gaps, AI
      recommendations, translations, vocabulary, resources, offline, sync, notifications),
      row-level access rules per role, email/password auth, demo-mode seeding
- [x] Phase 2 — Classroom list, classroom detail (lessons, students, assessments, AI note)
      and classroom creation now read and write real database records
- [x] Phase 2b — Teacher home, class progress and student profiles on real data
- [x] Phase 3 — Period plans saved to the database (class-linked, status draft/generated/approved/taught), saved-plan list, plan opened by id, approval stored. Generation itself still simulated client-side behind the same contract.
- [ ] Phase 3b — Move generation to a server workflow + adaptive recommendations written back from plan outcomes
- [x] Phase 4 — Language service abstraction (LanguageProvider → MockLanguageProvider today,
      BhashiniProvider auto-selected when BHASHINI_* secrets exist), one server entry point for all
      four modes (voice→voice, voice→text, text→voice, text→text), every call logged to `translations`,
      teacher-friendly error messages, /teacher/translate screen. Credentials never reach the browser.
- [ ] Phase 5 — Assessments, submissions, progress, learning-need diagnosis
- [ ] Phase 6 — Offline cache + sync queue
- [ ] Phase 7 — Institute and parent dashboards on real data
- [x] Home dashboard redesign (Today / Quick actions / Classrooms / AI suggestion / Attention / Recent)
- [x] Simplified navigation: Home, Classes, Prepare, Teach, Translate, Progress + More (/teacher/more)

## User requests
- [x] Rename app to "Tribhashniya" everywhere
- [x] Redesign the complete teacher classroom experience around large, low-cognitive-load visual cards while preserving every feature
- [x] Apply the selected premium mobile-card direction and six-step classroom setup

## AI Blackboard (central live-class workspace)
- Structured board sessions/steps/elements (`src/lib/services/blackboard.ts`), subject templates, readability check, board AI, translation, voice, snapshots.
- Live Class rebuilt around the board: lesson controls (left), blackboard (center), language + student responses (right).
- Blackboard history, replay and reuse at `/teacher/blackboard`.

## Live Lecture UX redesign
- [x] Replace the crowded three-column Live Class with one calm blackboard-first workspace.
- [x] Put both four-mode translation sections directly below the blackboard.
- [x] Move AI, activity, story, local examples, notes and board controls into functional sheets.
- [x] Add and verify the sticky Lesson / Board / Translate / Students / Tools quick bar.
- [x] Preserve attendance, participation, assessment, understanding, wrap-up and lecture summary flows.
- [x] Include the complete grouped Tools catalogue: Teach, Students, Classroom, and Teacher tools; every box stays inside Live Class.
## Premium green app-wide redesign
- [ ] Replace global palette, surfaces, typography hierarchy, interactions, and role-aware shell styling.
- [ ] Harmonize shared cards, buttons, forms, badges, progress, drawers, notifications, empty/loading states.
- [ ] Restyle all teacher, institute, parent, student, authentication, and onboarding screens without changing behavior.
- [ ] Preserve blackboard distinction and exact four translation modes in every translation context.
- [ ] Verify representative major routes on desktop and mobile, including authenticated role flows.
