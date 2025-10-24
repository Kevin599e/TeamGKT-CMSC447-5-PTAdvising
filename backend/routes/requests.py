from flask import Blueprint, request, jsonify, session
from models import StudentRequest
from database import db_session
from email_validator import validate_email, EmailNotValidError

requests_bp = Blueprint("requests", __name__)

def require_auth():
    if "uid" not in session:
        return False, ({"error": "Unauthorized"}, 401)
    return True, None

@requests_bp.post("")
def create_request():
    ok, err = require_auth()
    if not ok: return err

    data = request.get_json() or {}
    try:
        validate_email(data.get("student_email", ""))
    except EmailNotValidError:
        return {"error": "Invalid student email"}, 400

    sr = StudentRequest(
        student_name=data.get("student_name", "").strip(),
        student_email=data.get("student_email", "").strip(),
        source_institution=data.get("source_institution"),
        target_program=data.get("target_program"),
        advisor_id=session["uid"],
    )
    db_session.add(sr)
    db_session.commit()
    return {"id": sr.id}, 201

@requests_bp.get("")
def list_requests():
    ok, err = require_auth()
    if not ok: return err

    rows = db_session.query(StudentRequest).order_by(StudentRequest.created_at.desc()).all()
    return {"items": [{
        "id": r.id,
        "student_name": r.student_name,
        "student_email": r.student_email,
        "source_institution": r.source_institution,
        "target_program": r.target_program,
    } for r in rows]}
