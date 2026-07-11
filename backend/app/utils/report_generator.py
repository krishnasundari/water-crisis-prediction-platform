import os
import csv
from datetime import datetime
from sqlalchemy.orm import Session

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.models.models import Village, Reservoir, River, Prediction, Alert

# --------------------------------------------------
# Reports Folder
# --------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(__file__)
    )
)

REPORTS_DIR = os.path.join(BASE_DIR, "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

# --------------------------------------------------
# PDF Generator
# --------------------------------------------------

def generate_pdf_report(title: str, db: Session):
    """
    Generates a rich PDF report from live database tables.
    Returns the generated file path.
    """
    filename = (
        title.replace(" ", "_")
        + "_"
        + datetime.now().strftime("%Y%m%d_%H%M%S")
        + ".pdf"
    )
    filepath = os.path.join(REPORTS_DIR, filename)

    # Letter size: 612 x 792 pt
    document = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        alignment=1, # Center
        spaceAfter=15
    )
    
    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e3a8a'),
        spaceBefore=15,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        'TableBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#334155')
    )

    header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("🌊 National Hydrological Situation Brief", title_style))
    story.append(Paragraph(f"Generated On: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (UTC)", styles["Normal"]))
    story.append(Spacer(1, 15))

    # 2. Executive statistics Summary Table
    total_vil = db.query(Village).count()
    total_res = db.query(Reservoir).count()
    high_risks = db.query(Prediction).filter(Prediction.risk_level == "High").count()
    active_alerts = db.query(Alert).filter(Alert.is_read == False).count()

    summary_data = [
        [
            Paragraph("<b>Total Monitored Nodes:</b>", styles["Normal"]),
            Paragraph(str(total_vil + total_res), styles["Normal"]),
            Paragraph("<b>Active Warnings:</b>", styles["Normal"]),
            Paragraph(f"<font color='red'><b>{active_alerts}</b></font>", styles["Normal"])
        ],
        [
            Paragraph("<b>High-Risk Areas:</b>", styles["Normal"]),
            Paragraph(str(high_risks), styles["Normal"]),
            Paragraph("<b>Status:</b>", styles["Normal"]),
            Paragraph("CRITICAL WARNING ACTIVE" if active_alerts > 0 else "NOMINAL", styles["Normal"])
        ]
    ]
    summary_table = Table(summary_data, colWidths=[130, 130, 130, 130])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 15))

    # 3. Reservoir storage capacity Table
    story.append(Paragraph("Reservoir Storage Systems Status", section_style))
    reservoirs = db.query(Reservoir).all()
    res_table_data = [[
        Paragraph("Name", header_style),
        Paragraph("District", header_style),
        Paragraph("Max Cap (m3)", header_style),
        Paragraph("Current Level (m)", header_style),
        Paragraph("Storage %", header_style)
    ]]
    for r in reservoirs:
        pct = (r.current_level / r.capacity) * 100
        res_table_data.append([
            Paragraph(r.name, body_style),
            Paragraph(r.district, body_style),
            Paragraph(f"{r.capacity:,}", body_style),
            Paragraph(f"{r.current_level:,}", body_style),
            Paragraph(f"<b>{pct:.1f}%</b>", body_style)
        ])
    res_table = Table(res_table_data, colWidths=[120, 100, 110, 100, 90])
    res_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    story.append(res_table)
    story.append(Spacer(1, 15))

    # 4. River runoff levels Table
    story.append(Paragraph("River Basin Runoff Status", section_style))
    rivers = db.query(River).all()
    riv_table_data = [[
        Paragraph("River Name", header_style),
        Paragraph("Level (m)", header_style),
        Paragraph("Danger Line (m)", header_style),
        Paragraph("Flow Rate (m3/s)", header_style),
        Paragraph("Trend", header_style)
    ]]
    for r in rivers:
        riv_table_data.append([
            Paragraph(r.name, body_style),
            Paragraph(f"{r.river_level:.2f}", body_style),
            Paragraph(f"{r.danger_level:.2f}", body_style),
            Paragraph(f"{r.flow_rate:,}", body_style),
            Paragraph(f"<font color='{'red' if r.trend == 'Rising' else 'green'}'><b>{r.trend}</b></font>", body_style)
        ])
    riv_table = Table(riv_table_data, colWidths=[120, 90, 110, 110, 90])
    riv_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    story.append(riv_table)
    story.append(Spacer(1, 15))

    # 5. Recent warnings log list
    story.append(Paragraph("Emergency Alarms & Alerts Feed", section_style))
    alerts = db.query(Alert).filter(Alert.is_read == False).order_by(Alert.created_at.desc()).limit(8).all()
    if alerts:
        alerts_data = [[
            Paragraph("Sev", header_style),
            Paragraph("Type", header_style),
            Paragraph("Alert Message Detail", header_style),
            Paragraph("Logged Time", header_style)
        ]]
        for a in alerts:
            alerts_data.append([
                Paragraph(f"<b>{a.severity.upper()}</b>", body_style),
                Paragraph(a.alert_type.upper(), body_style),
                Paragraph(a.message, body_style),
                Paragraph(a.created_at.strftime('%H:%M:%S'), body_style)
            ])
        alerts_table = Table(alerts_data, colWidths=[55, 55, 310, 100])
        alerts_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ]))
        story.append(alerts_table)
    else:
        story.append(Paragraph("<i>All monitoring stations report steady levels. No active hazard alarms.</i>", styles["Normal"]))

    document.build(story)
    return filepath


# --------------------------------------------------
# CSV Generator
# --------------------------------------------------

def generate_csv_report(title: str, db: Session):
    """
    Generates a CSV report summarizing live telemetry.
    Returns the generated file path.
    """
    filename = (
        title.replace(" ", "_")
        + "_"
        + datetime.now().strftime("%Y%m%d_%H%M%S")
        + ".csv"
    )
    filepath = os.path.join(REPORTS_DIR, filename)

    with open(filepath, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)

        # 1. Summary details
        writer.writerow(["=== HYDROLOGICAL SITUATION BRIEF ==="])
        writer.writerow(["Title", title])
        writer.writerow(["Generated On", str(datetime.now())])
        writer.writerow([])

        # 2. Reservoirs
        writer.writerow(["=== RESERVOIR STORAGE STATUS ==="])
        writer.writerow(["ID", "Name", "District", "Capacity", "Current Level", "Storage %"])
        reservoirs = db.query(Reservoir).all()
        for r in reservoirs:
            pct = (r.current_level / r.capacity) * 100
            writer.writerow([r.id, r.name, r.district, r.capacity, r.current_level, f"{pct:.2f}%"])
        writer.writerow([])

        # 3. Rivers
        writer.writerow(["=== RIVER BASIN RUNOFF STATUS ==="])
        writer.writerow(["ID", "Name", "River Level (m)", "Danger Level (m)", "Flow Rate (m3/s)", "Trend"])
        rivers = db.query(River).all()
        for r in rivers:
            writer.writerow([r.id, r.name, r.river_level, r.danger_level, r.flow_rate, r.trend])
        writer.writerow([])

        # 4. Alerts
        writer.writerow(["=== EMERGENCY ALERTS LOG ==="])
        writer.writerow(["ID", "Severity", "Type", "Message", "Logged Time"])
        alerts = db.query(Alert).filter(Alert.is_read == False).all()
        for a in alerts:
            writer.writerow([a.id, a.severity, a.alert_type, a.message, str(a.created_at)])

    return filepath


# --------------------------------------------------
# Main Generator
# --------------------------------------------------

def generate_report(report_type: str, title: str, db: Session):
    """
    Generates PDF or CSV report from live database tables.
    """
    report_type = report_type.lower()
    if report_type == "pdf":
        return generate_pdf_report(title, db)
    elif report_type == "csv":
        return generate_csv_report(title, db)
    else:
        raise ValueError("Unsupported report type.")