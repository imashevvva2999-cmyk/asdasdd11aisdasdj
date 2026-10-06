import { Laya } from "@receptron/laya";

console.log("Loading Laya...");

const laya = await Laya.load();

console.log("Laya loaded successfully.");

const result = await laya.systemOne(
  {
    subject: "Mmusic user feedback",
    body: "The user cannot find their saved playlist and is frustrated."
  },
  {
    category: {
      type: "choice",
      instructions: "What type of issue is this?",
      criteria: {
        ui: "UI or navigation problem",
        playback: "Music playback problem",
        account: "Account or profile problem"
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
      instructions: "Does this user need support?"
    }
  }
);

console.log(JSON.stringify(result, null, 2));

await laya.close();