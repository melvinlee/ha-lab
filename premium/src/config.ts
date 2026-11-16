// Single place that maps HA entities to dashboard panels.
// Empty arrays are intentional: the panel renders a designed empty state until a device exists.

export type ControlKind = "light" | "switch" | "vacuum" | "climate";

export interface RoomControl {
  entity: string;
  name: string;
  kind: ControlKind;
  icon: "ceiling" | "strip" | "curtain" | "lamp" | "ring" | "vacuum" | "climate";
}

export interface Room {
  id: string;
  name: string;
  icon: "bed" | "desk" | "sofa";
  controls: RoomControl[];
  /** Room climate sensors (temperature/humidity). Not the drybox. */
  climate: { temperature?: string; humidity?: string; thermostat?: string };
  motion?: string;
}

export const ROOMS: Room[] = [
  {
    id: "master_bedroom",
    name: "Master Bedroom",
    icon: "bed",
    motion: "binary_sensor.aqara_motion_sensor_p1_occupancy",
    climate: {},
    controls: [
      { entity: "switch.smart_wall_switch_z1_pro_top", name: "Main light", kind: "switch", icon: "ceiling" },
      { entity: "switch.smart_wall_switch_z1_pro_center", name: "LED Cove", kind: "switch", icon: "strip" },
      { entity: "switch.smart_wall_switch_z1_pro_bottom", name: "Night Curtain", kind: "switch", icon: "curtain" },
      { entity: "light.bedlamp", name: "Bedlamp", kind: "light", icon: "lamp" },
    ],
  },
  {
    id: "office",
    name: "Office",
    icon: "desk",
    climate: {},
    controls: [
      { entity: "light.aqara_ceiling_light_t1_white", name: "Ceiling light", kind: "light", icon: "ceiling" },
      { entity: "light.aqara_ceiling_light_t1_rgb", name: "Ambient ring", kind: "light", icon: "ring" },
    ],
  },
  {
    id: "living_room",
    name: "Living Room",
    icon: "sofa",
    climate: {},
    controls: [{ entity: "vacuum.living_room_qrevo_2_breeze", name: "Roborock", kind: "vacuum", icon: "vacuum" }],
  },
];

/** Power sensors (W) summed for "Power draw now". Only per-device meters exist today. */
export const POWER_SENSORS = ["sensor.smart_wall_switch_z1_pro_power"];
/** Energy sensors (kWh, total_increasing) summed for today/yesterday and the 24h chart. */
export const ENERGY_SENSORS = ["sensor.smart_wall_switch_z1_pro_energy"];
/** Solar production energy sensors (kWh). None yet. */
export const SOLAR_SENSORS: string[] = [];
export const TARIFF_SGD_PER_KWH = 0.3;
export const CURRENCY = "SGD";

export const WEATHER = "weather.home";

export interface SecurityItem { entity: string; name: string }
export const LOCKS: SecurityItem[] = [];
export const DOORS: SecurityItem[] = [];
export const CAMERAS: SecurityItem[] = [];

/** Entities shown in the "recent events" timeline. */
export const TIMELINE_ENTITIES = [
  ...ROOMS.flatMap((r) => r.controls.map((c) => c.entity)),
  "binary_sensor.aqara_motion_sensor_p1_occupancy",
  "automation.master_bedroom_motion_turns_on_main_light",
  "automation.master_bedroom_no_motion_5_min_turns_off_lights",
  "automation.master_bedroom_tradfri_button_toggles_led_cove",
  "automation.office_e1_switch_turns_on_ceiling_light",
];

export interface SceneDef { entity: string; name: string; icon: "sunrise" | "film" | "plane" | "moon"; hint: string }
export const SCENES: SceneDef[] = [
  { entity: "scene.good_morning", name: "Good morning", icon: "sunrise", hint: "Lights up, bedroom bright" },
  { entity: "scene.movie", name: "Movie", icon: "film", hint: "Cove + dim bedlamp" },
  { entity: "scene.away", name: "Away", icon: "plane", hint: "Everything off" },
  { entity: "scene.goodnight", name: "Goodnight", icon: "moon", hint: "All off, night curtain on" },
];

/** Domains considered "devices" for the devices-on KPI. */
export const DEVICE_ENTITIES = ROOMS.flatMap((r) => r.controls.filter((c) => c.kind !== "vacuum").map((c) => c.entity));
