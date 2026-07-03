// Minimal typings for turndown's server-side DOM parser (the package ships
// none). Only what convertHtmlToMarkdown touches.
declare module "@mixmark-io/domino" {
  export interface DominoDocument {
    getElementById(id: string): object | null;
  }
  const domino: {
    createDocument(html?: string, forceStrictMode?: boolean): DominoDocument;
  };
  export default domino;
}
