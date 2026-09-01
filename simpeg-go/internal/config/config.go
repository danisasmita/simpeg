package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	AppURL         string
	Env            string
	WebRoot        string
	AllowedOrigins []string
	Database       DatabaseConfig
	Redis          RedisConfig
	JWT            JWTConfig
	Google         GoogleConfig
	SMTP           SMTPConfig
	Sentry         SentryConfig
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
	SSLMode  string
}

func (d DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode,
	)
}

type RedisConfig struct {
	Host string
	Port int
}

func (r RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}

type JWTConfig struct {
	Secret string
	Expiry time.Duration
}

type GoogleConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

func (g GoogleConfig) Enabled() bool {
	return g.ClientID != "" && g.ClientSecret != "" && g.RedirectURL != ""
}

type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	FromName string
}

func (s SMTPConfig) Enabled() bool {
	return s.Host != ""
}

type SentryConfig struct {
	DSN              string
	Environment      string
	TracesSampleRate float64
}

func (s SentryConfig) Enabled() bool {
	return s.DSN != ""
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}

	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	redisPort, _ := strconv.Atoi(getEnv("REDIS_PORT", "6379"))
	smtpPort, _ := strconv.Atoi(getEnv("SMTP_PORT", "587"))

	expiryStr := getEnv("JWT_EXPIRY", "120m")
	expiry, err := time.ParseDuration(expiryStr)
	if err != nil {
		expiry = 120 * time.Minute
	}

	tracesSampleRate, _ := strconv.ParseFloat(getEnv("SENTRY_TRACES_SAMPLE_RATE", "0.1"), 64)
	if tracesSampleRate < 0 {
		tracesSampleRate = 0
	}
	if tracesSampleRate > 1 {
		tracesSampleRate = 1
	}

	appURL := getEnv("APP_URL", "http://localhost:8000")
	allowedOrigins := []string{appURL}
	for _, origin := range strings.Split(getEnv("APP_ALLOWED_ORIGINS", ""), ",") {
		orig := strings.TrimSpace(origin)
		if orig != "" {
			allowedOrigins = append(allowedOrigins, orig)
		}
	}

	return &Config{
		Port:    port,
		AppURL:  appURL,
		Env:     getEnv("APP_ENV", "local"),
		WebRoot: getEnv("WEB_ROOT", "frontend/dist"),
		AllowedOrigins: allowedOrigins,
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     dbPort,
			User:     getEnv("DB_USER", "simpeg"),
			Password: getEnv("DB_PASSWORD", "secret"),
			Name:     getEnv("DB_NAME", "simpeg"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Host: getEnv("REDIS_HOST", "localhost"),
			Port: redisPort,
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", "dev-secret"),
			Expiry: expiry,
		},
		Google: GoogleConfig{
			ClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
			ClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("GOOGLE_REDIRECT_URL", ""),
		},
		SMTP: SMTPConfig{
			Host:     getEnv("SMTP_HOST", ""),
			Port:     smtpPort,
			Username: getEnv("SMTP_USERNAME", ""),
			Password: getEnv("SMTP_PASSWORD", ""),
			From:     getEnv("SMTP_FROM_ADDRESS", ""),
			FromName: getEnv("SMTP_FROM_NAME", "SIMPEG UML"),
		},
		Sentry: SentryConfig{
			DSN:              getEnv("SENTRY_DSN", ""),
			Environment:      getEnv("SENTRY_ENV", getEnv("APP_ENV", "local")),
			TracesSampleRate: tracesSampleRate,
		},
	}, nil
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
