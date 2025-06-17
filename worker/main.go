package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"github.com/wang-yuancheng/DiscordBot/worker/rdb"
)

func main() {
	// Variables
	inStream := "messageStream"
	outStream := "replyStream"
	consumerGroupName := "messageStreamCG"
	pollBatch := 5 // maximum number of messages to pull in one XREADGROUP call
	blockMS := 3000 // time XREADGROUP is willing to block waiting for new entries
	httpTimeout := time.Duration(10) * time.Second // reusable client used for every POST to FastAPI
	workers := 4

	// Load environment variables
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		log.Fatal("REDIS_URL is not found in the environment")
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("Bad REDIS_URL: %v", err)
	}

	fastAPI := os.Getenv("FASTAPI_URL")
	if fastAPI == "" {
		log.Fatal("FASTAPI_URL is not found in the environment")
	}

	// Start a context
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Connect to Redis Client
	redisClient := redis.NewClient(opt)
	defer redisClient.Close()

	_, err = redisClient.Ping(ctx).Result()
	if err != nil {
		log.Fatalf("Error pinging Redis client: %v", err)
	}
	log.Println("Connected to Redis")

	// Create and verify consumer-group
	rdb.CreateConsumerGroup(ctx, redisClient, inStream, consumerGroupName)

	// Shared HTTP client
	httpClient := &http.Client{Timeout: httpTimeout}

	// Launch workers
	var wg sync.WaitGroup
	for i := 1; i <= workers; i++ {
		wg.Add(1)
		consumerName := "worker-" + strconv.Itoa(i)

		go rdb.RunConsumer(&wg, ctx, redisClient, inStream, outStream, consumerGroupName, consumerName,
			pollBatch, time.Duration(blockMS)*time.Millisecond,
			httpClient, fastAPI)
	}

	// Graceful Shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
  
	<-sigCh
	cancel()  // stop consumers
	wg.Wait() // wait for them to exit
	log.Println("Shutdown complete")
}
