export interface Nation {
  id: string; name: string; time: string; status: string; alignment: string;
  diplomacy: { friendly: number; hostile: number; neutral: number };
  warStats: { wars: number; wins: number; losses: number };
}
export interface Person {
  id: string; name: string; aliases: string[]; nationId: string; role: string;
  status: string; motto: string; category: string;
}
export interface HistoryEvent {
  id: string; date: string; type: string; title: string; description: string; location: string; status: string; relatedNations: string[];
}
export interface Chronicle {
  id: string; date: string; title: string; description: string;
}
export interface War { id: string; name: string; }
export interface Building { id: string; name: string; }
