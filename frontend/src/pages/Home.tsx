import React from "react";
import { Socket } from "socket.io-client";
import { Typography, Paper, Input, Button } from "@mui/material";

export default function Home({
  socket,
  setPeerId,
  userId,
}: {
  socket: Socket | null;
  setPeerId: (id: String) => void;
  userId: String | null;
}): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <Paper
      className="home"
      elevation={3}
      sx={{
        display: "flex",
        flexFlow: "column",
        height: "-webkit-fill-available",
        width: "-webkit-fill-available",
        margin: "10px",
        alignItems: "center",
        justifyContent: "space-around",
        marginTop: "64px",
      }}
    >
      <Typography variant="h1">QuickChat</Typography>
      <Typography variant="h2">{userId}</Typography>
      <div>
        <form
          className="search__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (inputRef.current) {
              socket?.emit("search-id", inputRef.current.value);
            }
          }}
        >
          <Input
            className="search__input"
            inputRef={inputRef}
            type="text"
            placeholder="Search Remote ID"
            onChange={(e) => {
              setPeerId(e.target.value);
            }}
          />
          <Button className="search__submit_button" type="submit">
            Search Id
          </Button>
        </form>
      </div>
    </Paper>
  );
}
