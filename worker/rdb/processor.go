package rdb

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/redis/go-redis/v9"
)

// handleBatch sends each XMessage to FastAPI, then ACKs it.
// Uncomment the XAdd block if you want to forward replies.
func handleBatch(
	ctx context.Context,
	msgs []redis.XMessage,
	consumer string,
	redisClient *redis.Client,
	httpClient *http.Client,
	fastAPIURL string,
	outStream, inStream, consumerGroup string,
) {
	var wg sync.WaitGroup

	for _, msg := range msgs {
		wg.Add(1)
		go func(m redis.XMessage) {
			defer wg.Done()

			payload, err := json.Marshal(m.Values)
			if err != nil {
				log.Printf("[%s] marshal error: %v", consumer, err)
				return
			}

			resp, err := httpClient.Post(fastAPIURL, "application/json", bytes.NewReader(payload))
			if err != nil {
				log.Printf("[%s] HTTP error: %v", consumer, err)
				return
			}
			defer resp.Body.Close()

			var reply map[string]interface{}
			if err := json.NewDecoder(resp.Body).Decode(&reply); err != nil {
				log.Printf("[%s] decode error: %v", consumer, err)
				return
			}
			if reply != nil {
				log.Printf("[%v] %v", consumer, reply["Received"])
			}

			// Optional: forward reply to another stream
			// _, _ = redisClient.XAdd(ctx, &redis.XAddArgs{
			// 	Stream: outStream,
			// 	Values: reply,
			// })

			if err := redisClient.XAck(ctx, inStream, consumerGroup, m.ID).Err(); err != nil {
				log.Printf("[%s] XACK error: %v", consumer, err)
			}
		}(msg)
	}

	wg.Wait()
}
