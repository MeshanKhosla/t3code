import { type ThreadId } from "@t3tools/contracts";

import { readNativeApi } from "../nativeApi";
import { toastManager } from "../components/ui/toast";
import { newCommandId } from "./utils";

export type CommitThreadRenameResult = "renamed" | "unchanged" | "invalid" | "skipped";

export async function commitThreadRename(input: {
  threadId: ThreadId;
  nextTitle: string;
  originalTitle: string;
}): Promise<CommitThreadRenameResult> {
  const trimmed = input.nextTitle.trim();
  if (trimmed.length === 0) {
    toastManager.add({ type: "warning", title: "Thread title cannot be empty" });
    return "invalid";
  }
  if (trimmed === input.originalTitle) {
    return "unchanged";
  }

  const api = readNativeApi();
  if (!api) {
    return "skipped";
  }

  try {
    await api.orchestration.dispatchCommand({
      type: "thread.meta.update",
      commandId: newCommandId(),
      threadId: input.threadId,
      title: trimmed,
    });
    return "renamed";
  } catch (error) {
    toastManager.add({
      type: "error",
      title: "Failed to rename thread",
      description: error instanceof Error ? error.message : "An error occurred.",
    });
    return "skipped";
  }
}
