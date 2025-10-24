from jinja2 import Template
from pathlib import Path
import subprocess, os, json

TEX_TEMPLATE = r"""
\documentclass[11pt]{article}
\usepackage[margin=1in]{geometry}
\usepackage[T1]{fontenc}
\usepackage{hyperref}
\usepackage{longtable}
\usepackage{array}
\usepackage{setspace}
\setstretch{1.1}

\title{UMBC Advising Packet}
\begin{document}
\maketitle

\section*{Student}
{{ student_name }} (\texttt{ {{ student_email }} })\\
Transferring from: {{ source_institution }}\\
Target Program: {{ target_program }}

{% for sec in sections %}
\section*{ {{ sec.title }} }

{% if sec.content_type in ["table", "audit_table"] %}
\begin{longtable}{|{% for _ in sec.table.columns %}p{0.22\textwidth}|{% endfor %}}
\hline
{% for col in sec.table.columns -%}
\textbf{ {{ col }} }{% if not loop.last %} & {% endif %}
{%- endfor %} \\
\hline
\endfirsthead
\hline
{% for col in sec.table.columns -%}
\textbf{ {{ col }} }{% if not loop.last %} & {% endif %}
{%- endfor %} \\
\hline
\endhead

{% for row in sec.table.rows -%}
{% for cell in row -%}
{{ cell }}{% if not loop.last %} & {% endif %}
{%- endfor %} \\
\hline
{%- endfor %}

\end{longtable}

{% else %}
{{ sec.body_for_tex }}
{% endif %}

{% endfor %}
\end{document}
"""


def _parse_table_json(table_json_str):
    try:
        d = json.loads(table_json_str)
        return {
            "columns": d.get("columns", []),
            "rows": d.get("rows", []),
        }
    except Exception:
        return {
            "columns": [],
            "rows": [["[Could not parse table data]"]],
        }


def render_packet_pdf(packet, sections, export_dir="exports", latex_bin="pdflatex"):
    export = Path(export_dir)
    export.mkdir(parents=True, exist_ok=True)

    # build data for template
    rendered_sections = []
    for s in sections:
        if s.content_type in ("table", "audit_table"):
            rendered_sections.append({
                "title": s.title,
                "content_type": s.content_type,
                "table": _parse_table_json(s.content or "{}"),
                "body_for_tex": "",
            })
        else:
            rendered_sections.append({
                "title": s.title,
                "content_type": s.content_type,
                "table": {"columns": [], "rows": []},
                # escape backslashes/newlines for LaTeX
                "body_for_tex": (s.content or "").replace("\\", "\\textbackslash{}"),
            })

    tpl = Template(TEX_TEMPLATE)
    tex_str = tpl.render(
        student_name=packet.request.student_name,
        student_email=packet.request.student_email,
        source_institution=packet.request.source_institution or "-",
        target_program=packet.request.target_program or "-",
        sections=rendered_sections,
    )

    tex_path = export / f"packet_{packet.id}.tex"
    pdf_path = export / f"packet_{packet.id}.pdf"
    tex_path.write_text(tex_str, encoding="utf-8")

    try:
        subprocess.run(
            [latex_bin, "-interaction=nonstopmode", tex_path.name],
            cwd=export,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except Exception as e:
        return None, f"LaTeX compile failed: {e}"

    return str(pdf_path), None
