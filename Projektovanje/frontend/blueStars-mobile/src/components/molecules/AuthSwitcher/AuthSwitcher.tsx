import { HStack } from "@/src/components/ui/hstack";
import { useState } from "react";
import { SegmentedControl } from "../../atoms/SegmentedControl/SegmentedControl";

type AuthMode = 'login' | 'register';

interface Props {
  onModeChange: (mode: AuthMode) => void;
  initialMode?: AuthMode;
}

export default function AuthSwitcher({ onModeChange, initialMode = 'login' }: Props ) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);

  const handleSegmentChange = (option: string) => {
    const newMode = option === 'Prijava' ? 'login' : 'register';
    setAuthMode(newMode);
    onModeChange(newMode);
  };

  const selectedOption = authMode === 'login' ? 'Prijava' : 'Registracija';

  return (
    <HStack className="w-full justify-center items-center">
      <SegmentedControl
        options={['Prijava', 'Registracija']}
        selectedOption={selectedOption}
        onOptionPress={handleSegmentChange}
      />
    </HStack>
  );
};