package v1

import (
	"api/models/models"
	"api/service"
	"api/service/client"
	"api/service/session"
	"context"
	"fmt"
	"reflect"
	"sync"

	"github.com/gin-gonic/gin"
)

// GetState godoc
// @Summary Get Full State
// @Description Get full state
// @Tags State
// @Accept json
// @Produce json
// @Success 200 {array} models.FactoryStatsDTO "Get factory stats"
// @Success 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/factoryStats [get]
func GetState(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	wg := sync.WaitGroup{}
	state := models.State{}
	mu := sync.Mutex{}

	ctx := context.Background()

	fetchers := map[string]func() (any, error){
		"FactoryStats":          func() (any, error) { return service.NewClient().GetFactoryStats(ctx) },
		"GeneratorStats":        func() (any, error) { return service.NewClient().GetGeneratorStats(ctx) },
		"ProdStats":             func() (any, error) { return service.NewClient().GetProdStats(ctx) },
		"SinkStats":             func() (any, error) { return service.NewClient().GetSinkStats(ctx) },
		"SatisfactoryApiStatus": func() (any, error) { return service.NewClient().GetSatisfactoryApiStatus(ctx) },
		"Circuits":              func() (any, error) { return service.NewClient().ListCircuits(ctx) },
		"Players":               func() (any, error) { return service.NewClient().ListPlayers(ctx) },
		"Trains":                func() (any, error) { return service.NewClient().ListTrains(ctx) },
		"TrainStations":         func() (any, error) { return service.NewClient().ListTrainStations(ctx) },
		"Drones":                func() (any, error) { return service.NewClient().ListDrones(ctx) },
		"DroneStations":         func() (any, error) { return service.NewClient().ListDroneStations(ctx) },
	}

	for fieldName, fetcher := range fetchers {
		wg.Add(1)
		go func(fieldName string, fetcher func() (any, error)) {
			defer wg.Done()
			result, err := fetcher()
			if err != nil {
				requestContext.ServerError(fmt.Errorf("failed to fetch %s", fieldName), err)
				return
			}

			mu.Lock()
			defer mu.Unlock()

			v := reflect.ValueOf(&state).Elem()
			field := v.FieldByName(fieldName)
			if !field.IsValid() {
				requestContext.ServerError(fmt.Errorf("field %s not found in state", fieldName), nil)
				return
			}
			if !field.CanSet() {
				requestContext.ServerError(fmt.Errorf("cannot set field %s in state", fieldName), nil)
				return
			}

			val := reflect.ValueOf(result)
			fieldType := field.Type()

			if val.Type().AssignableTo(fieldType) {
				field.Set(val)
			} else if val.Type().Kind() == reflect.Ptr && val.Elem().Type().AssignableTo(fieldType) {
				// result is a pointer, field is a value type
				field.Set(val.Elem())
			} else if fieldType.Kind() == reflect.Ptr && val.Type().AssignableTo(fieldType.Elem()) {
				// field is a pointer, result is a value type
				ptr := reflect.New(val.Type())
				ptr.Elem().Set(val)
				field.Set(ptr)
			} else {
				requestContext.ServerError(fmt.Errorf(
					"type mismatch for field %s: expected %s, got %s",
					fieldName, fieldType, val.Type(),
				), nil)
			}
		}(fieldName, fetcher)
	}

	wg.Wait()

	requestContext.Ok(state.ToDTO())
}

// GetSessionState godoc
// @Summary Get Full State for a Session
// @Description Get full state for a specific session
// @Tags Sessions
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 {object} models.StateDTO "Full state"
// @Failure 404 {object} models.ErrorResponse "Session not found"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/sessions/{id}/state [get]
func GetSessionState(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Param("id")
	if sessionID == "" {
		requestContext.UserError("Session ID is required")
		return
	}

	// Get the session
	store := session.NewStore()
	sess, err := store.Get(sessionID)
	if err != nil {
		requestContext.ServerError(fmt.Errorf("failed to get session: %w", err), err)
		return
	}
	if sess == nil {
		requestContext.NotFound("Session not found")
		return
	}

	// Create appropriate client for this session
	var apiClient client.Client
	if sess.IsMock {
		apiClient = service.NewMockClient()
	} else {
		apiClient = service.NewClientWithAddress(sess.Address)
	}

	wg := sync.WaitGroup{}
	state := models.State{}
	mu := sync.Mutex{}

	ctx := context.Background()

	fetchers := map[string]func() (any, error){
		"FactoryStats":          func() (any, error) { return apiClient.GetFactoryStats(ctx) },
		"GeneratorStats":        func() (any, error) { return apiClient.GetGeneratorStats(ctx) },
		"ProdStats":             func() (any, error) { return apiClient.GetProdStats(ctx) },
		"SinkStats":             func() (any, error) { return apiClient.GetSinkStats(ctx) },
		"SatisfactoryApiStatus": func() (any, error) { return apiClient.GetSatisfactoryApiStatus(ctx) },
		"Circuits":              func() (any, error) { return apiClient.ListCircuits(ctx) },
		"Players":               func() (any, error) { return apiClient.ListPlayers(ctx) },
		"Trains":                func() (any, error) { return apiClient.ListTrains(ctx) },
		"TrainStations":         func() (any, error) { return apiClient.ListTrainStations(ctx) },
		"Drones":                func() (any, error) { return apiClient.ListDrones(ctx) },
		"DroneStations":         func() (any, error) { return apiClient.ListDroneStations(ctx) },
	}

	for fieldName, fetcher := range fetchers {
		wg.Add(1)
		go func(fieldName string, fetcher func() (any, error)) {
			defer wg.Done()
			result, err := fetcher()
			if err != nil {
				requestContext.ServerError(fmt.Errorf("failed to fetch %s", fieldName), err)
				return
			}

			mu.Lock()
			defer mu.Unlock()

			v := reflect.ValueOf(&state).Elem()
			field := v.FieldByName(fieldName)
			if !field.IsValid() {
				requestContext.ServerError(fmt.Errorf("field %s not found in state", fieldName), nil)
				return
			}
			if !field.CanSet() {
				requestContext.ServerError(fmt.Errorf("cannot set field %s in state", fieldName), nil)
				return
			}

			val := reflect.ValueOf(result)
			fieldType := field.Type()

			if val.Type().AssignableTo(fieldType) {
				field.Set(val)
			} else if val.Type().Kind() == reflect.Ptr && val.Elem().Type().AssignableTo(fieldType) {
				// result is a pointer, field is a value type
				field.Set(val.Elem())
			} else if fieldType.Kind() == reflect.Ptr && val.Type().AssignableTo(fieldType.Elem()) {
				// field is a pointer, result is a value type
				ptr := reflect.New(val.Type())
				ptr.Elem().Set(val)
				field.Set(ptr)
			} else {
				requestContext.ServerError(fmt.Errorf(
					"type mismatch for field %s: expected %s, got %s",
					fieldName, fieldType, val.Type(),
				), nil)
			}
		}(fieldName, fetcher)
	}

	wg.Wait()

	requestContext.Ok(state.ToDTO())
}
