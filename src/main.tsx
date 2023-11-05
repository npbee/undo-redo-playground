import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";
import { hydrateIssues } from "./state.ts";

async function deferRender() {
  const { worker } = await import("./backend/worker");

  // `worker.start()` returns a Promise that resolves
  // once the Service Worker is up and ready to intercept requests.
  await worker.start({
    quiet: true,
  });

  const issues = await fetch("issues").then((resp) => resp.json());

  hydrateIssues(issues);
}

deferRender().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
