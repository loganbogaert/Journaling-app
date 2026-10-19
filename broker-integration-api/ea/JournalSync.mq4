#property strict
#property version   "1.0"
#property description "Read-only trade journal sync for MetaTrader 4"

input string ApiBaseUrl = "http://localhost:8000/broker";
input string AccountApiKey = "";
input int PollSeconds = 30;

long g_lastDealId = -1;
datetime g_lastDealTime = 0;
bool g_ready = false;
string g_timeframes[];
int g_candleCount = 300;

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

bool JsonStringArray(const string json, const string name, string &values[])
{
   int pos = StringFind(json, "\"" + name + "\"");
   if(pos < 0) return false;
   pos = StringFind(json, "[", pos);
   if(pos < 0) return false;
   ArrayResize(values, 0);
   for(pos++; pos < StringLen(json); pos++)
   {
      ushort ch = StringGetCharacter(json, pos);
      if(ch == ']') return ArraySize(values) > 0;
      if(ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n' || ch == ',') continue;
      if(ch != '"') return false;
      int end = StringFind(json, "\"", pos + 1);
      if(end < 0) return false;
      int size = ArraySize(values);
      ArrayResize(values, size + 1);
      values[size] = StringSubstr(json, pos + 1, end - pos - 1);
      pos = end;
   }
   return false;
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
   string count = JsonValue(response, "candleCount");
   if(!JsonStringArray(response, "timeframes", g_timeframes)) return false;
   g_candleCount = (int)StringToInteger(count);
   if(g_candleCount < 50 || g_candleCount > 500) return false;
   g_lastDealId = id == "" ? -1 : StringToInteger(id);
   g_lastDealTime = time == "" ? 0 : (datetime)StringToInteger(time);
   return true;
}

int TimeframeFromName(const string name)
{
   if(name == "M1") return PERIOD_M1;
   if(name == "M5") return PERIOD_M5;
   if(name == "M15") return PERIOD_M15;
   if(name == "M30") return PERIOD_M30;
   if(name == "H1") return PERIOD_H1;
   if(name == "H4") return PERIOD_H4;
   return PERIOD_D1;
}

bool AppendCandlesForTimeframe(const string symbol, const string name, const datetime exitTime, string &payload)
{
   int period = TimeframeFromName(name);
   int digits = (int)MarketInfo(symbol, MODE_DIGITS);
   int lastShift = iBarShift(symbol, period, exitTime, false);
   if(lastShift < 0) return false;
   int count = (int)MathMin(g_candleCount, iBars(symbol, period) - lastShift);
   if(count <= 0) return false;

   int offset = (int)(TimeCurrent() - TimeGMT());
   payload += "\"" + name + "\":[";
   int written = 0;
   for(int shift = lastShift + count - 1; shift >= lastShift; shift--)
   {
      datetime time = iTime(symbol, period, shift);
      if(time <= 0) continue;
      if(written > 0) payload += ",";
      payload += "{\"time\":" + IntegerToString((int)(time - offset));
      payload += ",\"open\":" + DoubleToString(iOpen(symbol, period, shift), digits);
      payload += ",\"high\":" + DoubleToString(iHigh(symbol, period, shift), digits);
      payload += ",\"low\":" + DoubleToString(iLow(symbol, period, shift), digits);
      payload += ",\"close\":" + DoubleToString(iClose(symbol, period, shift), digits);
      payload += ",\"volume\":" + IntegerToString((int)iVolume(symbol, period, shift)) + "}";
      written++;
   }
   payload += "]";
   return written > 0;
}

bool AppendConfiguredCandles(const string symbol, const datetime exitTime, string &payload)
{
   payload += ",\"candles\":{";
   for(int index = 0; index < ArraySize(g_timeframes); index++)
   {
      if(index > 0) payload += ",";
      if(!AppendCandlesForTimeframe(symbol, g_timeframes[index], exitTime, payload))
      {
         Print("JournalSync candle history unavailable for ", symbol, " ", g_timeframes[index]);
         return false;
      }
   }
   payload += "}";
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
   payload += "\"result\":\"" + result + "\"";
   if(!AppendConfiguredCandles(symbol, exitTime, payload)) return false;
   payload += "}";

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
   g_ready = FetchCursor();
   if(g_ready) SyncHistory();
}
