import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View, Platform } from "react-native";
import { Calendar } from "react-native-calendars";
import DateTimePicker from "@react-native-community/datetimepicker";


import { useStyles } from "@/src/hooks/useStyles";
import { getStyles } from "./index.styles";
import { useTheme } from "@/src/providers/ThemeProvider";
import { HStack } from "@/src/components/ui/hstack";

const dayjs = require("dayjs");

type Props = {
  visible: boolean;
  initialValue?: Date | null;
  onClose: () => void;
  onConfirm: (value: Date) => void;
};

const toKey = (d: Date) => dayjs(d).format("YYYY-MM-DD");

enum Step {
  STEP_DATE,
  STEP_TIME_PENDING, 
}

const DateTimeDialog: React.FC<Props> = ({
  visible,
  initialValue,
  onClose,
  onConfirm,
}) => {
  const { Colors } = useTheme();
  const styles = useStyles(getStyles);

  const base = initialValue ?? new Date();

  const [step, setStep] = useState<Step>(Step.STEP_DATE);
  const [date, setDate] = useState<Date>(base);
  const [time, setTime] = useState<Date>(base);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  useEffect(() => {
    const b = initialValue ?? new Date();
    setDate(b);
    setTime(b);
    setStep(Step.STEP_DATE);
  }, [visible, initialValue]);

  useEffect(() => {
    if (visible && step === Step.STEP_TIME_PENDING && Platform.OS === 'android' && !showAndroidPicker) {
      setShowAndroidPicker(true);
    }
  }, [visible, step]);

  const confirmSelection = (finalTime: Date) => {
    const next = new Date(date);
    next.setHours(finalTime.getHours());
    next.setMinutes(finalTime.getMinutes());
    next.setSeconds(0);
    next.setMilliseconds(0);
    onConfirm(next);
  };

  const handleNext = () => {
    if (Platform.OS === 'android') {
      setStep(Step.STEP_TIME_PENDING);
    } else {
      confirmSelection(time);
    }
  };

  const handleTimeChange = (_: any, selected: Date | undefined) => {
    setShowAndroidPicker(false);
    
    if (selected) {
      confirmSelection(selected);
    } else if (Platform.OS === 'android') {
      setStep(Step.STEP_DATE);
    }
  };

  const showActions = step === Step.STEP_DATE || Platform.OS === 'ios';
  
  const confirmText = Platform.OS === 'ios' && step === Step.STEP_TIME_PENDING ? "Confirm" : "Next (Time)";
  
  const cancelText = Platform.OS === 'ios' && step === Step.STEP_TIME_PENDING ? "Back" : "Cancel";

  const CalendarView = (
    <Calendar
      firstDay={1}
      enableSwipeMonths
      markedDates={{
        [toKey(date)]: { selected: true, selectedColor: Colors.primary },
      }}
      onDayPress={(d) => {
        const [y, m, dd] = d.dateString.split("-").map(Number);
        const next = new Date(date);
        next.setFullYear(y);
        next.setMonth(m - 1);
        next.setDate(dd);
        setDate(next);
      }}
      theme={{
        arrowColor: Colors.primary,
        monthTextColor: Colors.textPrimary,
        dayTextColor: Colors.textPrimary,
        textDisabledColor: Colors.tertiary,
        todayTextColor: Colors.primary,
        textMonthFontSize: 18,
        textMonthFontWeight: "700",
      }}
      style={styles.calendar}
    />
  );
  
  const IosTimePickerView = (
    <View style={styles.timeBlockSimple}>
      <Text style={styles.timeTitle}>Odaberite vrijeme za {dayjs(date).format("DD.MM.YYYY.")}</Text>
      <DateTimePicker
          value={time}
          mode="time"
          display="spinner"
          onChange={handleTimeChange}
          style={{ marginTop: 10 }}
      />
    </View>
  );

  const shouldShowCard = !(Platform.OS === 'android' && showAndroidPicker);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {shouldShowCard && (
          <Pressable style={styles.card} onPress={() => {}}>
            
            {step === Step.STEP_DATE ? CalendarView : (Platform.OS === 'ios' ? IosTimePickerView : null)}

            {showActions && (
              <HStack space="md" style={styles.actions}>
                <Pressable onPress={step === Step.STEP_DATE ? onClose : () => setStep(Step.STEP_DATE)} style={styles.btnGhost}>
                  <Text style={styles.btnGhostText}>{cancelText}</Text>
                </Pressable>
                <Pressable onPress={handleNext} style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>{confirmText}</Text>
                </Pressable>
              </HStack>
            )}
          </Pressable>
        )}

        {showAndroidPicker && (
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour
            display="default"
            onChange={handleTimeChange}
          />
        )}
      </Pressable>
    </Modal>
  );
};

export default DateTimeDialog;