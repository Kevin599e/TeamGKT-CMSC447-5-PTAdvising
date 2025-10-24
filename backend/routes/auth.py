from flask import Blueprint, request, jsonify, session
from models import User
from database import db_session
from utils import verify_password
from email_validator import validate_email, EmailNotValidError

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    try:
        validate_email(email)
    except EmailNotValidError:
        return {"error": "Invalid email"}, 400

    user = db_session.query(User).filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return {"error": "Invalid credentials"}, 401

    session["uid"] = user.id
    session["role"] = user.role
    return {"id": user.id, "email": user.email, "role": user.role}

@auth_bp.post("/logout")
def logout():
    session.clear()
    return {"ok": True}

@auth_bp.get("/me")
def me():
    if "uid" not in session:
        return {"user": None}
    return {"id": session["uid"], "role": session.get("role")}
