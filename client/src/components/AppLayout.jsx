import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout({ active, onNavigate, children }) {
  return (
    <div className="app">
      <Sidebar active={active} onNavigate={onNavigate} />
      <div className="main">
        <Topbar />
        <main className="view">{children}</main>
      </div>
    </div>
  );
}
