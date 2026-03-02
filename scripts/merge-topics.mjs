// ABOUTME: One-off script to merge duplicate/related topics into bins.
// ABOUTME: Run with: node scripts/merge-topics.mjs

import Database from "better-sqlite3";
import { resolve } from "path";

const dbPath = resolve("data/inspire.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function merge(sourceSlugs, targetName) {
  const targetSlug = slugify(targetName);

  const doMerge = db.transaction(() => {
    db.prepare("INSERT OR IGNORE INTO topics (slug, name) VALUES (?, ?)").run(
      targetSlug,
      targetName
    );

    for (const sourceSlug of sourceSlugs) {
      if (sourceSlug === targetSlug) continue;

      // Check if source exists
      const exists = db.prepare("SELECT slug FROM topics WHERE slug = ?").get(sourceSlug);
      if (!exists) {
        console.log(`  SKIP: ${sourceSlug} (not found)`);
        continue;
      }

      db.prepare(
        `INSERT OR IGNORE INTO content_topics (content_id, topic_slug)
         SELECT content_id, ? FROM content_topics WHERE topic_slug = ?`
      ).run(targetSlug, sourceSlug);

      db.prepare("DELETE FROM topics WHERE slug = ?").run(sourceSlug);
    }
  });

  doMerge();
  const count = db.prepare(
    "SELECT COUNT(*) as c FROM content_topics WHERE topic_slug = ?"
  ).get(targetSlug);
  console.log(`  -> ${targetName} (${count.c} content items)`);
}

const merges = [
  {
    target: "neuroplasticity",
    slugs: ["neuroplasticity", "nuroplasticity", "sensory-substitution"],
  },
  {
    target: "exercise",
    slugs: [
      "resistance-training", "strength-training", "high-intensity-training",
      "muscle-hypertrophy", "training-intensity", "weight-training-periodization",
      "workout-efficiency", "sport-specific-training", "exercise-physiology",
      "exercise-programming", "exercise-and-brain-health", "exercise-nutrition",
    ],
  },
  {
    target: "recovery",
    slugs: [
      "exercise-recovery", "muscle-recovery", "stress-recovery",
      "recovery-and-rest", "physical-fitness-and-injury-recovery",
      "stretching-and-mobility", "injury-prevention", "physical-adaptation",
    ],
  },
  {
    target: "nutrition",
    slugs: [
      "nutrition", "nutrition-myths", "protein-intake", "fiber",
      "omega-3-fatty-acids", "fruit-juice", "food-industry-marketing",
    ],
  },
  {
    target: "metabolism",
    slugs: [
      "glucose-metabolism", "blood-sugar", "exogenous-ketones",
      "body-composition", "blood-based-biomarkers",
    ],
  },
  {
    target: "fasting",
    slugs: ["intermittent-fasting", "ketogenic-diet"],
  },
  {
    target: "sleep",
    slugs: ["sleep-optimization", "sleep-and-cognition", "circadian-rhythm"],
  },
  {
    target: "stress",
    slugs: [
      "stress-management", "stress-reduction",
      "nervous-system-regulation", "autonomic-nervous-system",
    ],
  },
  {
    target: "meditation",
    slugs: [
      "meditation", "mindfulness", "mindfulness-practice",
      "zen-meditation", "zen-practice", "contemplative-awareness",
      "body-awareness", "body-scan-relaxation",
    ],
  },
  {
    target: "longevity",
    slugs: [
      "longevity", "aging-biology", "regenerative-medicine",
      "bioelectricity", "cellular-cognition",
    ],
  },
  {
    target: "mental health",
    slugs: [
      "mental-health-treatment", "mental-health-in-athletics",
      "mental-resilience", "psychotherapy", "trauma-processing",
      "self-compassion", "self-care", "self-help-critique",
      "ancestral-trauma-and-recovery",
    ],
  },
  {
    target: "dopamine",
    slugs: ["dopamine", "serotonin", "neurotransmitter-measurement"],
  },
  {
    target: "psychedelics",
    slugs: ["psychedelics", "psychedelic-drugs", "psychedelics-in-therapy"],
  },
  {
    target: "cancer",
    slugs: ["cancer-biology", "cancer-risk"],
  },
  {
    target: "gut microbiome",
    slugs: [
      "gut-microbiome", "immune-function", "immune-system-tolerance",
      "food-allergies",
    ],
  },
  {
    target: "hormones",
    slugs: ["hormone-optimization", "glp-1-drugs", "libido-and-hormones"],
  },
  {
    target: "pregnancy",
    slugs: [
      "maternal-health", "pregnancy-health", "pregnancy-nutrition",
      "prenatal-nutrition", "fetal-development", "menopause",
    ],
  },
  {
    target: "child development",
    slugs: [
      "child-development", "adolescent-development", "childrens-literacy",
      "child-safety-online", "play", "play-and-improvisation",
    ],
  },
  {
    target: "career",
    slugs: [
      "career-decisions", "career-planning", "career-transitions",
      "professional-growth", "work-ethic", "work-ethic-and-leadership",
      "corporate-leadership", "corporate-turnaround",
    ],
  },
  {
    target: "productivity",
    slugs: [
      "focus-and-productivity", "personal-productivity-systems",
      "morning-routines", "essentialism", "intentional-living",
      "deliberate-practice", "motivation",
    ],
  },
  {
    target: "relationships",
    slugs: [
      "marriage-and-relationships", "relationship-psychology",
      "attachment-theory", "neuroscience-of-love",
      "physical-touch-and-proximity", "loneliness-crisis", "empathy",
    ],
  },
  {
    target: "spirituality",
    slugs: [
      "faith-and-purpose", "faith-and-self-transcendence",
      "transcendence-and-spirituality", "meaning-and-purpose",
      "personal-fulfillment",
    ],
  },
  {
    target: "fear and risk",
    slugs: [
      "fear-adaptation", "fear-and-exposure-therapy",
      "risk-assessment", "risk-perception", "risk-taking",
    ],
  },
  {
    target: "creativity",
    slugs: [
      "artistic-authenticity", "creative-longevity",
      "creative-writing-process", "music-career-development",
      "music-in-education", "curiosity",
    ],
  },
  {
    target: "AI",
    slugs: ["ai-assisted-programming", "software", "reinforcement-learning"],
  },
  {
    target: "intelligence operations",
    slugs: [
      "cia-covert-operations", "cold-war-intelligence", "mk-ultra",
      "government-cover-ups", "government-transparency",
      "intelligence-operations", "digital-surveillance",
    ],
  },
  {
    target: "punishment",
    slugs: ["punishment", "punishment-and-morality", "moral-psychology"],
  },
  {
    target: "cold exposure",
    slugs: ["cold-exposure", "phototherapy", "sunlight-and-health"],
  },
  {
    target: "vision",
    slugs: ["vision-and-eye-health", "vision-and-perception"],
  },
];

console.log(`Before: ${db.prepare("SELECT COUNT(*) as c FROM topics").get().c} topics\n`);

for (const { target, slugs } of merges) {
  console.log(`Merging -> ${target}`);
  merge(slugs, target);
}

console.log(`\nAfter: ${db.prepare("SELECT COUNT(*) as c FROM topics").get().c} topics`);

db.close();
