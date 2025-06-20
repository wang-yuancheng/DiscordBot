package rdb

import (
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

func RunConsumer(
	wg *sync.WaitGroup,
	ctx context.Context,
	redisClient *redis.Client,
	inStream, outStream, consumerGroup, consumer string,
	batch int,
	block time.Duration,
	httpClient *http.Client,
	fastAPIURL string,
) {
	defer wg.Done()

	for {
		select {
		case <-ctx.Done():
			log.Printf("[%v] Exiting...", consumer)
			return
		default:
			log.Printf("[%v] Reading from Redis Stream", consumer)

			streamArray, err := redisClient.XReadGroup(ctx, &redis.XReadGroupArgs{
				Group:    consumerGroup,
				Consumer: consumer,
				Streams:  []string{inStream, ">"},
				Count:    int64(batch),
				Block:    block,
			}).Result()

			if err != nil {
				if err == redis.Nil {
					continue
				}
				log.Printf("[%v] XREADGROUP error: %v", consumer, err)
				time.Sleep(time.Second)
				continue
			}

			if streamArray == nil {
				continue
			}

			for _, stream := range streamArray {
				if len(stream.Messages) == 0 {
					continue
				}
				handleBatch(
					ctx,
					stream.Messages,
					consumer,
					redisClient,
					httpClient,
					fastAPIURL,
					outStream,
					inStream,
					consumerGroup,
				)
			}
		}
	}
}
