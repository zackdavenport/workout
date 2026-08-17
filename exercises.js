// Built-in exercise library. Each exercise: id, name, type ('dumbbell' | 'bodyweight'), muscles: [MuscleGroup]
// Muscle group taxonomy kept intentionally short so filter chips stay usable on a phone screen.

const MUSCLE_GROUPS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Legs", "Glutes", "Core", "Full Body"
];

const BUILTIN_EXERCISES = [
  // Chest
  { id: "b-dumbbell-bench-press", name: "Dumbbell Bench Press", type: "dumbbell", muscles: ["Chest", "Triceps"] },
  { id: "b-incline-dumbbell-press", name: "Incline Dumbbell Press", type: "dumbbell", muscles: ["Chest", "Shoulders"] },
  { id: "b-dumbbell-flyes", name: "Dumbbell Flyes", type: "dumbbell", muscles: ["Chest"] },
  { id: "b-pushup", name: "Push-Up", type: "bodyweight", muscles: ["Chest", "Triceps"] },
  { id: "b-diamond-pushup", name: "Diamond Push-Up", type: "bodyweight", muscles: ["Triceps", "Chest"] },
  { id: "b-dip", name: "Dip", type: "bodyweight", muscles: ["Chest", "Triceps"] },

  // Back
  { id: "b-dumbbell-row", name: "Single-Arm Dumbbell Row", type: "dumbbell", muscles: ["Back", "Biceps"] },
  { id: "b-dumbbell-deadlift", name: "Dumbbell Deadlift", type: "dumbbell", muscles: ["Back", "Legs", "Glutes"] },
  { id: "b-dumbbell-shrug", name: "Dumbbell Shrug", type: "dumbbell", muscles: ["Back", "Shoulders"] },
  { id: "b-renegade-row", name: "Renegade Row", type: "dumbbell", muscles: ["Back", "Core"] },
  { id: "b-pullup", name: "Pull-Up", type: "bodyweight", muscles: ["Back", "Biceps"] },
  { id: "b-chinup", name: "Chin-Up", type: "bodyweight", muscles: ["Back", "Biceps"] },
  { id: "b-inverted-row", name: "Inverted Row", type: "bodyweight", muscles: ["Back", "Biceps"] },
  { id: "b-superman", name: "Superman", type: "bodyweight", muscles: ["Back", "Core"] },

  // Shoulders
  { id: "b-dumbbell-shoulder-press", name: "Dumbbell Shoulder Press", type: "dumbbell", muscles: ["Shoulders", "Triceps"] },
  { id: "b-arnold-press", name: "Arnold Press", type: "dumbbell", muscles: ["Shoulders", "Triceps"] },
  { id: "b-lateral-raise", name: "Lateral Raise", type: "dumbbell", muscles: ["Shoulders"] },
  { id: "b-front-raise", name: "Front Raise", type: "dumbbell", muscles: ["Shoulders"] },
  { id: "b-rear-delt-fly", name: "Rear Delt Fly", type: "dumbbell", muscles: ["Shoulders", "Back"] },
  { id: "b-pike-pushup", name: "Pike Push-Up", type: "bodyweight", muscles: ["Shoulders", "Triceps"] },
  { id: "b-handstand-pushup", name: "Handstand Push-Up", type: "bodyweight", muscles: ["Shoulders", "Triceps"] },

  // Biceps
  { id: "b-bicep-curl", name: "Dumbbell Bicep Curl", type: "dumbbell", muscles: ["Biceps"] },
  { id: "b-hammer-curl", name: "Hammer Curl", type: "dumbbell", muscles: ["Biceps"] },
  { id: "b-concentration-curl", name: "Concentration Curl", type: "dumbbell", muscles: ["Biceps"] },

  // Triceps
  { id: "b-tricep-kickback", name: "Tricep Kickback", type: "dumbbell", muscles: ["Triceps"] },
  { id: "b-overhead-tricep-ext", name: "Overhead Tricep Extension", type: "dumbbell", muscles: ["Triceps"] },
  { id: "b-skull-crusher", name: "Dumbbell Skull Crusher", type: "dumbbell", muscles: ["Triceps"] },

  // Legs / Glutes
  { id: "b-goblet-squat", name: "Goblet Squat", type: "dumbbell", muscles: ["Legs", "Glutes"] },
  { id: "b-dumbbell-lunge", name: "Dumbbell Lunge", type: "dumbbell", muscles: ["Legs", "Glutes"] },
  { id: "b-bulgarian-split-squat", name: "Bulgarian Split Squat (DB)", type: "dumbbell", muscles: ["Legs", "Glutes"] },
  { id: "b-romanian-deadlift", name: "Dumbbell Romanian Deadlift", type: "dumbbell", muscles: ["Legs", "Glutes"] },
  { id: "b-dumbbell-step-up", name: "Dumbbell Step-Up", type: "dumbbell", muscles: ["Legs", "Glutes"] },
  { id: "b-dumbbell-calf-raise", name: "Dumbbell Calf Raise", type: "dumbbell", muscles: ["Legs"] },
  { id: "b-dumbbell-sumo-squat", name: "Dumbbell Sumo Squat", type: "dumbbell", muscles: ["Legs", "Glutes"] },
  { id: "b-bodyweight-squat", name: "Bodyweight Squat", type: "bodyweight", muscles: ["Legs", "Glutes"] },
  { id: "b-jump-squat", name: "Jump Squat", type: "bodyweight", muscles: ["Legs", "Glutes"] },
  { id: "b-lunge", name: "Bodyweight Lunge", type: "bodyweight", muscles: ["Legs", "Glutes"] },
  { id: "b-split-squat-bw", name: "Bulgarian Split Squat (BW)", type: "bodyweight", muscles: ["Legs", "Glutes"] },
  { id: "b-glute-bridge", name: "Glute Bridge", type: "bodyweight", muscles: ["Glutes", "Legs"] },
  { id: "b-wall-sit", name: "Wall Sit", type: "bodyweight", muscles: ["Legs"] },

  // Core
  { id: "b-plank", name: "Plank", type: "bodyweight", muscles: ["Core"] },
  { id: "b-side-plank", name: "Side Plank", type: "bodyweight", muscles: ["Core"] },
  { id: "b-situp", name: "Sit-Up", type: "bodyweight", muscles: ["Core"] },
  { id: "b-crunch", name: "Crunch", type: "bodyweight", muscles: ["Core"] },
  { id: "b-bicycle-crunch", name: "Bicycle Crunch", type: "bodyweight", muscles: ["Core"] },
  { id: "b-hollow-hold", name: "Hollow Body Hold", type: "bodyweight", muscles: ["Core"] },
  { id: "b-mountain-climber", name: "Mountain Climbers", type: "bodyweight", muscles: ["Core", "Full Body"] },
  { id: "b-dumbbell-russian-twist", name: "Dumbbell Russian Twist", type: "dumbbell", muscles: ["Core"] },

  // Full body
  { id: "b-dumbbell-thruster", name: "Dumbbell Thruster", type: "dumbbell", muscles: ["Full Body", "Legs", "Shoulders"] },
  { id: "b-burpee", name: "Burpee", type: "bodyweight", muscles: ["Full Body"] },
  { id: "b-bear-crawl", name: "Bear Crawl", type: "bodyweight", muscles: ["Full Body", "Core"] },
];
