import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import { ThemeProvider } from "./components/theme-provider.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { Toaster } from "./components/ui/sonner.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <App />
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);