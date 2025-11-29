from database import init_db, db_session
from models import (
    User,
    SourceProgram,
    SourceContent,
    Template,
    TemplateSection,
)
from utils import hash_password
from datetime import datetime
import json


def main():
    init_db()

    # --- Users ---
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
                # ----------------- YEAR 1 -----------------
                ["Year 1 - Fall", "CMSC 201 - Computer Science I", "4", ""],
                ["Year 1 - Fall", "MATH 151 - Calculus and Analytic Geometry I", "4", ""],
                ["Year 1 - Fall", "Language 201 GEP", "4", ""],
                ["Year 1 - Fall", "ENGL 100", "3", ""],
                ["Year 1 - Fall", "Total", "15", ""],

                ["Year 1 - Benchmarks", "", "",
                "CMSC 201 minimum grade of B required. "
                "Students with advanced language placement must complete electives instead. "
                "University requirements: ENGL 100 or equivalent and a credit-bearing math "
                "course to be completed within the first year."
                ],

                ["Year 1 - Spring", "CMSC 202 - Computer Science II", "4", ""],
                ["Year 1 - Spring", "MATH 152 - Calculus and Analytic Geometry II", "4", ""],
                ["Year 1 - Spring", "CMSC 203 - Discrete Structures", "3", ""],
                ["Year 1 - Spring", "AH GEP", "3", ""],
                ["Year 1 - Spring", "SS GEP", "3", ""],
                ["Year 1 - Spring", "Total", "17", ""],

                ["Year 1 - Spring Benchmarks", "", "",
                "CMSC 202 minimum grade of B required; CMSC 202 minimum grade of C required."
                ],

                # ----------------- YEAR 2 -----------------
                ["Year 2 - Fall", "CMSC 331 - Programming Languages", "3", ""],
                ["Year 2 - Fall", "CMSC 341 - Data Structures", "3", ""],
                ["Year 2 - Fall", "Science Sequence I (see advisor)", "4", ""],
                ["Year 2 - Fall", "SS GEP", "3", ""],
                ["Year 2 - Fall", "Elective", "3", ""],
                ["Year 2 - Fall", "Total", "16", ""],
                ["Year 2 - Benchmarks", "", "", "None."],

                ["Year 2 - Spring", "CMSC 313 - Computer Organization & Assembly", "3", ""],
                ["Year 2 - Spring", "MATH 221 - Linear Algebra", "3", ""],
                ["Year 2 - Spring", "Science Sequence II", "4", ""],
                ["Year 2 - Spring", "Science Lab", "2", ""],
                ["Year 2 - Spring", "SS GEP", "3", ""],
                ["Year 2 - Spring", "Total", "15", ""],

                # ----------------- YEAR 3 -----------------
                ["Year 3 - Fall", "CMSC 304 - Social and Ethical Issues (AH GEP, WI)", "3", ""],
                ["Year 3 - Fall", "CMSC 411 - Computer Architecture", "3", ""],
                ["Year 3 - Fall", "CMSC 4XX", "3", ""],
                ["Year 3 - Fall", "STAT 355 - Probability and Statistics", "4", ""],
                ["Year 3 - Fall", "Total", "13", ""],

                ["Year 3 - Benchmarks", "", "",
                "By end of fall, students should have completed CMSC 341, CMSC 313, "
                "and STAT 355 with a minimum grade of C or better."
                ],

                ["Year 3 - Spring", "CMSC 421 - Operating Systems", "3", ""],
                ["Year 3 - Spring", "CMSC 4XX", "3", ""],
                ["Year 3 - Spring", "CMSC 4XX", "3", ""],
                ["Year 3 - Spring", "AH GEP", "3", ""],
                ["Year 3 - Spring", "Culture GEP", "3", ""],
                ["Year 3 - Spring", "Total", "15", ""],

                ["Year 3 - Spring Benchmarks", "", "", "None."],

                # ----------------- YEAR 4 -----------------
                ["Year 4 - Fall", "CMSC 441 - Algorithms", "3", ""],
                ["Year 4 - Fall", "CMSC 447 - Software Engineering", "3", ""],
                ["Year 4 - Fall", "Elective", "3", ""],
                ["Year 4 - Fall", "Upper level elective", "3", ""],
                ["Year 4 - Fall", "Elective", "3", ""],
                ["Year 4 - Fall", "Total", "15", ""],

                ["Year 4 - Benchmarks", "", "", "None."],

                ["Year 4 - Spring", "CMSC 4XX", "3", ""],
                ["Year 4 - Spring", "CMSC 4XX", "3", ""],
                ["Year 4 - Spring",
                "Elective (minimum of 8 credits, see advisor)",
                "8",
                ""
                ],
                ["Year 4 - Spring", "Total", "14", ""],

                ["Year 4 - Spring Benchmarks", "", "", "None."],

                # ----------------- PROGRAM TOTAL -----------------
                ["Program Total", "Total credits", "120",
                "Sample plan total; actual totals may vary by student."
                ]
            ]
        }),
        active=True,
    )

    # Degree audit schema starter: advisor will edit rows per student.
    # We'll store empty-ish table structure the advisor will fill.
    degree_audit_schema = SourceContent(
        title="Degree Audit Template (Blank)",
        content_type="audit_table",
        body=json.dumps({
            "columns": ["Term", "UMBC Course", "Transfer / CC Course", "Status", "Credits", "Notes"],
            "rows": [
                # ---------------- Year 1 ----------------
                ["Year 1 - Fall", "", "", "", "", ""],
                ["Year 1 - Fall", "", "", "", "", ""],
                ["Year 1 - Fall", "", "", "", "", ""],
                ["Year 1 - Fall", "", "", "", "", ""],

                ["Year 1 - Spring", "", "", "", "", ""],
                ["Year 1 - Spring", "", "", "", "", ""],
                ["Year 1 - Spring", "", "", "", "", ""],
                ["Year 1 - Spring", "", "", "", "", ""],

                # ---------------- Year 2 ----------------
                ["Year 2 - Fall", "", "", "", "", ""],
                ["Year 2 - Fall", "", "", "", "", ""],
                ["Year 2 - Fall", "", "", "", "", ""],
                ["Year 2 - Fall", "", "", "", "", ""],

                ["Year 2 - Spring", "", "", "", "", ""],
                ["Year 2 - Spring", "", "", "", "", ""],
                ["Year 2 - Spring", "", "", "", "", ""],
                ["Year 2 - Spring", "", "", "", "", ""],
            ]
        }),
        active=True,
    )


    # Info blocks (optional sections advisor can include)

    # Financial Aid
    financial_aid_info = SourceContent(
        title="Financial Aid & Deadlines (CS)",
        content_type="text",
        body=(
            "Financial Aid Deadlines:\n"
            "- FAFSA priority deadline: March 1.\n"
            "- Scholarship review begins in early spring.\n\n"
            "Please submit all transcripts to Admissions to avoid delays.\n\n"
            "More information for prospective students:\n"
            "https://financialaid.umbc.edu/prospective-students/"
        ),
        active=True,
    )

    #Orientation
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
        #db_session.add(TemplateSection(
           # template_id=cs_template.id,
            #title="Financial Aid & Deadlines",
            #section_type="info_block",
            #optional=True,
            #source_content_id=financial_aid_info.id,
        #))

        # 6. Optional info block: Orientation / Next Steps
        #db_session.add(TemplateSection(
           # template_id=cs_template.id,
           # title="Orientation / Next Steps",
           # display_order=5,
           # section_type="info_block",
           # optional=True,
           # source_content_id=orientation_info.id,
        #))

        # 7. Conclusion
        db_session.add(TemplateSection(
            template_id=cs_template.id,
            title="Conclusion",
            display_order=4,
            section_type="conclusion",
            optional=False,
            source_content_id=conclusion_block.id,
        ))

    db_session.commit()
    print("Seed complete: users, CS program, CS template, source content.")


if __name__ == "__main__":
    main()
