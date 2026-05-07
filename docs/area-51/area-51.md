# Area 51 — Long-term ideas and draft concepts

A place for ideas that:
- Are related to DF, but not included in foreseeable versions
- May become part of CONCEPT.md one day (or not)
- Do not require immediate action
- Are saved so they are not forgotten

## Rules

- Every entry is **dated** in the title
- An entry may become outdated — mark `STATUS: OUTDATED`, but do not delete.
  Outdated ideas are a valuable artifact: you can see how thinking has changed.
- At each hygiene pass — review and decide:
  - Ripe for CONCEPT.md → move it
  - Deprecated → mark OUTDATED
  - Still relevant → leave as is
- An idea can be refined in place (mark `UPDATED: date`)

## Why "Area 51" and not "ideas.md"

Area 51 is a place where things are stored that are not publicly discussed,
but that can one day come out and change everything.

These ideas are not a roadmap, not promises, not spec drafts.
They are **vectors** that can turn in any direction.

---

## 2026-05-05: Self-Build Factory

**STATUS:** active idea, vector

**Essence:**

DF capable of designing new modules for itself according to a human
designer's specification. Not "DF improving itself autonomously" (that is
technically and conceptually impossible), but "DF as a factory that builds
new workshops for itself on request."

**Metaphor:**

The designer (human) says to the plant director (DF): "I need a new
warehouse, GitLab instead of GitHub." The director assigns the task to
its own tool shop (Developer-agent). The agent generates a new module
under the Storage contract. The designer reviews, accepts, puts it in
place through config. DF now works via GitLab.

**Prerequisites:**

- Mature plugin architecture — DF modules as first-class objects
- Reliable contracts + autotests for each module
- DF mode "generate infrastructure code for myself", not only
  custom applications (this is a separate order type)
- Observability (metrics, logs) to evaluate the new module in operation

**Constraints and risks:**

- A human is **always** in the loop. No autonomous self-improvement.
  Human formulates the spec and accepts the result.
- The "better" criterion is set by a human, not DF.
- Infrastructure code requires more rigorous review than
  user applications. Probably with Claude in partner mode,
  not just DF agents.

**Realistic horizon:**

v2.0+. May never happen — and that's okay.

**Context:**

- Conversation 2026-05-04 — Philosophy of the "spring" (antagonism
  "human fantasy — AI consistency" as a source of motion).
- Conversation 2026-05-05 — Factory metaphor with workshop-modules.

**Philosophical basis:**

DF is not an autonomous entity. DF is an apparatus through which a human
achieves what they could not alone. Self-building factory is a continuation
of this line: human designs the factory, the plant builds itself according
to human's tasks. Human remains the source of will and the "better" criterion.

---

## 2026-05-05: Architectural Vector — Modular Factory

**STATUS:** active idea, partially implemented (v0.4–v0.6)

**Essence:**

DF is conceived as a set of "workshops" — modules with strict interfaces.
In the long run, workshops should be replaceable (Storage: GitHub/GitLab,
Deploy: Fly/Render, LLM: OpenRouter/Anthropic).

This substitution is not an end in itself. It is realized **on demand**:
when a real second candidate for the backend appears, extract the common
interface. Before that — a concrete implementation, cleanly written.

**Current DF "workshops":**

- Plant management — `orchestrator.js`, `server/index.js`
- Design bureau — Architect (agent)
- Tool shop — Developer (agent)
- QC department — `ac-checker.js`
- Transport workshop — `fly-manager.js` / Local Runner
- Finished product warehouse — `apps-store.js`
- Source warehouse — GitHub integration (v0.4)

**Principle:** A contract is derived from two implementations, not one.
The first contract is always imperfect. This is normal.

**Modularization roadmap:**

```
v0.4: GitHub Integration, code in a separate module, sourceUrl ✅
v0.5: REMEMBER (end-to-end functionality, not a module) ✅
v0.6: Local Runner (second deployer implementation) ✅
v0.7: VERIFY (verifier module with contract verify(url, spec) → Report)
v0.8: PROFILES v1 (first domain specialization — DF-SAP CAP UI5 or DF-Integration Card)
Deployer Contract: triggered when Fly unblocked OR second live Deployer appears — not a version
```

---

## 2026-05-05: Philosophy of the "spring"

**STATUS:** active idea, background

**Essence:**

Antagonism between a human (limitlessness of fantasy, desire, weakness)
and AI (boundaries of specifics, rules, consistency) is not a problem,
but a **driving force**.

The spring works as: human fantasy × AI consistency.
The bad parts of both (human greed, AI rule-stupidity) are obstacles
to the spring, not part of it.

**Three places to attach the spring:**

1. The "want–can" gap — DF closes the gap between fantasy and
   implementation without hiring a programmer
2. The "idea–implementation" gap — AI does not let the project die
   between flashes of human insight
3. The "me–me" gap — AI as memory and mirror of human's internal
   contradictions

**Practical consequence for CONCEPT.md (when it matures):**

> DF is not an autonomous entity. DF is an apparatus that turns the
> limitlessness of human imagination into working things. The criterion
> "better" is always set by a human.

---

## 2026-05-07: Proto DF → Specialized DFs (aircraft factory)

**STATUS:** active idea, program-level

**Essence:**

Instead of building one universal DF that does everything, build a
**base platform** (Proto DF) from which specialized factories can be
assembled for specific domains.

**Metaphor shift:**

- Old: "building one airplane, making it better and better"
- New: "building an aircraft factory that produces different models to order"

Proto DF = aircraft factory. Specialized DF = specific airplane model.

**Examples of specializations:**

- DF-Integration Card — SAP BWZ pages from mockup + backend data
- DF-SAP CAP UI5 — BE (SAP CAP) + FE (SAP UI5 freestyle)
- DF-Telegram Channel — Telegram bot/channel generation

**Distribution model:**

Colleague takes an instance, sets their own API key, uses it.
If something breaks — comes for "maintenance", gets bugs fixed,
possibly gets a module replaced.

**Customization levels:**

1. Configuration (prompts, AC-rules, assets, LLM model choice)
2. Module replacement (Storage, Deployer, LLM Provider)
3. Module addition (RAG, MCP, Vision, domain-specific linter)
4. Pipeline topology change (agent teams, iterative cycles)

Levels 1-2 are the near-term target (v0.9 PROFILES).
Levels 3-4 are distant horizon.

**Context:** Conversations with colleagues 2026-05-06, realization that
DF has practical value as a specialized tool, not just a learning project.

---

## 2026-05-06: Module Classification (e/s/c)

**STATUS:** immature idea, descriptive taxonomy

Hypothetical division of modules into difficulty classes:

- **e-class (elementary):** no connection to the outside world. Example: Local Runner.
- **s-class (simple):** single API call/protocol. Example: Developer agent, GitHub Client.
- **c-class (composite):** multiple s-class modules wrapped together. Example: Developer Team.

Does not change architecture or design. May become useful after 3-4
implemented modules — when there are real-world examples for each class.

---

## 2026-05-06: AI-driven apps

**STATUS:** immature idea, no trigger

Idea: DF generates applications that themselves use AI (LLM API).

**Open questions (no answers):**
- Whose API key goes into the generated application?
- How to handle limits and costs?
- How to test such applications in mock mode?

**Trigger for ROADMAP:** Appearance of a specific request for an
application that needs an LLM.

---

## 2026-05-06: What's After REMEMBER — Directions

**STATUS:** immature ideas, waiting for v0.5 usage experience

- **Iterator** — "generate → check → correct" cycle. Currently pipeline
  is linear. Trigger: when generation quality starts to annoy.
- **Variant Generator** — "make 3 options, I'll choose". Trigger:
  single result no longer satisfies.
- **Upgrader** — "take the app from REMEMBER, update/refine".
  First real consumer of REMEMBER.

Principle: the fourth module for "look around and see patterns"
will appear on its own. No need to choose it in advance.

---

## Ideas without dates (carried over)

- Vision models in verification (upload mockup, compare with screenshot)
- Alternative implementation paths (architect proposes 2-3 variants)
- Agent-to-agent feedback (tester → developer with specific complaints)
- Voice interface for ordering
- PWA for mobile UX
- Secrets/keys management as infrastructure module for AI-driven modules
