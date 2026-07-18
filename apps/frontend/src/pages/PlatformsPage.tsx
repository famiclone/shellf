import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";

export function PlatformsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [kindId, setKindId] = useState<number | "">("");
  const [emulatorCore, setEmulatorCore] = useState("");
  const [formError, setFormError] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["groups"],
    queryFn: () => api.getGroups(),
  });

  const { data: kinds } = useQuery({
    queryKey: ["kinds"],
    queryFn: api.getKinds,
  });

  const createGroupMutation = useMutation({
    mutationFn: api.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowCreate(false);
      setName("");
      setKindId("");
      setEmulatorCore("");
      setFormError("");
    },
    onError: (err) => setFormError((err as Error).message),
  });

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setFormError(t("platforms.createErrorName"));
      return;
    }
    if (kindId === "") {
      setFormError(t("platforms.createErrorKind"));
      return;
    }
    setFormError("");
    try {
      await createGroupMutation.mutateAsync({
        name: name.trim(),
        kindId: Number(kindId),
        emulatorCore: emulatorCore.trim() || null,
      });
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  if (isLoading) return <p>{t("common.loading")}</p>;
  if (error) return <p className="error">{(error as Error).message}</p>;

  const groups = data ?? [];
  const kindById = new Map((kinds ?? []).map((k) => [k.id, k]));

  return (
    <div>
      <header className="page-header">
        <h1>{t("platforms.title")}</h1>
        <p>{t("platforms.subtitle")}</p>
      </header>

      <div className="actions" style={{ marginBottom: "1.25rem" }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? t("common.cancel") : t("platforms.create")}
        </button>
      </div>

      {showCreate && (
        <form className="card" style={{ maxWidth: 520, marginBottom: "1.5rem" }} onSubmit={handleCreate}>
          <div className="form-group">
            <label>{t("platforms.createName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("platforms.createNamePlaceholder")}
            />
          </div>
          <div className="form-group">
            <label>{t("platforms.createKind")}</label>
            <select
              value={kindId}
              onChange={(e) => setKindId(e.target.value ? Number(e.target.value) : "")}
              required
            >
              <option value="">{t("platforms.createKindRequired")}</option>
              {kinds?.map((kind) => (
                <option key={kind.id} value={kind.id}>
                  {kind.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t("platforms.createEmulatorCore")}</label>
            <input
              value={emulatorCore}
              onChange={(e) => setEmulatorCore(e.target.value)}
              placeholder="nes"
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={createGroupMutation.isPending}
          >
            {createGroupMutation.isPending
              ? t("common.saving")
              : t("platforms.createSubmit")}
          </button>
          {formError && <p className="error">{formError}</p>}
        </form>
      )}

      {!groups.length ? (
        <div className="empty-state">
          <p>{t("platforms.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {groups.map((group) => {
            const kind = group.kindId != null ? kindById.get(group.kindId) : null;
            return (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="platform-card"
              >
                <h3>{group.name}</h3>
                <div className="count">
                  {kind && <span className="badge">{kind.name}</span>}
                  {kind && " · "}
                  <span className="badge">{group.slug}</span>
                  {" · "}
                  {t("platforms.gameMany", { count: group.itemCount ?? 0 })}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
