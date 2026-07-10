import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface GameActionsMenuProps {
  gameId: number;
  groupId: number;
  /** @deprecated Use groupId */
  platformId?: number;
  gameTitle: string;
}

export function GameActionsMenu({
  gameId,
  groupId,
  platformId,
  gameTitle,
}: GameActionsMenuProps) {
  const resolvedGroupId = groupId ?? platformId!;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
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

  useEffect(() => {
    if (!confirmOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen]);

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteItem(gameId),
    onSuccess: () => {
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(`/groups/${resolvedGroupId}`);
    },
  });

  function openDeleteConfirm() {
    setOpen(false);
    setConfirmOpen(true);
  }

  const confirmDialog = confirmOpen
    ? createPortal(
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => !deleteMutation.isPending && setConfirmOpen(false)}
        >
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-game-title"
            aria-describedby="delete-game-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="delete-game-title">{t("actions.deleteGame")}</h3>
            <p id="delete-game-desc">
              {t("actions.deleteGameBody", { title: gameTitle })}
            </p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={deleteMutation.isPending}
                onClick={() => setConfirmOpen(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn-danger with-icon"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                <LuTrash2 aria-hidden />
                {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
              </button>
            </div>
            {deleteMutation.isError && (
              <p className="error">{(deleteMutation.error as Error).message}</p>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className="action-menu" ref={menuRef}>
        <button
          type="button"
          className="btn-secondary action-menu-trigger icon-only"
          aria-label={t("actions.edit")}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
        >
          <LuPencil aria-hidden />
        </button>
        {open && (
          <div
            className="action-menu-dropdown"
            role="menu"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className="action-menu-item"
              onClick={() => {
                setOpen(false);
                navigate(`/items/${gameId}/edit`);
              }}
            >
              <LuPencil aria-hidden />
              {t("actions.editGame")}
            </button>
            <button
              type="button"
              role="menuitem"
              className="action-menu-item danger"
              onClick={openDeleteConfirm}
            >
              <LuTrash2 aria-hidden />
              {t("common.delete")}
            </button>
          </div>
        )}
      </div>
      {confirmDialog}
    </>
  );
}
