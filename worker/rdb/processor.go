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
				log.Printf("[%v] Message: %v Verdict: %v Probability: %v", consumer, reply["message"], reply["verdict"], reply["probability"])
			}

			out := map[string]interface{}{
				"messageID": m.Values["messageID"],
				"channelID": m.Values["channelID"],
				"guildID":   m.Values["guildID"],
			}
			for k, v := range reply {
				out[k] = v
			}

			_ = redisClient.XAdd(ctx, &redis.XAddArgs{
				Stream: outStream,
				Values: out,
			})

			if err := redisClient.XAck(ctx, inStream, consumerGroup, m.ID).Err(); err != nil {
				log.Printf("[%s] XACK error: %v", consumer, err)
			}
		}(msg)
	}

	wg.Wait()
}
