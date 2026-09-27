# Classroom-first Tribhashniya redesign

## Goal
Rebuild the existing teacher classroom journey around large, friendly, touch-ready cards so the next teaching action is obvious. Preserve all existing teacher, institute, parent, AI, language, offline, assessment, and planning functionality.

## What will change

### 1. My Classrooms
- Replace the current compact metric cards with spacious classroom cards in a responsive 1 / 2 / 3–4 column grid.
- Each card will emphasize class, section, subjects, student count, today’s topic, and one clear “Open Classroom” action.
- Use a controlled set of educational accent treatments so sections are easy to distinguish without looking childish.
- Add a full-size “Add Classroom” card to the grid.

### 2. Guided Add Classroom flow
- Replace the single administration-style form with five simple steps: class, section, subjects, student count, and teaching/support languages.
- Use large tap targets, sensible defaults, visible progress, Back/Continue actions, and a final Create Classroom action.
- Keep the existing local classroom creation behavior and navigate directly into the new classroom afterward.

### 3. Classroom home and navigation
- Turn the initial classroom screen into a second-level visual menu with a clear Back to Classes action and classroom identity.
- Place a prominent Today’s Class panel first, with Start Class and View Lesson actions.
- Add six large feature cards: Live Class, Upcoming Lectures, Previous Lectures, Assessments, Progress, and Syllabus.
- Give Live Class the strongest emphasis, followed by upcoming and previous lectures.
- Selecting a feature reveals its existing content without losing the classroom context or functionality.

### 4. Simplify each classroom feature
- Previous lectures: vertically stacked lecture cards with topic, date, duration, understanding, language bridge, and a clear action.
- Upcoming lectures: chronological Today / Tomorrow / date cards with AI status and View Plan actions; retain edit, regenerate, lock, and move controls in a secondary action area.
- Syllabus: large chapter cards with completed, in-progress, and upcoming states plus simple progress indicators.
- Assessments: readable cards showing questions, completion, average, results, and assessment creation.
- Progress: teacher-language summaries for overall learning, concept strengths/needs, and separate language-support needs; retain student drill-down and AI recommendations.
- Live Class: preserve the existing live lecture cockpit, translation, voice, attendance, assessment, and whiteboard flow, while making its classroom entry point dominant.

### 5. Shared visual system and responsive behavior
- Add reusable classroom-card and feature-card styling using the existing semantic design tokens.
- Keep consistent radius, spacing, icons, actions, and status treatments across classroom levels.
- Verify desktop and smartphone layouts, tap sizes, text fit, navigation clarity, and the full Classes → Classroom → Today’s Class journey.

## Technical details
- Primary files: `teacher.classrooms.index.tsx`, `teacher.classrooms.new.tsx`, `teacher.classrooms.$classroomId.tsx`, and `teacher.progress.tsx`.
- Reuse existing mock classroom, lecture, assessment, curriculum, student, and plan data; no backend or API work.
- Preserve current TanStack routes and all existing links into planner, live lecture, assessments, curriculum, progress, and student detail.
- Correct any remaining route/type errors and finish the Tribhashniya rename check before final verification.
