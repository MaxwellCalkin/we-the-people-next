/** Where a bill link should go: the ballot to vote, or results once voted. */
export function billHref(slug: string, congress: string, voted: boolean): string {
  return `/vote/${slug}/${congress}${voted ? "/voted" : ""}`;
}
