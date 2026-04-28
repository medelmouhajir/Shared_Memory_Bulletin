import { Search } from "lucide-react";

export function CommandPalette() {
  return (
    <button className="command-palette" type="button">
      <Search size={16} aria-hidden />
      <span className="command-palette-label">Open command palette</span>
    </button>
  );
}
