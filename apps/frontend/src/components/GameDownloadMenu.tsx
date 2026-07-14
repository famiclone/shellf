import { useEffect, useRef, useState } from "react";
import { LuDownload, LuJoystick, LuPackage } from "react-icons/lu";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface GameDownloadMenuProps {
  gameId: number;
  patchId?: number;
  hasRom: boolean;
  hasPack: boolean;
}

export function GameDownloadMenu({
  gameId,
  patchId,
  hasRom,
  hasPack,
}: GameDownloadMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  if (!hasRom && !hasPack) return null;

  return (
    <div className="action-menu" ref={menuRef}>
      <button
        type="button"
        className="btn-secondary action-menu-trigger icon-only"
        aria-label={t("common.download")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <LuDownload aria-hidden />
      </button>
      {open && (
        <div
          className="action-menu-dropdown"
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {hasRom && (
            <a
              role="menuitem"
              className="action-menu-item"
              href={api.getRomDownloadUrl(gameId, patchId)}
              onClick={() => setOpen(false)}
            >
              <LuJoystick aria-hidden />
              ROM
            </a>
          )}
          {hasPack && (
            <a
              role="menuitem"
              className="action-menu-item"
              href={api.getPackDownloadUrl(gameId)}
              onClick={() => setOpen(false)}
            >
              <LuPackage aria-hidden />
              Pack
            </a>
          )}
        </div>
      )}
    </div>
  );
}
