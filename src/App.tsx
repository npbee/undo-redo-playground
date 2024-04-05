import { tinykeys } from "tinykeys";
import invariant from "tiny-invariant";
import {
  useActiveIssue,
  useEffects,
  useFavorites,
  useIssue,
  useIssuesIds,
  useStatus,
} from "./queries";
import {
  setPriority,
  dispatch,
  undo,
  redo,
  commit,
  setStatus,
  activateIssue,
  setTitle,
  pause,
  record,
  createIssue,
  deactivateIssue,
  setFavorite,
} from "./state";
import type { Issue } from "./types";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircledIcon,
  CircleIcon,
  Cross1Icon,
  ExclamationTriangleIcon,
  Half2Icon,
  PlusIcon,
  StarFilledIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import {
  Redo,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Undo,
} from "./components/icons";
import * as Toggle from "@radix-ui/react-toggle";
import { Select, SelectItem } from "./components/select";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  Title,
} from "./components/dialog";
import { Button } from "./components/button";

export function App() {
  const ids = useIssuesIds();
  const activeIssue = useActiveIssue();
  const effects = useEffects();

  useEffect(() => {
    // TODO: cancellation
    effects.forEach((effect) => {
      effect();
    });
  }, [effects]);

  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      "$mod+z": () => undo(),
      "Shift+$mod+z": () => redo(),
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="p-4 flex justify-between border-b border-gray-100">
        <div className="flex items-center gap-4">
          <h1 className="text-gray-700 text-sm font-semibold">All issues</h1>
          <AutoSave />
        </div>
        <div className="flex gap-6 items-center">
          <div className="flex gap-4">
            <button onClick={undo} aria-label="Undo">
              <Undo />
            </button>
            <button onClick={redo} aria-label="Redo">
              <Redo />
            </button>
          </div>
          <CreateDialog />
        </div>
      </div>
      <div className="flex gap-8 flex-1">
        <div className="flex-[2]">
          {ids.map((id) => {
            return <Issue key={id} id={id} />;
          })}
        </div>
        {activeIssue ? <ActiveIssue issue={activeIssue} /> : null}
      </div>
      <footer className="p-4 flex justify-end gap-4">
        <a
          className="text-xs inline-flex font-bold text-gray-600 underline"
          href="https://www.npbee.me/posts/command-based-undo"
        >
          Post
        </a>
        <a
          className="text-xs inline-flex font-bold text-gray-600 underline"
          href="https://github.com/npbee/undo-redo-playground"
        >
          Source
        </a>
      </footer>
    </div>
  );
}

function ActiveIssue(props: { issue: Issue }) {
  const { issue } = props;
  const base = useRef(issue);

  return (
    <div className="border-l border-gray-100 bg-gray-50 h-full flex-1 p-4">
      <div className="flex justify-between py-4">
        <p className="text-xs font-semibold  text-gray-600">{issue.publicId}</p>
        <button
          aria-label="Close"
          className="text-gray-900"
          onClick={() => {
            deactivateIssue();
          }}
        >
          <Cross1Icon />
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="active-issue-title"
          className="text-xs font-semibold text-gray-600"
        >
          Title
        </label>
        <input
          className="bg-white border border-gray-200 px-2 py-1 rounded-sm text-sm"
          id="active-issue-title"
          onFocus={() => {
            pause();
            base.current = issue;
          }}
          onBlur={() => {
            record();

            // Need to make sure we're not dispatching unnecessarily
            if (issue.title !== base.current.title) {
              dispatch(
                setTitle({
                  id: issue.id,
                  title: issue.title,
                  base: base.current,
                  inputId: "active-issue-title",
                }),
              );
            }
          }}
          value={issue.title}
          onChange={(evt) => {
            dispatch(
              setTitle({
                id: issue.id,
                title: evt.target.value,
                inputId: "active-issue-title",
              }),
            );
          }}
        />
      </div>
    </div>
  );
}

function AutoSave() {
  const status = useStatus();

  useEffect(() => {
    const interval = setInterval(() => {
      commit();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  let text = null;
  let icon = null;
  let hasError = false;

  if (status === "idle") {
    text = null;
  } else if (status === "saving") {
    text = "Saving...";
    icon = null;
  } else if (status === "saved") {
    text = "Saved";
    icon = <CheckCircledIcon />;
  } else if (status === "error") {
    text = "Error";
    icon = <ExclamationTriangleIcon />;
    hasError = true;
  }

  return (
    <div
      className={`${
        hasError ? "text-red-500" : "text-gray-500"
      } text-xs flex items-center gap-1`}
    >
      {icon}
      {text}
    </div>
  );
}

function Issue(props: { id: string }) {
  const issue = useIssue(props.id);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 py-2 px-4">
      <div className="flex items-center gap-2">
        <PriorityPicker id={issue.id} />
        <div className="text-xs text-gray-500 font-semibold leading-[24px]">
          {issue.publicId}
        </div>
        <StatusPicker id={issue.id} />
        <button
          data-testid="issue"
          onClick={() => activateIssue(issue.id)}
          className="text-sm font-medium text-gray-800"
        >
          {issue.title}
        </button>
        <FavoriteToggle id={issue.id} />
      </div>
      <div className="flex gap-4 items-center">
        <div className="text-xs text-gray-500">Aug 15</div>
        <div className="bg-blue-500 rounded-full aspect-square flex items-center justify-center text-white text-[9px] w-6 font-bold">
          NB
        </div>
      </div>
    </div>
  );
}

function StatusPicker(props: { id: string }) {
  const issue = useIssue(props.id);

  let valueIcon = null;

  if (issue.status === "todo") {
    valueIcon = <CircleIcon />;
  } else if (issue.status === "in-progress") {
    valueIcon = <Half2Icon />;
  } else if (issue.status === "completed") {
    valueIcon = <CheckCircledIcon />;
  }

  return (
    <Select
      aria-label="Status"
      valueIcon={valueIcon}
      value={issue.status}
      onValueChange={(value) => {
        invariant(
          value === "todo" || value === "in-progress" || value === "completed",
        );
        dispatch(
          setStatus({
            id: issue.id,
            status: value,
          }),
        );
      }}
    >
      <SelectItem value="todo">Todo</SelectItem>
      <SelectItem value="in-progress">In Progress</SelectItem>
      <SelectItem value="completed">Completed</SelectItem>
    </Select>
  );
}

function PriorityPicker(props: { id: string }) {
  const issue = useIssue(props.id);
  let valueIcon = null;

  if (issue.priority === "low") {
    valueIcon = <SignalLow />;
  } else if (issue.priority === "medium") {
    valueIcon = <SignalMedium />;
  } else if (issue.priority === "high") {
    valueIcon = <SignalHigh />;
  }

  return (
    <Select
      aria-label="Priority"
      valueIcon={valueIcon}
      value={issue.priority}
      onValueChange={(value) => {
        invariant(value === "low" || value === "medium" || value === "high");
        dispatch(
          setPriority({
            id: issue.id,
            priority: value,
          }),
        );
      }}
    >
      <SelectItem value="low">Low</SelectItem>
      <SelectItem value="medium">Medium</SelectItem>
      <SelectItem value="high">High</SelectItem>
    </Select>
  );
}

function FavoriteToggle(props: { id: string }) {
  const { id } = props;
  const favoriteIds = useFavorites();
  const isFavorited = favoriteIds.has(id);

  return (
    <Toggle.Root
      pressed={isFavorited}
      onPressedChange={(value) => {
        dispatch(
          setFavorite({
            id,
            isFavorite: value,
          }),
        );
      }}
      aria-label="Toggle favorite"
      className={`hover:bg-gray-100 ${
        isFavorited ? "" : "hover:text-gray-700"
      } ${
        isFavorited ? "text-yellow-500" : "text-gray-400"
      } data-[state=on]:bg-violet6 data-[state=on]:text-violet12 shadow-blackA4 flex h-6 aspect-square items-center justify-center rounded bg-white text-base`}
    >
      {isFavorited ? <StarFilledIcon /> : <StarIcon />}
    </Toggle.Root>
  );
}

function CreateDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={isCreating}
          onClick={() => {
            setIsOpen(true);
          }}
        >
          <span aria-hidden="true">
            <PlusIcon />
          </span>
          New issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="flex flex-col">
          <div className="p-4">
            <Title>New Issue</Title>
          </div>
          <form
            className=""
            onSubmit={async (evt) => {
              evt.preventDefault();
              const formData = new FormData(evt.target as HTMLFormElement);
              const title = formData.get("title");

              if (typeof title === "string") {
                setIsCreating(true);
                const issue: Issue = await fetch("/api/createIssue", {
                  method: "POST",
                  body: JSON.stringify({ title }),
                }).then((resp) => resp.json());

                dispatch(
                  createIssue({
                    issue,
                  }),
                );

                setIsOpen(false);
                setIsCreating(false);
              }
            }}
          >
            <div className="flex gap-4 px-4 py-2">
              <label htmlFor="new-issue-title" className="sr-only">
                Title
              </label>
              <input
                id="new-issue-title"
                name="title"
                className="w-full text-lg font-medium outline-none rounded"
                placeholder="Issue title"
                autoFocus
                ref={(el) => {
                  if (el) {
                    el.focus();
                  }
                }}
              />
            </div>
            <hr className="mt-4" />
            <div className="px-4 py-3 flex justify-end">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating issue..." : "Create issue"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
