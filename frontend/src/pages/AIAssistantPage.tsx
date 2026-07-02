import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { aiAPI } from "../services/api";

export default function AIAssistantPage() {
  const [message,setMessage]=useState("");
  const [reply,setReply]=useState("");
  const [history,setHistory]=useState<any[]>([]);
  const [recommendations,setRecommendations]=useState<any>(null);

  async function load(){
    try{
      setHistory(await aiAPI.history());
      setRecommendations(await aiAPI.recommendations());
    }catch(e){console.error(e);}
  }

  useEffect(()=>{load();},[]);

  async function send(){
    if(!message.trim()) return;
    const res=await aiAPI.chat(message);
    setReply(res.assistant_response);
    setMessage("");
    load();
  }

  async function clear(){
    await aiAPI.clearHistory();
    setReply("");
    load();
  }

  return (
    <div style={{display:"flex"}}>
      <Sidebar/>
      <div style={{flex:1,padding:30,background:"#f4f6f9",minHeight:"100vh"}}>
        <h1>🤖 AI Water Assistant</h1>
        <div
  style={{
    background: "white",
    padding: "15px",
    borderRadius: "12px",
    margin: "20px 0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  }}
>
  <h3 style={{ marginBottom: "12px" }}>
    💡 Quick Questions
  </h3>

  <div
    style={{
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
    }}
  >
    <button
  onClick={() =>
    setMessage(
      "Which villages are currently at high risk?"
    )
  }
  style={{
    padding: "10px 18px",
    border: "none",
    borderRadius: "20px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
  }}
>
  🚨 High Risk Villages
</button>

    <button
      onClick={() =>
        setMessage(
          "Show the current reservoir status."
        )
      }
    >
      💧 Reservoir Status
    </button>

    <button
      onClick={() =>
        setMessage(
          "What is the rainfall prediction?"
        )
      }
    >
      🌧 Rainfall Prediction
    </button>

    <button
      onClick={() =>
        setMessage(
          "Give me water conservation tips."
        )
      }
    >
      🌱 Water Saving Tips
    </button>
  </div>
</div>

        <textarea style={{width:"100%",height:120,padding:10}}
          value={message}
          onChange={(e)=>setMessage(e.target.value)}
          placeholder="Ask about risk, reservoirs or alerts..."
        />

        <div style={{marginTop:15}}>
          <div
  style={{
    marginTop: 15,
    display: "flex",
    gap: "12px",
  }}
>
  <button
    onClick={send}
    style={{
      background: "#2563eb",
      color: "white",
      border: "none",
      padding: "10px 20px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    Send Message
  </button>

  <button
    onClick={clear}
    style={{
      background: "#dc2626",
      color: "white",
      border: "none",
      padding: "10px 20px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    Clear History
  </button>
</div>
          
        </div>

        <div
  style={{
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    marginTop: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  }}
>
  <h2>🤖 AI Response</h2>

  <div
    style={{
      background: "#eff6ff",
      padding: "15px",
      borderRadius: "10px",
      whiteSpace: "pre-wrap",
      lineHeight: "1.7",
      borderLeft: "5px solid #2563eb",
      minHeight: "80px",
    }}
  >
    {reply || "Ask me something about water crisis prediction, reservoirs, rainfall, or alerts."}
  </div>
</div>

  <div
  style={{
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    marginTop: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  }}
>
  <h2>💡 AI Recommendations</h2>

  {recommendations && (
    <>
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            flex: 1,
            background: "#fee2e2",
            padding: "15px",
            borderRadius: "10px",
          }}
        >
          <h3>⚠ High Risk</h3>
          <h1>{recommendations.high_risk_predictions}</h1>
        </div>

        <div
          style={{
            flex: 1,
            background: "#dbeafe",
            padding: "15px",
            borderRadius: "10px",
          }}
        >
          <h3>💧 Low Reservoirs</h3>
          <h1>{recommendations.low_reservoirs}</h1>
        </div>

        <div
          style={{
            flex: 1,
            background: "#dcfce7",
            padding: "15px",
            borderRadius: "10px",
          }}
        >
          <h3>🚨 Active Alerts</h3>
          <h1>{recommendations.active_alerts}</h1>
        </div>
      </div>

      <h3>Suggested Actions</h3>

      <ul>
        {recommendations.recommendations.map(
          (r: string, i: number) => (
            <li
              key={i}
              style={{
                marginBottom: "10px",
              }}
            >
              {r}
            </li>
          )
        )}
      </ul>
    </>
  )}
</div>

        <div
  style={{
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    marginTop: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  }}
>
  <h2>💬 Conversation History</h2>

  {history.length === 0 ? (
    <p>No conversations.</p>
  ) : (
    history.map((h: any) => (
      <div
        key={h.id}
        style={{
          marginBottom: "25px",
        }}
      >
        {/* User */}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              background: "#2563eb",
              color: "white",
              padding: "12px 16px",
              borderRadius: "15px",
              maxWidth: "70%",
            }}
          >
            <b>You</b>

            <div style={{ marginTop: "6px" }}>
              {h.user_message}
            </div>
          </div>
        </div>

        {/* AI */}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            marginTop: "12px",
          }}
        >
          <div
            style={{
              background: "#f3f4f6",
              padding: "12px 16px",
              borderRadius: "15px",
              maxWidth: "70%",
            }}
          >
            <b>🤖 AI</b>

            <div
              style={{
                marginTop: "6px",
                whiteSpace: "pre-wrap",
              }}
            >
              {h.assistant_response}
            </div>

            <div
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              {new Date(h.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    ))
  )}
</div>
      </div>
    </div>
  );
}
