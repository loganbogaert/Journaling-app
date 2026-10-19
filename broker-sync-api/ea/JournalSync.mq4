#property strict
#property version   "1.0"
#property description "Read-only trade journal sync for MetaTrader 4"

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
   int offset = (int)(TimeCurrent() - TimeGMT());
   datetime utc = brokerTime - offset;
   string value = TimeToString(utc, TIME_DATE | TIME_SECONDS);
   StringReplace(value, ".", "-");
   StringReplace(value, " ", "T");
   return value + "Z";
}

bool FindNextClosedOrder(int &ticket, datetime &closeTime)
{
   bool found = false;
   closeTime = 0;
   ticket = -1;

   for(int index = 0; index < OrdersHistoryTotal(); index++)
   {
      if(!OrderSelect(index, SELECT_BY_POS, MODE_HISTORY)) continue;
      int type = OrderType();
      if(type != OP_BUY && type != OP_SELL) continue;
      datetime closed = OrderCloseTime();
      int currentTicket = OrderTicket();
      if(closed <= 0 || !IsAfterCursor(closed, currentTicket)) continue;
      if(!found || closed < closeTime || (closed == closeTime && currentTicket < ticket))
      {
         found = true;
         closeTime = closed;
         ticket = currentTicket;
      }
   }
   return found;
}

bool SendSelectedOrder()
{
   string symbol = OrderSymbol();
   int digits = (int)MarketInfo(symbol, MODE_DIGITS);
   double entry = OrderOpenPrice();
   double exitPrice = OrderClosePrice();
   double stopLoss = OrderStopLoss();
   double takeProfit = OrderTakeProfit();
   double volume = OrderLots();
   double profit = OrderProfit();
   double commission = OrderCommission();
   double swap = OrderSwap();
   datetime entryTime = OrderOpenTime();
   datetime exitTime = OrderCloseTime();
   int ticket = OrderTicket();
   string direction = OrderType() == OP_BUY ? "long" : "short";

   double tickSize = MarketInfo(symbol, MODE_TICKSIZE) * MarketInfo(symbol, MODE_POINT);
   double tickValue = MarketInfo(symbol, MODE_TICKVALUE);
   bool hasRisk = stopLoss > 0 && tickSize > 0 && tickValue > 0;
   double risk = hasRisk ? MathAbs(entry - stopLoss) * volume * tickValue / tickSize : 0;
   double netProfit = profit + commission + swap;
   string result = MathAbs(netProfit) < 0.005 ? "BE" : (netProfit > 0 ? "W" : "L");

   string payload = "{";
   payload += "\"externalDealId\":\"" + IntegerToString(ticket) + "\",";
   payload += "\"symbol\":\"" + EscapeJson(symbol) + "\",";
   payload += "\"entry\":" + DoubleToString(entry, digits) + ",";
   payload += "\"exit\":" + DoubleToString(exitPrice, digits) + ",";
   payload += "\"tp\":" + (takeProfit > 0 ? DoubleToString(takeProfit, digits) : "null") + ",";
   payload += "\"sl\":" + (stopLoss > 0 ? DoubleToString(stopLoss, digits) : "null") + ",";
   payload += "\"entryDate\":\"" + IsoTime(entryTime) + "\",";
   payload += "\"exitDate\":\"" + IsoTime(exitTime) + "\",";
   payload += "\"cursorTime\":" + IntegerToString((int)exitTime) + ",";
   payload += "\"direction\":\"" + direction + "\",";
   payload += "\"risk\":" + (hasRisk ? DoubleToString(risk, 2) : "null") + ",";
   payload += "\"fee\":" + DoubleToString(-(commission + swap), 2) + ",";
   payload += "\"profit\":" + DoubleToString(profit, 2) + ",";
   payload += "\"result\":\"" + result + "\"}";

   string response;
   int status = Request("POST", "/ingest", payload, response);
   if(status != 200 && status != 201)
   {
      Print("JournalSync order ", ticket, " not acknowledged (HTTP ", status, "): ", response);
      return false;
   }

   g_lastDealTime = exitTime;
   g_lastDealId = ticket;
   Print("JournalSync order ", ticket, " acknowledged.");
   return true;
}

void SyncHistory()
{
   if(!g_ready) return;
   for(int pass = 0; pass < OrdersHistoryTotal(); pass++)
   {
      int ticket;
      datetime closeTime;
      if(!FindNextClosedOrder(ticket, closeTime)) return;
      if(!OrderSelect(ticket, SELECT_BY_TICKET, MODE_HISTORY)) return;
      if(!SendSelectedOrder()) return;
   }
}

int OnInit()
{
   if(AccountApiKey == "")
   {
      Print("JournalSync: AccountApiKey is required.");
      return INIT_PARAMETERS_INCORRECT;
   }
   g_ready = FetchCursor();
   EventSetTimer((int)MathMax(5, PollSeconds));
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
