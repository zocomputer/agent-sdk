import { defineEval } from "eve/evals";

// The default mock turn: a paced story stream with the asking prompt echoed
// into the output. Pins the plainest end-to-end path — send a turn, stream
// text, finish clean — plus the echo that keeps parallel chats tellable apart.
export default defineEval({
  description: "A plain mock turn streams the story and finishes without tools.",
  tags: ["mock"],
  async test(t) {
    const turn = await t.send("Tell me about the harbor tonight.");
    turn.succeeded();
    turn.usedNoTools();
    turn.messageIncludes("Story for:");
    turn.messageIncludes("Tell me about the harbor tonight.");
    turn.messageIncludes("lighthouse keeper");
  },
});
