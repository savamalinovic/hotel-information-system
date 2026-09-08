import { Button, ButtonText } from "@/src/components/ui/button";

interface DialogButtonProps {
  title?: string;
  onPress: () => void;
  className?: string; 
  textClassName?: string;
}

export const DialogButton = ({
  title = "DialogButton",
  onPress,
  className,
  textClassName,
}: DialogButtonProps) => {
  return (
    <Button
      action="primary"
      variant="solid"
      size="lg"
      onPress={onPress}
      className={`w-[130px] h-[40px] rounded-[32px] justify-center items-center self-center bg-[rgb(var(--color-primary-500))] ${className ?? ""}`}
    >
      <ButtonText className={`text-white font-semibold ${textClassName ?? ""}`}>
        {title}
      </ButtonText>
    </Button>
  );
};
