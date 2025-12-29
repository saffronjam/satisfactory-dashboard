package v1

import (
	"net"
	"strings"

	"github.com/gin-gonic/gin"
)

type ClientIPResponse struct {
	IP string `json:"ip"`
}

// GetClientIP godoc
// @Summary Get Client IP
// @Description Get the IP address of the client as seen by the server
// @Tags Status
// @Accept json
// @Produce json
// @Success 200 {object} ClientIPResponse "Client IP"
// @Router /v1/client-ip [get]
func GetClientIP(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	ip := getClientIP(ginContext)
	requestContext.Ok(ClientIPResponse{IP: ip})
}

func getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header first (for proxied requests)
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		// Take the first IP in the list
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if ip != "" {
				return ip
			}
		}
	}

	// Check X-Real-IP header
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(c.Request.RemoteAddr)
	if err != nil {
		return c.Request.RemoteAddr
	}

	return ip
}
