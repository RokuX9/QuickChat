import { Paper, Typography, Button, Input, Box } from "@mui/material";
import React from "react";

export default function Session({
  sendMessage,
  checkSession,
  userId,
  messages,
}: {
  sendMessage: (message: String) => void;
  checkSession: () => void;
  userId: String;
  messages: Array<{ type: String; content: String; user: String }>;
}): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  React.useEffect(() => {
    checkSession();
  }, []);
  return (
    <Paper
      elevation={3}
      sx={{
        display: "flex",
        flexFlow: "column",
        padding: "10px",
        alignItems: "center",
        justifyContent: "space-between",
        width: "-webkit-fill-available",
        height: "-webkit-fill-available",
        position: "relative",
        marginTop: "64px",
      }}
    >
      <div
        className="messageboard"
        style={{
          textWrap: "wrap",
          overflowY: "scroll",
          width: "-webkit-fill-available",
        }}
      >
        {messages.map((message, i) => (
          <Typography
            key={i}
            data-type={message.type}
            sx={{ wordBreak: "break-word" }}
          >
            {message.user === userId ? "you" : "peer"} said: {message.content}
          </Typography>
        ))}
      </div>
      <Box
        component={"form"}
        onSubmit={(e) => {
          e.preventDefault();
          if (
            !inputRef.current!.value ||
            inputRef.current!.value.trim().length === 0
          )
            return;
          sendMessage(inputRef.current!.value);
          inputRef.current!.value = "";
        }}
        sx={{ display: "flex", width: "100%" }}
        ref={formRef}
      >
        <Input
          type="text"
          inputRef={inputRef}
          minRows={1}
          maxRows={2}
          fullWidth
          multiline
          onKeyDown={(e) => {
            e.key === "Enter"
              ? e.shiftKey
                ? ""
                : formRef.current!.requestSubmit()
              : "";
          }}
        />
        <Button type="submit">Submit</Button>
      </Box>
    </Paper>
  );
}
