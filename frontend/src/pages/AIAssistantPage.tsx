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

        <textarea style={{width:"100%",height:120,padding:10}}
          value={message}
          onChange={(e)=>setMessage(e.target.value)}
          placeholder="Ask about risk, reservoirs or alerts..."
        />

        <div style={{marginTop:15}}>
          <button onClick={send}>Send</button>
          <button onClick={clear} style={{marginLeft:10}}>Clear History</button>
        </div>

        <div style={{background:"white",padding:20,borderRadius:12,marginTop:20}}>
          <h2>AI Response</h2>
          <p>{reply || "No response yet."}</p>
        </div>

        <div style={{background:"white",padding:20,borderRadius:12,marginTop:20}}>
          <h2>Recommendations</h2>
          {recommendations && (
            <>
              <p>High Risk: {recommendations.high_risk_predictions}</p>
              <p>Low Reservoirs: {recommendations.low_reservoirs}</p>
              <p>Active Alerts: {recommendations.active_alerts}</p>
              <ul>
                {recommendations.recommendations.map((r:string,i:number)=><li key={i}>{r}</li>)}
              </ul>
            </>
          )}
        </div>

        <div style={{background:"white",padding:20,borderRadius:12,marginTop:20}}>
          <h2>Conversation History</h2>
          {history.length===0 ? <p>No conversations.</p> :
            history.map((h:any,index:number)=>(
              <div key={index} style={{borderBottom:"1px solid #ddd",paddingBottom:10,marginBottom:10}}>
                <b>You:</b> {h.user_message}<br/>
                <b>AI:</b> {h.assistant_response}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
