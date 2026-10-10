import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import MemberDirectory from "../MemberDirectory";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  // `unoptimized` is a next/image prop, not an <img> attribute.
  default: ({ unoptimized, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} data-unoptimized={String(Boolean(unoptimized))} alt={(props.alt as string) || ""} />
  ),
}));

afterEach(cleanup);

const base = { matchingVotes: 0, totalCompared: 0, communityScore: null as number | null, district: null as number | null };
const members = [
  { ...base, bioguideId: "A000001", name: "Adams, Alma", party: "Democratic", state: "North Carolina", district: 12, chamber: "House", communityScore: 100, matchingVotes: 3, totalCompared: 3 },
  { ...base, bioguideId: "H000001", name: "Hunt, Wesley", party: "Republican", state: "Texas", district: 38, chamber: "House", communityScore: 100, matchingVotes: 11, totalCompared: 11 },
  { ...base, bioguideId: "F000479", name: "Fetterman, John", party: "Democratic", state: "Pennsylvania", chamber: "Senate", communityScore: 33, matchingVotes: 1, totalCompared: 3 },
  { ...base, bioguideId: "S000033", name: "Sanders, Bernard", party: "Independent", state: "Vermont", chamber: "Senate" },
];

function rowNames() {
  return screen.getAllByRole("listitem").map((li) => within(li).getByRole("link").textContent);
}

describe("MemberDirectory", () => {
  it("shows names in natural order with Rep./Sen. titles", () => {
    render(<MemberDirectory members={members} />);
    expect(screen.getByRole("link", { name: "Sen. John Fetterman" })).toHaveAttribute("href", "/members/F000479");
    expect(screen.getByRole("link", { name: "Rep. Wesley Hunt" })).toBeInTheDocument();
  });

  it("ranks ties by the larger sample of shared votes and puts unscored members last", () => {
    render(<MemberDirectory members={members} />);
    expect(rowNames()).toEqual(["Rep. Wesley Hunt", "Rep. Alma Adams", "Sen. John Fetterman", "Sen. Bernard Sanders"]);
  });

  it("lists members without a score in last-name order after the ranked ones", () => {
    render(
      <MemberDirectory
        members={[
          { ...base, bioguideId: "S000033", name: "Sanders, Bernard", party: "Independent", state: "Vermont", chamber: "Senate" },
          { ...base, bioguideId: "M001153", name: "Murkowski, Lisa", party: "Republican", state: "Alaska", chamber: "Senate" },
          { ...base, bioguideId: "A000001", name: "Adams, Alma", party: "Democratic", state: "North Carolina", district: 12, chamber: "House", communityScore: 50, matchingVotes: 1, totalCompared: 2 },
        ]}
      />
    );
    expect(rowNames()).toEqual(["Rep. Alma Adams", "Sen. Lisa Murkowski", "Sen. Bernard Sanders"]);
  });

  it("shows each member's Congress.gov photo, loaded straight from Congress.gov", () => {
    const imageUrl = "https://www.congress.gov/img/member/6a986b632a68122e10181e6b_200.jpg";
    render(
      <MemberDirectory
        members={[
          { ...base, bioguideId: "W000832", name: "Wahab, Aisha", party: "Democratic", state: "California", district: 14, chamber: "House", imageUrl },
          { ...base, bioguideId: "S000033", name: "Sanders, Bernard", party: "Independent", state: "Vermont", chamber: "Senate" },
        ]}
      />
    );
    const wahab = screen.getByRole("img", { name: "Aisha Wahab" });
    expect(wahab).toHaveAttribute("src", imageUrl);
    expect(wahab).toHaveAttribute("data-unoptimized", "true");
    // Without a known photo, the usual bioguide file name is tried.
    expect(screen.getByRole("img", { name: "Bernard Sanders" })).toHaveAttribute(
      "src",
      "https://www.congress.gov/img/member/s000033_200.jpg"
    );
  });

  it("filters by chamber and by name", async () => {
    const user = userEvent.setup();
    render(<MemberDirectory members={members} />);

    await user.click(screen.getByRole("button", { name: "Senate" }));
    expect(rowNames()).toEqual(["Sen. John Fetterman", "Sen. Bernard Sanders"]);
    expect(screen.getByText("2 of 4 members")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Search members by name" }), "bernard");
    expect(rowNames()).toEqual(["Sen. Bernard Sanders"]);
  });

  it("offers a way out when no members match", async () => {
    const user = userEvent.setup();
    render(<MemberDirectory members={members} />);

    await user.type(screen.getByRole("searchbox", { name: "Search members by name" }), "zzzz");
    expect(screen.getByText("No members match those filters")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Clear filters" })[0]);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });
});
