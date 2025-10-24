import os, smtplib
from email.message import EmailMessage

def send_email(to_email: str, subject: str, body: str, attachments: list[str] = None):
    host = os.getenv("SMTP_HOST", "localhost")
    port = int(os.getenv("SMTP_PORT", "1025"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    from_addr = os.getenv("SMTP_FROM", "no-reply@example.com")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(body)

    for path in attachments or []:
        with open(path, "rb") as f:
            data = f.read()
        filename = os.path.basename(path)
        msg.add_attachment(data, maintype="application", subtype="octet-stream", filename=filename)

    with smtplib.SMTP(host, port) as s:
        if user and password:
            s.starttls()
            s.login(user, password)
        s.send_message(msg)
