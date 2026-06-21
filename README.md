# 🔓 EscapeLearn

**Your PDF didn't get a summary. It became an escape room.**

EscapeLearn turns any course PDF into a fully playable escape room in under 20 seconds. Students solve real interactive puzzles — not quizzes — built directly from their actual course content. Professors upload material, share one room code, and watch their entire class learn live with real-time analytics.

> 🏆 Built for **[Everyone Ships Now](https://mindtheproduct.devpost.com/)** — Mind The Product's World Product Day 2026 hackathon.

 🔗 **[Try it live](#https://escape-learn.lovable.app/)** · 📄 **[Devpost submission](#https://devpost.com/software/escaplearn?ref_content=user-portfolio&ref_feature=in_progress)**

---

## 🎮 What It Does

Upload a lecture PDF, textbook chapter, or study guide. AI reads it, extracts the key concepts, and generates **3 puzzle rooms + 1 boss room** — each one a different interactive mechanic built from the real content:

| Mechanic | How it works |
|---|---|
| 🔧 **Levers** | Reorder events/steps in the correct sequence |
| 🔌 **Circuit** | Wire connections between causes and effects |
| 🔑 **Safe** | Decode hidden clues into a 4-digit combination |
| 🗺️ **Map** | Place concepts correctly on an interactive diagram |

Before and after each session, students rate their confidence on key concepts — EscapeLearn shows the real learning delta. Not *"you finished,"* but *"your understanding of mitosis went from 2/5 to 4/5 in 18 minutes."*

**For professors:** generate a room from any PDF in under a minute, share one code with the class, and get a live dashboard showing exactly who's completed it and which concepts the whole class is struggling with — while it's still happening, not three weeks later on an exam.

---

## 🧠 Why It Exists

I studied through Covid alone in my room, drowning in dense lecture PDFs nobody ever re-reads. The real question that led here: *why do kids get addicted to video games and not to learning?* Games make progress visible and give instant feedback. Studying usually doesn't. EscapeLearn borrows that loop and points it at something that actually matters — turning a PDF into a place a student *wants* to come back to.

---

## 🛠️ Tech Stack

| Layer | Tool |
|---|---|
| App framework | [Lovable](https://lovable.dev) (Next.js + React under the hood) |
| Backend / Auth / DB | [Supabase](https://supabase.com) — Postgres, Auth, Row-Level Security |
| AI generation & evaluation | [Claude](https://www.anthropic.com/claude) (Sonnet) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Drag & drop | dnd-kit |
| Product analytics | [Novus.ai](https://www.novus.ai) |
| Deployment | Vercel (via Lovable) |

---

## ⚙️ How It Works

```
1. Upload PDF
   ↓
2. Claude extracts key concepts + generates a themed
   narrative + structured puzzle data for each room
   ↓
3. Each concept is mapped to a game mechanic
   (levers / circuit / safe / map)
   ↓
4. Student plays through 3 rooms + 1 boss room
   ↓
5. Confidence delta + score calculated and stored
   ↓
6. Teacher dashboard reads live session data via Supabase
```

**Database schema:** `profiles` · `escape_rooms` · `rooms` · `game_sessions` · `room_attempts`
**AI generation** is constrained to a strict JSON schema per room — open-ended prompts produced inconsistent puzzles; structured constraints made the AI dramatically more reliable.

---

## ✨ Key Features

- 🤖 **AI-generated puzzles**, not multiple-choice quizzes — every room is built from real course content
- 🎬 **Cinematic narrative briefings** themed to the subject (chemistry becomes a lab on the brink of disaster, history becomes an archive you're racing to escape)
- 📊 **Confidence-delta tracking** — a self-reported, honest signal that learning actually happened
- 👩‍🏫 **Teacher mode** — one PDF → one shareable room code → live class-wide analytics
- 🔁 **Persistent game state** — refresh-proof sessions tracked end-to-end in Supabase
- 📈 **Novus.ai instrumentation** across the entire funnel, from upload to completion

---

## 🚀 Getting Started

```bash
git clone https://github.com/your-username/escapelearn.git
cd escapelearn
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_claude_api_key
```

```bash
npm run dev
```

---

## 🗺️ Roadmap

- [ ] Support PDFs with diagrams, formulas, and tables (STEM-ready)
- [ ] University-wide dashboard — completion + comprehension gaps across every course
- [ ] Room marketplace — professors publish and share rooms across institutions
- [ ] Multiplayer mode — an entire lecture hall solving the same room live, together

---

## 👤 About This Project

Built solo in 10 days for **Everyone Ships Now**, Mind The Product's global hackathon (June 2026). The brief: ship something *real*, *deployed*, and instrumented with Novus.ai — no themes, no required APIs beyond that.

This project is also a demonstration of:
- End-to-end product thinking — from a real pain point to a measurable learning outcome
- Constraining generative AI output into reliable, structured game data
- Designing a B2C *and* B2B2C flow (student solo play + teacher classroom mode) in a single coherent product
- Shipping a polished, deployed, demo-ready product under real time pressure


---

*"Kids get addicted to video games, not homework. EscapeLearn fixes the wrong target."*
