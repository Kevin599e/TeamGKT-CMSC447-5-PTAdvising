from database import init_db, db_session
from models import Template

def delete_template(tpl_id: int):
    init_db()
    tpl = db_session.query(Template).get(tpl_id)
    if not tpl:
        print(f"No template with id {tpl_id}")
        return
    print(f"Deleting template {tpl.id} / {tpl.name}")
    db_session.delete(tpl)
    db_session.commit()
    print("Deleted.")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python scripts/delete_template.py <TEMPLATE_ID>")
    else:
        delete_template(int(sys.argv[1]))