package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type GeocodeHandler struct {
	client *http.Client
}

func NewGeocodeHandler() *GeocodeHandler {
	return &GeocodeHandler{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// Reverse godoc
// @Summary Reverse geocoding
// @Description Menerjemahkan koordinat lat/lon menjadi alamat via Nominatim (OpenStreetMap).
// @Tags Geocode
// @Produce json
// @Param lat query string true "Latitude"
// @Param lon query string true "Longitude"
// @Success 200 {object} GeocodeReverseResponse
// @Failure 400 {object} ErrorResponse
// @Failure 502 {object} ErrorResponse
// @Router /geocode/reverse [get]
func (h *GeocodeHandler) Reverse(c *gin.Context) {
	lat := c.Query("lat")
	lon := c.Query("lon")
	if lat == "" || lon == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "lat dan lon wajib diisi"})
		return
	}

	endpoint := "https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=" +
		url.QueryEscape(lat) + "&lon=" + url.QueryEscape(lon)
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat request geocode"})
		return
	}
	req.Header.Set("User-Agent", "SIMPEG-UML/1.0 (simpeg@uml.ac.id)")

	resp, err := h.client.Do(req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"address": fmt.Sprintf("%s, %s", lat, lon), "detail": gin.H{}})
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Geocoding service unavailable"})
		return
	}

	var payload struct {
		DisplayName string `json:"display_name"`
		Address     struct {
			Road    string `json:"road"`
			Village string `json:"village"`
			Hamlet  string `json:"hamlet"`
			Suburb  string `json:"suburb"`
			City    string `json:"city"`
			Town    string `json:"town"`
			County  string `json:"county"`
			State   string `json:"state"`
			Country string `json:"country"`
		} `json:"address"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		c.JSON(http.StatusOK, gin.H{"address": fmt.Sprintf("%s, %s", lat, lon), "detail": gin.H{}})
		return
	}

	village := firstNonEmpty(payload.Address.Village, payload.Address.Hamlet, payload.Address.Suburb)
	city := firstNonEmpty(payload.Address.City, payload.Address.Town, payload.Address.County)
	parts := compactStrings(payload.Address.Road, village, city, payload.Address.State, payload.Address.Country)
	address := strings.Join(parts, ", ")
	if address == "" {
		address = firstNonEmpty(payload.DisplayName, fmt.Sprintf("%s, %s", lat, lon))
	}

	c.JSON(http.StatusOK, gin.H{
		"address": address,
		"detail": gin.H{
			"road":    payload.Address.Road,
			"village": village,
			"city":    city,
			"state":   payload.Address.State,
			"country": payload.Address.Country,
		},
	})
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func compactStrings(values ...string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			result = append(result, value)
		}
	}
	return result
}
