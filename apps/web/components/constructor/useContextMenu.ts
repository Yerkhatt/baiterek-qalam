"use client";

import { useState } from "react";

export interface ContextMenuState {
  screenX: number;
  screenY: number;
  canvasX: number;
  canvasY: number;
}

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  function openMenu(screenX: number, screenY: number, canvasX: number, canvasY: number) {
    setMenu({ screenX, screenY, canvasX, canvasY });
  }

  function closeMenu() {
    setMenu(null);
  }

  return { menu, openMenu, closeMenu };
}
