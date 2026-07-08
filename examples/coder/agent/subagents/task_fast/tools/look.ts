// Re-export of the parent's tool: the task child runs the coder's full tool
// surface. look needs no park-delivery hook (it makes its own AI SDK call),
// so unlike read/webfetch it works in a child unchanged. manifest.test.ts
// pins the set and the instance identity.
export { default } from "../../../tools/look";
