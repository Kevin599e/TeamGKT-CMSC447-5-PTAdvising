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

# ---- Extra info blocks (optional sections advisor can include) ----

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
        usage_tag="extra_info_block",
    )

    # Orientation / Next Steps
    orientation_info = SourceContent(
        title="UMBC Orientation / Next Steps",
        content_type="text",
        body=(
            "You must complete orientation before registering for classes.\n"
            "Look for an email from UMBC Orientation with session dates.\n"
            "Bring unofficial transcripts to advising for preliminary review.\n"
        ),
        active=True,
        usage_tag="extra_info_block",
    )

    # COEIT Repeat Policy
    repeat_policy_info = SourceContent(
        title="COEIT Repeat Policy",
        content_type="text",
        body=(
            "COEIT Repeat Policy:\n"
            "The College of Engineering and Information Technology (COEIT) has a strict course repeat policy.\n\n"
            "- Students are allowed only TWO attempts in any course required for the major or required to progress in the major.\n"
            "- This includes Math, Science, and major-related classes.\n"
            "- This policy counts all attempts, including:\n"
            "  * Courses taken at UMBC or other institutions (transfer credits).\n"
            "  * Courses with grades of W (withdrawal).\n\n"
            "If you are unsure whether a course counts toward the repeat limit, please speak with an advisor before "
            "re-enrolling."
        ),
        active=True,
        usage_tag="extra_info_block",
    )

    # Language Requirement Overview
    language_requirement_info = SourceContent(
        title="Language Requirement Overview",
        content_type="text",
        body=(
            "Language Requirement:\n"
            "You can work on your language requirement while you are still at your community college.\n\n"
            "- If you completed FOUR years of a language in high school, you may be able to have the requirement waived.\n"
            "  * You must submit your high school transcript for review.\n"
            "- Otherwise, you will need to complete a language course through the INTERMEDIATE level at UMBC.\n"
            "- There are additional ways to satisfy this requirement (placement, prior coursework, etc.).\n\n"
            "Your advisor can help you review your options and determine the best way to complete this requirement."
        ),
        active=True,
        usage_tag="extra_info_block",
    )

    # CSEE / CS Track Options
    cs_track_info = SourceContent(
        title="Computer Science Track Options (CSEE)",
        content_type="text",
        body=(
            "Computer Science Tracks (CSEE):\n"
            "You do not need to choose a track immediately. Tracks are chosen once you begin your 300-level CS coursework.\n\n"
            "- Track courses are 400-level computer science electives taken toward the end of your degree.\n"
            "- These courses appear as CMSC 4XX in the sample plans.\n"
            "- You will have plenty of time to explore different areas before selecting a track.\n\n"
            "More detailed information about CS tracks is available on the department website and in the advising materials."
        ),
        active=True,
        usage_tag="extra_info_block",
    )

    # Transfer Admissions – Deadlines & Overview
    transfer_admissions_info = SourceContent(
        title="Transfer Admissions – Deadlines & Overview",
        content_type="text",
        body=(
            "Transfer Admissions Deadlines:\n\n"
            "Spring Deadlines:\n"
            "- Priority Deadline: October 15\n"
            "- Regular Deadline: December 1\n"
            "- Honors College (Priority): October 15\n"
            "- Honors College (Regular): December 1\n\n"
            "Fall Deadlines:\n"
            "- Priority Deadline: March 1\n"
            "- Regular Deadline: June 1\n"
            "- Honors College (Priority): March 1\n"
            "- Honors College (Regular): June 1\n\n"
            "Admissions Information:\n"
            "- UMBC uses the Common Application for transfer admission.\n"
            "- You must submit:\n"
            "  * Completed Common Application\n"
            "  * $75 application fee\n"
            "  * Official transcripts from all previously attended institutions\n\n"
            "How Applications Are Evaluated:\n"
            "- The Admissions Committee reviews:\n"
            "  * Cumulative GPA (as calculated by UMBC)\n"
            "  * Academic trends and course rigor\n"
            "  * Performance in courses related to the intended major\n"
            "- Competitive transfer applicants typically have a 3.0 or higher in college-level coursework.\n"
            "- Applicants can usually expect a decision 3–4 weeks after the application is complete.\n\n"
            "Once you have completed your application, you will receive a UMBC student ID number, which you can use to "
            "search for scholarships in Scholarship Retriever.\n\n"
            "For questions or to speak with an admissions counselor, you can schedule an appointment:\n"
            "https://undergraduate.umbc.edu/counselors/"
        ),
        active=True,
        usage_tag="extra_info_block",
    )

    # Transfer Student Alliance (TSA)
    transfer_tsa_info = SourceContent(
        title="Transfer Student Alliance (TSA)",
        content_type="text",
        body=(
            "Transfer Student Alliance (TSA):\n"
            "The TSA is a member benefit program for students intending to complete an associate degree at a Maryland "
            "community college before transferring to UMBC.\n\n"
            "- TSA members enjoy benefits at UMBC's main campus and at the Universities at Shady Grove.\n"
            "- TSA applicants should:\n"
            "  * Be enrolled at a Maryland community college after earning a high school diploma or equivalent.\n"
            "  * Have at least 12 college credits completed with a 3.0 GPA or higher (competitive applicants).\n\n"
            "A full list of TSA benefits and recommended application timelines can be found on the TSA website."
        ),
        active=True,
        usage_tag="extra_info_block",
    )

    # Transferring Coursework & Transfer Credits
    transfer_coursework_info = SourceContent(
        title="Transferring Coursework & Transfer Credits",
        content_type="text",
        body=(
            "Transferring Coursework to UMBC:\n\n"
            "- To have coursework evaluated and transferred, you must be degree-seeking at UMBC.\n"
            "- Coursework must appear on an official, sealed transcript from a regionally accredited institution or be "
            "sent directly from CollegeBoard/IB.\n"
            "- Transfer Services will NOT evaluate coursework that is not official.\n\n"
            "Course Evaluation:\n"
            "- Students from four-year institutions or out-of-state community colleges may need to provide course "
            "descriptions and syllabi to determine course equivalencies.\n"
            "- It is the student's responsibility to provide the necessary documentation.\n"
            "- Students from Maryland community colleges can use ARTSYS to see how courses transfer.\n"
            "- Students from other institutions can use the Transfer Evaluation System (TES) as a guide.\n\n"
            "Maximum Transferable Credits:\n"
            "- Up to 70 credits from two-year colleges.\n"
            "- Up to 90 total transfer credits (including AP, IB, and CLEP).\n\n"
            "How Credits Apply to Your Degree:\n"
            "- Transfer courses are applied as academic credit, but grades do not affect your UMBC GPA.\n"
            "- When appropriate, courses can satisfy general education requirements and/or major/minor requirements.\n"
            "- Your Transfer Credit Report (TCR) and degree audit show how your credits are being applied.\n\n"
            "Additional Details:\n"
            "- Based on your transfer credit report and degree audit, you may be asked to provide more information or "
            "submit a Course Review form for certain classes.\n"
            "- More information is available on the Registrar's Office Transfer Credits web page."
        ),
        active=True,
        usage_tag="extra_info_block",
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
            "Questions? please feel free to email COEITtransfer@umbc.edu. "
        ),
        active=True,
    )

    db_session.add_all([
        intro_script,
        cs_plan_table,
        degree_audit_schema,
        financial_aid_info,
        orientation_info,
        repeat_policy_info,
        language_requirement_info,
        cs_track_info,
        transfer_admissions_info,
        transfer_tsa_info,
        transfer_coursework_info,
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
