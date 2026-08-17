export interface User {
  /** Keycloak subject (`sub` claim) */
  id: string;
  email?: string;
  name?: string;
  roles?: string[];
}

export interface Session {
  id: number;
  /** Keycloak subject (`sub` claim) of the owning user */
  userId: string;
  name: string;
  accountBalance: number;
  currency: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Pair {
  id: number;
  pair: string;
}

export interface Trade {
  id: number;
  sessionId: number;
  pairId: number;
  entry: number;
  tp: number;
  sl: number;
  entryDate: string;
  exitDate: string;
  direction: 'long' | 'short';
  risk: number;
  fee: number;
  profit: number;
  result: 'W' | 'BE' | 'L';
  createdAt?: string;
  updatedAt?: string;
}

export interface TradePicture {
  id: number;
  tradeId: number;
  pictureUrl: string;
}

export interface BalanceHistoryPoint {
  tradeId: number | null;
  date: string | null;
  balance: number;
  profit: number;
  percent: number;
  changePercent: number;
  result: 'W' | 'BE' | 'L' | null;
}

export interface SessionMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winrate: number;
  averageRiskReward: number;
}

export interface SessionTradesResponse {
  trades: Trade[];
  metrics: SessionMetrics;
  startingBalance: number;
  balanceHistory: BalanceHistoryPoint[];
}

