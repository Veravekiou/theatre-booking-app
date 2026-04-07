import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import api from '../../services/api';

export default function HomeScreen() {
  const [theatres, setTheatres] = useState<any[]>([]);

  useEffect(() => {
    fetchTheatres();
  }, []);

  const fetchTheatres = async () => {
    try {
      const response = await api.get('/theatres');
      setTheatres(response.data);
    } catch (error: any) {
      console.log(error.response?.data || error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Theatres</Text>

        <FlatList
          data={theatres}
          keyExtractor={(item) => item.theatre_id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.text}>{item.location}</Text>
              <Text style={styles.text}>{item.description}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No theatres found</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f2f2f2',
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
    textAlign: 'center',
    color: '#000',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  text: {
    color: '#333',
    marginBottom: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#333',
    marginTop: 20,
  },
});