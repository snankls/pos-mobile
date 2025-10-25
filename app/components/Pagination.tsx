import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  currentCount: number;
  onPageChange: (newPage: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  totalItems,
  currentCount,
  onPageChange,
}: PaginationProps) {
  return (
    <View style={styles.pagination}>
      <View style={styles.paginationInfo}>
        <Text style={styles.paginationText}>
          Showing {currentCount} of {totalItems}
        </Text>
      </View>
      <View style={styles.paginationControls}>
        <TouchableOpacity
          disabled={page <= 1}
          onPress={() => onPageChange(page - 1)}
          style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
        >
          <Ionicons
            name="chevron-back-outline"
            size={20}
            color={page <= 1 ? '#C7C7CC' : '#007AFF'}
          />
        </TouchableOpacity>

        <Text style={styles.pageIndicatorText}>
          Page {page} of {totalPages}
        </Text>

        <TouchableOpacity
          disabled={page >= totalPages}
          onPress={() => onPageChange(page + 1)}
          style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
        >
          <Ionicons
            name="chevron-forward-outline"
            size={20}
            color={page >= totalPages ? '#C7C7CC' : '#007AFF'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#E5E5EA',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  paginationInfo: {
    flex: 1,
  },
  paginationText: {
    fontSize: 13,
    color: '#6B7280',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageButton: {
    padding: 6,
    borderRadius: 6,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageIndicatorText: {
    fontSize: 13,
    color: '#374151',
    marginHorizontal: 6,
  },
});
