package rdb

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

/*
RunConsumer continuously:
 1. XREADGROUPs a batch from <inStream>
 2. POSTs each entry’s JSON to FastAPI
 3. Pushes FastAPI’s JSON reply to <outStream>
 4. ACKs the message
*/
func RunConsumer(wg *sync.WaitGroup, ctx context.Context, redisClient *redis.Client, inStream, outStream, consumerGroup, consumer string, batch int, block time.Duration, httpClient *http.Client, fastAPIURL string) {
	defer wg.Done()
	for {
		select {
		case <-ctx.Done(): // Only selected when cancel() is called
			log.Printf("[%v] Exiting...", consumer)
			return
		default:
			log.Printf("[worker-%v] Reading from Redis Stream", consumer)
			streamArray, err := redisClient.XReadGroup(ctx, &redis.XReadGroupArgs{
				Group:    consumerGroup,
				Consumer: consumer,
				Streams:  []string{inStream, ">"},
				Count:    int64(batch),
				Block:    block,
			}).Result()

			if err != nil {
				if err == redis.Nil {
					continue // blocked and timed out, not an error
				}
				log.Printf("[%s] xReadGroup error: %v", consumer, err)
				time.Sleep(time.Second)
				continue
			}

			if streamArray == nil {
				log.Printf("[%v] No messages in Redis %v, retrying...", consumer, inStream)
				continue
			}

			var bwg sync.WaitGroup

			for _, stream := range streamArray {
				for _, msg := range stream.Messages {
					bwg.Add(1)

					// msgID := msg.ID
					values := msg.Values

					go func() {
						defer bwg.Done()

						// Marshal to JSON
						payload, err := json.Marshal(values)
						if err != nil {
							log.Printf("[%s] marshal error: %v", consumer, err)
							return
						}
						if payload != nil {
							log.Printf("Caught payload: %v", payload)
						}

						// Send to FastAPI
						resp, err := httpClient.Post(fastAPIURL, "application/json", bytes.NewReader(payload))
						if err != nil {
							log.Printf("[%s] HTTP error: %v", consumer, err)
							return
						}

						defer resp.Body.Close()

						// Decode reply
						var reply map[string]interface{}
						if err := json.NewDecoder(resp.Body).Decode(&reply); err != nil {
							log.Printf("[%s] decode error: %v", consumer, err)
							return
						}
						if reply != nil {
							log.Printf("[%v] %v", consumer, reply["Received"])
						}

						// Push reply onto outStream
						// if _, err := redisClient.XAdd(ctx, &redis.XAddArgs{
						// 	Stream: outStream,
						// 	Values: reply,
						// }).Result(); err != nil {
						// 	log.Printf("[%s] xadd error: %v", consumer, err)
						// }

						// Acknowledge original message
						// if err := redisClient.XAck(ctx, inStream, consumerGroup, msgID).Err(); err != nil {
						// 	log.Printf("[%s] xack error: %v", consumer, err)
						// }
					}()
				}

			}
			bwg.Wait()
		}
	}
}
