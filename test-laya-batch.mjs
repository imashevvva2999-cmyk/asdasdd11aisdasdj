import { Laya } from "@receptron/laya";

console.log("Loading Laya...");

const laya = await Laya.load();

console.log("Laya loaded successfully.\n");

const examples = [
  "The play button does nothing.",
  "I forgot my account password.",
  "I cannot find my saved playlist.",
  "The song stops after 10 seconds.",
  "My profile photo is missing."
];

for (const [index, text] of examples.entries()) {
  const result = await laya.systemOne(
    {
      subject: `Mmusic test ${index + 1}`,
      body: text
    },
    {
      category: {
        type: "choice",
        instructions: "What type of issue is this?",
        criteria: {
          ui: "UI, layout, navigation, visibility, or interface problem",
          playback: "Music playback, audio, player, buffering, or track problem",
          account: "Account, login, password, profile, or authentication problem"
        }
      },
      urgency: {
        type: "score",
        instructions: "How urgent is this issue?",
        criteria: [
          "not urgent",
          "somewhat urgent",
          "urgent",
          "critical"
        ]
      },
      needs_support: {
        type: "noul",
        instructions: "Does this issue likely require customer support?"
      }
    }
  );

  console.log(`\n==============================`);
  console.log(`TEST ${index + 1}`);
  console.log(`Input: ${text}`);
  console.log(`Category: ${result.answers.category.choice}`);
  console.log(
    "Probabilities:",
    result.answers.category.probabilities
  );
  console.log(`Urgency score: ${result.answers.urgency.score}`);
  console.log(`Needs support: ${result.answers.needs_support.noul}`);
}

await laya.close();

console.log("\nAll tests completed.");