import Pdf from "react-native-pdf";
import { StyleSheet, View } from "react-native";

export default function DemoReceiptPdfViewer({
  uri,
  onLoadComplete,
  onError,
}: {
  uri: string;
  onLoadComplete: (pages: number) => void;
  onError: () => void;
}) {
  return (
    <View style={styles.container}>
      <Pdf
        source={{ uri, cache: false }}
        onLoadComplete={(pages) => onLoadComplete(pages)}
        onError={onError}
        style={styles.pdf}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pdf: { flex: 1, width: "100%" },
});
