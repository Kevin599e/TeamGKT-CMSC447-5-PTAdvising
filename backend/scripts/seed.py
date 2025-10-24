from database import init_db, db_session
from models import User, Template, TemplateSection
from utils import hash_password

def main():
    init_db()
    # Create admin
    if not db_session.query(User).filter_by(email="admin@umbc.edu").first():
        admin = User(email="admin@umbc.edu", password_hash=hash_password("Passw0rd!"), role="admin")
        db_session.add(admin)

    # Advisor demo
    if not db_session.query(User).filter_by(email="advisor@umbc.edu").first():
        adv = User(email="advisor@umbc.edu", password_hash=hash_password("Passw0rd!"), role="advisor")
        db_session.add(adv)

    # Demo template
    if not db_session.query(Template).first():
        t = Template(name="Default Advising Template", active=True)
        db_session.add(t); db_session.flush()
        db_session.add_all([
            TemplateSection(template_id=t.id, title="Welcome", content="Welcome to UMBC Advising.", display_order=0),
            TemplateSection(template_id=t.id, title="Transfer Credits", content="Evaluation of transfer credits goes here.", display_order=1),
            TemplateSection(template_id=t.id, title="Next Steps", content="Checklist and follow-ups.", display_order=2),
        ])
    db_session.commit()
    print("Seed complete. Users: admin@umbc.edu / advisor@umbc.edu (Passw0rd!)")

if __name__ == "__main__":
    main()
