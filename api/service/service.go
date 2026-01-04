package service

import (
	"api/service/client"
	"api/service/frm_client"
	"api/service/mock_client"
)

// NewClientWithAddress creates a new client with a custom address
func NewClientWithAddress(address string) client.Client {
	return frm_client.NewClientWithAddress(address)
}

// NewMockClient creates a new mock client for testing
func NewMockClient() client.Client {
	return mock_client.NewClient()
}
