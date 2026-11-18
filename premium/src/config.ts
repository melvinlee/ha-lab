// Single place that maps HA entities to dashboard panels.
// Empty arrays are intentional: the panel renders a designed empty state until a device exists.

export type ControlKind = "light" | "switch" | "vacuum" | "climate" | "curtain" | "mode";

export interface RoomControl {
  entity: string;
  name: string;
  kind: ControlKind;
  icon: "ceiling" | "strip" | "curtain" | "lamp" | "ring" | "vacuum" | "climate" | "shower" | "fan" | "tv" | "washer" | "spot";
  /** mode: automation this switch pauses while on (shown as the status line). */
  pauses?: string;
  /** curtain on a relay: which relay state means "open". */
  openState?: "on" | "off";
}

export interface Room {
  id: string;
  name: string;
  icon: "bed" | "desk" | "sofa" | "bath" | "kitchen" | "dining" | "laundry";
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
  /** Read-only appliances (e.g. SmartThings washer/dryer): state, job, progress, finish time, power. */
  appliances?: Appliance[];
}

export interface Appliance {
  name: string;
  icon: "washer" | "dryer";
  machineState: string;
  jobState?: string;
  progress?: string;
  completionTime?: string;
  power?: string;
  /** Daily utility meter (kWh) on the machine's cumulative energy sensor. */
  energyToday?: string;
}

const samsung = (name: string, icon: Appliance["icon"], p: string): Appliance => ({
  name, icon, machineState: `${p}_machine_state`, jobState: `${p}_job_state`, progress: `${p}_progress`, completionTime: `${p}_completion_time`, power: `${p}_power`, energyToday: `${p}_energy_today`,
});

export const ROOMS: Room[] = [
  // Order on the dashboard: Living Room, Dining Room, Office, Bathroom, Kitchen, Master Bedroom, Laundry Room
  {
    id: "living_room",
    name: "Living Room",
    icon: "sofa",
    climate: {},
    controls: [
      { entity: "switch.living_room_switch_top", name: "Ceiling Fan", kind: "switch", icon: "fan" },
      { entity: "switch.living_room_switch_center", name: "LED Cove", kind: "switch", icon: "strip" },
      { entity: "switch.living_room_switch_bottom", name: "TV Light", kind: "switch", icon: "tv" },
      { entity: "light.tv_spotlights", name: "TV Spotlights", kind: "light", icon: "spot" },
      { entity: "light.sofa_spotlights", name: "Sofa Spotlights", kind: "light", icon: "spot" },
      { entity: "vacuum.living_room_qrevo_2_breeze", name: "Roborock", kind: "vacuum", icon: "vacuum" },
    ],
    // Roborock app routines, exposed by the roborock integration as buttons
    routines: [
      { entity: "button.living_room_qrevo_2_breeze_living_room_cleaning", name: "Living room clean", icon: "sofa" },
      { entity: "button.living_room_qrevo_2_breeze_room_cleaning", name: "Room cleaning", icon: "door" },
      { entity: "button.living_room_qrevo_2_breeze_after_meals", name: "After meals", icon: "utensils" },
      { entity: "button.living_room_qrevo_2_breeze_vac_followed_by_mop", name: "Vac then mop", icon: "mop" },
    ],
  },
  {
    id: "dining_room",
    name: "Dining Room",
    icon: "dining",
    climate: {},
    // Center rocker is the relay that powers the spotlights (decision A): the group is unavailable while it is off
    controls: [
      { entity: "light.dining_spotlights", name: "Dining Spotlights", kind: "light", icon: "spot" },
      { entity: "switch.dining_switch_top", name: "Walkway", kind: "switch", icon: "lamp" },
      { entity: "switch.dining_switch_center", name: "Spotlight", kind: "switch", icon: "spot" },
      { entity: "switch.dining_switch_bottom", name: "Dining Table", kind: "switch", icon: "ceiling" },
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
      // Right rocker (decoupled): ON pauses the 15-min no-motion auto-off; 2 h safety timeout
      { entity: "switch.bathroom_switch_d1_right", name: "Bath mode", kind: "mode", icon: "shower", pauses: "automation.bathroom_no_motion_15_min_turns_off_lights" },
    ],
  },
  {
    id: "kitchen",
    name: "Kitchen",
    icon: "kitchen",
    motion: "binary_sensor.kitchen_presence_sensor_presence",
    climate: {},
    // Switch 1 (Z1 Pro): top = Cabinet LED, center = Walkway, bottom = decoupled (toggles Main Light; its relay mirrors it for the LED).
    // Switch 2 (D1): left = Washing Machine, right = Main Light relay.
    controls: [
      { entity: "switch.kitchen_switch_2_right", name: "Main Light", kind: "switch", icon: "ceiling" },
      { entity: "switch.kitchen_switch_1_center", name: "Walkway", kind: "switch", icon: "lamp" },
      { entity: "switch.kitchen_switch_1_top", name: "Cabinet LED", kind: "switch", icon: "strip" },
      { entity: "switch.kitchen_switch_2_left", name: "Washing Machine", kind: "switch", icon: "washer" },
    ],
  },
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
    id: "laundry_room",
    name: "Laundry Room",
    icon: "laundry",
    climate: {},
    controls: [],
    // Samsung washer + dryer (SmartThings), read-only. Finish time shows only while running.
    appliances: [
      samsung("Washer", "washer", "sensor.laundry_room_washer"),
      samsung("Dryer", "dryer", "sensor.laundry_room_dryer"),
    ],
  },
];

/** Power sensors (W) summed for "Power draw now". Only per-device meters exist today. */
export const POWER_SENSORS = ["sensor.smart_wall_switch_z1_pro_power", "sensor.living_room_switch_power", "sensor.kitchen_switch_1_power", "sensor.kitchen_switch_2_power", "sensor.dining_switch_power"];
/** Energy sensors (kWh, total_increasing) summed for today/yesterday and the 24h chart. */
export const ENERGY_SENSORS = ["sensor.smart_wall_switch_z1_pro_energy", "sensor.living_room_switch_energy", "sensor.kitchen_switch_1_energy", "sensor.kitchen_switch_2_energy", "sensor.dining_switch_energy"];
/** Solar production energy sensors (kWh). None yet. */
export const SOLAR_SENSORS: string[] = [];
export const TARIFF_SGD_PER_KWH = 0.3;
export const CURRENCY = "SGD";

export const WEATHER = "weather.home";

export interface SecurityItem { entity: string; name: string }
export const LOCKS: SecurityItem[] = [];
export const DOORS: SecurityItem[] = [
  { entity: "binary_sensor.front_door_sensor_contact", name: "Front Door" },
];
export const CAMERAS: SecurityItem[] = [];

/** Entities shown in the "recent events" timeline. */
export const TIMELINE_ENTITIES = [
  ...ROOMS.flatMap((r) => r.controls.map((c) => c.entity)),
  "binary_sensor.aqara_motion_sensor_p1_occupancy",
  "binary_sensor.front_door_sensor_contact",
  "automation.living_room_front_door_opens_back_home",
  "automation.master_bedroom_motion_turns_on_main_light",
  "automation.master_bedroom_no_motion_5_min_turns_off_lights",
  "automation.master_bedroom_tradfri_button_toggles_led_cove",
  "automation.office_e1_switch_turns_on_ceiling_light",
  "automation.office_switch_lighting_scene_by_time",
  "binary_sensor.bathroom_motion_sensor_p1_occupancy",
  "automation.bathroom_motion_turns_on_lights",
  "automation.bathroom_no_motion_15_min_turns_off_lights",
  "switch.bathroom_switch_d1_right",
  "automation.bathroom_right_rocker_pauses_auto_off",
  "scene.office_hour",
  "scene.after_office",
];

export interface SceneDef { entity: string; name: string; icon: "sunrise" | "film" | "plane" | "moon"; hint: string }
export const SCENES: SceneDef[] = [
  { entity: "scene.good_morning", name: "Good morning", icon: "sunrise", hint: "Lights up, curtain open" },
  { entity: "scene.movie", name: "Movie", icon: "film", hint: "Cove + dim bedlamp, curtain closed" },
  { entity: "scene.away", name: "Away", icon: "plane", hint: "All lights off" },
  { entity: "scene.goodnight", name: "Goodnight", icon: "moon", hint: "Living, Dining, Kitchen, Office off" },
];

/** Lights and switches counted in the devices-on KPI (curtains and vacuums excluded). */
export const DEVICE_ENTITIES = ROOMS.flatMap((r) => r.controls.filter((c) => c.kind === "light" || c.kind === "switch").map((c) => c.entity));

/** Bus arrivals: REST sensor in HA (ha-config/rest.yaml) holding the API response in attributes. */
export const BUS_SENSORS = ["sensor.ng_shuttle_arrivals", "sensor.yishun_mrt_shuttle_arrivals"];
