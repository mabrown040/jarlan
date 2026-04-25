/**
 * Reply assembly: pure function that combines the AI's body +
 * optional assumption-line + the server-generated share URL +
 * a fixed disclosure into the final Reddit-postable text.
 *
 * Hardcoded here so:
 * - The disclosure is reviewed once and can't drift (we hit this:
 *   the model wrote "nothing saved" which became false when the
 *   share-links service started persisting scenarios).
 * - Brand-consistent across every reply.
 * - Updates to the link line / disclosure don't require
 *   re-testing the prompt.
 *
 * Used by the admin UI to render the editable preview. The route
 * handler returns the raw `replyDraft` fields and the share URL;
 * the UI calls `assembleReplyMessage` to compose the final text.
 *
 * Pure — no I/O, no side effects, safe to import from server or
 * client code.
 */

export const REPLY_DISCLOSURE = "(I built this — free, no signup.)";

interface AssembleReplyParams {
  body: string;
  assumptionsLine: string;
  shareUrl: string;
}

export function assembleReplyMessage(params: AssembleReplyParams): string {
  const trimmedAssumptions = params.assumptionsLine.trim();
  const linkLine = trimmedAssumptions
    ? `${trimmedAssumptions} ${params.shareUrl}`
    : params.shareUrl;
  return `${params.body.trim()}\n\n${linkLine}\n\n${REPLY_DISCLOSURE}`;
}
