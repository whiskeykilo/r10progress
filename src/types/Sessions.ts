import { GolfSwingData } from "./GolfSwingData";

export type Session = {
  results: GolfSwingData[];
  selected: boolean;
  date: string;
  displayName?: string;
  tags?: string[];
  notes?: string;
};
export type Sessions = {
  [key: string]: Session;
};
