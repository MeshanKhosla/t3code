import { ThreadId } from "@t3tools/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const addToastMock = vi.fn();
const readNativeApiMock = vi.fn();

vi.mock("../nativeApi", () => ({
  readNativeApi: readNativeApiMock,
}));

vi.mock("../components/ui/toast", () => ({
  toastManager: {
    add: addToastMock,
  },
}));

describe("commitThreadRename", () => {
  beforeEach(() => {
    vi.resetModules();
    addToastMock.mockReset();
    readNativeApiMock.mockReset();
  });

  it("trims the title and dispatches thread.meta.update", async () => {
    const dispatchCommand = vi.fn().mockResolvedValue(undefined);
    readNativeApiMock.mockReturnValue({
      orchestration: {
        dispatchCommand,
      },
    });

    const { commitThreadRename } = await import("./threadRename");
    const result = await commitThreadRename({
      threadId: ThreadId.makeUnsafe("thread-1"),
      nextTitle: "  Renamed thread  ",
      originalTitle: "Old name",
    });

    expect(result).toBe("renamed");
    expect(dispatchCommand).toHaveBeenCalledWith({
      type: "thread.meta.update",
      commandId: expect.any(String),
      threadId: "thread-1",
      title: "Renamed thread",
    });
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it("rejects empty titles with the existing warning toast", async () => {
    const { commitThreadRename } = await import("./threadRename");
    const result = await commitThreadRename({
      threadId: ThreadId.makeUnsafe("thread-1"),
      nextTitle: "   ",
      originalTitle: "Old name",
    });

    expect(result).toBe("invalid");
    expect(readNativeApiMock).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith({
      type: "warning",
      title: "Thread title cannot be empty",
    });
  });

  it("skips dispatch when the title is unchanged after trimming", async () => {
    const dispatchCommand = vi.fn().mockResolvedValue(undefined);
    readNativeApiMock.mockReturnValue({
      orchestration: {
        dispatchCommand,
      },
    });

    const { commitThreadRename } = await import("./threadRename");
    const result = await commitThreadRename({
      threadId: ThreadId.makeUnsafe("thread-1"),
      nextTitle: " Existing name ",
      originalTitle: "Existing name",
    });

    expect(result).toBe("unchanged");
    expect(dispatchCommand).not.toHaveBeenCalled();
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it("shows the existing error toast when dispatch fails", async () => {
    const dispatchCommand = vi.fn().mockRejectedValue(new Error("rename failed"));
    readNativeApiMock.mockReturnValue({
      orchestration: {
        dispatchCommand,
      },
    });

    const { commitThreadRename } = await import("./threadRename");
    const result = await commitThreadRename({
      threadId: ThreadId.makeUnsafe("thread-1"),
      nextTitle: "Renamed thread",
      originalTitle: "Old name",
    });

    expect(result).toBe("skipped");
    expect(addToastMock).toHaveBeenCalledWith({
      type: "error",
      title: "Failed to rename thread",
      description: "rename failed",
    });
  });

  it("skips safely when the native api is unavailable", async () => {
    readNativeApiMock.mockReturnValue(undefined);

    const { commitThreadRename } = await import("./threadRename");
    const result = await commitThreadRename({
      threadId: ThreadId.makeUnsafe("thread-1"),
      nextTitle: "Renamed thread",
      originalTitle: "Old name",
    });

    expect(result).toBe("skipped");
    expect(addToastMock).not.toHaveBeenCalled();
  });
});
