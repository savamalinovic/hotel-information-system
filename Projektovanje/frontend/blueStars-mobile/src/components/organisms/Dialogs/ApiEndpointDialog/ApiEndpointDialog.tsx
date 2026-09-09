import { Button, ButtonText } from "@/src/components/ui/button";
import { HStack } from "@/src/components/ui/hstack";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/src/components/ui/modal";
import TextField from "@/src/components/atoms/TextField/TextField";
import { Text } from "@/src/components/ui/text";
import { useApiEndpoint } from "@/src/providers/ApiEndpointProvider";
import { DEFAULT_API_ROOT_URL } from "@/src/services/apiEndpointService";
import { useTheme } from "@/src/providers/ThemeProvider";
import { toastService } from "@/src/services/toastService";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

interface ApiEndpointDialogProps {
  visible: boolean;
  onClose: () => void;
}

export default function ApiEndpointDialog({ visible, onClose }: ApiEndpointDialogProps) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { rootUrl, setRootUrl } = useApiEndpoint();
  const [draftUrl, setDraftUrl] = useState(rootUrl);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraftUrl(rootUrl);
      setValidationError(null);
    }
  }, [rootUrl, visible]);

  const handleSave = async () => {
    setValidationError(null);
    setIsSaving(true);

    try {
      await setRootUrl(draftUrl);
      queryClient.clear();
      toastService.success(t("apiEndpoint.savedTitle"), t("apiEndpoint.savedMessage"));
      onClose();
    } catch {
      setValidationError(t("apiEndpoint.invalidMessage"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={visible} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent
        style={[
          styles.modalContainer,
          { backgroundColor: Colors.background, shadowColor: Colors.shadowColor },
        ]}
      >
        <ModalHeader>
          <Text style={[styles.title, { color: Colors.tertiary }]}>{t("apiEndpoint.title")}</Text>
        </ModalHeader>

        <ModalBody style={styles.body}>
          <Text style={[styles.description, { color: Colors.textSecondary }]}>
            {t("apiEndpoint.description")}
          </Text>
          <TextField
            iconName="Globe"
            inputProps={{
              value: draftUrl,
              onChangeText: (value: string) => {
                setDraftUrl(value);
                setValidationError(null);
              },
              autoCapitalize: "none",
              autoCorrect: false,
              keyboardType: "url",
              autoComplete: "off",
            }}
          />
          {validationError ? (
            <Text style={[styles.error, { color: Colors.deleteColor }]}>{validationError}</Text>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => {
              setDraftUrl(DEFAULT_API_ROOT_URL);
              setValidationError(null);
            }}
          >
            <Text style={[styles.reset, { color: Colors.primary }]}>{t("apiEndpoint.useDefault")}</Text>
          </TouchableOpacity>
        </ModalBody>

        <ModalFooter style={styles.footer}>
          <HStack style={styles.footerContent}>
            <Button
              action="secondary"
              disabled={isSaving}
              onPress={onClose}
              variant="outline"
              size="md"
              className="flex-1"
            >
              <ButtonText>{t("apiEndpoint.cancel")}</ButtonText>
            </Button>
            <Button
              action="primary"
              disabled={isSaving}
              onPress={() => void handleSave()}
              variant="solid"
              size="md"
              className="flex-1"
            >
              <ButtonText>{isSaving ? t("apiEndpoint.saving") : t("apiEndpoint.save")}</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    width: "90%",
    borderRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 20,
    elevation: 8,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  body: {
    width: "100%",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  error: {
    fontSize: 13,
    marginTop: 6,
  },
  reset: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 14,
  },
  footer: {
    width: "100%",
    marginTop: 6,
  },
  footerContent: {
    gap: 10,
    width: "100%",
  },
});
