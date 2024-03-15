import { AppBar, Toolbar, Typography, Switch } from "@mui/material";

export default function SiteBar({
	switchDarkMode,
	darkMode,
}: {
	switchDarkMode: () => void;
	darkMode: Boolean;
}) {
	return (
		<AppBar position="static">
			<Toolbar>
				<Typography
					variant="h5"
					flexGrow={1}
				>
					QuickChat
				</Typography>
				<Switch
					color="default"
					onChange={switchDarkMode}
					value={darkMode}
				/>
			</Toolbar>
		</AppBar>
	);
}
