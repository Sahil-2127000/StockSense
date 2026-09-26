import { useState } from "react";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Stock from "./pages/Stock";
import "./styles/theme.css";

// This is a placeholder router just to preview all of "your" screens together.
// Swap it for react-router-dom (or whatever the team lead picks) once you
// merge with your teammate's screens.
export default function App() {
  const [view, setView] = useState("login");

  const nav = (next) => {
    // Sidebar items that don't map to a screen you own yet just log for now —
    // your teammate's routes will replace this.
    const yours = ["dashboard", "products", "stock"];
    if (yours.includes(next) || ["login", "signup", "reset"].includes(next)) {
      setView(next);
    } else {
      console.log(`Navigate to "${next}" — not built yet in this half of the app`);
    }
  };

  switch (view) {
    case "login":
      return <Login onLogin={async () => setView("dashboard")} onGoSignup={() => setView("signup")} onGoReset={() => setView("reset")} />;
    case "signup":
      return <Signup onSignup={async () => setView("dashboard")} onGoLogin={() => setView("login")} />;
    case "reset":
      return <ResetPassword onComplete={async () => setView("dashboard")} onGoLogin={() => setView("login")} />;
    case "dashboard":
      return <Dashboard onNavigate={nav} />;
    case "products":
      return <Products onNavigate={nav} />;
    case "stock":
      return <Stock onNavigate={nav} />;
    default:
      return <Dashboard onNavigate={nav} />;
  }
}
