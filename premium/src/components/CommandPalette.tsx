import { useEffect, useMemo } from "react";
import { Command } from "cmdk";
import { Search, CornerDownLeft, ArrowUpDown } from "lucide-react";
import { useHass, isUnavailable } from "../ha/store";
import { domainIcon } from "../lib/icons";
import { Badge } from "./ui";

const ACTIONABLE: Record<string, { label: (s: string) => string; run: (s: string) => [string, string, string] }> = {
  light: { label: (s) => (s === "on" ? "Turn off" : "Turn on"), run: (s) => ["light", s === "on" ? "turn_off" : "turn_on", s === "on" ? "off" : "on"] },
  switch: { label: (s) => (s === "on" ? "Turn off" : "Turn on"), run: (s) => ["switch", s === "on" ? "turn_off" : "turn_on", s === "on" ? "off" : "on"] },
  automation: { label: (s) => (s === "on" ? "Disable" : "Enable"), run: (s) => ["automation", s === "on" ? "turn_off" : "turn_on", s === "on" ? "off" : "on"] },
  scene: { label: () => "Activate", run: (s) => ["scene", "turn_on", s] },
  script: { label: () => "Run", run: (s) => ["script", "turn_on", s] },
  button: { label: () => "Press", run: (s) => ["button", "press", s] },
  vacuum: { label: (s) => (s === "cleaning" ? "Return to dock" : "Start"), run: (s) => ["vacuum", s === "cleaning" ? "return_to_base" : "start", s === "cleaning" ? "returning" : "cleaning"] },
};
const GROUP_ORDER = ["scene", "light", "switch", "vacuum", "automation", "script", "button"];
const label = (d: string) => ({ scene: "Scenes", light: "Lights", switch: "Switches", vacuum: "Vacuums", automation: "Automations", script: "Scripts", button: "Buttons" } as Record<string, string>)[d] ?? "Other";

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { entities, get, call } = useHass();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(!open); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const groups = useMemo(() => {
    const g = new Map<string, string[]>();
    for (const id of Object.keys(entities ?? {})) {
      const d = id.split(".")[0];
      const key = ACTIONABLE[d] ? d : "other";
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(id);
    }
    return [...GROUP_ORDER, "other"].filter((d) => g.has(d)).map((d) => [d, g.get(d)!.sort()] as const);
  }, [entities]);

  return (
    <>
      {open && <div className="cmdk-overlay" onClick={() => setOpen(false)} />}
      <Command.Dialog open={open} onOpenChange={setOpen} label="Search and control entities" loop>
        <div className="cmdk-input-wrap"><Search size={18} aria-hidden /><Command.Input placeholder="Search entities, scenes, automations…" autoFocus /></div>
        <Command.List>
          <Command.Empty>No matching entities.</Command.Empty>
          {groups.map(([d, ids]) => (
            <Command.Group key={d} heading={label(d)}>
              {ids.map((id) => {
                const e = get(id)!;
                const name = (e.attributes.friendly_name as string | undefined) ?? id;
                const act = ACTIONABLE[d];
                const I = domainIcon(id);
                const unavailable = isUnavailable(e);
                return (
                  <Command.Item
                    key={id}
                    value={`${name} ${id}`}
                    disabled={!act || unavailable}
                    onSelect={() => {
                      if (!act) return;
                      const [domain, service, optimistic] = act.run(e.state);
                      const opt = d === "scene" || d === "script" || d === "button" ? undefined : { entity: id, state: optimistic };
                      call(domain, service, { entity_id: id }, opt);
                      setOpen(false);
                    }}
                  >
                    <I size={16} aria-hidden />
                    <span className="grow">{name}<div className="eid">{id}</div></span>
                    {unavailable ? <Badge tone="muted" label="Unavailable" /> : act ? <Badge tone="accent" label={act.label(e.state)} /> : <span className="num muted" style={{ fontSize: 12 }}>{e.state}{e.attributes.unit_of_measurement ? ` ${e.attributes.unit_of_measurement}` : ""}</span>}
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
        </Command.List>
        <div className="cmdk-foot">
          <span><ArrowUpDown size={12} aria-hidden /> Navigate</span>
          <span><CornerDownLeft size={12} aria-hidden /> Run action</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </Command.Dialog>
    </>
  );
}
