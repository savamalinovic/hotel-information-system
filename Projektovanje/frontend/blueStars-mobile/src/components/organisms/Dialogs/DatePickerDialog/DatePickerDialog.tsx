import React, { useState } from 'react';
import {
  Modal,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Label } from '@/src/components/atoms/Label/Label';
import { useTheme } from '@/src/providers/ThemeProvider';
import { Icon } from '@/src/components/atoms/Icon/Icon';

interface DatePickerDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (startDate: Date, endDate: Date) => void;
}

const DatePickerDialog: React.FC<DatePickerDialogProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const { Colors } = useTheme();
  const today = new Date();
  
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [mode, setMode] = useState<'start' | 'end'>('start');
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const months = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  const daysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert to Monday = 0
  };

  const renderCalendar = () => {
    const days = daysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const cells = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Actual day cells
    for (let day = 1; day <= days; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isSelected = mode === 'start' 
        ? date.toDateString() === startDate.toDateString()
        : date.toDateString() === endDate.toDateString();
      
      const isInRange = startDate && endDate && date >= startDate && date <= endDate;

      cells.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isSelected && { backgroundColor: Colors.primary },
            !isSelected && isInRange && { backgroundColor: Colors.primary + '30' },
          ]}
          onPress={() => {
            if (mode === 'start') {
              setStartDate(date);
              setMode('end');
            } else {
              setEndDate(date);
            }
          }}
        >
          <Text
            style={[
              styles.dayText,
              { color: isSelected ? '#FFFFFF' : Colors.textPrimary },
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return cells;
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleConfirm = () => {
    if (startDate <= endDate) {
      onConfirm(startDate, endDate);
    } else {
      alert('Početni datum mora biti prije završnog datuma');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: Colors.background },
            ]}
          >
            <Label
              text="Izaberite period"
              size="lg"
              color={Colors.textPrimary}
              className="font-bold"
            />

            {/* Date selection buttons */}
            <View style={styles.dateSelectionContainer}>
              <TouchableOpacity
                style={[
                  styles.dateSelectionButton,
                  { borderColor: Colors.borderColor },
                  mode === 'start' && { borderColor: Colors.primary, borderWidth: 2 },
                ]}
                onPress={() => setMode('start')}
              >
                <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>
                  Od
                </Text>
                <Text style={{ color: Colors.textPrimary, fontSize: 16, fontWeight: '600' }}>
                  {formatDate(startDate)}
                </Text>
              </TouchableOpacity>

              <Icon name="ArrowRight" size={20} color={Colors.textSecondary} />

              <TouchableOpacity
                style={[
                  styles.dateSelectionButton,
                  { borderColor: Colors.borderColor },
                  mode === 'end' && { borderColor: Colors.primary, borderWidth: 2 },
                ]}
                onPress={() => setMode('end')}
              >
                <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>
                  Do
                </Text>
                <Text style={{ color: Colors.textPrimary, fontSize: 16, fontWeight: '600' }}>
                  {formatDate(endDate)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Calendar header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
                <Icon name="ChevronLeft" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              
              <Text style={[styles.monthYear, { color: Colors.textPrimary }]}>
                {months[currentMonth]} {currentYear}
              </Text>
              
              <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
                <Icon name="ChevronRight" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Day labels */}
            <View style={styles.weekDays}>
              {['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'].map((day) => (
                <View key={day} style={styles.weekDayCell}>
                  <Text style={[styles.weekDayText, { color: Colors.textSecondary }]}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calendarGrid}>{renderCalendar()}</View>

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { borderColor: Colors.borderColor },
                ]}
                onPress={onClose}
              >
                <Label
                  text="Otkaži"
                  color={Colors.textSecondary}
                  className="font-semibold"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  { backgroundColor: Colors.primary },
                ]}
                onPress={handleConfirm}
              >
                <Label
                  text="Potvrdi"
                  color="#FFFFFF"
                  className="font-semibold"
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    minHeight: '90%',
    maxWidth: 300,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dateSelectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  dateSelectionButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default DatePickerDialog;