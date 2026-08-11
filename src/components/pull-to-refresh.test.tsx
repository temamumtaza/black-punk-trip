/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PullToRefresh } from "@/components/pull-to-refresh";

describe("PullToRefresh", () => {
  afterEach(() => cleanup());

  it("reloads after a deliberate pull from the top", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<PullToRefresh onRefresh={onRefresh}><main>Trip content</main></PullToRefresh>);
    const shell = screen.getByText("Trip content").parentElement as HTMLElement;

    fireEvent.touchStart(shell, { touches: [{ clientY: 10 }] });
    fireEvent.touchMove(shell, { touches: [{ clientY: 180 }] });
    fireEvent.touchEnd(shell);

    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
  });

  it("dismisses the indicator when the pull is released before its threshold", () => {
    render(<PullToRefresh onRefresh={vi.fn()}><main>Trip content</main></PullToRefresh>);
    const shell = screen.getByText("Trip content").parentElement as HTMLElement;

    fireEvent.touchStart(shell, { touches: [{ clientY: 10 }] });
    fireEvent.touchMove(shell, { touches: [{ clientY: 70 }] });
    fireEvent.touchEnd(shell);

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps visible success feedback after the refreshed data resolves", async () => {
    let finishRefresh: (() => void) | undefined;
    const onRefresh = vi.fn(() => new Promise<void>((resolve) => { finishRefresh = resolve; }));
    render(<PullToRefresh onRefresh={onRefresh}><main>Trip content</main></PullToRefresh>);
    const shell = screen.getByText("Trip content").parentElement as HTMLElement;

    fireEvent.touchStart(shell, { touches: [{ clientY: 10 }] });
    fireEvent.touchMove(shell, { touches: [{ clientY: 180 }] });
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe("Lepaskan untuk memuat");
    fireEvent.touchEnd(shell);
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe("Memuat data terbaru…");

    finishRefresh?.();
    await waitFor(() => expect(screen.getByRole("status").getAttribute("aria-label")).toBe("Data sudah terbaru"));
  });
});
