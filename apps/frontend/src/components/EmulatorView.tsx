import { useMemo } from "react";

interface EmulatorViewProps {
  gameId: number;
  core: string;
  patchId?: number;
}

export function EmulatorView({ gameId, core, patchId }: EmulatorViewProps) {
  const src = useMemo(() => {
    const params = new URLSearchParams({
      gameId: String(gameId),
      core,
    });
    if (patchId) params.set("patchId", String(patchId));
    return `/emulator/player.html?${params}`;
  }, [gameId, core, patchId]);

  return (
    <iframe
      key={src}
      className="emulator-container"
      src={src}
      title="Емулятор"
      allowFullScreen
      style={{ border: "none" }}
    />
  );
}
