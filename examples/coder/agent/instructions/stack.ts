import { stdlib } from "../lib/stdlib";

// The SDK's whole baseline prompt as one instruction, in its canonical
// section order: repo conventions → workflow → planning → parallel tools →
// delegation → media → asking → communicating. One file instead of one per
// section — eve orders instruction slots alphabetically by filename, so the
// composed stack is what keeps section order deliberate. The persona stays
// in coder.ts; the stack ships operational contracts, not personality.
export default stdlib.instructions.stack;
