package postgres

import (
	"sort"
	"strings"

	"gorm.io/gorm"
)

// RunMigrations executes all embedded SQL migration files in order.
// Files may contain multiple statements separated by semicolons.
// Idempotent: uses IF NOT EXISTS / ON CONFLICT DO NOTHING and tolerates
// "already exists" errors for re-runs.
func RunMigrations(db *gorm.DB) error {
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return err
	}

	files := make([]string, 0, len(entries))
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, name := range files {
		content, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return err
		}

		statements := splitStatements(string(content))
		for _, stmt := range statements {
			if strings.TrimSpace(stmt) == "" {
				continue
			}
			if err := db.Exec(stmt).Error; err != nil {
				println("MIGRATION ERROR:", name, "->", err.Error())
				if !strings.Contains(strings.ToLower(err.Error()), "already exists") {
					return err
				}
			}
		}
	}

	return nil
}

// splitStatements splits SQL content on semicolons that are not inside
// single-quoted strings (used by seeded VARCHAR values).
func splitStatements(sql string) []string {
	var statements []string
	var current strings.Builder
	inString := false

	for _, r := range sql {
		if r == '\'' {
			inString = !inString
		}
		if r == ';' && !inString {
			statements = append(statements, current.String())
			current.Reset()
			continue
		}
		current.WriteRune(r)
	}

	if current.Len() > 0 {
		statements = append(statements, current.String())
	}

	return statements
}