import { stdlib } from "../lib/stdlib";

// `todo` re-uses eve's framework name, so this overrides it directly with the
// stdlib's discipline-enforcing wrapper: same durable state and schemas, but
// an invalid write (duplicate/blank contents, two in_progress, a
// pending → completed jump) is rejected with the list unchanged.
export default stdlib.tools.todo;
