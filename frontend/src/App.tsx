import "./App.css";
import React from "react";
import { Socket, io } from "socket.io-client";
import { Routes, Route, useNavigate, NavigateFunction } from "react-router-dom";
import Peer, { SignalData } from "simple-peer";
import { Paper, ThemeProvider, createTheme } from "@mui/material";
import SiteBar from "./components/siteBar/SiteBar";
import Home from "./pages/Home";
import Session from "./pages/Session";
export type Message = {
  type: String;
  content: String | FileMetadata;
  user: String;
};
export type FileMetadata = { fileName: string; fileSize: string };

const worker = new Worker("../worker.js");

const calculateFileSize = (size: number) => {
  if (size >= 1073741824) return `${Math.round(size / 1073741824)}GiB`;
  if (size >= 1048576) return `${Math.round(size / 1048576)}MiB`;
  if (size >= 1024) return `${Math.round(size / 1024)}KiB`;
  return `${size}B`;
};

function App() {
  const socketRef = React.useRef<Socket | null>(null);
  const peerIdRef = React.useRef<String | null>(null);
  const peerRef = React.useRef<Peer.Instance | null>(null);
  const navigateRef = React.useRef<NavigateFunction>(useNavigate());
  const [userId, setUserId] = React.useState<String>("");
  const [darkMode, setDarkMode] = React.useState<Boolean>(false);
  const [messages, setMessages] = React.useState<Array<Message>>([]);

  const switchDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
    },
  });

  const checkSession = () => {
    if (!peerRef.current) navigateRef.current("/");
  };

  const configurePeer = (peer: Peer.Instance): Peer.Instance => {
    peer.on("connect", () => {
      navigateRef.current("/session");
    });
    peer.on("data", (data: String | ArrayBuffer | Buffer | Blob): void => {
      if (data instanceof Uint8Array) {
      }
      try {
        const parsedData: Message = JSON.parse(data.toString());
        switch (parsedData.type) {
          case "text":
            setMessages((messages) => [...messages, parsedData]);
            break;
          case "download-message":
            setMessages((messages) => [...messages, parsedData]);
            break;
          case "peer-disconnected":
            peerDisconnected();
            break;
          case "download-done":
            worker.postMessage("download");
            break;
          case "download-metadata":
            const content = parsedData.content as FileMetadata;
            worker.postMessage({
              type: "metadata",
              fileName: content.fileName,
              fileSize: content.fileSize,
            });
        }
      } catch {
        worker.postMessage(data);
        return;
      }
    });
    return peer;
  };

  const initiateConnection = (id: String): void => {
    const newPeer = new Peer({
      initiator: true,
    });
    newPeer.on("signal", (data) => {
      socketRef.current?.emit(`answer-search-id`, { data, id });
    });
    peerRef.current = configurePeer(newPeer);
  };

  const acceptConnection = (signalData: SignalData) => {
    if (peerRef.current === null) {
      const newPeer = new Peer();
      peerRef.current = configurePeer(newPeer);
      peerRef.current.on("signal", (data) => {
        socketRef.current?.emit(`accept-connection`, {
          data,
          id: peerIdRef.current,
        });
      });
      peerRef.current.signal(signalData);
    }
  };

  const finializeConnection = (signalData: SignalData) => {
    peerRef.current?.signal(signalData);
  };

  const sendMessage = (message: String): void => {
    const messageObject = { type: "text", content: message, user: userId };
    peerRef.current?.send(JSON.stringify(messageObject));
    setMessages([...messages, messageObject]);
  };

  const sendFile = (file: File): void => {
    const calculatedFileSize = calculateFileSize(file.size);
    peerRef.current!.write(
      JSON.stringify({
        type: "download-metadata",
        content: {
          fileSize: calculatedFileSize,
          fileName: file.name,
        },
        user: userId,
      }),
    );
    const downloadMessage = {
      type: "download-message",
      content: `${file.name} ${calculatedFileSize}`,
      user: userId,
    };
    peerRef.current!.write(JSON.stringify(downloadMessage));
    setMessages((messages) => [...messages, downloadMessage]);
    const stream = file.stream();
    const reader = stream.getReader();
    reader
      .read()
      .then((obj: ReadableStreamReadResult<Uint8Array<ArrayBuffer>>) => {
        handleReading(obj.done, obj.value);
      });
    const handleReading = (done: Boolean, value: Uint8Array | undefined) => {
      if (done) {
        peerRef.current!.write(
          JSON.stringify({
            type: "download-done",
            user: userId,
          }),
        );
        return;
      }
      peerRef.current!.write(value);
      reader
        .read()
        .then((obj: ReadableStreamReadResult<Uint8Array<ArrayBuffer>>) => {
          handleReading(obj.done, obj.value);
        });
    };
  };

  const peerDisconnected = (): void => {
    navigateRef.current("/");
    peerRef.current!.destroy();
    peerRef.current = null;
    setMessages([]);
  };

  const disconnetPeer = (): void => {
    peerRef.current!.send(
      JSON.stringify({
        type: "peer-disconnected",
        user: userId,
      }),
    );
    peerRef.current!.destroy();
    peerRef.current = null;
    navigateRef.current("/");
    setMessages([]);
  };
  const downloadFile = (e: MessageEvent) => {
    const url = window.URL.createObjectURL(e.data.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = e.data.fileName;
    a.click();
  };

  React.useEffect(() => {
    socketRef.current = io("ws://localhost:3000/");
    socketRef.current.on("connected", (id: String) => {
      setUserId(id);
      socketRef.current?.on(`search-${id}`, initiateConnection);
      socketRef.current?.on(`initiate-connection-${id}`, acceptConnection);
      socketRef.current?.on(`connection-accepted-${id}`, finializeConnection);
    });
    worker.addEventListener("message", downloadFile);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Paper className="app" square>
        <SiteBar
          switchDarkMode={switchDarkMode}
          darkMode={darkMode}
          disconnetPeer={disconnetPeer}
        />
        <Routes>
          <Route
            path="/"
            element={
              <Home
                socket={socketRef.current}
                setPeerId={(id: String): void => {
                  peerIdRef.current = id;
                }}
                userId={userId}
              />
            }
          />
          <Route
            path="/session"
            element={
              <Session
                sendMessage={sendMessage}
                checkSession={checkSession}
                userId={userId}
                messages={messages}
                sendFile={sendFile}
              />
            }
          />
        </Routes>
      </Paper>
    </ThemeProvider>
  );
}

export default App;
