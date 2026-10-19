export interface User {
  /** Keycloak subject (`sub` claim) */
  id: string;
  email?: string;
  name?: string;
  roles?: string[];
}

export type AccountType = 'manual' | 'connected';

export interface Account {
  id: number;
  /** Keycloak subject (`sub` claim) of the owning user */
  userId: string;
  type: AccountType;
  name: string;
  accountBalance: number;
  currency: string;
  startDate?: string | null;
  endDate?: string | null;
  platform?: 'mt4' | 'mt5' | null;
  brokerServer?: string | null;
  brokerLogin?: string | null;
  syncStatus?: 'pending' | 'active' | 'error' | 'disabled' | null;
  lastSyncedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountInput {
  type?: AccountType;
  name: string;
  accountBalance: number;
  currency: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface Pair {
  id: number;
  pair: string;
}

export interface Trade {
  id: number;
  accountId: number;
  source: 'manual' | 'sync';
  externalDealId?: string | null;
  pairId: number;
  entry: number;
  /** Always set on manual trades; may be null on synced trades */
  tp: number | null;
  sl: number | null;
  entryDate: string;
  exitDate: string;
  direction: 'long' | 'short';
  risk: number | null;
  fee: number;
  profit: number;
  result: 'W' | 'BE' | 'L';
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TradeInput {
  accountId: number;
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
  notes: string | null;
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

export interface AccountMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winrate: number;
  averageRiskReward: number;
}

export interface AccountTradesResponse {
  trades: Trade[];
  metrics: AccountMetrics;
  startingBalance: number;
  balanceHistory: BalanceHistoryPoint[];
}

