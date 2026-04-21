import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import api from '../../services/api';
import {
  cardShadow,
  softOrbBottom,
  softOrbTop,
  uiColors
} from '../../constants/ui';
import { getErrorMessage } from '../../utils/errorMessage';
import { isValidIsoDateInput } from '../../utils/formatters';

type Show = {
  show_id: number;
  theatre_id: number;
  title: string;
  description: string;
  duration: number;
  age_rating: string | null;
  theatre_name: string;
  theatre_location: string;
};

type ShowFilters = {
  theatreId?: string;
  title?: string;
  date?: string;
};

const getSingleParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateFromFilter = (value: string) => {
  if (!isValidIsoDateInput(value) || !value.trim()) {
    return new Date();
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function ShowsScreen() {
  const params = useLocalSearchParams<{
    theatreId?: string | string[];
    title?: string | string[];
    date?: string | string[];
  }>();

  const incomingTheatreIdParam = getSingleParam(params.theatreId) || '';
  const incomingTitleParam = getSingleParam(params.title) || '';
  const incomingDateParam = getSingleParam(params.date) || '';

  const [shows, setShows] = useState<Show[]>([]);
  const [theatreIdFilter, setTheatreIdFilter] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerDateValue, setPickerDateValue] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchShows = async (filters?: ShowFilters, withLoading = true) => {
    try {
      if (withLoading) {
        setLoading(true);
      }

      setErrorMessage('');

      const response = await api.get('/shows', {
        params: filters
      });

      setShows(response.data || []);
    } catch (error: unknown) {
      setShows([]);
      setErrorMessage(getErrorMessage(error, 'Failed to load shows.'));
    } finally {
      if (withLoading) {
        setLoading(false);
      }
    }
  };

  const buildFilters = (): ShowFilters => ({
    theatreId: theatreIdFilter.trim() || undefined,
    title: titleFilter.trim() || undefined,
    date: dateFilter.trim() || undefined
  });

  useEffect(() => {
    const incomingTheatreId = incomingTheatreIdParam.trim();
    const incomingTitle = incomingTitleParam.trim();
    const incomingDate = incomingDateParam.trim();

    setTheatreIdFilter(incomingTheatreId);
    setTitleFilter(incomingTitle);
    setDateFilter(incomingDate);

    fetchShows({
      theatreId: incomingTheatreId || undefined,
      title: incomingTitle || undefined,
      date: incomingDate || undefined
    });
  }, [incomingTheatreIdParam, incomingTitleParam, incomingDateParam]);

  const handleSearch = () => {
    const dateValue = dateFilter.trim();
    if (!isValidIsoDateInput(dateValue)) {
      Alert.alert('Invalid date', 'Please use date format YYYY-MM-DD.');
      return;
    }

    fetchShows(buildFilters());
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setDatePickerVisible(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    const nextDate = selectedDate || pickerDateValue;
    setPickerDateValue(nextDate);
    setDateFilter(toIsoDate(nextDate));
  };

  const openDatePicker = () => {
    setPickerDateValue(getDateFromFilter(dateFilter));
    setDatePickerVisible(true);
  };

  const handleClear = () => {
    setTheatreIdFilter('');
    setTitleFilter('');
    setDateFilter('');
    setDatePickerVisible(false);
    fetchShows();
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchShows(buildFilters(), false);
    } finally {
      setRefreshing(false);
    }
  };

  const renderShow = ({ item }: { item: Show }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.badge}>{item.age_rating || 'All ages'}</Text>
      </View>
      <Text style={styles.meta}>{item.theatre_name} - {item.theatre_location}</Text>
      <Text style={styles.meta}>Duration: {item.duration} minutes</Text>
      <Text style={styles.description}>{item.description || 'No description available.'}</Text>
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() =>
          router.push({
            pathname: '/(tabs)/explore',
            params: {
              showId: String(item.show_id),
              title: item.title
            }
          })
        }>
        <Text style={styles.ctaText}>View showtimes</Text>
      </TouchableOpacity>
    </View>
  );

  const showsCountLabel = shows.length === 1 ? 'show found' : 'shows found';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundOrbTop} />
      <View style={styles.backgroundOrbBottom} />

      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Catalogue</Text>
          <Text style={styles.heroTitle}>Shows</Text>
          <Text style={styles.heroSubtitle}>Browse productions and jump to showtimes.</Text>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipValue}>{shows.length}</Text>
            <Text style={styles.heroChipLabel}>{showsCountLabel}</Text>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroActionPrimary}
              onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.heroActionPrimaryText}>Browse all showtimes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {theatreIdFilter ? (
          <View style={styles.filterBanner}>
            <Text style={styles.filterBannerText}>Filtered by selected theatre</Text>
            <TouchableOpacity
              style={styles.filterBannerButton}
              onPress={() => {
                setTheatreIdFilter('');
                fetchShows({
                  title: titleFilter.trim() || undefined,
                  date: dateFilter.trim() || undefined
                });
              }}>
              <Text style={styles.filterBannerButtonText}>Show all theatres</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.searchPanel}>
          <TextInput
            style={styles.searchInput}
            placeholder="Show title"
            placeholderTextColor="#9f7f66"
            value={titleFilter}
            onChangeText={setTitleFilter}
          />

          <View style={styles.searchRow}>
            <TouchableOpacity style={styles.datePickerButton} onPress={openDatePicker}>
              <Text style={dateFilter ? styles.datePickerValue : styles.datePickerPlaceholder}>
                {dateFilter || 'Select date'}
              </Text>
            </TouchableOpacity>
            {dateFilter ? (
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => {
                  setDateFilter('');
                }}>
                <Text style={styles.clearDateButtonText}>Clear date</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {datePickerVisible ? (
            <View style={styles.pickerCard}>
              <DateTimePicker
                value={pickerDateValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
              {Platform.OS === 'ios' ? (
                <TouchableOpacity
                  style={styles.pickerDoneButton}
                  onPress={() => {
                    setDatePickerVisible(false);
                  }}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.primaryButtonText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={uiColors.primary} style={styles.loader} />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : (
          <FlatList
            data={shows}
            keyExtractor={(item) => item.show_id.toString()}
            renderItem={renderShow}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={<Text style={styles.emptyText}>No shows found</Text>}
          />
        )}
      </View>
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
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: softOrbTop,
    top: -88,
    left: -65
  },
  backgroundOrbBottom: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: softOrbBottom,
    bottom: -112,
    right: -70
  },
  container: {
    flex: 1,
    padding: 16
  },
  heroCard: {
    backgroundColor: uiColors.hero,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    ...cardShadow
  },
  heroEyebrow: {
    color: '#e7c58f',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  heroTitle: {
    color: uiColors.heroText,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4
  },
  heroSubtitle: {
    color: '#f0d6ac',
    marginBottom: 12
  },
  heroChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  heroChipValue: {
    color: uiColors.heroText,
    fontWeight: '800',
    fontSize: 16
  },
  heroChipLabel: {
    color: '#f4e3c8',
    fontSize: 12
  },
  heroActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8
  },
  heroActionPrimary: {
    backgroundColor: uiColors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: uiColors.primaryDark,
    ...cardShadow
  },
  heroActionPrimaryText: {
    color: uiColors.buttonPrimaryText,
    fontWeight: '700'
  },
  filterBanner: {
    backgroundColor: '#f8efe3',
    borderWidth: 1,
    borderColor: '#e6d2b4',
    borderRadius: 12,
    marginBottom: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  filterBannerText: {
    color: uiColors.primaryDark,
    flex: 1,
    fontWeight: '600'
  },
  filterBannerButton: {
    backgroundColor: uiColors.buttonSecondary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#dbc4aa'
  },
  filterBannerButtonText: {
    color: uiColors.buttonSecondaryText,
    fontWeight: '700',
    fontSize: 12
  },
  searchPanel: {
    backgroundColor: uiColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiColors.border,
    padding: 12,
    marginBottom: 12,
    ...cardShadow
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  searchInput: {
    borderWidth: 1,
    borderColor: uiColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: uiColors.surface,
    color: uiColors.text
  },
  datePickerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: uiColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: uiColors.surface
  },
  datePickerPlaceholder: {
    color: '#9f7f66'
  },
  datePickerValue: {
    color: uiColors.text,
    fontWeight: '600'
  },
  clearDateButton: {
    backgroundColor: uiColors.buttonSecondary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#dbc4aa'
  },
  clearDateButtonText: {
    color: uiColors.buttonSecondaryText,
    fontWeight: '700',
    fontSize: 12
  },
  pickerCard: {
    borderWidth: 1,
    borderColor: uiColors.border,
    borderRadius: 12,
    backgroundColor: uiColors.surface,
    marginTop: 8
  },
  pickerDoneButton: {
    alignSelf: 'flex-end',
    marginRight: 10,
    marginBottom: 10,
    marginTop: 2,
    backgroundColor: uiColors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: uiColors.primaryDark
  },
  pickerDoneText: {
    color: uiColors.buttonPrimaryText,
    fontWeight: '700'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  searchButton: {
    flex: 1,
    backgroundColor: uiColors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: uiColors.primaryDark,
    ...cardShadow
  },
  clearButton: {
    flex: 1,
    backgroundColor: uiColors.buttonSecondary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d6bea4'
  },
  primaryButtonText: {
    color: uiColors.buttonPrimaryText,
    fontWeight: '700'
  },
  secondaryButtonText: {
    color: uiColors.buttonSecondaryText,
    fontWeight: '700'
  },
  listContent: {
    paddingBottom: 26
  },
  card: {
    backgroundColor: uiColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiColors.border,
    padding: 12,
    marginBottom: 12,
    ...cardShadow
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: uiColors.text
  },
  badge: {
    backgroundColor: '#f7e2bd',
    color: '#7a4a14',
    fontWeight: '700',
    fontSize: 12,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  meta: {
    color: uiColors.textMuted,
    marginBottom: 2
  },
  description: {
    color: uiColors.textMuted,
    marginTop: 6
  },
  ctaButton: {
    marginTop: 10,
    backgroundColor: uiColors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: uiColors.primaryDark,
    ...cardShadow
  },
  ctaText: {
    color: uiColors.buttonPrimaryText,
    fontWeight: '700'
  },
  loader: {
    marginTop: 24
  },
  emptyText: {
    textAlign: 'center',
    color: uiColors.textMuted,
    marginTop: 24
  },
  errorText: {
    textAlign: 'center',
    color: uiColors.danger,
    marginTop: 24
  }
});
