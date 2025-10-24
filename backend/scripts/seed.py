from database import init_db, db_session
<<<<<<< HEAD
from models import (
    User,
    SourceProgram,
    SourceContent,
    Template,
    TemplateSection,
)
=======
from models import User, Template, TemplateSection, SourceContent
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d
from utils import hash_password
from datetime import datetime
import json


def main():
    init_db()

<<<<<<< HEAD
    # --- Users ---
=======
    # 1. Users
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d
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

<<<<<<< HEAD
    # --- Program: Computer Science BS ---
    cs_prog = db_session.query(SourceProgram).filter_by(name="Computer Science BS").first()
    if not cs_prog:
        cs_prog = SourceProgram(
            name="Computer Science BS",
            active=True,
            created_at=datetime.utcnow(),
        )
        db_session.add(cs_prog)
        db_session.flush()

    # --- SourceContent blocks for CS program ---

    # Intro script with placeholders. We'll fill these with student_request data at generation.
    intro_script = SourceContent(
        title="CS Intro Script",
        content_type="text",
        body=(
            "Welcome to UMBC Computer Science.\n\n"
            "Student: {{student_name}} ({{student_email}})\n"
            "Transferring from: {{source_institution}}\n"
            "Intended Program: {{target_program}}\n\n"
            "This packet outlines your suggested plan, degree audit, and next steps."
        ),
        active=True,
    )

    # 4-year plan for CS as a table (store as JSON string).
    # This is just an example of what you'd store. Advisors won't rewrite this every time.
    cs_plan_table = SourceContent(
        title="CS 4-Year Sample Plan v2025",
        content_type="table",
        body=json.dumps({
            "columns": ["Term", "Course", "Credits", "Notes"],
            "rows": [
                ["Term 1", "CMSC 201 - Intro to CS I", "3", ""],
                ["Term 1", "MATH 151 - Calculus I", "4", ""],
                ["Term 2", "CMSC 202 - Intro to CS II", "3", ""],
                ["Term 2", "MATH 152 - Calculus II", "4", ""],
                ["Term 3", "CMSC 203 - Discrete Structures", "3", ""],
                ["Term 3", "STAT 355 - Probability & Statistics", "3", ""],
                ["...", "...", "...", "..."]
            ]
        }),
        active=True,
    )

    # Degree audit schema starter: advisor will edit rows per student.
    # We'll store empty-ish table structure the advisor will fill.
    degree_audit_schema = SourceContent(
        title="Blank Degree Audit Table Schema",
        content_type="audit_table",
        body=json.dumps({
            "columns": ["Requirement", "Satisfied By", "Status", "Credits"],
            "rows": [
                # advisor fills these later per student
            ]
        }),
        active=True,
    )

    # Info blocks (optional sections advisor can include)
    financial_aid_info = SourceContent(
        title="Financial Aid & Deadlines (CS)",
        content_type="text",
        body=(
            "Financial Aid Deadlines:\n"
            "- FAFSA priority deadline: March 1.\n"
            "- Scholarship review begins in early spring.\n\n"
            "Please submit all transcripts to Admissions to avoid delays."
        ),
        active=True,
    )

    orientation_info = SourceContent(
        title="UMBC Orientation / Next Steps",
        content_type="text",
        body=(
            "You must complete orientation before registering for classes.\n"
            "Look for an email from UMBC Orientation with session dates.\n"
            "Bring unofficial transcripts to advising for preliminary review."
        ),
        active=True,
    )

    # Conclusion block
    conclusion_block = SourceContent(
        title="CS Conclusion / Contact",
        content_type="markdown",
        body=(
            "Next Steps:\n"
            "1. Attend orientation.\n"
            "2. Meet with advising to confirm transfer credits.\n"
            "3. Register for first-semester courses.\n\n"
            "Questions? Contact the Undergraduate Advising Office."
        ),
        active=True,
    )

    db_session.add_all([
        intro_script,
        cs_plan_table,
        degree_audit_schema,
        financial_aid_info,
        orientation_info,
        conclusion_block,
    ])
    db_session.flush()

    # --- Template for CS program ---
    # One template with fixed ordered sections.
    cs_template = db_session.query(Template).filter_by(program_id=cs_prog.id).first()
    if not cs_template:
        cs_template = Template(
            program_id=cs_prog.id,
            name="CS Transfer Packet Template v1",
            active=True,
        )
        db_session.add(cs_template)
        db_session.flush()

        # 1. Introduction (auto merge student info)
        db_session.add(TemplateSection(
            template_id=cs_template.id,
            title="Introduction",
            display_order=0,
            section_type="intro",
            optional=False,
            source_content_id=intro_script.id,
        ))

        # 2. 4-year sample plan table (program default)
        db_session.add(TemplateSection(
            template_id=cs_template.id,
            title="Sample 4-Year Plan",
            display_order=1,
            section_type="plan_table",
            optional=False,
            source_content_id=cs_plan_table.id,
        ))

        # 3. Official Degree Audit (advisor edits rows)
        db_session.add(TemplateSection(
            template_id=cs_template.id,
            title="Preliminary Degree Audit",
            display_order=2,
            section_type="degree_audit",
            optional=False,
            source_content_id=degree_audit_schema.id,
        ))

        # 4. Advisor Personalized Notes
        db_session.add(TemplateSection(
            template_id=cs_template.id,
            title="Advisor Notes",
            display_order=3,
            section_type="advisor_notes",
            optional=False,
            source_content_id=None,  # advisor writes this
        ))

        # 5. Optional info block: Financial Aid / Deadlines
        db_session.add(TemplateSection(
            template_id=cs_template.id,
            title="Financial Aid & Deadlines",
            display_order=4,
            section_type="info_block",
            optional=True,
            source_content_id=financial_aid_info.id,
        ))

        # 6. Optional info block: Orientation / Next Steps
        db_session.add(TemplateSection(
            template_id=cs_template.id,
            title="Orientation / Next Steps",
            display_order=5,
            section_type="info_block",
            optional=True,
            source_content_id=orientation_info.id,
        ))

        # 7. Conclusion
        db_session.add(TemplateSection(
            template_id=cs_template.id,
            title="Conclusion",
            display_order=6,
            section_type="conclusion",
            optional=False,
            source_content_id=conclusion_block.id,
        ))
=======
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
>>>>>>> c6cb0c3f0f3138cb1f34bdefae62c2f75270e69d

    db_session.commit()
    print("Seed complete: users, CS program, CS template, source content.")


if __name__ == "__main__":
    main()
