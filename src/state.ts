import { create } from "zustand";
import {
  produce,
  produceWithPatches,
  applyPatches,
  enablePatches,
} from "immer";
import type { Issue, IssueStatus, Priority } from "./types";
import { Effect, defineCommand, drainQueue, rollback } from "./commandr";

export { dispatch, undo, redo, pause, record } from "./commandr";

enablePatches();

export type Status = "idle" | "saving" | "saved" | "error";

interface AppState {
  activeIssueId: string | null;
  status: Status;
  favorites: Set<string>;
}

export const useAppStore = create<AppState>(() => ({
  status: "idle",
  activeIssueId: null,
  favorites: new Set(),
}));

export const useIssuesStore = create<Record<string, Issue>>()(() => ({}));

/**
 * This is probably not the most ideal way to hydrate a store from the server,
 * but I'm taking the easy way out for now since that's not the focus of this
 * demo
 */
export function hydrateIssues(issues: Array<Issue>) {
  const obj = Object.fromEntries(issues.map((issue) => [issue.id, issue]));
  useIssuesStore.setState(obj);
}

export function activateIssue(id: string) {
  useAppStore.setState({
    activeIssueId: id,
  });
}

export function deactivateIssue() {
  useAppStore.setState({
    activeIssueId: null,
  });
}

export async function commit() {
  const appState = useAppStore.getState();

  if (appState.status === "saving") {
    return;
  }

  const toSync = drainQueue();

  if (toSync.length === 0) {
    return;
  }

  useAppStore.setState({
    status: "saving",
  });

  console.log(`committing ${toSync.length} transactions...`);

  let nextStatus: Status = "saved";

  for (const txn of toSync) {
    const result = await txn.command.sync(txn);
    if (result === "error") {
      rollback(txn);

      nextStatus = "error";
    }
  }

  useAppStore.setState({
    status: nextStatus,
  });
}

/**
 * In this command we're handling things manually. It gives a lot of flexibility
 * but is repetitive and a little tedious.
 */
export const setPriority = defineCommand({
  type: "SetPriority",
  exec(params: { id: string; priority: Priority }) {
    const previousIssue = getIssue(params.id);

    mutateIssues((issues) => {
      issues[params.id].priority = params.priority;
    });

    return {
      inverse: previousIssue.priority,
      actual: params.priority,
    };
  },
  undo(txn) {
    const previousIssue = getIssue(txn.command.params.id);

    mutateIssues((issues) => {
      issues[txn.command.params.id].priority = txn.payload.inverse;
    });

    return {
      inverse: previousIssue.priority,
      actual: txn.payload.inverse,
    };
  },
  redo(txn) {
    const previousIssue = getIssue(txn.command.params.id);
    mutateIssues((issues) => {
      issues[txn.command.params.id].priority = txn.payload.inverse;
    });

    return {
      inverse: previousIssue.priority,
      actual: txn.payload.inverse,
    };
  },
  async sync(txn) {
    const resp = await fetch("/api/setIssuePriority", {
      method: "POST",
      body: JSON.stringify({
        id: txn.command.params.id,
        priority: txn.payload.actual,
      }),
    });

    return resp.ok ? "ok" : "error";
  },
});

// Here we're using a custom "patched" command. We only need to define a
// `mutate` method that handles recording and applying patches.
export const setTitle = definePatchedIssueCommand({
  type: "SetTitle",
  mutate(issue, params: { id: string; title: string; inputId: string }) {
    issue.title = params.title;
  },

  // In this particular app, we know that the title can only be set when the
  // issue is activated, so when we undo we activate the issue so we can focus
  // the input that was undone. In a real app, this would probably be more
  // complex and you may need to attach more metadata to the original action to
  // know what to do here.
  onUndo(params, createEffect) {
    activateIssue(params.id);
    createEffect(() => {
      document.getElementById(params.inputId)?.focus();
    });
  },
  onRedo(params, createEffect) {
    activateIssue(params.id);
    createEffect(() => {
      document.getElementById(params.inputId)?.focus();
    });
  },
});

export const setStatus = definePatchedIssueCommand({
  type: "SetStatus",
  mutate(issue, params: { id: string; status: IssueStatus }) {
    issue.status = params.status;
  },
});

// In this one, we are assuming the issue already exists in the backend, so
// the command is just here to add it to our local state. Undoing/redoing is
// setting the issue to "archived" so that it can happen immediately
export const createIssue = defineCommand({
  type: "CreateIssue",
  exec(params: { issue: Issue }) {
    mutateIssues((issues) => {
      issues[params.issue.id] = params.issue;
    });

    return {
      type: "exec",
      id: params.issue.id,
    };
  },
  undo(txn) {
    mutateIssues((issues) => {
      issues[txn.payload.id].isArchived = true;
    });

    return {
      type: "undo",
      id: txn.payload.id,
    };
  },
  redo(txn) {
    mutateIssues((issues) => {
      issues[txn.payload.id].isArchived = false;
    });

    return {
      type: "redo",
      id: txn.payload.id,
    };
  },
  async sync(txn) {
    if (txn.payload.type === "exec") {
      // Nothing to sync here. We already created the issue
      return "ok";
    }

    const issue = getIssue(txn.payload.id);

    const resp = await fetch("/api/setIssueArchived", {
      method: "POST",
      body: JSON.stringify({
        id: txn.payload.id,
        isArchived: issue.isArchived,
      }),
    });

    return resp.ok ? "ok" : "error";
  },
});

export const setFavorite = defineCommand({
  type: "SetFavorite",
  exec(params: { id: string; isFavorite: boolean }) {
    toggleFavorite(params.id, params.isFavorite);
    return params;
  },
  undo(txn) {
    toggleFavorite(txn.command.params.id, !txn.payload.isFavorite);
    return {
      ...txn.payload,
      isFavorite: !txn.payload.isFavorite,
    };
  },
  redo(txn) {
    toggleFavorite(txn.command.params.id, txn.command.params.isFavorite);
    return {
      ...txn.payload,
      isFavorite: !txn.payload.isFavorite,
    };
  },
  async sync(txn) {
    const resp = await fetch("/api/setFavorite", {
      method: "POST",
      body: JSON.stringify({
        id: txn.payload.id,
        isFavorite: txn.payload.isFavorite,
      }),
    });

    return resp.ok ? "ok" : "error";
  },
});

function toggleFavorite(id: string, isFavorite: boolean) {
  useAppStore.setState((appState) => {
    const nextFavs = new Set(appState.favorites);

    if (isFavorite) {
      nextFavs.add(id);
    } else {
      nextFavs.delete(id);
    }

    return {
      ...appState,
      favorites: nextFavs,
    };
  });
}

function definePatchedIssueCommand<
  Type extends string,
  Params extends { id: string },
>(config: {
  type: Type;
  mutate: (issue: Issue, params: Params) => void;
  onUndo?: (params: Params, exec: (effect: Effect) => void) => void;
  onRedo?: (params: Params, exec: (effect: Effect) => void) => void;
}) {
  return defineCommand({
    type: config.type,
    exec(params: Params & { base?: Issue }) {
      const base = params.base ?? getIssue(params.id);
      const [updatedIssue, patches, inversePatches] = produceWithPatches(
        base,
        (draft) => config.mutate(draft, params),
      );

      mutateIssues((issues) => {
        issues[params.id] = updatedIssue;
      });

      return { patches, inversePatches };
    },
    undo(txn, exec) {
      const currentIssue = getIssue(txn.command.params.id);
      const [updatedIssue, patches, inversePatches] = produceWithPatches(
        currentIssue,
        (draft) => {
          applyPatches(draft, txn.payload.inversePatches);
        },
      );

      mutateIssues((issues) => {
        issues[txn.command.params.id] = updatedIssue;
      });

      if (typeof config.onUndo === "function") {
        config.onUndo(txn.command.params, exec);
      }

      return { ...txn.payload, patches, inversePatches };
    },
    redo(txn, exec) {
      const currentIssue = getIssue(txn.command.params.id);
      const [updatedIssue, patches, inversePatches] = produceWithPatches(
        currentIssue,
        (draft) => {
          applyPatches(draft, txn.payload.inversePatches);
        },
      );

      mutateIssues((issues) => {
        issues[txn.command.params.id] = updatedIssue;
      });

      if (typeof config.onRedo === "function") {
        config.onRedo(txn.command.params, exec);
      }

      return { ...txn.payload, patches, inversePatches };
    },
    async sync(txn) {
      const resp = await fetch("/api/patchIssue", {
        method: "POST",
        body: JSON.stringify({
          id: txn.command.params.id,
          patches: txn.payload.patches,
        }),
      });

      return resp.ok ? "ok" : "error";
    },
  });
}

function mutateIssues(fn: (issues: Record<string, Issue>) => void) {
  useIssuesStore.setState((state) => produce(state, fn));
}

function getIssue(id: string) {
  return useIssuesStore.getState()[id];
}
