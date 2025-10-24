from docx import Document
from pathlib import Path

def render_packet_docx(packet, sections, export_dir="exports"):
    export_path = Path(export_dir)
    export_path.mkdir(parents=True, exist_ok=True)
    filename = export_path / f"packet_{packet.id}.docx"

    doc = Document()
    doc.add_heading(f"UMBC Advising Packet", level=1)
    doc.add_paragraph(f"Student: {packet.request.student_name} <{packet.request.student_email}>")
    doc.add_paragraph(f"Program: {packet.request.target_program or '-'}")
    doc.add_paragraph("")

    for s in sections:
        doc.add_heading(s.title, level=2)
        doc.add_paragraph(s.content or "")

    doc.save(str(filename))
    return str(filename)
