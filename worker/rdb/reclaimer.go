package rdb

import (
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// RunReclaimer reclaims pending entries older than minIdle.
// It runs once immediately, then every reclaimInterval.
func RunReclaimer(
	wg *sync.WaitGroup,
	ctx context.Context,
	redisClient *redis.Client,
	inStream, outStream, consumerGroup, consumer string,
	minIdle time.Duration,
	batch int,
	reclaimInterval time.Duration,
	httpClient *http.Client,
	fastAPIURL string,
) {
	defer wg.Done()

	// Helper that performs one reclaim cycle
	reclaimOnce := func() {
		log.Printf("[%v] Started...", consumer)

		claimed, _, err := redisClient.XAutoClaim(ctx, &redis.XAutoClaimArgs{
			Stream:   inStream,
			Group:    consumerGroup,
			Consumer: consumer,
			MinIdle:  minIdle,
			Start:    "0",
			Count:    int64(batch),
		}).Result()

		if err != nil {
			log.Printf("[%v] XAUTOCLAIM error: %v", consumer, err)
			return
		}
		if len(claimed) == 0 {
			return
		}

		log.Printf("[%v] Claimed %v stale entries", consumer, len(claimed))

		handleBatch(
			ctx,
			claimed,
			consumer,
			redisClient,
			httpClient,
			fastAPIURL,
			outStream,
			inStream,
			consumerGroup,
		)
	}

	// Immediate first run
	reclaimOnce()

	// Periodic runs
	ticker := time.NewTicker(reclaimInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Printf("[%v] Exiting...", consumer)
			return
		case <-ticker.C:
			reclaimOnce()
		}
	}
}
