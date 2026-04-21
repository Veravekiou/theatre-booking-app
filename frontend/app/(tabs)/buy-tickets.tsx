import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import {
  cardShadow,
  softOrbBottom,
  softOrbTop,
  uiColors
} from '../../constants/ui';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatCurrency, formatShowDateTime } from '../../utils/formatters';

type Showtime = {
  showtime_id: number;
  show_id: number;
  show_title: string;
  duration: number;
  age_rating: string | null;
  theatre_name: string;
  theatre_location: string;
  show_date: string;
  show_time: string;
  hall: string;
  price: number;
  available_seats: number;
};

type VenueOption = {
  key: string;
  label: string;
};

const getSingleParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const getVenueKey = (showtime: Showtime) =>
  `${showtime.theatre_name}|||${showtime.theatre_location}`;

const formatDateOption = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('el-GR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  });
};

const formatTimeOption = (value: string) => {
  if (value.length >= 5) {
    return value.slice(0, 5);
  }

  return value;
};

export default function BuyTicketsScreen() {
  const params = useLocalSearchParams<{
    showId?: string | string[];
    title?: string | string[];
  }>();

  const incomingShowId = (getSingleParam(params.showId) || '').trim();
  const incomingTitle = (getSingleParam(params.title) || '').trim();

  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const availableShowtimes = useMemo(
    () => showtimes.filter((row) => row.available_seats > 0),
    [showtimes]
  );

  const venueOptions = useMemo<VenueOption[]>(() => {
    const unique = new Map<string, VenueOption>();

    availableShowtimes.forEach((row) => {
      const key = getVenueKey(row);
      if (!unique.has(key)) {
        unique.set(key, {
          key,
          label: `${row.theatre_name} - ${row.theatre_location}`
        });
      }
    });

    return Array.from(unique.values());
  }, [availableShowtimes]);

  const dateOptions = useMemo(() => {
    if (!selectedVenue) {
      return [];
    }

    const dates = availableShowtimes
      .filter((row) => getVenueKey(row) === selectedVenue)
      .map((row) => row.show_date);

    return Array.from(new Set(dates)).sort();
  }, [availableShowtimes, selectedVenue]);

  const timeOptions = useMemo(() => {
    if (!selectedVenue || !selectedDate) {
      return [];
    }

    const times = availableShowtimes
      .filter((row) => getVenueKey(row) === selectedVenue && row.show_date === selectedDate)
      .map((row) => row.show_time);

    return Array.from(new Set(times)).sort();
  }, [availableShowtimes, selectedVenue, selectedDate]);

  const selectedShowtime = useMemo(
    () =>
      availableShowtimes.find(
        (row) =>
          getVenueKey(row) === selectedVenue &&
          row.show_date === selectedDate &&
          row.show_time === selectedTime
      ) || null,
    [availableShowtimes, selectedVenue, selectedDate, selectedTime]
  );

  const initializeSelection = (rows: Showtime[]) => {
    if (!rows.length) {
      setSelectedVenue('');
      setSelectedDate('');
      setSelectedTime('');
      return;
    }

    const firstVenue = getVenueKey(rows[0]);
    const firstDates = rows
      .filter((row) => getVenueKey(row) === firstVenue)
      .map((row) => row.show_date);
    const uniqueDates = Array.from(new Set(firstDates)).sort();
    const firstDate = uniqueDates[0] || '';
    const firstTimes = rows
      .filter((row) => getVenueKey(row) === firstVenue && row.show_date === firstDate)
      .map((row) => row.show_time);
    const uniqueTimes = Array.from(new Set(firstTimes)).sort();

    setSelectedVenue(firstVenue);
    setSelectedDate(firstDate);
    setSelectedTime(uniqueTimes[0] || '');
  };

  useEffect(() => {
    const fetchShowtimes = async () => {
      try {
        setLoading(true);
        setErrorMessage('');

        const response = await api.get('/showtimes', {
          params: {
            showId: incomingShowId || undefined,
            title: incomingTitle || undefined
          }
        });

        const rows: Showtime[] = response.data || [];
        setShowtimes(rows);
        initializeSelection(rows.filter((row) => row.available_seats > 0));
      } catch (error: unknown) {
        setShowtimes([]);
        setErrorMessage(getErrorMessage(error, 'Failed to load ticket options.'));
      } finally {
        setLoading(false);
      }
    };

    fetchShowtimes();
  }, [incomingShowId, incomingTitle]);

  const handleVenueSelection = (venueKey: string) => {
    setSelectedVenue(venueKey);

    const venueDates = showtimes
      .filter((row) => row.available_seats > 0)
      .filter((row) => getVenueKey(row) === venueKey)
      .map((row) => row.show_date);
    const uniqueDates = Array.from(new Set(venueDates)).sort();
    const nextDate = uniqueDates[0] || '';

    setSelectedDate(nextDate);

    const venueTimes = showtimes
      .filter((row) => row.available_seats > 0)
      .filter((row) => getVenueKey(row) === venueKey && row.show_date === nextDate)
      .map((row) => row.show_time);
    const uniqueTimes = Array.from(new Set(venueTimes)).sort();
    setSelectedTime(uniqueTimes[0] || '');
  };

  const handleDateSelection = (dateValue: string) => {
    setSelectedDate(dateValue);

    const dateTimes = showtimes
      .filter((row) => row.available_seats > 0)
      .filter((row) => getVenueKey(row) === selectedVenue && row.show_date === dateValue)
      .map((row) => row.show_time);
    const uniqueTimes = Array.from(new Set(dateTimes)).sort();
    setSelectedTime(uniqueTimes[0] || '');
  };

  const fallbackShowtime = selectedShowtime || availableShowtimes[0] || showtimes[0] || null;
  const showTitle = fallbackShowtime?.show_title || incomingTitle || 'Show';
  const canSelectSeats = Boolean(selectedShowtime && selectedShowtime.available_seats > 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundOrbTop} />
      <View style={styles.backgroundOrbBottom} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Now Showing</Text>
          <Text style={styles.heroTitle}>{showTitle}</Text>
          <Text style={styles.heroSubtitle}>Choose location, day and time before seat selection.</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={uiColors.primary} style={styles.loader} />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : showtimes.length === 0 ? (
          <Text style={styles.emptyText}>No showtimes available for this show.</Text>
        ) : availableShowtimes.length === 0 ? (
          <Text style={styles.emptyText}>No available showtimes for this show right now.</Text>
        ) : (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.optionsWrap}>
                {venueOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.optionChip,
                      selectedVenue === option.key && styles.optionChipActive
                    ]}
                    onPress={() => {
                      handleVenueSelection(option.key);
                    }}>
                    <Text
                      style={[
                        styles.optionChipText,
                        selectedVenue === option.key && styles.optionChipTextActive
                      ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Day</Text>
              <View style={styles.optionsWrap}>
                {dateOptions.map((dateValue) => (
                  <TouchableOpacity
                    key={dateValue}
                    style={[
                      styles.optionChip,
                      selectedDate === dateValue && styles.optionChipActive
                    ]}
                    onPress={() => {
                      handleDateSelection(dateValue);
                    }}>
                    <Text
                      style={[
                        styles.optionChipText,
                        selectedDate === dateValue && styles.optionChipTextActive
                      ]}>
                      {formatDateOption(dateValue)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Time</Text>
              <View style={styles.optionsWrap}>
                {timeOptions.map((timeValue) => (
                  <TouchableOpacity
                    key={timeValue}
                    style={[
                      styles.optionChip,
                      selectedTime === timeValue && styles.optionChipActive
                    ]}
                    onPress={() => {
                      setSelectedTime(timeValue);
                    }}>
                    <Text
                      style={[
                        styles.optionChipText,
                        selectedTime === timeValue && styles.optionChipTextActive
                      ]}>
                      {formatTimeOption(timeValue)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {selectedShowtime ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Selected Show</Text>
                <Text style={styles.summaryLine}>
                  {formatShowDateTime(selectedShowtime.show_date, selectedShowtime.show_time)}
                </Text>
                <Text style={styles.summaryLine}>
                  {selectedShowtime.theatre_name} - {selectedShowtime.theatre_location}
                </Text>
                <Text style={styles.summaryLine}>Hall: {selectedShowtime.hall}</Text>
                <Text style={styles.summaryLine}>
                  Price: {formatCurrency(selectedShowtime.price)}
                </Text>
                <Text style={styles.summaryLine}>
                  Available seats: {selectedShowtime.available_seats}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.selectSeatsButton,
                !canSelectSeats && styles.selectSeatsButtonDisabled
              ]}
              disabled={!canSelectSeats}
              onPress={() => {
                if (!selectedShowtime) {
                  return;
                }

                router.push(`/showtimes/${selectedShowtime.showtime_id}`);
              }}>
              <Text style={styles.selectSeatsButtonText}>
                {canSelectSeats ? 'Select Seats' : 'No Seats Available'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: uiColors.background
  },
  backgroundOrbTop: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: softOrbTop,
    top: -92,
    right: -62
  },
  backgroundOrbBottom: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: softOrbBottom,
    bottom: -118,
    left: -74
  },
  container: {
    padding: 16,
    paddingBottom: 28
  },
  heroCard: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
    alignItems: 'center'
  },
  heroEyebrow: {
    color: '#e7c58f',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center'
  },
  heroTitle: {
    color: uiColors.heroText,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center'
  },
  heroSubtitle: {
    color: '#f0d6ac',
    textAlign: 'center'
  },
  loader: {
    marginTop: 24
  },
  errorText: {
    textAlign: 'center',
    color: uiColors.danger,
    marginTop: 24
  },
  emptyText: {
    textAlign: 'center',
    color: uiColors.textMuted,
    marginTop: 24
  },
  sectionCard: {
    backgroundColor: uiColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiColors.border,
    padding: 12,
    marginBottom: 10,
    ...cardShadow
  },
  sectionTitle: {
    color: uiColors.text,
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 15
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: uiColors.border,
    backgroundColor: uiColors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  optionChipActive: {
    backgroundColor: uiColors.primary,
    borderColor: uiColors.primaryDark,
    ...cardShadow
  },
  optionChipText: {
    color: uiColors.textMuted,
    fontWeight: '600'
  },
  optionChipTextActive: {
    color: '#fff'
  },
  summaryCard: {
    backgroundColor: uiColors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: uiColors.border,
    padding: 12,
    marginTop: 4,
    marginBottom: 12
  },
  summaryTitle: {
    color: uiColors.text,
    fontWeight: '700',
    marginBottom: 6
  },
  summaryLine: {
    color: uiColors.textMuted,
    marginBottom: 2
  },
  selectSeatsButton: {
    backgroundColor: uiColors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: uiColors.primaryDark,
    ...cardShadow
  },
  selectSeatsButtonDisabled: {
    opacity: 0.65
  },
  selectSeatsButtonText: {
    textAlign: 'center',
    color: uiColors.buttonPrimaryText,
    fontWeight: '700'
  }
});
