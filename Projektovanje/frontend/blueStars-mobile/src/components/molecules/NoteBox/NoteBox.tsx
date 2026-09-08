import { View } from "react-native";
import { Textarea, TextareaInput } from "@/src/components/ui/textarea";
import { Icon } from "@/src/components/atoms/Icon/Icon";
import styles from "./index.styles";
import { useTheme } from "@/src/providers/ThemeProvider";

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  size?: "sm" | "md" | "lg" | "xl";
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
};

const NoteBox = ({
  value,
  onChangeText,
  placeholder = "",
  size = "lg",
  isInvalid = false,
  isDisabled = false,
  isReadOnly = false,
}: Props) => {

  const { Colors } = useTheme();

  return (
    <View style={styles.root}>
      <Textarea
        size={size}
        isInvalid={isInvalid}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
      >
        <TextareaInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          multiline
          textAlignVertical="top"
          style={styles.input}
        />
      </Textarea>

      <View pointerEvents="none" style={styles.pencil}>
        <Icon name="Pencil" size={20} color={Colors.iconMenu} />
      </View>
    </View>
  );
};

export default NoteBox;
