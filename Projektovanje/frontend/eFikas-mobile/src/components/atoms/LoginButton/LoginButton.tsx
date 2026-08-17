import { Button, ButtonText } from "@/src/components/ui/button";
import { HStack } from "@/src/components/ui/hstack";
import { Spinner } from "@/src/components/ui/spinner";

interface LoginButtonProps {
  title?: string;
  onPress: () => void;
  className?: string; 
  textClassName?: string;
  loadingTitle?: string;
  isLoading?: boolean;
}

export const LoginButton = ({
  title = "Login",
  onPress,
  className,
  textClassName,
  loadingTitle,
  isLoading = false,
}: LoginButtonProps) => {
  return (
    <Button
      action="primary"
      variant="solid"
      size="lg"
      onPress={onPress}
      disabled={isLoading}
      className={`w-[346px] h-[46px] rounded-[10px] justify-center items-center self-center bg-[rgb(var(--color-primary-500))] ${className ?? ""}`}
    >
      {isLoading ? (
        <HStack space="md">
          <ButtonText className={`text-white font-semibold ${textClassName ?? ""}`}>
            {loadingTitle}
          </ButtonText>
          <Spinner color="white" size="small" />
        </HStack>
      ) : (
        <ButtonText className={`text-white font-semibold ${textClassName ?? ""}`}>
          {title}
        </ButtonText>
      )}
    </Button>
  );
};
