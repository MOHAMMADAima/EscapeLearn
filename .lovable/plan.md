## Goal
Replace the current text-question / text-answer room flow with 4 interactive visual game mechanics. Evaluation becomes client-side and instant — no AI call to grade answers.

## Scope
- AI generation prompt + types (server side)
- Room play route (rewritten to dispatch on mechanic)
- 4 new mechanic components
- Shared visuals (door/lock, success/failure animations, progress bar)
- Hint system (50pt cost per hint)
- Framer Motion transitions

## Files to add
```
src/components/game/RoomShell.tsx          // door, progress bar, success/failure FX, hint button
src/components/game/LeversRoom.tsx         // drag-to-reorder
src/components/game/CircuitRoom.tsx        // click-to-connect lines (SVG)
src/components/game/SafeRoom.tsx           // clue modals + 4-digit keypad
src/components/game/MapRoom.tsx            // drag labels to zones
src/components/game/types.ts               // GameData discriminated union
```

## Files to modify
- `src/lib/escape-room.functions.ts` — update prompt to emit `mechanic` + `game_data` per room; drop `evaluateAnswer` use for non-boss rooms (boss kept for now).
- `src/lib/escape-room.functions.ts` — add `recordRoomAttempt({sessionId, roomId, success, hintsUsed, timeSeconds})` that just persists; no AI eval.
- `src/routes/_authenticated/play/$roomId/room/$roomNumber.tsx` — rewrite as dispatcher: load room → render `<RoomShell>` containing the matching mechanic component → on success, persist attempt and advance.
- `src/styles.css` — add 4 atmospheric room themes (industrial/sci-fi/detective/cartography) as utility classes; shake + glow keyframes.

## DB
No schema change required. `rooms.game_data jsonb` already exists (per migration); `puzzle_question`/`correct_answer_keywords` become unused for mechanic rooms but stay nullable for boss compatibility.

If `game_data` column is missing, add it via migration.

## Mechanic contracts
```ts
type GameData =
  | { mechanic: 'levers';  items: {id:number,label:string,correct_order:number}[] }
  | { mechanic: 'circuit'; connections: {left:string,right:string}[] }
  | { mechanic: 'safe';    clues: {object:string,icon:string,reveals:string}[], code: string }
  | { mechanic: 'map';     zones: {id:string,label:string,correct_item:string}[], items: string[] }
```

Each mechanic component:
```
props: { data, onSolve(), onHint() }
internal state: attempt tracking
shake on wrong, green pulse on right, then call onSolve()
```

## RoomShell
- Top: progress bar (room N of 4) + hint button (shows count + cost)
- Center: themed background per mechanic + the mechanic component
- Door overlay: closed by default, opens on success with particle burst + "UNLOCKED"
- Wrong: red overlay flash + framer-motion x-shake
- After 1.5s success pause → navigate to next room via slide transition (AnimatePresence in parent route)

## Hint system
- Local `hintsUsed` counter passed to mechanic via ref/callback
- Each mechanic exposes a `revealHint()` imperatively (useImperativeHandle)
  - levers: highlight item with correct_order===1
  - circuit: briefly draw one correct line
  - safe: reveal one digit on keypad display
  - map: auto-place + lock one correct item
- Server: increment `hints_used` on `room_attempts` row; score penalty applied in results page (already wired).

## AI prompt update
Update JSON template in `generateEscapeRoom` to include `mechanic` and `game_data` per shape. Instruct model: pick mechanic best suited to concept type (sequence→levers, cause/effect→circuit, factual→safe, structural→map). 3 mechanic rooms + 1 boss (boss stays text-based for now, or becomes a harder mechanic — keeping text boss for MVP).

## Out of scope (this turn)
- Boss room redesign (still text-based)
- Particle library — use simple CSS/framer for burst
- Sound effects

## Dependencies
- `framer-motion` (add if not present)

## Verification
- Build passes
- Manually walk one generated room of each mechanic in preview
