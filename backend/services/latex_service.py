from jinja2 import Template
from pathlib import Path
import subprocess, os

TEX_TEMPLATE = r"""
\documentclass[11pt]{article}
\usepackage[margin=1in]{geometry}
\usepackage[T1]{fontenc}
\usepackage{hyperref}
\title{UMBC Advising Packet}
\begin{document}
\maketitle
\section*{Student}
{{ student_name }} (\texttt{ {{ student_email }} })\\
Program: {{ target_program | default("-", true) }}
{% for s in sections %}
\section*{ {{ s.title }} }
{{ s.content | replace("\n","\\\\") }}
{% endfor %}
\end{document}
"""

def render_packet_pdf(packet, sections, export_dir="exports", latex_bin="pdflatex"):
    export = Path(export_dir)
    export.mkdir(parents=True, exist_ok=True)
    tex_path = export / f"packet_{packet.id}.tex"
    pdf_path = export / f"packet_{packet.id}.pdf"

    tpl = Template(TEX_TEMPLATE)
    tex = tpl.render(
        student_name=packet.request.student_name,
        student_email=packet.request.student_email,
        target_program=packet.request.target_program,
        sections=[{"title": s.title, "content": s.content or ""} for s in sections],
    )
    tex_path.write_text(tex, encoding="utf-8")

    try:
        subprocess.run([latex_bin, "-interaction=nonstopmode", tex_path.name], cwd=export, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except Exception as e:
        return None, f"LaTeX compile failed: {e}"
    return str(pdf_path), None
