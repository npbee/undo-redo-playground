/**
 * This is a separate file to create some separation between "undo" stuff vs.
 * other stuff, but it's not the cleanest separation
 */
import { produce } from "immer";
import { createStore, useStore } from "zustand";

export type Effect = () => void;

/**
 * A transaction represents a discrete change in the UI state. It holds an
 * arbitrary payload and the command that created it.
 */
interface Transaction<Cmd extends AnyCommand, Payload extends object> {
  id: string;
  command: Cmd;
  payload: Payload;
}

interface UndoTransaction<Cmd extends AnyCommand, Payload extends object>
  extends Transaction<Cmd, Payload> {
  originalTxn: Transaction<Cmd, Payload>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTransaction = Transaction<AnyCommand, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyUndoTransaction = UndoTransaction<AnyCommand, any>;

/**
 * An individual command to update the state in the app. It may have `params`
 * to stash values needed when the command is executed. The `exec`, `undo`, and
 * `redo` functions each create a new transaction.
 */
interface Command<
  Type extends string,
  Params extends object,
  Payload extends object,
> {
  type: Type;
  params: Params;
  exec: (params: Params, useEffect: (effect: Effect) => void) => Payload;
  undo: (
    txn: Transaction<Command<Type, Params, Payload>, Payload>,
    useEffect: (effect: Effect) => void,
  ) => Payload;
  redo: (
    txn: Transaction<Command<Type, Params, Payload>, Payload>,
    useEffect: (effect: Effect) => void,
  ) => Payload;
  sync: (
    txn: Transaction<Command<Type, Params, Payload>, Payload>,
  ) => Promise<"ok" | "error">;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCommand = Command<any, any, any>;

interface CommandState {
  undoStack: Array<AnyTransaction>;
  redoStack: Array<AnyUndoTransaction>;
  syncQueue: Array<AnyTransaction>;
  historyStatus: "recording" | "paused";
  effects: Array<Effect>;
}

export const commandStore = createStore<CommandState>(() => ({
  undoStack: [],
  redoStack: [],
  syncQueue: [],
  historyStatus: "recording",
  effects: [],
}));

export const useEffects = () =>
  useStore(commandStore, (state) => state.effects);

export function dispatch(cmd: AnyCommand) {
  const state = commandStore.getState();
  const effects: Array<Effect> = [];
  const useEffect = (effect: Effect) => effects.push(effect);
  const payload = cmd.exec(cmd.params, useEffect);

  if (state.historyStatus === "recording") {
    const txn = createTransaction(cmd, payload);

    mutate((state) => {
      state.undoStack.push(
        // The GURQ (I think....)
        // We want to put the redo stack back onto the undo stack twice:
        //   1 - Forwards: When we undo we should undo the original action
        //   2 - Backwards: When we undo we should undo the undo, a.k.a. redo
        ...state.redoStack.map((txn) => txn.originalTxn),
        ...state.redoStack.map((txn) => ({
          ...txn,
          command: {
            ...txn.command,
            undo: txn.command.redo,
            redo: txn.command.undo,
          },
        })),
        txn,
      );

      // Always clear the redo stack
      state.redoStack = [];
      state.syncQueue.push(txn);
    });
  }
}

export function undo() {
  const state = commandStore.getState();
  const txn = state.undoStack.slice().pop();

  if (!txn) {
    return;
  }

  const effects: Array<Effect> = [];
  const useEffect = (effect: Effect) => effects.push(effect);
  const payload = txn.command.undo(txn, useEffect);
  const nextTxn = createUndoTransaction(txn.command, payload, txn);

  mutate((state) => {
    state.undoStack.pop();
    state.redoStack.push(nextTxn);
    state.syncQueue.push(nextTxn);
    state.effects = effects;
  });
}

export function redo() {
  const state = commandStore.getState();
  const txn = state.redoStack.slice().pop();

  if (!txn) {
    return;
  }

  const effects: Array<Effect> = [];
  const useEffect = (effect: Effect) => effects.push(effect);
  const payload = txn.command.redo(txn, useEffect);
  const nextTxn = createUndoTransaction(txn.command, payload, txn);

  mutate((state) => {
    state.redoStack.pop();
    state.undoStack.push(nextTxn);
    state.syncQueue.push(nextTxn);
    state.effects = effects;
  });
}

export function rollback(txn: AnyTransaction) {
  const effects: Array<Effect> = [];
  const useEffect = (effect: Effect) => effects.push(effect);
  txn.command.undo(txn, useEffect);

  mutate((state) => {
    // Remove the commands that failed from the undo/redo stacks
    state.undoStack.splice(state.undoStack.indexOf(txn), 1);
    state.redoStack.splice(state.undoStack.indexOf(txn), 1);
    state.effects = effects;
  });
}

export function pause() {
  commandStore.setState({
    historyStatus: "paused",
  });
}

export function record() {
  commandStore.setState({
    historyStatus: "recording",
  });
}

export function drainQueue() {
  const queue = commandStore.getState().syncQueue;
  if (queue.length === 0) return queue;

  commandStore.setState({
    syncQueue: [],
  });
  return queue;
}

/**
 * A helper to be able to define type-safe commands. Returns a function that
 * accepts the `params` value for the `exec` function
 */
export function defineCommand<
  Type extends string,
  Params extends object,
  Payload extends object,
>(config: Omit<Command<Type, Params, Payload>, "params">) {
  return function createCommand(
    params: Params,
  ): Command<Type, Params, Payload> {
    return {
      params,
      ...config,
    };
  };
}

function createTransaction<Cmd extends AnyCommand, Payload extends object>(
  command: Cmd,
  payload: Payload,
): Transaction<Cmd, Payload> {
  return {
    id: crypto.randomUUID(),
    payload,
    command,
  };
}

function createUndoTransaction<Cmd extends AnyCommand, Payload extends object>(
  command: Cmd,
  payload: Payload,
  txn: Transaction<Cmd, Payload>,
): UndoTransaction<Cmd, Payload> {
  return {
    id: crypto.randomUUID(),
    payload,
    command,
    originalTxn: txn,
  };
}

function mutate(fn: (state: CommandState) => void) {
  commandStore.setState((state) => produce(state, fn));
}
