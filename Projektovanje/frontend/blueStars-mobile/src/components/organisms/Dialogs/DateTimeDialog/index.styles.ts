import { StyleSheet, Platform } from "react-native";

export const getStyles = (Colors: any) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    backgroundColor: Colors.background,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadowColor,
        shadowOpacity: 0.12,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  calendar: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: Colors.background,
  },
  
  timeBlockSimple: {
    paddingVertical: 10,
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 0 : 10,
  },
  timeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  timeValueDisplay: {
    fontSize: 32, 
    fontWeight: "900",
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 15,
  },
  timeChangeButton: {
    width: '80%',
    maxWidth: 200,
  },
  
  actions: {
    marginTop: 18,
    justifyContent: "flex-end",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: Colors.borderColor,
    paddingTop: 12,
  },
  btnGhost: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  btnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.textLight,
  },
  pressed: {
    opacity: 0.85,
  },
});