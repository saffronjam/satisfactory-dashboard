package frm_client

import (
	"api/models/models"
	"context"
	"fmt"
)

// GetSessionInfo fetches session information from the Satisfactory API
func (client *Client) GetSessionInfo(ctx context.Context) (*models.SessionInfo, error) {
	var raw models.SessionInfoRaw
	err := client.makeSatisfactoryCall(ctx, "/getSessionInfo", &raw)
	if err != nil {
		return nil, fmt.Errorf("failed to get session info: %w", err)
	}
	return raw.ToDTO(), nil
}
