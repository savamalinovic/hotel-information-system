import { useTheme } from "@/src/providers/ThemeProvider";
import { Label } from "../../atoms/Label/Label";
import { VStack } from "../../ui/vstack";

interface Props {
	title: string;
	children: React.ReactNode;
}

export default function ProfileSection({ title, children }: Props) {
	const { Colors } = useTheme();
	
	return (
		<VStack style={{ gap: 10 }}>
			{/* Sekcija za profil */}
			<Label
				text={title}
				size="xl"
				color={Colors.primary}
				className="font-semibold"
			/>

			{children}
		</VStack>
	)
}