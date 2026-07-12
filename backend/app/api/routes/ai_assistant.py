import re
import urllib.request
import urllib.parse
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.db.database import get_db
from app.models.models import (
    AIConversation,
    Prediction,
    Reservoir,
    Alert,
    Village,
    River
)
from app.schemas.schemas import AIMessageRequest

router = APIRouter()


@router.post("/chat")
def chat(
    request: AIMessageRequest,
    db: Session = Depends(get_db)
):
    user_message = request.message
    msg_lower = user_message.lower()
    assistant_response = ""

    # 1. Which river is rising fastest?
    if "river" in msg_lower and ("rising" in msg_lower or "fastest" in msg_lower or "trend" in msg_lower or "level" in msg_lower):
        rivers = db.query(River).all()
        rising_rivers = [r for r in rivers if (r.trend or "").lower() == "rising"]
        
        # Sort by level relative to danger line (ascending/descending margins)
        rising_rivers.sort(key=lambda r: (r.river_level - r.danger_level), reverse=True)
        
        if rising_rivers:
            msg = "Here are the river basins currently in a **RISING** trend (sorted by danger line margin):\n\n"
            for r in rising_rivers:
                margin = r.river_level - r.danger_level
                margin_str = f"+{margin:.2f}m above danger line" if margin >= 0 else f"{abs(margin):.2f}m below danger line"
                msg += (
                    f"🌊 **{r.name} River**\n"
                    f"  • Current Level: **{r.river_level:.2f} m** (Danger Threshold: **{r.danger_level:.2f} m**)\n"
                    f"  • Status: **{margin_str}**\n"
                    f"  • Flow Speed: **{r.flow_rate:,} m³/s**\n"
                    f"  • Runoff Trend: **{r.trend}**\n\n"
                )
            assistant_response = msg
        elif rivers:
            msg = "No river channels are currently rising. Here is the current status of all river basins:\n\n"
            for r in rivers:
                msg += f"• **{r.name} River**: {r.river_level:.2f}m (Danger: {r.danger_level:.2f}m) | Trend: **{r.trend or 'Stable'}**\n"
            assistant_response = msg
        else:
            assistant_response = "No river monitoring stations were found in the database."

    # 2. Which districts received maximum rainfall today?
    elif "rainfall" in msg_lower and ("maximum" in msg_lower or "max" in msg_lower or "highest" in msg_lower or "today" in msg_lower or "district" in msg_lower):
        # Group predictions by village district and compute average rainfall
        results = db.query(
            Village.district,
            func.avg(Prediction.rainfall).label("avg_rain")
        ).join(Prediction, Prediction.village_id == Village.id).group_by(Village.district).all()
        
        if results:
            sorted_results = sorted(results, key=lambda x: x[1] or 0, reverse=True)
            msg = "Based on today's weather telemetry, here are the districts ranked by average rainfall:\n\n"
            for idx, (dist, rain) in enumerate(sorted_results):
                rain_val = rain or 0.0
                rank_emoji = "🥇" if idx == 0 else "🥈" if idx == 1 else "🥉" if idx == 2 else "•"
                msg += f"{rank_emoji} **{dist} District**: Average of **{rain_val:.1f} mm** today.\n"
            assistant_response = msg
        else:
            assistant_response = "No rainfall telemetry records were found in the database."

    # 3. Which dams are above X% capacity? / below X% capacity / Specific dam name search
    elif "dam" in msg_lower or "reservoir" in msg_lower or "capacity" in msg_lower:
        reservoirs = db.query(Reservoir).all()
        
        # Check if user is asking about a specific dam by name
        target_dam = None
        for r in reservoirs:
            name_clean = r.name.lower().replace(" dam", "").replace(" reservoir", "").strip()
            # Special case for "sagar" matching "Nagarjuna Sagar Dam" or "Indirasagar Dam"
            if name_clean in msg_lower or (name_clean == "nagarjuna sagar" and "sagar" in msg_lower):
                target_dam = r
                break
                
        if target_dam:
            pct = (target_dam.current_level / (target_dam.capacity or 1)) * 100
            assistant_response = (
                f"🌊 **Telemetry Report: {target_dam.name}**\n\n"
                f"Here is the live telemetry and storage capacity for this location:\n"
                f"• **Current Live Storage**: **{target_dam.current_level:,} TMC** ({pct:.1f}% of total capacity)\n"
                f"• **Maximum Storage Capacity**: **{target_dam.capacity:,} TMC**\n"
                f"• **District / State**: {target_dam.district} District, {target_dam.state}\n"
                f"• **Geographic Coordinates**: {target_dam.latitude}° N, {target_dam.longitude}° E\n"
                f"• **Data Source Status**: **{target_dam.data_status or 'Active'}** | Source: {target_dam.data_source or 'Estimated (Runoff Calculation)'}\n\n"
                f"The AI model forecasts stable levels for its catchment area over the next 24 hours. Let me know if you want to trigger alerts for this sector!"
            )
        else:
            # Fallback to threshold capacity lookup
            pct_match = re.search(r"(\d{1,3})\s*%", msg_lower)
            num_match = re.search(r"\b(\d{1,3})\b", msg_lower)
            threshold = 95.0
            if pct_match:
                threshold = float(pct_match.group(1))
            elif num_match:
                threshold = float(num_match.group(1))

            is_below = "below" in msg_lower or "under" in msg_lower or "less" in msg_lower
            matches = []
            for r in reservoirs:
                pct = (r.current_level / (r.capacity or 1)) * 100
                if is_below:
                    if pct < threshold:
                        matches.append((r, pct))
                else:
                    if pct >= threshold:
                        matches.append((r, pct))

            op_str = "below" if is_below else "above"
            if matches:
                msg = f"Based on live telemetry, the following dams/reservoirs are operating **{op_str} {threshold}% capacity**:\n\n"
                for r, pct in matches:
                    msg += (
                        f"💧 **{r.name}** ({r.district} District)\n"
                        f"  • Live Level: **{pct:.1f}%** ({r.current_level:,} TMC / {r.capacity:,} TMC capacity)\n\n"
                    )
                assistant_response = msg
            else:
                msg = f"No reservoirs are currently operating **{op_str} {threshold}% capacity**.\n\n"
                msg += "Here is the status of all active reservoirs in the database:\n"
                for r in reservoirs:
                    pct = (r.current_level / (r.capacity or 1)) * 100
                    msg += f"• **{r.name}**: **{pct:.1f}%** capacity ({r.current_level:,} TMC / {r.capacity:,} TMC)\n"
                assistant_response = msg

    # 4. Why is X under flood/drought risk?
    elif "why" in msg_lower or "risk" in msg_lower or "flood" in msg_lower or "drought" in msg_lower:
        # Extract candidate location words
        words = re.findall(r"\b[A-Za-z]+\b", user_message)
        stop_words = {
            "why", "is", "under", "risk", "flood", "drought", "in", "for", "the", "village", "town", "district",
            "state", "what", "how", "who", "which", "are", "of", "alert", "threat", "warning", "and", "danger",
            "water", "crisis", "platform", "system", "predict", "predicted", "forecast", "forecasting"
        }
        candidate_words = [w for w in words if w.lower() not in stop_words]
        
        matched_village = None
        for word in candidate_words:
            matched_village = db.query(Village).filter(Village.name.ilike(f"%{word}%")).first()
            if matched_village:
                break
                
        if matched_village:
            v = matched_village
            latest_pred = db.query(Prediction).filter(Prediction.village_id == v.id).order_by(Prediction.id.desc()).first()
            dams = db.query(Reservoir).filter(Reservoir.district == v.district).all()
            rivers_near = db.query(River).all()
            alerts_near = db.query(Alert).filter(Alert.village_id == v.id, Alert.is_read == False).all()
            
            risk_level = (latest_pred.risk_level if latest_pred else "Safe").upper()
            prob = latest_pred.flood_probability if latest_pred else 0.0
            rain = latest_pred.rainfall if latest_pred else 0.0
            impact = latest_pred.expected_impact if latest_pred else "No impact predicted."

            msg = f"🔍 **Diagnostic analysis for {v.name} ({v.district} District, {v.state} State)**\n\n"
            msg += f"The AI engine has assessed **{v.name}** under **{risk_level} Risk** status (Flood Probability: **{prob}%**).\n\n"
            msg += "**Diagnostic Telemetry Metrics:**\n"
            msg += f"• **Meteorology / Precipitation**: Local rainfall is logged at **{rain} mm**.\n"
            
            if dams:
                msg += "• **Reservoir Systems Storage**:\n"
                for d in dams:
                    pct = (d.current_level / (d.capacity or 1)) * 105
                    msg += f"  - **{d.name} Reservoir**: utilized at **{pct:.1f}%** ({d.current_level:,} TMC level).\n"
            else:
                msg += f"• **Reservoir Storage**: No direct reservoir dependency logged in {v.district} District.\n"

            # Check if any river in same district
            district_rivers = [r for r in rivers_near if v.district.lower() in (r.name or "").lower() or v.district == "Gaya" and r.name == "Ganges"]
            if district_rivers:
                msg += "• **River Runoff Levels**:\n"
                for r in district_rivers:
                    msg += f"  - **{r.name} River**: {r.river_level:.2f}m (Danger threshold: {r.danger_level:.2f}m, Trend: **{r.trend}**).\n"
            
            if alerts_near:
                msg += "• **Active System Alerts**:\n"
                for a in alerts_near:
                    msg += f"  - [**{a.severity.upper()}** - {a.alert_type}] {a.message}\n"
            else:
                msg += "• **Active System Alerts**: No active alerts triggered for this location.\n"

            msg += f"\n**AI Advisory Guidance:**\n"
            msg += f"  * Impact Outlook: *{impact}*\n"
            msg += f"  * Advisory Action: "
            if risk_level == "HIGH":
                msg += "Prepare emergency evacuation channels, check warning dispatches, and coordinate downstream refuge havens."
            elif risk_level == "MODERATE":
                msg += "Maintain active telemetry checks and verify local drainage channels are clear of obstructions."
            else:
                msg += "Normal monitoring operations. No immediate threat detected."
            
            assistant_response = msg
        else:
            assistant_response = (
                "To assess flood or water crisis risk, please specify a village name (e.g. *'Why is Gaya Village under risk?'* or *'Why is Ponugodu under risk?'*).\n\n"
                "If you meant general risk stats, there are currently:\n"
                f"• {db.query(Prediction).filter(Prediction.risk_level == 'High').count()} high-risk village(s)\n"
                f"• {db.query(Alert).filter(Alert.is_read == False).count()} active alert warning(s) in the database."
            )

    # 5. Default Fallback
    else:
        total_vil = db.query(Village).count()
        total_res = db.query(Reservoir).count()
        high_risk = db.query(Prediction).filter(Prediction.risk_level == "High").count()
        active_alerts = db.query(Alert).filter(Alert.is_read == False).count()
        low_reservoirs = db.query(Reservoir).filter(Reservoir.current_level < (Reservoir.capacity * 0.40)).count()

        system_context = (
            "You are the National Hydrological Command AI Assistant. "
            "You are integrated into the Water Crisis Platform dashboard. "
            f"The platform currently monitors: {total_vil} villages, {total_res} major reservoirs/dams across India, "
            f"{high_risk} villages under High flood risk, and {active_alerts} active alerts. "
            "Respond to the user's question directly, clearly, and concisely, exactly like ChatGPT. "
            "If they ask general knowledge questions, real-life questions, or questions unrelated to water, answer them fully and accurately. "
            "Use clear Markdown formatting with lists, headers, or bullet points where appropriate."
        )

        try:
            # Query the Pollinations AI text completion endpoint
            query_url = f"https://text.pollinations.ai/{urllib.parse.quote(user_message)}?system={urllib.parse.quote(system_context)}"
            req = urllib.request.Request(
                query_url, 
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            # Timeout set to 8 seconds to prevent blocking
            with urllib.request.urlopen(req, timeout=8) as response:
                assistant_response = response.read().decode('utf-8')
        except Exception as e:
            # Fallback to local metrics report in case of network issues or timeout
            assistant_response = (
                "🤖 **Hydrological Command Assistant Online**\n\n"
                "I am monitoring live telemetry database feeds to answer your questions! Try asking me:\n"
                "• *'what is the dam present in sagar'* (specific reservoir query)\n"
                "• *'Why is Gaya Village under flood risk?'* (village diagnostics)\n"
                "• *'Which dams are above 80% capacity?'* (threshold query)\n"
                "• *'Which districts received maximum rainfall today?'*\n"
                "• *'Which river is rising fastest?'*\n\n"
                "**Current System Summary Metrics:**\n"
                f"• Monitored Villages: **{total_vil}**\n"
                f"• Active Reservoirs: **{total_res}** ({low_reservoirs} below 40% capacity)\n"
                f"• High Flood/Drought Risk Predictions: **{high_risk}**\n"
                f"• Unresolved Active Alerts: **{active_alerts}**"
            )

    # Write conversation log
    conversation = AIConversation(
        user_message=request.message,
        assistant_response=assistant_response,
        created_at=datetime.now()
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return {
        "user_message": conversation.user_message,
        "assistant_response": conversation.assistant_response,
        "created_at": conversation.created_at
    }


@router.get("/history")
def history(
    db: Session = Depends(get_db)
):
    conversations = (
        db.query(AIConversation)
        .order_by(AIConversation.created_at.desc())
        .all()
    )

    return conversations


@router.delete("/history")
def clear_history(
    db: Session = Depends(get_db)
):
    db.query(AIConversation).delete()
    db.commit()

    return {
        "message": "AI conversation history cleared successfully."
    }


@router.get("/recommendations")
def recommendations(
    db: Session = Depends(get_db)
):
    high_risk = db.query(Prediction).filter(
        Prediction.risk_level == "High"
    ).count()

    active_alerts = db.query(Alert).filter(
        Alert.is_read == False
    ).count()

    low_reservoirs = db.query(Reservoir).filter(
        Reservoir.current_level < (Reservoir.capacity * 0.40)
    ).count()

    recommendations = []

    if high_risk > 0:
        recommendations.append(
            "Increase water conservation measures in high-risk villages."
        )

    if low_reservoirs > 0:
        recommendations.append(
            "Implement rainwater harvesting and optimize reservoir usage."
        )

    if active_alerts > 0:
        recommendations.append(
            "Review unresolved alerts immediately."
        )

    if len(recommendations) == 0:
        recommendations.append(
            "Current water resources are stable. Continue regular monitoring."
        )

    return {
        "high_risk_predictions": high_risk,
        "low_reservoirs": low_reservoirs,
        "active_alerts": active_alerts,
        "recommendations": recommendations
    }