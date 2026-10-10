import { describe, expect, it } from "vitest";
import { exampleBallot } from "../ballot-demo";
import { contestOptions, emptyPreparation, preparationStorageKey, sanitizePreparation, toggleChoice } from "../ballot-preparation";
import type { BallotContest } from "../ballot-types";

const single = exampleBallot.contests[0];
const multi = exampleBallot.contests[2];
const measure = exampleBallot.contests[4];
const [first, second, third] = single.candidates.map(({ id }) => id);
const [boardFirst, boardSecond, boardThird] = multi.candidates.map(({ id }) => id);

describe("ballot preparation", () => {
  it("replaces a single choice, supports clearing it, and rejects unknown candidates", () => {
    expect(toggleChoice(single, [first], second)).toEqual([second]);
    expect(toggleChoice(single, [second], second)).toEqual([]);
    expect(toggleChoice(single, [first], "unknown")).toEqual([first]);
  });

  it("prevents an overvote in a multi-seat contest without discarding existing choices", () => {
    expect(toggleChoice(multi, [boardFirst], boardSecond)).toEqual([boardFirst, boardSecond]);
    expect(toggleChoice(multi, [boardFirst, boardSecond], boardThird)).toEqual([boardFirst, boardSecond]);
    expect(toggleChoice(multi, [boardFirst, boardSecond], boardFirst)).toEqual([boardSecond]);
  });

  it("does not guess a candidate selection limit", () => {
    for (const voteFor of [null, 0, -1, 1.5, Number.NaN]) {
      const contest = { ...single, voteFor };
      expect(toggleChoice(contest, [first], second)).toEqual([]);
      expect(sanitizePreparation({ choices: { [contest.id]: [first] } }, [contest]).choices).toEqual({});
    }
  });

  it("uses one response for a measure with an unspecified limit", () => {
    const contest = { ...measure, voteFor: null };
    expect(contestOptions(contest)).toEqual([{ id: "Yes", label: "Yes" }, { id: "No", label: "No" }]);
    expect(toggleChoice(contest, ["Yes"], "No")).toEqual(["No"]);
  });

  it("removes stale contests, stale candidates, duplicate choices and excess choices", () => {
    const result = sanitizePreparation({
      choices: {
        [single.id]: ["old-candidate", first, first, second, third],
        [multi.id]: [boardFirst, boardFirst, boardSecond, boardThird, 3],
        "old-contest": ["old-candidate"],
      },
      notes: { [single.id]: "  Check the candidate statements.  ", "old-contest": "stale" },
      reviewed: [single.id, single.id, "old-contest", 2, multi.id],
    }, exampleBallot.contests);
    expect(result).toEqual({
      choices: { [single.id]: [first], [multi.id]: [boardFirst, boardSecond] },
      notes: { [single.id]: "Check the candidate statements." },
      reviewed: [single.id, multi.id],
    });
  });

  it("limits notes to 2,000 characters and drops non-string or empty notes", () => {
    const result = sanitizePreparation({
      notes: { [single.id]: `  ${"x".repeat(2001)}  `, [multi.id]: " \n ", [measure.id]: { text: "invalid" } },
    }, exampleBallot.contests);
    expect(result.notes).toEqual({ [single.id]: "x".repeat(2000) });
  });

  it("ignores malformed storage and inherited properties instead of accepting object garbage", () => {
    for (const value of [null, undefined, 2, "not JSON", [], new Date(), { choices: [], notes: [], reviewed: {} }]) {
      expect(sanitizePreparation(value, exampleBallot.contests)).toEqual(emptyPreparation());
    }
    const inherited = Object.create({ choices: { [single.id]: [first] }, reviewed: [single.id] });
    expect(sanitizePreparation(inherited, exampleBallot.contests)).toEqual(emptyPreparation());
    expect(sanitizePreparation({ choices: Object.create({ [single.id]: [first] }) }, exampleBallot.contests)).toEqual(emptyPreparation());
  });

  it("does not invoke getters or mutate prototypes when reading stored data", () => {
    const getter = { get choices(): never { throw new Error("must not run"); } };
    expect(sanitizePreparation(getter, exampleBallot.contests)).toEqual(emptyPreparation());
    const unusualContest: BallotContest = { ...single, id: "__proto__" };
    const payload = JSON.parse('{"choices":{"__proto__":["example-alex-morgan"]},"notes":{"__proto__":"note"},"reviewed":["__proto__"]}');
    const result = sanitizePreparation(payload, [unusualContest]);
    expect(Object.getPrototypeOf(result.choices)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(result.choices, "__proto__")?.value).toEqual([first]);
    expect(Object.getOwnPropertyDescriptor(result.notes, "__proto__")?.value).toBe("note");
  });

  it("isolates stored choices by ballot and primary party, even when identifiers contain separators", () => {
    expect(preparationStorageKey("ballot", "Party A")).toBe(preparationStorageKey("ballot", "Party A"));
    expect(preparationStorageKey("ballot", "Party A")).not.toBe(preparationStorageKey("ballot", "Party B"));
    expect(preparationStorageKey("ballot", "Party A")).not.toBe(preparationStorageKey("other", "Party A"));
    expect(preparationStorageKey("a:b", "c")).not.toBe(preparationStorageKey("a", "b:c"));
    expect(preparationStorageKey("ballot")).toBe(preparationStorageKey("ballot", ""));
  });
});
