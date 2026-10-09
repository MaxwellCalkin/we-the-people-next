import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { TabList, TabPanel } from "../Tabs";

afterEach(cleanup);

function Harness() {
  const [tab, setTab] = useState<"trending" | "top" | "new">("trending");
  return (
    <>
      <TabList
        label="Bill lists"
        prefix="t"
        value={tab}
        onChange={setTab}
        items={[
          { id: "trending", label: "Trending" },
          { id: "top", label: "Most voted" },
          { id: "new", label: "Newest", count: 20 },
        ]}
      />
      <TabPanel prefix="t" active={tab}>
        Showing {tab}
      </TabPanel>
    </>
  );
}

describe("TabList", () => {
  it("exposes tabs with the selected one in the tab order", () => {
    render(<Harness />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    expect(screen.getByRole("tabpanel", { name: "Trending" })).toHaveTextContent("Showing trending");
  });

  it("moves between tabs with the arrow, Home, and End keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("tab", { name: "Trending" }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Most voted" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Showing top");

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: /Newest/ })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Trending" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: /Newest/ })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Showing trending");
  });
});
