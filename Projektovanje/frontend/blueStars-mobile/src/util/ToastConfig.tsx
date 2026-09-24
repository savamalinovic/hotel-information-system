import {
  BaseToast,
  ErrorToast,
  type ToastConfig as ToastConfiguration,
  type ToastConfigParams,
} from "react-native-toast-message";
import { useTheme } from "@/src/providers/ThemeProvider";

type ToastRendererProps = ToastConfigParams<Record<string, never>>;

function SuccessToast(props: ToastRendererProps) {
  const { Colors } = useTheme();

  return (
    <BaseToast
      {...props}
      style={{
        backgroundColor: Colors.toastBackground,
        borderLeftColor: Colors.success,
      }}
      text1Style={{
        color: Colors.textPrimary,
        fontSize: 12,
        fontWeight: "600",
      }}
      text2Style={{
        color: Colors.textSecondary,
        fontSize: 10,
      }}
    />
  );
}

function FailureToast(props: ToastRendererProps) {
  const { Colors } = useTheme();

  return (
    <ErrorToast
      {...props}
      style={{
        backgroundColor: Colors.toastBackground,
        borderLeftColor: Colors.error,
        width: "90%",
      }}
      text1Style={{ color: Colors.textPrimary }}
      text2Style={{
        color: Colors.textSecondary,
        flexShrink: 1,
        flexWrap: "wrap",
        includeFontPadding: true,
      }}
      text2NumberOfLines={2}
    />
  );
}

function InfoToast(props: ToastRendererProps) {
  const { Colors } = useTheme();

  return (
    <BaseToast
      {...props}
      style={{
        backgroundColor: Colors.toastBackground,
        borderLeftColor: Colors.info,
      }}
      text1Style={{ color: Colors.textPrimary }}
      text2Style={{ color: Colors.textSecondary }}
    />
  );
}

export const ToastConfig: ToastConfiguration = {
  success: (props) => <SuccessToast {...props} />,
  error: (props) => <FailureToast {...props} />,
  info: (props) => <InfoToast {...props} />,
};
