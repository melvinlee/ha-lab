// Single place that maps HA entities to dashboard panels.
// Empty arrays are intentional: the panel renders a designed empty state until a device exists.

export type ControlKind = "light" | "switch" | "vacuum" | "climate" | "curtain";

export interface RoomControl {
  entity: string;
  name: string;
  kind: ControlKind;
  icon: "ceiling" | "strip" | "curtain" | "lamp" | "ring" | "vacuum" | "climate";
  /** curtain on a relay: which relay state means "open". */
  openState?: "on" | "off";
}

export interface Room {
  id: string;
  name: string;
  icon: "bed" | "desk" | "sofa" | "bath";
  controls: RoomControl[];
  /** Room climate sensors (temperature/humidity). Not the drybox. */
  climate: { temperature?: string; humidity?: string; thermostat?: string };
  motion?: string;
  /** One-tap routines (HA button entities, e.g. Roborock app scenes). */
  routines?: { entity: string; name: string; icon: "sofa" | "door" | "utensils" | "mop" | "briefcase" | "sunset" }[];
  /** Heading for the routines block (default "Routines"). */
  routinesTitle?: string;
  /** Drybox (enclosure) climate shown inside the room card. Not counted as room climate. */
  drybox?: { humidity: string; temperature?: string; battery?: string; goodMax: number; watchMax: number };
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
      // Curtain on the Z1 Pro bottom relay: relay ON = curtain OPEN, OFF = closed.
      { entity: "switch.smart_wall_switch_z1_pro_bottom", name: "Night Curtain", kind: "curtain", icon: "curtain", openState: "on" },
      { entity: "light.bedlamp", name: "Bedlamp", kind: "light", icon: "lamp" },
    ],
  },
  {
    id: "office",
    name: "Office",
    icon: "desk",
    climate: {},
    // Office-only scenes: ceiling light colour temperature (brightness and ring untouched)
    routinesTitle: "Lighting",
    routines: [
      { entity: "scene.office_hour", name: "Office hour", icon: "briefcase" },
      { entity: "scene.after_office", name: "After office", icon: "sunset" },
    ],
    drybox: {
      humidity: "sensor.aqara_sensor_humidity",
      temperature: "sensor.aqara_sensor_temperature",
      battery: "sensor.aqara_sensor_battery",
      goodMax: 40, // <= 40% RH good
      watchMax: 50, // 40–50% watch, > 50% replace/recharge desiccant
    },
    controls: [
      { entity: "light.aqara_ceiling_light_t1_white", name: "Ceiling light", kind: "light", icon: "ceiling" },
      { entity: "light.aqara_ceiling_light_t1_rgb", name: "Ambient ring", kind: "light", icon: "ring" },
    ],
  },
  {
    id: "bathroom",
    name: "Bathroom",
    icon: "bath",
    motion: "binary_sensor.bathroom_motion_sensor_p1_occupancy",
    climate: {},
    // Bathroom Switch D1 (QBKG26LM): left = LED Cove, center = Main Light, right = decoupled (no load control)
    controls: [
      { entity: "switch.bathroom_switch_d1_center", name: "Main Light", kind: "switch", icon: "ceiling" },
      { entity: "switch.bathroom_switch_d1_left", name: "LED Cove", kind: "switch", icon: "strip" },
    ],
  },
  {
    id: "living_room",
    name: "Living Room",
    icon: "sofa",
    climate: {},
    controls: [{ entity: "vacuum.living_room_qrevo_2_breeze", name: "Roborock", kind: "vacuum", icon: "vacuum" }],
    // Roborock app routines, exposed by the roborock integration as buttons
    routines: [
      { entity: "button.living_room_qrevo_2_breeze_living_room_cleaning", name: "Living room clean", icon: "sofa" },
      { entity: "button.living_room_qrevo_2_breeze_room_cleaning", name: "Room cleaning", icon: "door" },
      { entity: "button.living_room_qrevo_2_breeze_after_meals", name: "After meals", icon: "utensils" },
      { entity: "button.living_room_qrevo_2_breeze_vac_followed_by_mop", name: "Vac then mop", icon: "mop" },
    ],
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
  "automation.office_switch_lighting_scene_by_time",
  "binary_sensor.bathroom_motion_sensor_p1_occupancy",
  "automation.bathroom_motion_turns_on_lights",
  "automation.bathroom_no_motion_15_min_turns_off_lights",
  "scene.office_hour",
  "scene.after_office",
];

export interface SceneDef { entity: string; name: string; icon: "sunrise" | "film" | "plane" | "moon"; hint: string }
export const SCENES: SceneDef[] = [
  { entity: "scene.good_morning", name: "Good morning", icon: "sunrise", hint: "Lights up, curtain open" },
  { entity: "scene.movie", name: "Movie", icon: "film", hint: "Cove + dim bedlamp, curtain closed" },
  { entity: "scene.away", name: "Away", icon: "plane", hint: "All lights off" },
  { entity: "scene.goodnight", name: "Goodnight", icon: "moon", hint: "All off, curtain closed" },
];

/** Lights and switches counted in the devices-on KPI (curtains and vacuums excluded). */
export const DEVICE_ENTITIES = ROOMS.flatMap((r) => r.controls.filter((c) => c.kind === "light" || c.kind === "switch").map((c) => c.entity));

/** Bus arrivals: REST sensor in HA (ha-config/rest.yaml) holding the API response in attributes. */
export const BUS_SENSORS = ["sensor.ng_shuttle_arrivals", "sensor.yishun_mrt_shuttle_arrivals"];
