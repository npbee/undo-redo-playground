import { useAppStore, useIssuesStore } from "./state";

export { useEffects } from "./commandr";

export function useIssuesIds() {
  return useIssuesStore((issues) =>
    Object.keys(issues).filter((id) => issues[id].isArchived === false),
  );
}

export function useIssue(id: string) {
  return useIssuesStore((issues) => issues[id]);
}

export function useStatus() {
  return useAppStore((app) => app.status);
}

export function useActiveIssue() {
  const activeId = useAppStore((app) => app.activeIssueId);
  return useIssuesStore((issues) => {
    if (activeId) {
      return issues[activeId];
    }
    return null;
  });
}

export function useFavorites() {
  return useAppStore((state) => state.favorites);
}
