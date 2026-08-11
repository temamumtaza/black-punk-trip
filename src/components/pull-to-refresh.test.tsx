/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PullToRefresh } from "@/components/pull-to-refresh";

describe("PullToRefresh", () => {
  it("reloads after a deliberate pull from the top", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<PullToRefresh onRefresh={onRefresh}><main>Trip content</main></PullToRefresh>);
    const shell = screen.getByText("Trip content").parentElement as HTMLElement;

    fireEvent.touchStart(shell, { touches: [{ clientY: 10 }] });
    fireEvent.touchMove(shell, { touches: [{ clientY: 180 }] });
    fireEvent.touchEnd(shell);

    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
  });
});
