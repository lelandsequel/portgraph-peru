export interface TradeAlert {
  id: string;
  type: 'entity_entry' | 'dominance_shift' | 'route_expansion';
  title: string;
  description: string;
  severity: 'medium' | 'high';
  confidence: number;
  timestamp: number;
  flowId: string;
  entities: string[];
}
