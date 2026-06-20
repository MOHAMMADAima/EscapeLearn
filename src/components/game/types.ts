export type LeverItem = { id: number; label: string; correct_order: number };
export type CircuitConnection = { left: string; right: string };
export type SafeClue = { object: string; icon: string; reveals: string };
export type MapZone = { id: string; label: string; correct_item: string };

export type GameData =
  | { mechanic: "levers"; items: LeverItem[] }
  | { mechanic: "circuit"; connections: CircuitConnection[] }
  | { mechanic: "safe"; clues: SafeClue[]; code: string }
  | { mechanic: "map"; zones: MapZone[]; items: string[] };

export type Mechanic = GameData["mechanic"];

export interface MechanicHandle {
  revealHint: () => void;
}

export interface MechanicProps<T extends GameData = GameData> {
  data: T;
  onSolve: () => void;
  onWrong?: () => void;
  disabled?: boolean;
}
