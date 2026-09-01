package redis

import (
	"context"
	"fmt"
	"log"

	"simpeg-go/internal/config"

	"github.com/redis/go-redis/v9"
)

func NewRedis(cfg config.RedisConfig) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr(),
		Password: "",
		DB:       0,
	})

	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("unable to connect to redis: %w", err)
	}

	log.Println("✓ Connected to Redis")
	return client, nil
}
