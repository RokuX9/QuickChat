import React from "react";
import { AppBar, Toolbar, Typography, Switch, Button } from "@mui/material";
import { useLocation, Location } from "react-router-dom";

export default function SiteBar({
  switchDarkMode,
  darkMode,
  disconnetPeer,
}: {
  switchDarkMode: () => void;
  darkMode: Boolean;
  disconnetPeer: () => void;
}) {
  const location: Location<any> = useLocation();
  const [isInSession, setIsInSession] = React.useState<Boolean>(false);
  React.useEffect(() => {
    location.pathname === "/session"
      ? setIsInSession(true)
      : setIsInSession(false);
  }, [location]);
  return (
    <AppBar>
      <Toolbar>
        <Typography variant="h5" flexGrow={1}>
          QuickChat
        </Typography>
        {isInSession ? (
          <Button color="error" variant="contained" onClick={disconnetPeer}>
            Disconnet
          </Button>
        ) : (
          ""
        )}
        <Switch color="default" onChange={switchDarkMode} value={darkMode} />
      </Toolbar>
    </AppBar>
  );
}
