package service

import (
	"api/service/client"
	"api/service/frm_client"
)

// NewClientWithAddress creates a new client with a custom address
func NewClientWithAddress(address string) client.Client {
	return frm_client.NewClientWithAddress(address)
}
