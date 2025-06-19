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
	// Streams and consumer-group
	inStream := "messageStream"
	outStream := "replyStream"
	consumerGroupName := "messageStreamCG"

	// Worker settings
	pollBatch := 5                     // XREADGROUP batch size
	blockMS := 3000                    // XREADGROUP block time
	workers := 2                       // regular consumers

	// Reclaimer settings
	minIdle := 100 * time.Second       // message must be idle this long to be reclaimed
	reclaimBatch := 50                 // XAUTOCLAIM batch size
	reclaimInterval := 5 * time.Minute // how often the reclaimer wakes

	// HTTP
	httpTimeout := 10 * time.Second // FastAPI request timeout

	// Load environment
	if err := godotenv.Load(".env"); err != nil {
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

	// Context with cancel
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Redis client
	redisClient := redis.NewClient(opt)
	defer redisClient.Close()

	if _, err := redisClient.Ping(ctx).Result(); err != nil {
		log.Fatalf("Error pinging Redis client: %v", err)
	}
	log.Println("Connected to Redis")

	// Ensure consumer-group exists
	rdb.CreateConsumerGroup(ctx, redisClient, inStream, consumerGroupName)

	// Shared HTTP client
	httpClient := &http.Client{Timeout: httpTimeout}

	// Launch consumers
	var wg sync.WaitGroup
	for i := 1; i <= workers; i++ {
		wg.Add(1)
		consumerName := "worker-" + strconv.Itoa(i)
		log.Printf("Starting %v", consumerName)

		go rdb.RunConsumer(&wg, ctx, redisClient, inStream, outStream,
			consumerGroupName, consumerName,
			pollBatch, time.Duration(blockMS)*time.Millisecond,
			httpClient, fastAPI)
	}

	// Launch reclaimer
	wg.Add(1)
	go rdb.RunReclaimer(&wg, ctx, redisClient, inStream, outStream,
		consumerGroupName, "reclaimer",
		minIdle, reclaimBatch, reclaimInterval,
		httpClient, fastAPI)

	// Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	<-sigCh
	cancel()   // stop goroutines
	wg.Wait()  // wait for them
	log.Println("Shutdown complete")
}
