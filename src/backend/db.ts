import type { Issue, Priority } from "../types";

const issue1: Issue = {
  id: crypto.randomUUID(),
  title: "Build the app",
  status: "todo",
  priority: "low",
  publicId: "UND-1",
  isArchived: false,
};

const issues = new Map<string, Issue>([[issue1.id, issue1]]);

const favorites = new Set<string>();

export function getIssues() {
  return Array.from(issues.values());
}

export function getIssue(id: string) {
  return issues.get(id) ?? null;
}

export function updateIssue(id: string, props: Partial<Issue>): Issue | null {
  const issue = issues.get(id);
  if (issue) {
    const updated = Object.assign({}, issue, props);
    issues.set(id, updated);
    return updated;
  }

  return null;
}

export function createIssue(title: string) {
  const id = crypto.randomUUID();
  const publicId = `UND-${issues.size + 1}`;
  const issue: Issue = {
    id,
    publicId,
    title,
    priority: "low",
    status: "todo",
    isArchived: false,
  };
  issues.set(issue.id, issue);
  return issue;
}

export function setFavorite(id: string, isFavorite: boolean) {
  if (isFavorite) {
    favorites.add(id);
  } else {
    favorites.delete(id);
  }
}
