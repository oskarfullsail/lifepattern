package test

import (
	"time"

	"lifepattern-api/internal/database"
)

// TestData contains common test data
type TestData struct {
	ValidRoutineLog   database.RoutineLog
	InvalidRoutineLog database.RoutineLog
	ValidAIReport     database.AIReport
}

// NewTestData creates a new TestData instance with sample data
func NewTestData() *TestData {
	return &TestData{
		ValidRoutineLog: database.RoutineLog{
			UserID:           1,
			SleepHours:       8.0,
			MealTimes:        []string{"07:30", "12:00", "18:30"},
			ScreenTime:       4.5,
			ExerciseDuration: 1.0,
			WakeUpTime:       "07:00",
			BedTime:          "23:00",
			WaterIntake:      2.5,
			StressLevel:      4,
			LogDate:          time.Now().Format("2006-01-02"),
		},
		InvalidRoutineLog: database.RoutineLog{
			UserID:           1,
			SleepHours:       -1.0, // Invalid
			MealTimes:        []string{},
			ScreenTime:       25.0, // Invalid
			ExerciseDuration: 1.0,
			WakeUpTime:       "", // Invalid
			BedTime:          "23:00",
			WaterIntake:      2.5,
			StressLevel:      11, // Invalid
			LogDate:          time.Now().Format("2006-01-02"),
		},
		ValidAIReport: database.AIReport{
			RoutineLogID:      1,
			IsAnomaly:         true,
			ConfidenceScore:   0.85,
			AnomalyType:       "high_screen_time",
			Recommendations:   []string{"Reduce screen time", "Take more breaks"},
			AIServiceResponse: `{"is_anomaly": true, "confidence": 0.85}`,
		},
	}
}

// CreateSampleRoutineLogs creates multiple sample routine logs for testing
func CreateSampleRoutineLogs(userID int, count int) []database.RoutineLog {
	logs := make([]database.RoutineLog, count)

	for i := 0; i < count; i++ {
		logs[i] = database.RoutineLog{
			UserID:           userID,
			SleepHours:       7.0 + float64(i%3), // Varies between 7-9 hours
			MealTimes:        []string{"08:00", "13:00", "19:00"},
			ScreenTime:       4.0 + float64(i%4), // Varies between 4-7 hours
			ExerciseDuration: 0.5 + float64(i%2), // Varies between 0.5-1.5 hours
			WakeUpTime:       "07:00",
			BedTime:          "23:00",
			WaterIntake:      2.0 + float64(i%3), // Varies between 2-4 liters
			StressLevel:      3 + i%5,            // Varies between 3-7
			LogDate:          time.Now().AddDate(0, 0, -i).Format("2006-01-02"),
		}
	}

	return logs
}

// CreateSampleAIReports creates multiple sample AI reports for testing
func CreateSampleAIReports(logIDs []int) []database.AIReport {
	reports := make([]database.AIReport, len(logIDs))

	anomalyTypes := []string{
		"high_screen_time",
		"sleep_deprivation",
		"low_exercise",
		"irregular_meals",
		"high_stress",
	}

	recommendations := [][]string{
		{"Reduce screen time", "Take more breaks"},
		{"Get more sleep", "Establish bedtime routine"},
		{"Increase physical activity", "Find enjoyable exercises"},
		{"Eat at regular times", "Plan meals ahead"},
		{"Practice stress management", "Consider meditation"},
	}

	for i, logID := range logIDs {
		anomalyIndex := i % len(anomalyTypes)
		reports[i] = database.AIReport{
			RoutineLogID:      logID,
			IsAnomaly:         i%2 == 0,               // Alternate between anomaly and normal
			ConfidenceScore:   0.7 + float64(i%3)*0.1, // Varies between 0.7-0.9
			AnomalyType:       anomalyTypes[anomalyIndex],
			Recommendations:   recommendations[anomalyIndex],
			AIServiceResponse: `{"is_anomaly": true, "confidence": 0.85}`,
		}
	}

	return reports
}
