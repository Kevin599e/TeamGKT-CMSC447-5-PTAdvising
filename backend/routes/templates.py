from flask import Blueprint, session, request
from functools import wraps

from database import db_session
from models import Template, TemplateSection, SourceContent, SourceProgram

templates_bp = Blueprint("templates", __name__)


def require_admin():
    if session.get("role") != "admin":
        return False, ({"error": "Admin only"}, 403)
    return True, None


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        ok, err = require_admin()
        if not ok:
            return err
        return fn(*args, **kwargs)
    return wrapper


## ----------------- TEMPLATE ADVISOR ROUTES -----------------

@templates_bp.get("/source-content")
def list_source_content_public():
    """
    Advisors: list all active source content blocks they can insert into packets.
    You can filter by usage_tag via query parameter, e.g. ?usage_tag=extra_block
    """
    tag = request.args.get("usage_tag")

    q = db_session.query(SourceContent).filter_by(active=True)
    if tag:
        q = q.filter(SourceContent.usage_tag == tag)

    rows = q.order_by(SourceContent.title).all()

    return {
        "items": [
            {
                "id": sc.id,
                "title": sc.title,
                "content_type": sc.content_type,
                "body_preview": sc.body[:200],
                "usage_tag": sc.usage_tag,  # NEW
            }
            for sc in rows
        ]
    }


@templates_bp.get("")
def list_templates():
    """
    List all templates with high-level info so UI can display them.
    Advisors can also see this. Not admin-only.
    """
    rows = db_session.query(Template).all()
    return {
        "items": [
            {
                "id": t.id,
                "name": t.name,
                "program_name": t.program.name if t.program else None,
                "active": t.active,
                "sections": [
                    {
                        "id": s.id,
                        "title": s.title,
                        "section_type": s.section_type,
                        "display_order": s.display_order,
                        "optional": s.optional,
                    }
                    for s in t.sections
                ],
            }
            for t in rows
        ]
    }

@templates_bp.get("/<int:template_id>/builder")
def template_builder_view(template_id):
    """
    Return all sections in this template, including:
      - which ones are optional (advisor can pick them)
      - preview of SourceContent if exists (to help advisor decide)
    """
    t = db_session.query(Template).get(template_id)
    if not t:
        return {"error": "Template not found"}, 404

    result_sections = []
    for s in t.sections:
        sc = s.source_content
        preview = None
        if sc:
            # short preview body (first ~300 chars)
            preview = {
                "source_content_id": sc.id,
                "title": sc.title,
                "content_type": sc.content_type,
                "body_preview": sc.body[:300],
            }

        result_sections.append({
            "template_section_id": s.id,
            "title": s.title,
            "display_order": s.display_order,
            "section_type": s.section_type,
            "optional": s.optional,
            "source_content_preview": preview,
        })

    return {
        "template_id": t.id,
        "template_name": t.name,
        "program_name": t.program.name if t.program else None,
        "sections": result_sections,
    }
## ----------------- TEMPLATE ADMIN ROUTES -----------------

@templates_bp.post("")
@admin_required
def create_template():
    """
    Admin-only: create a new template tied to a SourceProgram.
    Body:
      {
        "name": "CS BS Transfer Packet",
        "program_id": 1,       # REQUIRED (must exist in source_programs)
        "active": true         # optional (default True)
      }
    """
    data = request.get_json() or {}

    name = data.get("name")
    program_id = data.get("program_id")

    if not name:
        return {"error": "name is required"}, 400
    if not program_id:
        return {"error": "program_id is required"}, 400

    program = db_session.query(SourceProgram).get(program_id)
    if not program:
        return {"error": "SourceProgram not found"}, 404

    t = Template(
        name=name,
        program_id=program.id,
        active=bool(data.get("active", True)),
    )
    db_session.add(t)
    db_session.commit()

    return {
        "id": t.id,
        "name": t.name,
        "program_id": t.program_id,
        "program_name": t.program.name if t.program else None,
        "active": t.active,
        "created_at": t.created_at.isoformat(),
    }, 201


@templates_bp.patch("/<int:template_id>")
@admin_required
def update_template(template_id):
    """
    Admin-only: update basic template properties.
    Body (all optional):
      {
        "name": "...",
        "program_id": 2,
        "active": false
      }
    """
    t = db_session.query(Template).get(template_id)
    if not t:
        return {"error": "Template not found"}, 404

    data = request.get_json() or {}

    if "name" in data:
        t.name = data["name"]

    if "program_id" in data:
        program = db_session.query(SourceProgram).get(data["program_id"])
        if not program:
            return {"error": "SourceProgram not found"}, 404
        t.program_id = program.id

    if "active" in data:
        t.active = bool(data["active"])

    db_session.commit()

    return {
        "id": t.id,
        "name": t.name,
        "program_id": t.program_id,
        "program_name": t.program.name if t.program else None,
        "active": t.active,
        "created_at": t.created_at.isoformat(),
    }

@templates_bp.post("/<int:template_id>/sections")
@admin_required
def create_template_section(template_id):
    """
    Admin-only: add a section to a template.

    Body:
      {
        "title": "Intro & Overview",
        "section_type": "intro",          # must match your conventions
        "optional": false,
        "display_order": 1,               # optional; auto-appends if omitted
        "source_content_id": 10           # optional
      }
    """
    t = db_session.query(Template).get(template_id)
    if not t:
        return {"error": "Template not found"}, 404

    data = request.get_json() or {}

    title = data.get("title")
    section_type = data.get("section_type")
    if not title or not section_type:
        return {"error": "title and section_type are required"}, 400

    # Validate optional SourceContent
    source_content_id = data.get("source_content_id")
    if source_content_id is not None:
        sc = db_session.query(SourceContent).get(source_content_id)
        if not sc:
            return {"error": "SourceContent not found"}, 404

    # Default order: append to end if not provided
    if "display_order" in data:
        display_order = int(data["display_order"])
    else:
        max_order = max((s.display_order for s in t.sections), default=0)
        display_order = max_order + 1

    s = TemplateSection(
        template_id=t.id,
        title=title,
        section_type=section_type,
        optional=bool(data.get("optional", False)),
        display_order=display_order,
        source_content_id=source_content_id,
    )

    db_session.add(s)
    db_session.commit()

    return {
        "id": s.id,
        "template_id": s.template_id,
        "title": s.title,
        "section_type": s.section_type,
        "optional": s.optional,
        "display_order": s.display_order,
        "source_content_id": s.source_content_id,
    }, 201

@templates_bp.patch("/sections/<int:section_id>")
@admin_required
def update_template_section(section_id):
    """
    Admin-only: update a template section.

    Body (all optional):
      {
        "title": "...",
        "section_type": "info_block",
        "optional": true,
        "display_order": 3,
        "source_content_id": 11  # or null
      }
    """
    s = db_session.query(TemplateSection).get(section_id)
    if not s:
        return {"error": "TemplateSection not found"}, 404

    data = request.get_json() or {}

    if "title" in data:
        s.title = data["title"]
    if "section_type" in data:
        s.section_type = data["section_type"]
    if "optional" in data:
        s.optional = bool(data["optional"])
    if "display_order" in data:
        s.display_order = int(data["display_order"])
    if "source_content_id" in data:
        sc_id = data["source_content_id"]
        if sc_id is None:
            s.source_content_id = None
        else:
            sc = db_session.query(SourceContent).get(sc_id)
            if not sc:
                return {"error": "SourceContent not found"}, 404
            s.source_content_id = sc.id

    db_session.commit()

    return {
        "id": s.id,
        "template_id": s.template_id,
        "title": s.title,
        "section_type": s.section_type,
        "optional": s.optional,
        "display_order": s.display_order,
        "source_content_id": s.source_content_id,
    }

@templates_bp.delete("/sections/<int:section_id>")
@admin_required
def delete_template_section(section_id):
    """
    Admin-only: delete a template section.

    NOTE: If you want to be extra safe, you can later forbid deleting
    sections from templates that already have generated Packets.
    """
    s = db_session.query(TemplateSection).get(section_id)
    if not s:
        return {"error": "TemplateSection not found"}, 404

    db_session.delete(s)
    db_session.commit()
    return {"status": "ok"}


@templates_bp.get("/source-content/admin")
@admin_required
def list_source_content():
    """
    Admin-only: list all source content blocks.
    """
    rows = db_session.query(SourceContent).order_by(SourceContent.title).all()
    return {
        "items": [
            {
                "id": sc.id,
                "title": sc.title,
                "content_type": sc.content_type,
                "active": sc.active,
                "created_at": sc.created_at.isoformat(),
                "updated_at": sc.updated_at.isoformat() if sc.updated_at else None,
            }
            for sc in rows
        ]
    }


@templates_bp.post("/source-content")
@admin_required
def create_source_content():
    """
    Admin-only: create a new reusable content block.

    Body:
      {
        "title": "UMBC CS Overview",
        "content_type": "text",        # 'text' | 'markdown' | 'table' | 'audit_table'
        "body": "Long text or JSON...",
        "active": true
      }
    """
    data = request.get_json() or {}

    title = data.get("title")
    body = data.get("body")
    if not title or not body:
        return {"error": "title and body are required"}, 400

    sc = SourceContent(
        title=title,
        content_type=data.get("content_type", "text"),
        body=body,
        active=bool(data.get("active", True)),
        usage_tag=data.get("usage_tag", "general"),
    )

    db_session.add(sc)
    db_session.commit()

    return {
        "id": sc.id,
        "title": sc.title,
        "content_type": sc.content_type,
        "active": sc.active,
        "usage_tag": sc.usage_tag,  # NEW
        "created_at": sc.created_at.isoformat(),
        "updated_at": sc.updated_at.isoformat() if sc.updated_at else None,
    }, 201


@templates_bp.patch("/source-content/<int:content_id>")
@admin_required
def update_source_content(content_id):
    """
    Admin-only: update an existing content block.

    Body (all optional):
      {
        "title": "...",
        "content_type": "markdown",
        "body": "New body",
        "active": false
      }
    """
    sc = db_session.query(SourceContent).get(content_id)
    if not sc:
        return {"error": "SourceContent not found"}, 404

    data = request.get_json() or {}

    if "title" in data:
        sc.title = data["title"]
    if "content_type" in data:
        sc.content_type = data["content_type"]
    if "body" in data:
        sc.body = data["body"]
    if "active" in data:
        sc.active = bool(data["active"])
    if "usage_tag" in data:
        sc.usage_tag = data["usage_tag"]

    db_session.commit()

    return {
        "id": sc.id,
        "title": sc.title,
        "content_type": sc.content_type,
        "active": sc.active,
        "usage_tag": sc.usage_tag,  # NEW
        "created_at": sc.created_at.isoformat(),
        "updated_at": sc.updated_at.isoformat() if sc.updated_at else None,
    }

# ----------------- SOURCE PROGRAM ADMIN ROUTES -----------------

@templates_bp.get("/programs")
def list_source_programs():
    """
    List all source programs.
    Advisors can see this too (so they can see IDs to use).
    """
    rows = db_session.query(SourceProgram).order_by(SourceProgram.name).all()
    return {
        "items": [
            {
                "id": p.id,
                "name": p.name,
                "active": p.active,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in rows
        ]
    }


@templates_bp.post("/programs")
@admin_required
def create_source_program():
    """
    Admin-only: create a new SourceProgram.

    Body:
      {
        "name": "Computer Science BS",
        "active": true
      }
    """
    data = request.get_json() or {}

    name = data.get("name")
    if not name:
        return {"error": "name is required"}, 400

    # Optional: check uniqueness
    existing = db_session.query(SourceProgram).filter_by(name=name).first()
    if existing:
        return {"error": "SourceProgram with that name already exists"}, 400

    p = SourceProgram(
        name=name,
        active=bool(data.get("active", True)),
    )
    db_session.add(p)
    db_session.commit()

    return {
        "id": p.id,
        "name": p.name,
        "active": p.active,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }, 201


@templates_bp.patch("/programs/<int:program_id>")
@admin_required
def update_source_program(program_id):
    """
    Admin-only: update an existing SourceProgram.

    Body (all optional):
      {
        "name": "New Name",
        "active": false
      }
    """
    p = db_session.query(SourceProgram).get(program_id)
    if not p:
        return {"error": "SourceProgram not found"}, 404

    data = request.get_json() or {}

    if "name" in data:
        p.name = data["name"]
    if "active" in data:
        p.active = bool(data["active"])

    db_session.commit()

    return {
        "id": p.id,
        "name": p.name,
        "active": p.active,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


