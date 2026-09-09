import { TouchableOpacity } from "react-native";
import { Path, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { VStack } from "@/src/components/ui/vstack";
import { LoginButton } from "@/src/components/atoms/LoginButton/LoginButton";
import { Label } from "@/src/components/atoms/Label/Label";
import FormField from "@/src/components/molecules/FormField/FormField";
import AuthScreenTemplate from "@/src/components/templates/AuthScreenTemplate/AuthScreenTemplate";
import { useAuth } from "@/src/hooks/useAuth";
import { useTheme } from "@/src/providers/ThemeProvider";
import { LoginRequest, LucideIconName } from "@/src/types/types";
import { LoginValidation } from "@/src/util/validationSchemas";
import ApiEndpointDialog from "@/src/components/organisms/Dialogs/ApiEndpointDialog/ApiEndpointDialog";
import { isLocalApiOverrideEnabled } from "@/src/services/apiEndpointService";
import { useState } from "react";

export default function AuthScreen() {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const { login, isLoggingIn } = useAuth();
  const [apiEndpointDialogVisible, setApiEndpointDialogVisible] = useState(false);
  const { control, handleSubmit } = useForm<LoginValidation.FormValues>({
    resolver: zodResolver(LoginValidation.schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const renderLoginField = (
    label: string,
    name: Path<LoginValidation.FormValues>,
    placeholder: string,
    type: "text" | "password",
    iconName: LucideIconName
  ) => (
    <FormField
      control={control}
      iconName={iconName}
      label={label}
      name={name}
      placeholder={placeholder}
      type={type}
    />
  );

  const onSubmit = (data: LoginValidation.FormValues) => {
    const request: LoginRequest = {
      email: data.email,
      password: data.password,
    };
    login(request);
  };

  return (
    <>
      <AuthScreenTemplate
        authForm={
          <VStack space="xl" className="w-full px-6">
            <VStack space="lg" className="w-full">
              {renderLoginField(
                "Email",
                "email",
                "markomarkovic@gmail.com",
                "text",
                "Mail"
              )}
              {renderLoginField(
                t("auth.login.password"),
                "password",
                "••••••••",
                "password",
                "Lock"
              )}
            </VStack>

            <LoginButton
              className="mt-2"
              isLoading={isLoggingIn}
              loadingTitle={t("auth.login.loadingTitle")}
              onPress={() => handleSubmit(onSubmit)()}
              title={t("auth.login.loginButton")}
            />

            <TouchableOpacity
              activeOpacity={0.6}
              className="self-center mt-1"
              onPress={() => router.push("/(auth)/forgotPassword")}
            >
              <Label
                color={Colors.primary}
                className="font-semibold text-center text-sm"
                text={t("auth.login.forgotPassword")}
              />
            </TouchableOpacity>

            {isLocalApiOverrideEnabled && (
              <TouchableOpacity
                activeOpacity={0.6}
                className="self-center mt-1"
                onPress={() => setApiEndpointDialogVisible(true)}
              >
                <Label
                  color={Colors.primary}
                  className="font-semibold text-center text-sm"
                  text={t("apiEndpoint.openSettings")}
                />
              </TouchableOpacity>
            )}
          </VStack>
        }
      />

      <ApiEndpointDialog
        visible={apiEndpointDialogVisible}
        onClose={() => setApiEndpointDialogVisible(false)}
      />
    </>
  );
}
