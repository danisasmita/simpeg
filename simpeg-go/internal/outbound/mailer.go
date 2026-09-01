package outbound

import (
	"fmt"
	"net/smtp"
	"strings"

	"simpeg-go/internal/config"
)

type Mailer struct {
	host     string
	port     int
	username string
	password string
	from     string
	fromName string
	baseURL  string
}

func NewMailer(cfg config.SMTPConfig, appURL string) *Mailer {
	m := &Mailer{
		host:     cfg.Host,
		port:     cfg.Port,
		username: cfg.Username,
		password: cfg.Password,
		from:     cfg.From,
		fromName: cfg.FromName,
		baseURL:  strings.TrimRight(appURL, "/"),
	}
	if m.port == 0 {
		m.port = 587
	}
	if m.from == "" {
		m.from = "noreply@uml.ac.id"
	}
	if m.fromName == "" {
		m.fromName = "SIMPEG UML"
	}
	return m
}

func (m *Mailer) Enabled() bool {
	return m.host != ""
}

func (m *Mailer) Send(to, subject, html string) error {
	addr := fmt.Sprintf("%s:%d", m.host, m.port)

	var msg strings.Builder
	msg.WriteString(fmt.Sprintf("From: %s <%s>\r\n", m.fromName, m.from))
	msg.WriteString(fmt.Sprintf("To: %s\r\n", to))
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	msg.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	msg.WriteString("\r\n")
	msg.WriteString(html)

	var auth smtp.Auth
	// PlainAuth menolak koneksi non-TLS ke host non-localhost, jadi hanya
	// gunakan AUTH bila kredensial diisi (server SMTP dengan STARTTLS).
	if m.username != "" {
		auth = smtp.PlainAuth("", m.username, m.password, m.host)
	}

	return smtp.SendMail(addr, auth, m.from, []string{to}, []byte(msg.String()))
}

func (m *Mailer) SendPasswordReset(to, token string) error {
	link := fmt.Sprintf("%s/reset-password/%s", m.baseURL, token)
	body := fmt.Sprintf(`
		<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#334155">
			<h2 style="color:#7c3aed">Reset Kata Sandi</h2>
			<p>Halo,</p>
			<p>Anda menerima email ini karena kami menerima permintaan reset kata sandi untuk akun Anda.</p>
			<p>
				<a href="%s" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:6px">
					Reset Kata Sandi
				</a>
			</p>
			<p>Tautan ini berlaku %s. Jika Anda tidak melakukan permintaan ini, abaikan email ini.</p>
		</div>`, link, "60 menit")
	return m.Send(to, "Reset Kata Sandi - SIMPEG UML", body)
}

func (m *Mailer) SendEmailVerification(to, token string) error {
	link := fmt.Sprintf("%s/verify-email?token=%s", m.baseURL, token)
	body := fmt.Sprintf(`
		<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#334155">
			<h2 style="color:#7c3aed">Verifikasi Email</h2>
			<p>Halo,</p>
			<p>Klik tombol di bawah untuk memverifikasi alamat email Anda pada SIMPEG UML.</p>
			<p>
				<a href="%s" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:6px">
					Verifikasi Email
				</a>
			</p>
			<p>Tautan ini berlaku %s. Jika bukan Anda yang mendaftar, abaikan email ini.</p>
		</div>`, link, "60 menit")
	return m.Send(to, "Verifikasi Email - SIMPEG UML", body)
}