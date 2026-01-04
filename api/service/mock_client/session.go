package mock_client

import (
	"api/models/models"
	"context"
	"fmt"
	"math/rand"
	"time"
)

func (c *Client) GetSessionInfo(_ context.Context) (*models.SessionInfo, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	return &models.SessionInfo{
		SessionName:                "Mock Session",
		IsPaused:                   false,
		DayLength:                  50,
		NightLength:                10,
		PassedDays:                 randInt(100, 900),
		NumberOfDaysSinceLastDeath: randInt(0, 100),
		Hours:                      randInt(0, 24),
		Minutes:                    randInt(0, 60),
		Seconds:                    rand.Float64() * 60,
		IsDay:                      rand.Float64() > 0.3,
		TotalPlayDuration:          randInt(100000, 900000),
		TotalPlayDurationText:      fmt.Sprintf("%d:%02d:%02d", randInt(100, 900), randInt(0, 60), randInt(0, 60)),
	}, nil
}
