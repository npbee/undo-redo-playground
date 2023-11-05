import { HttpResponse, http } from "msw";
import {
  createIssue,
  getIssue,
  getIssues,
  setFavorite,
  updateIssue,
} from "./db";
import invariant from "tiny-invariant";
import { applyPatches, enablePatches } from "immer";

enablePatches();

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const handlers = [
  http.get("/issues", () => {
    return HttpResponse.json(getIssues());
  }),

  http.post("/api/patchIssue", async ({ request }) => {
    const { id, patches } = await request.json();
    invariant(typeof id === "string");

    const currentIssue = getIssue(id);

    if (!currentIssue) {
      return new Response(null, {
        status: 404,
      });
    }

    const updatedIssue = updateIssue(id, applyPatches(currentIssue, patches));

    if (updatedIssue?.title === "BOOM") {
      return new Response(JSON.stringify(currentIssue), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // artificial delay
    await wait(1000);

    return new Response(JSON.stringify(updatedIssue), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),

  http.post("/api/createIssue", async ({ request }) => {
    const { title } = await request.json();
    invariant(typeof title === "string");

    const issue = createIssue(title);

    // artificial delay
    await wait(1000);

    return new Response(JSON.stringify(issue), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),

  http.post("/api/setIssueArchived", async ({ request }) => {
    const { id, isArchived } = await request.json();
    invariant(typeof id === "string");
    invariant(typeof isArchived === "boolean");

    const updatedIssue = updateIssue(id, {
      isArchived,
    });

    // artificial delay
    await wait(1000);

    return new Response(JSON.stringify(updatedIssue), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),

  http.post("/api/setIssuePriority", async ({ request }) => {
    const { id, priority } = await request.json();
    invariant(typeof id === "string");
    invariant(
      priority === "low" || priority === "medium" || priority === "high",
    );

    const updatedIssue = updateIssue(id, { priority });

    // artificial delay
    await wait(1000);

    return new Response(JSON.stringify(updatedIssue), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),

  http.post("/api/setFavorite", async ({ request }) => {
    const { id, isFavorite } = await request.json();
    invariant(typeof id === "string");
    invariant(typeof isFavorite === "boolean");

    setFavorite(id, isFavorite);

    // artificial delay
    await wait(1000);

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),
];
