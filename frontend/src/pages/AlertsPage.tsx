import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { alertAPI } from "../services/api";

import useWebSocket from "../hooks/useWebSocket";

export default function AlertsPage() {
  const [alerts,setAlerts]=useState<any[]>([]);
  const [form,setForm]=useState({
    village_id:"",
    reservoir_id:"",
    alert_type:"risk",
    severity:"low",
    message:""
  });

  const getBaseURL = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000/api/v1"
      : "https://water-crisis-prediction-platform-1.onrender.com/api/v1";
  };

  async function load(){
    try{
      const data=await alertAPI.getAll();
      setAlerts(data);
    }catch(e){console.error(e);}
  }

  useEffect(()=>{load();},[]);

  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("Telemetry sync complete. Reloading alerts list.");
      load();
    }
  });

  async function createAlert(){
    await fetch(`${getBaseURL()}/alerts/`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        village_id: form.village_id?Number(form.village_id):null,
        reservoir_id: form.reservoir_id?Number(form.reservoir_id):null,
        alert_type: form.alert_type,
        severity: form.severity,
        message: form.message
      })
    });
    setForm({village_id:"",reservoir_id:"",alert_type:"risk",severity:"low",message:""});
    load();
  }

  async function deleteAlert(id:number){
    await fetch(`${getBaseURL()}/alerts/${id}`,{method:"DELETE"});
    load();
  }

  return (
    <div style={{display:"flex"}}>
      <Sidebar/>
      <div style={{flex:1,padding:30,background:"#f4f6f9",minHeight:"100vh"}}>
        <h1>🚨 Alerts Management</h1>

        <div style={{background:"white",padding:20,borderRadius:12}}>
          <h2>Create Alert</h2>

          <input placeholder="Village ID" value={form.village_id}
            onChange={e=>setForm({...form,village_id:e.target.value})}/>

          <input placeholder="Reservoir ID" value={form.reservoir_id}
            onChange={e=>setForm({...form,reservoir_id:e.target.value})}
            style={{marginLeft:10}}/>

          <select value={form.alert_type}
            onChange={e=>setForm({...form,alert_type:e.target.value})}
            style={{marginLeft:10}}>
            <option value="risk">risk</option>
            <option value="reservoir">reservoir</option>
            <option value="groundwater">groundwater</option>
          </select>

          <select value={form.severity}
            onChange={e=>setForm({...form,severity:e.target.value})}
            style={{marginLeft:10}}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>

          <br/><br/>
          <input
            style={{width:"60%",padding:8}}
            placeholder="Message"
            value={form.message}
            onChange={e=>setForm({...form,message:e.target.value})}
          />

          <button onClick={createAlert} style={{marginLeft:10}}>
            Create Alert
          </button>
        </div>

        <div style={{background:"white",padding:20,borderRadius:12,marginTop:20}}>
          <h2>Current Alerts</h2>

          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Message</th>
                <th>Read</th>
                <th>Created</th>
                <th>Delete</th>
              </tr>
            </thead>

            <tbody>
              {alerts.map((a:any)=>(
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{a.alert_type}</td>
                  <td>{a.severity}</td>
                  <td>{a.message}</td>
                  <td>{a.is_read?"Yes":"No"}</td>
                  <td>{a.created_at}</td>
                  <td>
                    <button onClick={()=>deleteAlert(a.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>
    </div>
  );
}
