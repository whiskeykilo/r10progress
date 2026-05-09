import { GolfSwingData } from "./GolfSwingData";

export type SessionEnvironment = "indoor" | "outdoor" | "unknown";

export type Session = {
  results: GolfSwingData[];
  selected: boolean;
  date: string;
  displayName?: string;
  tags?: string[];
  notes?: string;
  environment?: SessionEnvironment;
};
export type Sessions = {
  [key: string]: Session;
};
