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
  variants: z.array(z.enum(["realistic", "animal"])).optional(),
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
    // "voice" = non-character speaker (narrator, places) with no in-world sprite
    kind: z.enum(["voice"]).optional(),
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

// ---------- schedule.json (NPC director placements) ----------

export const scheduleFileSchema = z.object({
  schema: z.string().optional(),
  note: z.string().optional(),
  placements: z.array(
    z.object({
      npcId: z.string().min(1),
      scene: z.string().min(1),
      position: z.object({ x: z.number(), y: z.number() }),
      dialogueId: z.string().min(1),
      timeParts: z.array(z.number().int().min(0).max(2)).nonempty().optional(),
      conditions: z.array(conditionSchema).optional()
    })
  )
});

// ---------- districts.json (task 6.3) ----------

export const districtFileSchema = z.object({
  schema: z.string().optional(),
  note: z.string().optional(),
  districts: z.array(
    z.object({
      id: z.string().min(1),
      displayName: z.string().min(1),
      world: z.object({ width: z.number().positive(), height: z.number().positive() }),
      ground: z.tuple([z.string(), z.string()]),
      landmark: z
        .object({
          x: z.number(),
          y: z.number(),
          width: z.number().positive(),
          height: z.number().positive(),
          color: z.string(),
          label: z.string()
        })
        .optional()
    })
  )
});

// ---------- promises.json (task 4.3) ----------

export const promiseFileSchema = z.object({
  schema: z.string().optional(),
  note: z.string().optional(),
  promises: z.array(
    z.object({
      id: z.string().min(1),
      owner: z.string().min(1),
      deadlineDays: z.number().int().positive()
    })
  )
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
      rewards: z.array(effectSchema).optional(),
      meta: z
        .object({
          npc: z.string().optional(),
          abilityMatch: z.string().optional(),
          crisisLink: z.string().nullable().optional()
        })
        .passthrough()
        .optional()
    })
  )
});

// ---------- crises.json (Crisis Week extension) ----------

const crisisTierSchema = z.object({ conditions: z.array(conditionSchema), effects: z.array(effectSchema).optional() });

export const crisisFileSchema = z.object({
  schema: z.string().optional(),
  note: z.string().optional(),
  crises: z.array(
    z.object({
      id: z.string().min(1),
      day: z.number().int().positive(),
      title: z.string().min(1),
      type: z.string(),
      convergingNeeds: z.array(z.string()),
      bufferResources: z.array(z.string()),
      resultVariable: z.string().min(1),
      tiers: z.object({
        transformative: crisisTierSchema,
        coordinated: crisisTierSchema,
        reactive: crisisTierSchema
      })
    })
  )
});

// ---------- assembly.json (task 7.1) ----------

const resourceCostSchema = z.record(z.string(), z.number().nonnegative());

export const assemblyFileSchema = z
  .object({
    schema: z.string().optional(),
    note: z.string().optional(),
    tuning: z.object({
      storySlots: z.number().int().positive(),
      dataSlots: z.number().int().positive(),
      inviteSlots: z.number().int().nonnegative(),
      storyDiscount: z.number().int().nonnegative(),
      toneGap: z.number().int().nonnegative(),
      deadlineOptions: z.array(z.number().int().positive()).nonempty(),
      verificationOptions: z.array(z.string().min(1)).nonempty()
    }),
    attendance: z.array(
      z.object({
        npcId: z.string().min(1),
        group: z.string().min(1),
        conditions: z.array(conditionSchema),
        invitedConditions: z.array(conditionSchema).optional()
      })
    ),
    stories: z.array(
      z.object({
        id: z.string().min(1),
        kind: z.enum(["story", "data"]),
        requires: z.array(conditionSchema),
        measures: z.array(z.string().min(1))
      })
    ),
    conflicts: z.array(
      z.object({
        id: z.string().min(1),
        conditions: z.array(conditionSchema),
        positions: z
          .array(
            z.object({
              id: z.string().min(1),
              kind: z.enum(["synthesis", "partisan", "evasion"]),
              cost: resourceCostSchema.optional(),
              effects: z.array(effectSchema).optional()
            })
          )
          .min(2)
      })
    ),
    categories: z.array(z.string().min(1)).min(1),
    measures: z.array(
      z.object({
        id: z.string().min(1),
        category: z.string().min(1),
        cost: resourceCostSchema,
        effects: z.array(effectSchema).optional()
      })
    )
  })
  .superRefine((file, ctx) => {
    // Referential integrity: measures point at known categories, stories at known measures.
    const categories = new Set(file.categories);
    const measureIds = new Set(file.measures.map((measure) => measure.id));
    for (const measure of file.measures) {
      if (!categories.has(measure.category)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Measure "${measure.id}": unknown category "${measure.category}".`
        });
      }
    }
    for (const story of file.stories) {
      for (const measureId of story.measures) {
        if (!measureIds.has(measureId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Story "${story.id}": unknown measure "${measureId}".`
          });
        }
      }
    }
  });

// ---------- endings.json (task 7.2) ----------

const endingConditionSchema = z.object({
  metric: z.string().min(1),
  op: z.enum(["gte", "lte", "eq", "neq"]),
  value: z.union([z.number(), z.string(), z.boolean()])
});

type EndingRuleShape =
  | z.infer<typeof endingConditionSchema>
  | { all: EndingRuleShape[] }
  | { any: EndingRuleShape[] };

const endingRuleSchema: z.ZodType<EndingRuleShape> = z.lazy(() =>
  z.union([
    endingConditionSchema,
    z.object({ all: z.array(endingRuleSchema).nonempty() }),
    z.object({ any: z.array(endingRuleSchema).nonempty() })
  ])
);

export const endingsFileSchema = z
  .object({
    schema: z.string().optional(),
    note: z.string().optional(),
    endings: z
      .array(
        z.object({
          id: z.string().min(1),
          when: endingRuleSchema.optional(),
          default: z.boolean().optional()
        })
      )
      .min(1)
  })
  .superRefine((file, ctx) => {
    if (!file.endings.some((ending) => ending.default === true)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endings.json needs exactly one default ending (the catch-all)."
      });
    }
    for (const ending of file.endings) {
      if (!ending.when && ending.default !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Ending "${ending.id}" has no conditions and is not the default.`
        });
      }
    }
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
