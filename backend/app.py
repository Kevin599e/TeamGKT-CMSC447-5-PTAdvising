from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

from database import db_session, init_db
from routes.auth import auth_bp
from routes.requests import requests_bp
from routes.templates import templates_bp
from routes.packets import packets_bp

def create_app():
    load_dotenv()
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-secret")
    CORS(app, supports_credentials=True)

    init_db()

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(requests_bp, url_prefix="/api/requests")
    app.register_blueprint(templates_bp, url_prefix="/api/templates")
    app.register_blueprint(packets_bp, url_prefix="/api/packets")

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()

    @app.get("/api/health")
    def health():
        return {"ok": True}

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
