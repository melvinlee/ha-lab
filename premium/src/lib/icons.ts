import {
  Lamp, LampCeiling, Blinds, CircleDot, Bot, Thermometer, BedDouble, Monitor, Sofa, Sunrise, Film, Plane, Moon,
  Sun, Cloud, CloudFog, CloudRain, CloudDrizzle, CloudLightning, CloudSnow, CloudSun, Wind, MoonStar, CloudHail,
  Lightbulb, ToggleRight, Activity, Workflow, Zap, Bath, type LucideIcon,
} from "lucide-react";
import type { RoomControl, Room, SceneDef } from "../config";

export const controlIcon: Record<RoomControl["icon"], LucideIcon> = {
  ceiling: LampCeiling, strip: Lightbulb, curtain: Blinds, lamp: Lamp, ring: CircleDot, vacuum: Bot, climate: Thermometer,
};
export const roomIcon: Record<Room["icon"], LucideIcon> = { bed: BedDouble, desk: Monitor, sofa: Sofa, bath: Bath };
export const sceneIcon: Record<SceneDef["icon"], LucideIcon> = { sunrise: Sunrise, film: Film, plane: Plane, moon: Moon };

export const weatherIcon = (state?: string): LucideIcon =>
  ({
    "clear-night": MoonStar, sunny: Sun, cloudy: Cloud, fog: CloudFog, rainy: CloudRain, pouring: CloudRain,
    lightning: CloudLightning, "lightning-rainy": CloudLightning, snowy: CloudSnow, "snowy-rainy": CloudSnow,
    partlycloudy: CloudSun, windy: Wind, "windy-variant": Wind, hail: CloudHail, exceptional: CloudDrizzle,
  } as Record<string, LucideIcon>)[state ?? ""] ?? Cloud;

export const domainIcon = (entityId: string): LucideIcon => {
  const d = entityId.split(".")[0];
  return ({ light: Lightbulb, switch: ToggleRight, binary_sensor: Activity, automation: Workflow, vacuum: Bot, sensor: Zap, scene: Sunrise } as Record<string, LucideIcon>)[d] ?? Activity;
};
