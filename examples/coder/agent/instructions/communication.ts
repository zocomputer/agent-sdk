import { stdlib } from "../lib/stdlib";

// The reporting contract: lead with the outcome, readable over brief,
// report-don't-fix when the user is diagnosing, act without permission-seeking.
export default stdlib.instructions.communication;
