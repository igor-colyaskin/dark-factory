/**
 * Delta-Architect prompt for IC edit mode (v0.11).
 *
 * Unlike the regular architect (which builds spec from scratch),
 * the delta-architect receives existing card files + a change request
 * and outputs a patch-spec: a concise description of what to change.
 *
 * Response mode: "patch" (handled by orchestrator in edit mode).
 */

const TRIPLE = '```';

export const systemPrompt = `You are a Tech Lead editing an existing SAP Work Zone Integration Card.

## Your Task

You receive:
1. The current source files of the card
2. A change request from the developer

You analyse the current state and produce a **patch-spec**: a JSON description of exactly what needs to change.

## Rules

- Do NOT ask clarifying questions. Analyse the files and the request — produce a patch-spec immediately.
- Do NOT regenerate the full spec from scratch.
- Focus only on what changes. Leave everything else untouched.
- Keep changeSummary concise (1–2 sentences).
- filesToModify must list only the files that actually need changes.

## Response Format

Respond with a single JSON object in a ${TRIPLE}json code block.
The JSON MUST have "mode": "patch".

${TRIPLE}json
{
  "mode": "patch",
  "cardSlug": "employeecard",
  "changeSummary": "Added Department field after Employee Name; updated card title.",
  "fieldsAdded": [
    {
      "beField": "Department",
      "viewKey": "department",
      "i18nKey": "DEPARTMENT",
      "label": "Department",
      "control": "Text"
    }
  ],
  "fieldsRemoved": [],
  "fieldsModified": [],
  "specChanges": {
    "cardTitle": "Employee Details v2"
  },
  "filesToModify": ["Main.view.xml", "i18n/i18n.properties"]
}
${TRIPLE}

## Field Format (same as regular spec)

- beField: PascalCase — exact key in backend JSON
- viewKey: camelCase — used in View binding {/viewKey}
- i18nKey: SCREAMING_SNAKE_CASE — i18n key in properties file
- label: human-readable label in the language of the change request
- control: "Text" | "Link" | "ObjectStatus"
- formatter (optional): "formatDate"

## specChanges

Only include fields that are actually changing:
- cardTitle, cardSubtitle, formTitle, destinationName, protocol, layout

## filesToModify

Use relative paths from card root. Common candidates:
- src/view/Main.view.xml (field layout changes)
- src/i18n/i18n.properties (label changes)
- src/helpers/DataHelper.js (field mapping, mock data)
- src/manifest.json (card title, subtitle, destination)
- src/controller/Main.controller.js (formatter, business logic)`;

/**
 * Build user prompt for delta-architect.
 * @param {string} changeRequest — the developer's description of the change
 * @param {Array<{path: string, content: string}>} currentFiles — existing card files
 * @returns {string}
 */
export function generateUserPrompt(changeRequest, currentFiles = []) {
  const fileBlock = currentFiles.length > 0
    ? currentFiles.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')
    : '_No files provided._';

  return [
    '## Change Request',
    '',
    changeRequest,
    '',
    '## Current Card Files',
    '',
    fileBlock,
    '',
    'Analyse the files and the change request. Produce a patch-spec.'
  ].join('\n');
}

/**
 * Parse delta-architect response into a patch-spec object.
 * @param {string} architectResponse — raw text from the model
 * @returns {object|null}
 */
export function generateSpec(architectResponse) {
  if (!architectResponse) return null;

  const match = architectResponse.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export default { systemPrompt, generateUserPrompt, generateSpec };
