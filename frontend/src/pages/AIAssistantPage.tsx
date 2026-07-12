import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { aiAPI } from "../services/api";
import { 
  Send, 
  Trash2, 
  Sparkles, 
  Bot, 
  User, 
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Database,
  Bell
} from "lucide-react";

export default function AIAssistantPage() {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      setHistory(await aiAPI.history());
      setRecommendations(await aiAPI.recommendations());
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  async function handleSend(customMessage?: string) {
    const textToSend = customMessage || message;
    if (!textToSend.trim()) return;

    try {
      setLoading(true);
      if (!customMessage) {
        setMessage("");
      }

      await aiAPI.chat(textToSend);
      await load();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function clear() {
    try {
      setLoading(true);
      await aiAPI.clearHistory();
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const quickQuestions = [
    { text: "Which villages are currently at high risk?", label: "High Risk Villages", icon: AlertTriangle, color: "text-red-500 bg-red-50 border-red-200" },
    { text: "Show the current reservoir status.", label: "Reservoir Status", icon: Database, color: "text-blue-500 bg-blue-50 border-blue-200" },
    { text: "What is the rainfall prediction?", label: "Rainfall Prediction", icon: Sparkles, color: "text-amber-500 bg-amber-50 border-amber-200" },
    { text: "Give me water conservation tips.", label: "Water Saving Tips", icon: HelpCircle, color: "text-emerald-500 bg-emerald-50 border-emerald-200" }
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Platform Navigation Sidebar */}
      <Sidebar />

      {/* Main Container: Chat on Left, AI Insights Sidebar on Right */}
      <div className="flex-1 flex flex-row overflow-hidden">
        
        {/* LEFT CHAT THREAD PORTAL */}
        <div className="flex-1 flex flex-col h-full bg-white relative">
          
          {/* Top Panel Header */}
          <header className="border-b border-slate-200/80 px-8 py-6 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-30 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 shrink-0">
                <Bot className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-none">AI Assistant</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">Disaster Decision Support & LLM Engine</p>
              </div>
            </div>

            {/* Clear Conversation Controls */}
            <button
              onClick={clear}
              disabled={loading || history.length === 0}
              className="py-2.5 px-4.5 hover:bg-red-50 text-red-650 border border-transparent hover:border-red-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed outline-none"
            >
              <Trash2 className="w-4.5 h-4.5" />
              <span>Clear History</span>
            </button>
          </header>

          {/* Messages Scroll Panel */}
          <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 flex flex-col box-border">
            {history.length === 0 ? (
              <div className="my-auto text-center max-w-2xl mx-auto space-y-8 py-10 select-none">
                <div className="inline-flex w-20 h-20 rounded-full bg-sky-50 flex items-center justify-center text-sky-500 border border-sky-100 shadow-inner">
                  <Bot className="w-10 h-10" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-slate-850">How can I assist you today?</h3>
                  <p className="text-slate-500 text-base leading-relaxed">
                    Ask me questions about water shortage predictions, active dam telemetry, rainfall forecasting, or evacuate safety routing.
                  </p>
                </div>

                {/* Quick Starters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
                  {quickQuestions.map((q, idx) => {
                    const Icon = q.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSend(q.text)}
                        className="p-5 rounded-2xl border text-left flex items-start gap-4 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer outline-none bg-white border-slate-200/80"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${q.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-850 text-sm">{q.label}</h4>
                          <p className="text-xs text-slate-400 mt-1 font-semibold line-clamp-1">"{q.text}"</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-7 w-full max-w-3xl mx-auto">
                {history.map((h: any) => (
                  <div key={h.id} className="flex flex-col gap-4">
                    {/* User message block */}
                    <div className="flex flex-row items-start gap-3.5 self-end max-w-[80%]">
                      <div className="bg-sky-600 text-white rounded-2xl rounded-tr-none px-5 py-3.5 text-base md:text-lg shadow-sm font-semibold leading-relaxed">
                        {h.user_message}
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center border border-sky-200/30 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                    </div>

                    {/* AI assistant response block */}
                    <div className="flex flex-row items-start gap-3.5 self-start max-w-[85%]">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-650 flex items-center justify-center border border-slate-200 shrink-0 shadow-inner">
                        <Bot className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="bg-slate-50 text-slate-800 rounded-2xl rounded-tl-none border border-slate-200/60 px-5.5 py-4 text-base md:text-lg shadow-sm flex flex-col gap-2 leading-relaxed">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">AI Assistant</span>
                        <div className="whitespace-pre-wrap font-medium text-slate-700">{h.assistant_response}</div>
                        <span className="text-xs text-slate-400 font-bold self-end mt-2">
                          {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading state indicator */}
                {loading && (
                  <div className="flex flex-row items-start gap-3.5 self-start max-w-[85%] animate-pulse">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="bg-slate-50 text-slate-550 rounded-2xl rounded-tl-none border border-slate-200/60 px-5.5 py-4 text-base shadow-sm flex flex-row items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-slate-450 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-slate-450 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-slate-450 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                
                {/* Scroll Anchor */}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Docked Send Input Field */}
          <footer className="border-t border-slate-200 bg-white p-6 sticky bottom-0 z-30 shrink-0">
            <div className="flex gap-4 max-w-3xl mx-auto items-center bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 hover:border-slate-350 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/10 transition-all">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about water risk scores, live telemetry, weather forecast..."
                className="flex-1 bg-transparent border-none outline-none text-base md:text-lg text-slate-800 placeholder-slate-400 py-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSend();
                  }
                }}
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !message.trim()}
                className="w-10 h-10 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shrink-0 cursor-pointer outline-none border-none shadow-md shadow-sky-500/10"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </footer>
        </div>

        {/* RIGHT SIDEBAR: AI Recommendations Summary & Insights Panel (320px width) */}
        <div className="w-80 border-l border-slate-200/80 bg-slate-50/50 p-6 flex flex-col gap-6 overflow-y-auto shrink-0 select-none box-border">
          <div>
            <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-500 animate-pulse" />
              <span>Real-Time AI Insights</span>
            </h3>
            
            {recommendations ? (
              <div className="space-y-4">
                
                {/* Stats indicators */}
                <div className="bg-red-50 border border-red-200/50 p-4.5 rounded-2xl flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] text-red-550 font-extrabold uppercase tracking-wider">Critical Risk</h4>
                    <p className="text-2xl font-black text-slate-900 leading-none mt-1">
                      {recommendations.high_risk_predictions}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200/50 p-4.5 rounded-2xl flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                    <Database className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] text-blue-550 font-extrabold uppercase tracking-wider">Low Reservoirs</h4>
                    <p className="text-2xl font-black text-slate-900 leading-none mt-1">
                      {recommendations.low_reservoirs}
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200/50 p-4.5 rounded-2xl flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                    <Bell className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] text-emerald-550 font-extrabold uppercase tracking-wider">Active Alerts</h4>
                    <p className="text-2xl font-black text-slate-900 leading-none mt-1">
                      {recommendations.active_alerts}
                    </p>
                  </div>
                </div>

                {/* Suggested actions list */}
                <div className="border-t border-slate-200 pt-5 mt-2 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">Suggested Actions</h4>
                  <ul className="list-none p-0 m-0 space-y-3">
                    {recommendations.recommendations.map((r: string, idx: number) => (
                      <li key={idx} className="flex gap-2.5 items-start text-sm font-bold text-slate-600 leading-relaxed">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs italic">Syncing AI recommendations...</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
