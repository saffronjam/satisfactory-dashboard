package service

import (
	"api/service/client"
	"api/service/implClient"
	"api/service/mockClient"
)

// NewClient creates a new client using the config URL
func NewClient() client.Client {
	return implClient.NewClient()
}

// NewClientWithAddress creates a new client with a custom address
func NewClientWithAddress(address string) client.Client {
	return implClient.NewClientWithAddress(address)
}

// NewMockClient creates a new mock client for testing
func NewMockClient() client.Client {
	return mockClient.NewClient()
}
