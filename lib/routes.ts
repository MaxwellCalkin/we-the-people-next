/**
 * Where signed-in users start: logging in, signing up, and finishing
 * onboarding all land here.
 */
export const HOME_PATH = "/elections";

/** Where a bill link should go: the ballot to vote, or results once voted. */
export function billHref(slug: string, congress: string, voted: boolean): string {
  return `/vote/${slug}/${congress}${voted ? "/voted" : ""}`;
}
