#property strict
#property version   "1.0"
#property description "Read-only trade journal sync for MetaTrader 5"

input string ApiBaseUrl = "http://localhost:8000/broker";
input string AccountApiKey = "";
input int PollSeconds = 30;

long g_lastDealId = -1;
datetime g_lastDealTime = 0;
bool g_ready = false;

string FullUrl(const string path)
{
   string base = ApiBaseUrl;
   if(StringLen(base) > 0 && StringSubstr(base, StringLen(base) - 1, 1) == "/")
      base = StringSubstr(base, 0, StringLen(base) - 1);
   return base + path;
}

string EscapeJson(string value)
{
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   StringReplace(value, "\r", "\\r");
   StringReplace(value, "\n", "\\n");
   return value;
}

string JsonValue(const string json, const string name)
{
   int pos = StringFind(json, "\"" + name + "\"");
   if(pos < 0) return "";
   pos = StringFind(json, ":", pos);
   if(pos < 0) return "";
   pos++;
   while(pos < StringLen(json) && (StringGetCharacter(json, pos) == ' ' || StringGetCharacter(json, pos) == '\t')) pos++;
   if(pos >= StringLen(json) || StringSubstr(json, pos, 4) == "null") return "";
   if(StringGetCharacter(json, pos) == '"')
   {
      int end = StringFind(json, "\"", pos + 1);
      if(end < 0) return "";
      return StringSubstr(json, pos + 1, end - pos - 1);
   }
   int end = pos;
   while(end < StringLen(json) && StringGetCharacter(json, end) != ',' && StringGetCharacter(json, end) != '}') end++;
   return StringSubstr(json, pos, end - pos);
}

int Request(const string method, const string path, const string payload, string &response)
{
   char data[];
   ArrayResize(data, 0);
   if(method == "POST")
   {
      StringToCharArray(payload, data, 0, WHOLE_ARRAY, CP_UTF8);
      if(ArraySize(data) > 0) ArrayResize(data, ArraySize(data) - 1);
   }

   char result[];
   string resultHeaders;
   string headers = "X-Account-Key: " + AccountApiKey + "\r\nContent-Type: application/json\r\n";
   ResetLastError();
   int status = WebRequest(method, FullUrl(path), headers, 10000, data, result, resultHeaders);
   if(status < 0)
   {
      Print("JournalSync WebRequest failed: ", GetLastError());
      return status;
   }
   response = CharArrayToString(result, 0, -1, CP_UTF8);
   return status;
}

bool FetchCursor()
{
   string response;
   int status = Request("GET", "/cursor", "", response);
   if(status != 200)
   {
      Print("JournalSync cursor request returned HTTP ", status, ": ", response);
      return false;
   }
   string id = JsonValue(response, "lastDealId");
   string time = JsonValue(response, "lastDealTime");
   g_lastDealId = id == "" ? -1 : StringToInteger(id);
   g_lastDealTime = time == "" ? 0 : (datetime)StringToInteger(time);
   return true;
}

bool IsAfterCursor(const datetime dealTime, const long dealId)
{
   return dealTime > g_lastDealTime || (dealTime == g_lastDealTime && dealId > g_lastDealId);
}

string IsoTime(const datetime brokerTime)
{
   int offset = (int)(TimeTradeServer() - TimeGMT());
   datetime utc = brokerTime - offset;
   MqlDateTime parts;
   TimeToStruct(utc, parts);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ", parts.year, parts.mon, parts.day, parts.hour, parts.min, parts.sec);
}

bool ReadPositionEntry(const ulong positionId, double &entry, datetime &entryTime, string &direction, double &stopLoss, double &takeProfit, double &openedVolume, double &openingCommission)
{
   if(!HistorySelectByPosition(positionId)) return false;
   double weightedPrice = 0;
   double totalVolume = 0;
   openingCommission = 0;
   entryTime = 0;

   for(int index = 0; index < HistoryDealsTotal(); index++)
   {
      ulong ticket = HistoryDealGetTicket(index);
      if(ticket == 0) continue;
      long entryType = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entryType != DEAL_ENTRY_IN && entryType != DEAL_ENTRY_INOUT) continue;

      double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double price = HistoryDealGetDouble(ticket, DEAL_PRICE);
      weightedPrice += volume * price;
      totalVolume += volume;
      openingCommission += HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      datetime openedAt = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      if(entryTime == 0 || openedAt < entryTime) entryTime = openedAt;

      long type = HistoryDealGetInteger(ticket, DEAL_TYPE);
      direction = type == DEAL_TYPE_BUY ? "long" : "short";
      if(stopLoss == 0) stopLoss = HistoryDealGetDouble(ticket, DEAL_SL);
      if(takeProfit == 0) takeProfit = HistoryDealGetDouble(ticket, DEAL_TP);
   }

   if(totalVolume <= 0) return false;
   openedVolume = totalVolume;
   entry = weightedPrice / totalVolume;
   return true;
}

bool SendClosedDeal(const ulong ticket)
{
   string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
   ulong positionId = (ulong)HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
   double exitPrice = HistoryDealGetDouble(ticket, DEAL_PRICE);
   datetime exitTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
   double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
   double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
   double stopLoss = HistoryDealGetDouble(ticket, DEAL_SL);
   double takeProfit = HistoryDealGetDouble(ticket, DEAL_TP);
   double entry = 0;
   datetime entryTime = 0;
   double openedVolume = 0;
   double openingCommission = 0;
   string direction = "long";

   if(!ReadPositionEntry(positionId, entry, entryTime, direction, stopLoss, takeProfit, openedVolume, openingCommission))
   {
      Print("JournalSync could not resolve opening deal for ", ticket);
      return false;
   }
   if(openedVolume > 0) commission += openingCommission * volume / openedVolume;

   double risk = 0;
   double tickSize = 0;
   double tickValue = 0;
   bool hasRisk = stopLoss > 0 && SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE, tickSize)
      && SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE, tickValue) && tickSize > 0;
   if(hasRisk) risk = MathAbs(entry - stopLoss) * volume * tickValue / tickSize;

   double netProfit = profit + commission + swap;
   string result = MathAbs(netProfit) < 0.005 ? "BE" : (netProfit > 0 ? "W" : "L");
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   string tpJson = takeProfit > 0 ? DoubleToString(takeProfit, digits) : "null";
   string slJson = stopLoss > 0 ? DoubleToString(stopLoss, digits) : "null";
   string riskJson = hasRisk ? DoubleToString(risk, 2) : "null";
   string payload = "{";
   payload += "\"externalDealId\":\"" + (string)ticket + "\",";
   payload += "\"symbol\":\"" + EscapeJson(symbol) + "\",";
   payload += "\"entry\":" + DoubleToString(entry, digits) + ",";
   payload += "\"exit\":" + DoubleToString(exitPrice, digits) + ",";
   payload += "\"tp\":" + tpJson + ",\"sl\":" + slJson + ",";
   payload += "\"entryDate\":\"" + IsoTime(entryTime) + "\",";
   payload += "\"exitDate\":\"" + IsoTime(exitTime) + "\",";
   payload += "\"cursorTime\":" + IntegerToString((long)exitTime) + ",";
   payload += "\"direction\":\"" + direction + "\",";
   payload += "\"risk\":" + riskJson + ",";
   payload += "\"fee\":" + DoubleToString(-(commission + swap), 2) + ",";
   payload += "\"profit\":" + DoubleToString(profit, 2) + ",";
   payload += "\"result\":\"" + result + "\"}";

   string response;
   int status = Request("POST", "/ingest", payload, response);
   if(status != 200 && status != 201)
   {
      Print("JournalSync deal ", ticket, " not acknowledged (HTTP ", status, "): ", response);
      return false;
   }

   g_lastDealTime = exitTime;
   g_lastDealId = (long)ticket;
   Print("JournalSync deal ", ticket, " acknowledged.");
   return true;
}

void SyncHistory()
{
   if(!g_ready || !HistorySelect(0, TimeCurrent())) return;
   int total = HistoryDealsTotal();
   ulong closingDeals[];
   ArrayResize(closingDeals, 0);

   for(int index = 0; index < total; index++)
   {
      ulong ticket = HistoryDealGetTicket(index);
      if(ticket == 0) continue;
      long entryType = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entryType != DEAL_ENTRY_OUT && entryType != DEAL_ENTRY_OUT_BY) continue;
      int size = ArraySize(closingDeals);
      ArrayResize(closingDeals, size + 1);
      closingDeals[size] = ticket;
   }

   for(int index = 0; index < ArraySize(closingDeals); index++)
   {
      if(!HistorySelect(0, TimeCurrent())) break;
      ulong ticket = closingDeals[index];
      datetime closedAt = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      if(!IsAfterCursor(closedAt, (long)ticket)) continue;
      if(!SendClosedDeal(ticket)) break;
   }
}

int OnInit()
{
   if(AccountApiKey == "")
   {
      Print("JournalSync: AccountApiKey is required.");
      return INIT_PARAMETERS_INCORRECT;
   }
   EventSetTimer((int)MathMax(5, PollSeconds));
   g_ready = FetchCursor();
   if(g_ready) SyncHistory();
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   if(!g_ready) g_ready = FetchCursor();
   SyncHistory();
}

void OnTradeTransaction(const MqlTradeTransaction &transaction, const MqlTradeRequest &request, const MqlTradeResult &result)
{
   if(transaction.type == TRADE_TRANSACTION_DEAL_ADD) SyncHistory();
}
