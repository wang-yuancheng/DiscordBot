package rdb

import (
	"context"
	"log"
	"strings"

	"github.com/redis/go-redis/v9"
)

func CreateConsumerGroup(ctx context.Context, client *redis.Client, stream, consumerGroup string) {

	err := client.XGroupCreateMkStream(ctx, stream, consumerGroup, "0").Err()
	if err != nil {
		if strings.Contains(err.Error(), "BUSYGROUP") {
			log.Println("Consumer group already exists")
		} else {
			log.Fatalf("Error creating consumer group: %v", err)
		}
	} else {
		log.Println("Consumer group created")
	}
}
