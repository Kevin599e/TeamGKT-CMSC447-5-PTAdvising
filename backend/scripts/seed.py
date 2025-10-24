from database import init_db, db_session
from models import User, Template, TemplateSection, SourceContent
from utils import hash_password

def main():
    init_db()

    # 1. Users
    if not db_session.query(User).filter_by(email="admin@umbc.edu").first():
        admin = User(
            email="admin@umbc.edu",
            password_hash=hash_password("Passw0rd!"),
            role="admin",
        )
        db_session.add(admin)

    if not db_session.query(User).filter_by(email="advisor@umbc.edu").first():
        adv = User(
            email="advisor@umbc.edu",
            password_hash=hash_password("Passw0rd!"),
            role="advisor",
        )
        db_session.add(adv)

    db_session.flush()

    # 2. SourceContent blocks (canonical reusable text)
    # only create them if table is empty
    if not db_session.query(SourceContent).first():
        sc_welcome = SourceContent(
            title="Welcome / Intro",
            content_type="text",
            body="Welcome to UMBC Advising. We’re excited to work with you as you prepare to transfer.",
            active=True,
        )
        sc_transfer = SourceContent(
            title="Transfer Credit Guidance",
            content_type="text",
            body="Evaluation of transfer credits will be finalized after Admissions reviews official transcripts.",
            active=True,
        )
        sc_next = SourceContent(
            title="Next Steps Checklist",
            content_type="text",
            body="1. Submit official transcript.\n2. Complete orientation.\n3. Meet with advisor for course selection.",
            active=True,
        )

        db_session.add_all([sc_welcome, sc_transfer, sc_next])
        db_session.flush()  # so they get IDs

        # 3. Template using those SourceContent rows
        t = Template(name="Default Advising Template", active=True)
        db_session.add(t)
        db_session.flush()

        db_session.add_all([
            TemplateSection(
                template_id=t.id,
                title="Welcome",
                display_order=0,
                source_content_id=sc_welcome.id,
            ),
            TemplateSection(
                template_id=t.id,
                title="Transfer Credits",
                display_order=1,
                source_content_id=sc_transfer.id,
            ),
            TemplateSection(
                template_id=t.id,
                title="Next Steps",
                display_order=2,
                source_content_id=sc_next.id,
            ),
        ])

    db_session.commit()
    print("Seed complete. Users: admin@umbc.edu / advisor@umbc.edu (Passw0rd!)")

if __name__ == "__main__":
    main()
