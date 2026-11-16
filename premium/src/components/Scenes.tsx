import { useState } from "react";
import { Check } from "lucide-react";
import { useHass, isUnavailable } from "../ha/store";
import { SCENES } from "../config";
import { sceneIcon } from "../lib/icons";
import { Skeleton } from "./ui";

export function Scenes() {
  const { entities, get, call } = useHass();
  const [fired, setFired] = useState<string | null>(null);

  if (!entities) return <div className="scenes">{SCENES.map((s) => <Skeleton key={s.entity} h={56} style={{ borderRadius: 12 }} />)}</div>;

  return (
    <div className="scenes" role="group" aria-label="Scenes">
      {SCENES.map((s) => {
        const e = get(s.entity);
        const missing = !e;
        const Icon = sceneIcon[s.icon];
        const isFired = fired === s.entity;
        return (
          <button
            key={s.entity}
            className={`scene${isFired ? " fired" : ""}`}
            disabled={missing || isUnavailable(e)}
            onClick={() => {
              setFired(s.entity);
              setTimeout(() => setFired((f) => (f === s.entity ? null : f)), 1500);
              call("scene", "turn_on", { entity_id: s.entity });
            }}
          >
            <span className="scene-ic">{isFired ? <Check size={16} aria-hidden /> : <Icon size={16} aria-hidden />}</span>
            <span>
              <div className="scene-name">{s.name}</div>
              <div className="scene-sub">{missing ? "Not set up" : isFired ? "Activated" : s.hint}</div>
            </span>
          </button>
        );
      })}
    </div>
  );
}
