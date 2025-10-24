from docx import Document
from pathlib import Path
import json

def render_table(doc, table_json_str):
    try:
        data = json.loads(table_json_str)
    except Exception:
        doc.add_paragraph("[Could not parse table]")
        return

    columns = data.get("columns", [])
    rows = data.get("rows", [])

    table = doc.add_table(rows=1 + len(rows), cols=len(columns))
    table.style = "Light List Accent 1"

    # header
    hdr_cells = table.rows[0].cells
    for j, col_name in enumerate(columns):
        if j < len(hdr_cells):
            hdr_cells[j].text = str(col_name)

    # body
    for i, row in enumerate(rows):
        cells = table.rows[i + 1].cells
        for j, cell_val in enumerate(row):
            if j < len(cells):
                cells[j].text = str(cell_val)


def render_packet_docx(packet, sections, export_dir="exports"):
    export_path = Path(export_dir)
    export_path.mkdir(parents=True, exist_ok=True)
    filename = export_path / f"packet_{packet.id}.docx"

    doc = Document()

<<<<<<< HEAD
    # Header info
    doc.add_heading("UMBC Advising Packet", level=1)
    doc.add_paragraph(
        f"Student: {packet.request.student_name} <{packet.request.student_email}>"
    )
    doc.add_paragraph(
        f"Source Institution: {packet.request.source_institution or '-'}"
    )
    doc.add_paragraph(
        f"Target Program: {packet.request.target_program or '-'}"
    )
=======
    # packet.request and packet.request.student_name etc. still exist in your new models
    doc.add_heading("UMBC Advising Packet", level=1)
    doc.add_paragraph(f"Student: {packet.request.student_name} <{packet.request.student_email}>")
    doc.add_paragraph(f"Program: {packet.request.target_program or '-'}")
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d
    doc.add_paragraph("")

    for s in sections:
        doc.add_heading(s.title, level=2)
<<<<<<< HEAD

        if s.content_type in ("table", "audit_table"):
            render_table(doc, s.content or "{}")
        else:
            # assume plain text / markdown-ish
            doc.add_paragraph(s.content or "")
=======
        # we don't care about s.content_type here yet, just dump the text snapshot
        doc.add_paragraph(s.content or "")
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d

    doc.save(str(filename))
    return str(filename)
