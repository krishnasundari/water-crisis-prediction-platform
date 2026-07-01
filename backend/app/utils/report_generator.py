import os
import csv
from datetime import datetime

from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph


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

def generate_pdf_report(title: str, data: dict):
    """
    Generates a PDF report.
    Returns the generated file path.
    """

    filename = (
        title.replace(" ", "_")
        + "_"
        + datetime.now().strftime("%Y%m%d_%H%M%S")
        + ".pdf"
    )

    filepath = os.path.join(REPORTS_DIR, filename)

    document = SimpleDocTemplate(filepath)

    styles = getSampleStyleSheet()

    story = []

    story.append(
        Paragraph(title, styles["Heading1"])
    )

    story.append(
        Paragraph(
            f"Generated On : {datetime.now()}",
            styles["Normal"],
        )
    )

    story.append(
        Paragraph("<br/><br/>", styles["Normal"])
    )

    for key, value in data.items():

        story.append(
            Paragraph(
                f"<b>{key}</b> : {value}",
                styles["Normal"],
            )
        )

    document.build(story)

    return filepath


# --------------------------------------------------
# CSV Generator
# --------------------------------------------------

def generate_csv_report(title: str, data: dict):
    """
    Generates a CSV report.
    Returns the generated file path.
    """

    filename = (
        title.replace(" ", "_")
        + "_"
        + datetime.now().strftime("%Y%m%d_%H%M%S")
        + ".csv"
    )

    filepath = os.path.join(REPORTS_DIR, filename)

    with open(
        filepath,
        "w",
        newline="",
        encoding="utf-8",
    ) as csvfile:

        writer = csv.writer(csvfile)

        writer.writerow(["Field", "Value"])

        for key, value in data.items():
            writer.writerow([key, value])

    return filepath


# --------------------------------------------------
# Main Generator
# --------------------------------------------------

def generate_report(report_type: str, title: str, data: dict):
    """
    Generates PDF or CSV report.
    """

    report_type = report_type.lower()

    if report_type == "pdf":
        return generate_pdf_report(title, data)

    elif report_type == "csv":
        return generate_csv_report(title, data)

    else:
        raise ValueError(
            "Unsupported report type."
        )