import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GenerateInput = z.object({
  pdfText: z.string().min(50),
  subject: z.string().min(1).max(120),
});

function stringFromAiItem(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["label", "item", "name", "correct_item", "title", "text"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  }
  return String(value ?? "").trim();
}

function fallbackCode(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 10000;
  return hash.toString().padStart(4, "0");
}

function ensureMinimum<T>(items: T[], make: (index: number) => T, min = 3) {
  const next = [...items];
  while (next.length < min) next.push(make(next.length));
  return next;
}

const GameDataSchema = z.union([
  z.object({
    mechanic: z.literal("levers").optional().default("levers"),
    items: z
      .array(
        z.object({
          id: z.coerce.number().int(),
          label: z.string().min(1),
          correct_order: z.coerce.number().int().min(1),
        }),
      )
      .min(3)
      .max(6),
  }),
  z.object({
    mechanic: z.literal("circuit").optional().default("circuit"),
    connections: z
      .array(z.object({ left: z.string().min(1), right: z.string().min(1) }))
      .min(3)
      .max(5),
  }),
  z.object({
    mechanic: z.literal("safe").optional().default("safe"),
    clues: z
      .array(
        z.object({
          object: z.string().min(1),
          icon: z.string().min(1),
          reveals: z.string().min(1),
        }),
      )
      .min(3)
      .max(4),
    code: z.coerce.string().regex(/^\d{3,5}$/),
  }),
  z.object({
    mechanic: z.literal("map").optional().default("map"),
    zones: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          correct_item: z.string().min(1),
        }),
      )
      .min(3)
      .max(5),
    items: z.array(z.unknown()).optional().default([]),
  }).transform((data) => {
    const items = data.items.map(stringFromAiItem).filter(Boolean);
    for (const zone of data.zones) {
      if (!items.includes(zone.correct_item)) items.push(zone.correct_item);
    }
    return { ...data, items };
  }),
]);

const MechanicRoomSchema = z.object({
  room_number: z.number().int().min(1).max(3),
  title: z.string(),
  concept: z.string(),
  mechanic: z.enum(["levers", "circuit", "safe", "map"]),
  narrative_description: z.string(),
  hint: z.string(),
  game_data: GameDataSchema,
});

const BossRoomSchema = z.object({
  room_number: z.literal(4),
  title: z.string(),
  concept: z.string(),
  narrative_description: z.string(),
  puzzle_question: z.string(),
  correct_answer_keywords: z.string(),
  hint: z.string(),
  is_boss_room: z.literal(true).optional(),
});

const GeneratedSchema = z.object({
  title: z.string(),
  subject: z.string(),
  narrative_intro: z.string(),
  rooms: z.tuple([MechanicRoomSchema, MechanicRoomSchema, MechanicRoomSchema, BossRoomSchema]),
});

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function normalizeGeneratedEscapeRoom(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const root = value as Record<string, unknown>;
  const rooms = Array.isArray(root.rooms)
    ? root.rooms.map((room) => {
        if (!room || typeof room !== "object") return room;
        const next = { ...(room as Record<string, unknown>) };
        if (next.room_number !== 4) {
          const mechanic = next.mechanic;
          const gameData =
            next.game_data && typeof next.game_data === "object"
              ? { ...(next.game_data as Record<string, unknown>) }
              : {};
          if (typeof mechanic === "string") {
            gameData.mechanic = mechanic;
          }
          if (mechanic === "levers") {
            const rawItems = Array.isArray(gameData.items)
              ? gameData.items
              : Array.isArray(gameData.steps)
                ? gameData.steps
                : Array.isArray(gameData.events)
                  ? gameData.events
                  : [];
            gameData.items = rawItems.map((item, index) => {
              const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
              return {
                id: typeof record.id === "number" ? record.id : index + 1,
                label: stringFromAiItem(item) || `Step ${index + 1}`,
                correct_order:
                  typeof record.correct_order === "number"
                    ? record.correct_order
                    : typeof record.order === "number"
                      ? record.order
                      : index + 1,
              };
            });
            gameData.items = ensureMinimum((gameData.items as unknown[]).slice(0, 6), (index) => ({
              id: index + 1,
              label: `Key step ${index + 1}`,
              correct_order: index + 1,
            }));
          }
          if (mechanic === "circuit") {
            const rawConnections = Array.isArray(gameData.connections)
              ? gameData.connections
              : Array.isArray(gameData.pairs)
                ? gameData.pairs
                : Array.isArray(gameData.matches)
                  ? gameData.matches
                  : Array.isArray(gameData.items)
                    ? gameData.items
                    : [];
            gameData.connections = rawConnections.map((connection, index) => {
              const record =
                connection && typeof connection === "object" ? (connection as Record<string, unknown>) : {};
              return {
                left:
                  stringFromAiItem(record.left ?? record.term ?? record.cause ?? record.source ?? record.prompt) ||
                  `Term ${index + 1}`,
                right:
                  stringFromAiItem(
                    record.right ?? record.definition ?? record.effect ?? record.target ?? record.answer,
                  ) || `Match ${index + 1}`,
              };
            });
            gameData.connections = ensureMinimum((gameData.connections as unknown[]).slice(0, 5), (index) => ({
              left: `Term ${index + 1}`,
              right: `Match ${index + 1}`,
            }));
          }
          if (mechanic === "safe") {
            const rawClues = Array.isArray(gameData.clues) ? gameData.clues : [];
            gameData.clues = rawClues.map((clue, index) => {
              const record = clue && typeof clue === "object" ? (clue as Record<string, unknown>) : {};
              return {
                object: stringFromAiItem(record.object ?? record.name) || `clue-${index + 1}`,
                icon: stringFromAiItem(record.icon) || ["📖", "🗺️", "📊", "🔎"][index % 4],
                reveals: stringFromAiItem(record.reveals ?? record.clue ?? clue) || `Digit ${index + 1}`,
              };
            });
            gameData.clues = ensureMinimum((gameData.clues as unknown[]).slice(0, 4), (index) => ({
              object: `clue-${index + 1}`,
              icon: ["📖", "🗺️", "📊", "🔎"][index % 4],
              reveals: `Use the course details to infer digit ${index + 1}.`,
            }));
            if (Array.isArray(gameData.digits)) gameData.code = gameData.digits.join("");
            if (!/^\d{3,5}$/.test(String(gameData.code ?? ""))) {
              gameData.code = fallbackCode(`${next.title ?? ""}${next.concept ?? ""}`);
            }
          }
          if (mechanic === "map") {
            const rawZones = Array.isArray(gameData.zones)
              ? gameData.zones
              : Array.isArray(gameData.placements)
                ? gameData.placements
                : [];
            gameData.zones = rawZones.map((zone, index) => {
              const record = zone && typeof zone === "object" ? (zone as Record<string, unknown>) : {};
              return {
                id: stringFromAiItem(record.id) || `z${index + 1}`,
                label: stringFromAiItem(record.label ?? record.zone ?? record.region ?? record.name) || `Zone ${index + 1}`,
                correct_item:
                  stringFromAiItem(record.correct_item ?? record.item ?? record.answer ?? record.component) ||
                  `Item ${index + 1}`,
              };
            });
            gameData.zones = ensureMinimum((gameData.zones as unknown[]).slice(0, 5), (index) => ({
              id: `z${index + 1}`,
              label: `Zone ${index + 1}`,
              correct_item: `Item ${index + 1}`,
            }));
          }
          next.game_data = gameData;
        }
        return next;
      })
    : root.rooms;
  return { ...root, rooms };
}

function extractJsonObject(text: string) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  return start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
}

function parseAiJson(text: string) {
  const jsonStr = extractJsonObject(text).trim();
  try {
    return JSON.parse(jsonStr);
  } catch (firstError) {
    const repaired = jsonStr.replace(/\\(?!["\\/bfnrtu])/g, "");
    try {
      return JSON.parse(repaired);
    } catch {
      throw firstError;
    }
  }
}

export const generateEscapeRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const trimmed = data.pdfText.slice(0, 8000);

    const prompt = `Given this course content:\n\n${trimmed}\n\nGenerate a complete 4-room escape room game. Rooms 1-3 are INTERACTIVE VISUAL PUZZLES (no text answers). Room 4 is the boss room (text-based synthesis question). Return STRICT JSON only — no markdown, no commentary — matching EXACTLY this shape:\n\n{\n  "title": "string — catchy escape room title",\n  "subject": "string — short subject name e.g. Cell Biology",\n  "narrative_intro": "string — 2-3 paragraph cinematic intro where the student is trapped and must escape using knowledge",\n  "rooms": [\n    {\n      "room_number": 1,\n      "title": "string",\n      "concept": "string — the key concept this room teaches",\n      "mechanic": "levers" | "circuit" | "safe" | "map",\n      "narrative_description": "string — 2-3 immersive sentences themed to the subject",\n      "hint": "string — guides without revealing",\n      "game_data": { ...shape depends on mechanic, see below... }\n    },\n    { "room_number": 2, ...same shape, DIFFERENT mechanic... },\n    { "room_number": 3, ...same shape, DIFFERENT mechanic... },\n    {\n      "room_number": 4,\n      "title": "FINAL CHALLENGE",\n      "concept": "string — synthesizes all 3 prior concepts",\n      "narrative_description": "string",\n      "puzzle_question": "string — requires connecting all 3 prior concepts, answerable in 2-4 sentences",\n      "correct_answer_keywords": "string — 3-5 comma-separated keywords",\n      "hint": "string",\n      "is_boss_room": true\n    }\n  ]\n}\n\nMECHANIC SELECTION — pick the best fit for each concept (use 3 DIFFERENT mechanics across rooms 1-3):\n- "levers": sequential / ordered concepts (timelines, processes, steps). game_data shape: { "items": [ {"id": 1, "label": "Event A", "correct_order": 1}, {"id": 2, "label": "Event B", "correct_order": 2}, {"id": 3, "label": "Event C", "correct_order": 3}, {"id": 4, "label": "Event D", "correct_order": 4} ] } — 4-5 items.\n- "circuit": cause-effect or term-definition matching. game_data shape: { "connections": [ {"left": "Term A", "right": "Definition A"}, {"left": "Term B", "right": "Definition B"}, {"left": "Term C", "right": "Definition C"}, {"left": "Term D", "right": "Definition D"} ] } — 4 connections.\n- "safe": precise factual knowledge expressed as digits (years, counts, percentages). game_data shape: { "clues": [ {"object": "book", "icon": "📖", "reveals": "clue text leading to first digit"}, {"object": "map", "icon": "🗺️", "reveals": "clue text leading to second digit"}, {"object": "chart", "icon": "📊", "reveals": "clue text leading to remaining digits"} ], "code": "1847" } — exactly 3 clues, 4-digit code.\n- "map": relational / structural concepts (parts of a system, regions, components). game_data shape: { "zones": [ {"id": "z1", "label": "Zone Name 1", "correct_item": "Item A"}, {"id": "z2", "label": "Zone Name 2", "correct_item": "Item B"}, {"id": "z3", "label": "Zone Name 3", "correct_item": "Item C"}, {"id": "z4", "label": "Zone Name 4", "correct_item": "Item D"} ], "items": ["Item A","Item B","Item C","Item D"] } — items array must contain EVERY correct_item plus 0-2 distractors.\n\nEVERY field MUST be present and non-empty. Pick 3 distinct concepts from the content for rooms 1-3.`;

    let parsed;
    let rawText = "";
    try {
      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system:
          "You are an expert educator and game designer. You transform academic content into immersive escape room experiences. Always return STRICT JSON only — no markdown, no commentary.",
        prompt,
      });
      rawText = text;
      parsed = GeneratedSchema.parse(normalizeGeneratedEscapeRoom(parseAiJson(text)));
    } catch (err) {
      console.error("AI generation failed:", err, "rawText:", rawText.slice(0, 2000));
      throw new Error("Failed to generate escape room. Please try again.");
    }

    // Insert into DB using user-scoped client (RLS as user)
    const { supabase, userId } = context;

    // Unique room code (retry up to 5 times)
    let roomCode = "";
    for (let i = 0; i < 5; i++) {
      const candidate = generateRoomCode();
      const { data: existing } = await supabase
        .from("escape_rooms")
        .select("id")
        .eq("room_code", candidate)
        .maybeSingle();
      if (!existing) {
        roomCode = candidate;
        break;
      }
    }
    if (!roomCode) throw new Error("Could not allocate room code");

    const { data: escapeRoom, error: erErr } = await supabase
      .from("escape_rooms")
      .insert({
        title: parsed.title,
        subject: parsed.subject,
        narrative_intro: parsed.narrative_intro,
        pdf_content: trimmed,
        created_by: userId,
        room_code: roomCode,
      })
      .select()
      .single();
    if (erErr || !escapeRoom) {
      console.error(erErr);
      throw new Error("Could not save escape room");
    }

    const sortedRooms = [...parsed.rooms].sort((a, b) => a.room_number - b.room_number);
    const roomsPayload = sortedRooms.map((r, i) => {
      const isBoss = "puzzle_question" in r;
      return {
        escape_room_id: escapeRoom.id,
        room_number: r.room_number,
        title: r.title,
        concept: r.concept,
        narrative_description: r.narrative_description,
        puzzle_question: isBoss ? r.puzzle_question : null,
        correct_answer_keywords: isBoss ? r.correct_answer_keywords : null,
        hint: r.hint,
        is_boss_room: isBoss || r.room_number === 4,
        mechanic: isBoss ? null : r.mechanic,
        game_data: isBoss ? null : r.game_data,
        order_index: i,
      };
    });

    const { error: rErr } = await supabase.from("rooms").insert(roomsPayload);
    if (rErr) {
      console.error(rErr);
      throw new Error("Could not save rooms");
    }

    return { escapeRoomId: escapeRoom.id, roomCode };
  });

const EvaluateInput = z.object({
  question: z.string(),
  userAnswer: z.string().min(1),
  keywords: z.string(),
  concept: z.string(),
});

const EvalResultSchema = z.object({
  is_correct: z.boolean(),
  feedback: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

export const evaluateAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EvaluateInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Question: ${data.question}\n\nKey concepts that should be present: ${data.keywords}\n\nStudent answer: ${data.userAnswer}\n\nEvaluate if the answer demonstrates understanding of: ${data.concept}.\n\nReturn STRICT JSON only with shape:\n{"is_correct": true/false, "feedback": "2 sentence response — if correct: brief encouragement + what they got right; if incorrect: what is missing + a nudge without giving the answer", "confidence": "high|medium|low"}\n\nCorrect means the answer contains the main ideas even if not exact keywords. Be generous but require genuine understanding.`;

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system:
          "You are evaluating a student's answer in an educational escape room. Be encouraging but honest. The student must demonstrate genuine understanding. Return STRICT JSON only — no markdown.",
        prompt,
      });
      const cleaned = text.replace(/```json|```/g, "").trim();
      return EvalResultSchema.parse(JSON.parse(cleaned));
    } catch (err) {
      console.error("Eval failed", err);
      return {
        is_correct: false,
        feedback: "We couldn't evaluate that just now. Try rephrasing your answer.",
        confidence: "low" as const,
      };
    }
  });
