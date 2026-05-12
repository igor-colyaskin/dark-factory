export function buildChroniclePrompt({ cardName, fromRef, toRef, newVersion, gitLog, currentDate }) {
  const system = `You are a technical writer generating changelog entries for SAP UI5 Integration Cards.
Your output must be valid JSON. No prose outside JSON. No markdown fences.`;

  const user = `Card: ${cardName}
Changes: ${fromRef} → ${toRef} (new version: ${newVersion})
Date: ${currentDate}

Git log:
${gitLog || '(no commits found in range)'}

Generate a changelog entry. Return JSON:
{
  "summary": "<one sentence: what changed overall>",
  "changelogRow": "<concise comma-separated list of changes, past tense, no version/date — those are added by the server>",
  "confluenceSection": "<Confluence wiki markup: h2. Version ${newVersion} (${currentDate})\\n then bullet list with * items>"
}

Rules:
- summary: max 120 chars, plain English
- changelogRow: max 200 chars, e.g. "Added phone column, improved search placeholder, fixed card subtitle"
- confluenceSection: use * for bullets, \\n for newlines, no leading/trailing whitespace
- Do not invent changes not present in the git log`;

  return { system, user };
}
