import { z } from "zod";

/**
 * Zod schemas for every JSON data file bundled with the game.
 * All schemas are intentionally tolerant of extra keys (passthrough by
 * default in zod objects is off, but unknown keys are simply stripped),
 * so adding metadata to the JSON never breaks validation.
 */

// ---------- asset_manifest.json ----------

export const assetManifestSchema = z.object({
  version: z.string().optional(),
  characters: z
    .array(
      z.object({
        id: z.string().min(1),
        displayName: z.string().optional(),
        generatedAssets: z
          .object({
            icon: z.string().optional(),
            portraits: z.record(z.string(), z.string()).optional(),
            atlasImage: z.string().optional(),
            atlasJson: z.string().optional(),
            spritesDir: z.string().optional()
          })
          .optional(),
        icon: z.string().optional(),
        portrait: z.string().optional(),
        atlasImage: z.string().optional(),
        atlasJson: z.string().optional()
      })
    )
    .optional()
});

// ---------- characters.json ----------

export const charactersSchema = z.array(
  z.object({
    id: z.string().min(1),
    displayName: z.string().min(1),
    type: z.string().optional(),
    priority: z.string().optional(),
    assetStatus: z.string().optional(),
    // null = the character has no reference sheet yet (e.g. "custom")
    reference: z.string().nullable().optional(),
    icon: z.string().optional(),
    portrait: z.string().optional(),
    atlas: z.string().optional()
  })
);

// ---------- animations.json ----------

export const animationsSchema = z.record(
  z.string(),
  z.object({
    atlas: z.string().min(1),
    frameRate: z.number().positive(),
    animations: z.record(z.string(), z.array(z.string().min(1)).min(1))
  })
);

// ---------- dialogues.json ----------

const conditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("variableEquals"), key: z.string(), value: z.union([z.string(), z.number(), z.boolean()]) }),
  z.object({ type: z.literal("variableNotEquals"), key: z.string(), value: z.union([z.string(), z.number(), z.boolean()]) }),
  z.object({ type: z.literal("resourceAtLeast"), key: z.string(), value: z.number() }),
  z.object({ type: z.literal("resourceBelow"), key: z.string(), value: z.number() }),
  z.object({
    type: z.literal("questState"),
    questId: z.string(),
    state: z.enum(["locked", "available", "active", "completed"])
  })
]);

const effectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("setVariable"), key: z.string(), value: z.union([z.string(), z.number(), z.boolean()]) }),
  z.object({ type: z.literal("addResource"), key: z.string(), value: z.number() }),
  z.object({ type: z.literal("startQuest"), questId: z.string() }),
  z.object({ type: z.literal("completeObjective"), questId: z.string(), objectiveId: z.string() }),
  z.object({ type: z.literal("completeQuest"), questId: z.string() }),
  z.object({
    type: z.literal("createProgressEvent"),
    eventType: z.string(),
    payload: z.record(z.string(), z.unknown()).optional()
  })
]);

const dialogueChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  conditions: z.array(conditionSchema).optional(),
  effects: z.array(effectSchema).optional(),
  next: z.string().optional(),
  end: z.boolean().optional()
});

const dialogueNodeSchema = z.object({
  text: z.string(),
  conditions: z.array(conditionSchema).optional(),
  effects: z.array(effectSchema).optional(),
  choices: z.array(dialogueChoiceSchema)
});

export const dialogueFileSchema = z
  .object({
    dialogues: z.array(
      z.object({
        id: z.string().min(1),
        speakerId: z.string().min(1),
        startNode: z.string().min(1),
        nodes: z.record(z.string(), dialogueNodeSchema)
      })
    )
  })
  .superRefine((file, ctx) => {
    // Referential integrity: startNode and every choice.next must exist.
    for (const dialogue of file.dialogues) {
      if (!dialogue.nodes[dialogue.startNode]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Dialogue "${dialogue.id}": startNode "${dialogue.startNode}" does not exist.`
        });
      }
      for (const [nodeId, node] of Object.entries(dialogue.nodes)) {
        for (const choice of node.choices) {
          if (choice.next && !dialogue.nodes[choice.next]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Dialogue "${dialogue.id}", node "${nodeId}", choice "${choice.id}": next node "${choice.next}" does not exist.`
            });
          }
        }
      }
    }
  });

// ---------- quests.json ----------

export const questFileSchema = z.object({
  quests: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string(),
      status: z.enum(["locked", "available", "active", "completed"]),
      objectives: z
        .array(
          z.object({
            id: z.string().min(1),
            description: z.string(),
            completed: z.boolean(),
            required: z.boolean().optional()
          })
        )
        .min(1),
      rewards: z.array(effectSchema).optional()
    })
  )
});

// ---------- playable.json ----------

export const playableSchema = z.object({
  playable: z
    .array(
      z.object({
        id: z.string().min(1),
        displayName: z.string().min(1),
        pronoun: z.enum(["she", "he", "they"]),
        customizable: z.boolean(),
        tagline: z.string(),
        portrait: z.string().min(1)
      })
    )
    .min(1)
});

// ---------- prologue.json ----------

export const prologueSchema = z.object({
  panels: z
    .array(
      z.object({
        title: z.string().optional(),
        text: z.string().min(1)
      })
    )
    .min(1)
});

// ---------- helper ----------

export class DataValidationError extends Error {
  constructor(fileName: string, issues: string) {
    super(`Invalid ${fileName}:\n${issues}`);
    this.name = "DataValidationError";
  }
}

/** Parse `data` with `schema`; throw a DataValidationError naming the file and listing each issue path. */
export function validateData<S extends z.ZodTypeAny>(fileName: string, schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new DataValidationError(fileName, issues);
  }
  return result.data;
}
