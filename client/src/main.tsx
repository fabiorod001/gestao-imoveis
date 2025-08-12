import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure DOM is loaded before mounting React
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById("root");
    if (rootElement) {
      createRoot(rootElement).render(<App />);
    }
  });
} else {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    createRoot(rootElement).render(<App />);
  }
}
