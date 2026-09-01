package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const fixedWindowScript = `
local count = redis.call('GET', KEYS[1])
if count and tonumber(count) >= tonumber(ARGV[1]) then
	return {count, 0}
end
local next = redis.call('INCR', KEYS[1])
if next == 1 then
	redis.call('EXPIRE', KEYS[1], ARGV[2])
end
return {next, 1}
`

type RateLimiter struct {
	client *redis.Client
}

func NewRateLimiter(client *redis.Client) *RateLimiter {
	return &RateLimiter{client: client}
}

type RateLimitResult struct {
	Current   int64
	Remaining int64
	Allowed   bool
}

func (r *RateLimiter) Allow(ctx context.Context, key string, limit int64, window time.Duration) (*RateLimitResult, error) {
	var values []interface{}
	var err error

	// go-redis v9 signature: Eval(ctx, script, keys, args...) -> *Cmd
	values, err = r.client.Eval(ctx, fixedWindowScript, []string{"ratelimit:" + key}, int64(limit), int64(window.Seconds())).Slice()
	if err != nil {
		return nil, fmt.Errorf("ratelimit: %w", err)
	}

	current, _ := values[0].(int64)
	allowedFlag, _ := values[1].(int64)

	remaining := limit - current
	if remaining < 0 {
		remaining = 0
	}

	return &RateLimitResult{
		Current:   current,
		Remaining: remaining,
		Allowed:   allowedFlag == 1,
	}, nil
}