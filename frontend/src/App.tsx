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
type Download = {
  worker?: Worker;
  messageIndex: number;
  downloadMessage: string;
  totalFileSize: number;
  currentFileSize: number;
  status: string;
};
type Chunk = {
  data: Object;
  messageIndex: number;
};

function App() {
  const socketRef = React.useRef<Socket | null>(null);
  const peerIdRef = React.useRef<String>("");
  const peerRef = React.useRef<Peer.Instance | null>(null);
  const navigateRef = React.useRef<NavigateFunction>(useNavigate());
  const [userId, setUserId] = React.useState<String>("");
  const [darkMode, setDarkMode] = React.useState<Boolean>(false);
  const [messages, setMessages] = React.useState<Array<Message>>([]);
  const downloadsRef = React.useRef<Array<Download>>([]);
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

  const calculateFileSize = (size: number) => {
    if (size >= 1073741824) return `${Math.round(size / 1073741824)}GiB`;
    if (size >= 1048576) return `${Math.round(size / 1048576)}MiB`;
    if (size >= 1024) return `${Math.round(size / 1024)}KiB`;
    return `${size}B`;
  };

  const calculateProgress = (currentSize: number, totalSize: number) => {
    return Math.floor((currentSize / totalSize) * 100);
  };

  const cancelDownload = (messageIndex: number) => {
    const downloadIndex = downloadsRef.current.findIndex(
      (download) => download.messageIndex === messageIndex,
    );
    const canceledDownloadMessage = `${downloadsRef.current[downloadIndex].downloadMessage} - Canceled`;
    const cancelMessage = JSON.stringify({
      type: "cancel-download",
      content: messageIndex,
      user: userId,
    });
    peerRef.current!.send(cancelMessage);
    setMessages((messages) =>
      messages.map((message, i) => {
        return i === messageIndex
          ? {
              ...message,
              type: "cancel-message",
              content: canceledDownloadMessage,
            }
          : message;
      }),
    );
    downloadsRef.current = downloadsRef.current.map((download, i) =>
      i === downloadIndex ? { ...download, status: "canceled" } : download,
    );
    downloadsRef.current[downloadIndex].worker?.postMessage("cancel");
  };

  const downloadCanceled = (messageIndex: number) => {
    const downloadIndex = downloadsRef.current.findIndex(
      (download) => download.messageIndex === messageIndex,
    );
    const canceledDownloadMessage = `${downloadsRef.current[downloadIndex].downloadMessage} - Canceled`;
    setMessages((messages) =>
      messages.map((message, i) => {
        return i === messageIndex
          ? {
              ...message,
              type: "cancel-message",
              content: canceledDownloadMessage,
            }
          : message;
      }),
    );
    downloadsRef.current = downloadsRef.current.map((download, i) =>
      i === downloadIndex ? { ...download, status: "canceled" } : download,
    );
    downloadsRef.current[downloadIndex].worker?.postMessage("cancel");
  };

  const configurePeer = (peer: Peer.Instance): Peer.Instance => {
    peer.on("connect", () => {
      navigateRef.current("/session");
    });
    peer.on(
      "data",
      (data: String | ArrayBuffer | Buffer | Blob | Chunk): void => {
        try {
          const parsedData: Message = JSON.parse(data.toString());
          let downloadIndex: number;
          let messageIndex: number;
          switch (parsedData.type) {
            case "text":
              setMessages((messages) => [...messages, parsedData]);
              break;
            case "transfer-message":
              setMessages((messages) => {
                return [...messages, parsedData];
              });
              break;
            case "peer-disconnected":
              peerDisconnected();
              break;
            case "download-done":
              messageIndex = Number(parsedData.content);
              downloadIndex = downloadsRef.current.findIndex(
                (download) => download.messageIndex === messageIndex,
              );
              downloadsRef.current[downloadIndex].worker!.postMessage(
                "download",
              );
              setMessages((messages) =>
                messages.map((message, i) => {
                  return i === messageIndex &&
                    message.type === "transfer-message"
                    ? {
                        ...message,
                        type: "done-message",
                        content: `${downloadsRef.current[downloadIndex].downloadMessage} - Done`,
                      }
                    : message;
                }),
              );
              break;
            case "download-metadata":
              const content = parsedData.content as FileMetadata;
              const calculatedFileSize = calculateFileSize(
                Number(content.fileSize),
              );
              const worker = new Worker("../public/worker.js");
              worker.addEventListener("message", downloadFile);
              setMessages((messages) => {
                const downloadObj: Download = {
                  worker,
                  messageIndex: messages.length,
                  downloadMessage: `${content.fileName} ${calculatedFileSize}`,
                  totalFileSize: Number(content.fileSize),
                  currentFileSize: 0,
                  status: "ongoing",
                };
                downloadsRef.current = [...downloadsRef.current, downloadObj];
                return messages;
              });
              worker.postMessage({
                type: "metadata",
                fileName: content.fileName,
                fileSize: calculatedFileSize,
              });
              break;
            case "cancel-download":
              messageIndex = Number(parsedData.content);
              downloadCanceled(messageIndex);
          }
        } catch {
          const rawBytesArray = data as Uint8Array;
          const messageIndex = rawBytesArray[0];
          const bytesArray = rawBytesArray.subarray(1);
          const downloadIndex = downloadsRef.current.findIndex(
            (download) => download.messageIndex === messageIndex,
          );
          if (downloadsRef.current[downloadIndex].status === "ongoing") {
            console.log(downloadIndex, messageIndex);
            const currentSize =
              bytesArray.buffer.byteLength +
              downloadsRef.current[downloadIndex].currentFileSize;
            const currentProgress = calculateProgress(
              currentSize,
              downloadsRef.current[downloadIndex].totalFileSize,
            );
            setMessages((messages) => {
              return messages.map((message, i) => {
                console.log(i === messageIndex);
                return i === messageIndex && message.type === "transfer-message"
                  ? {
                      ...message,
                      content: `${downloadsRef.current[downloadIndex].downloadMessage} - ${currentProgress}%`,
                    }
                  : message;
              });
            });
            downloadsRef.current = downloadsRef.current.map((download) =>
              download.messageIndex === messageIndex
                ? { ...download, currentFileSize: currentSize }
                : download,
            );
            downloadsRef.current[downloadIndex].worker!.postMessage(bytesArray);
          }
        }
      },
    );
    return peer;
  };

  const initiateConnection = (id: String): void => {
    peerIdRef.current = id;
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
    const messageIndex = messages.length;
    const downloadIndex = downloadsRef.current.length;
    const calculatedFileSize = calculateFileSize(file.size);
    const downloadMessageContent = `${file.name} ${calculatedFileSize}`;
    const downloadObj: Download = {
      messageIndex,
      downloadMessage: downloadMessageContent,
      currentFileSize: 0,
      totalFileSize: file.size,
      status: "ongoing",
    };
    downloadsRef.current = [...downloadsRef.current, downloadObj];
    peerRef.current!.write(
      JSON.stringify({
        type: "download-metadata",
        content: {
          fileSize: file.size,
          fileName: file.name,
        },
        user: userId,
      }),
    );
    const downloadMessage = {
      type: "transfer-message",
      content: downloadMessageContent,
      user: userId,
    };
    peerRef.current!.write(JSON.stringify(downloadMessage));
    setMessages((messages) => {
      return [...messages, downloadMessage];
    });
    const stream = file.stream();
    const reader = stream.getReader();
    reader
      .read()
      .then((obj: ReadableStreamReadResult<Uint8Array<ArrayBuffer>>) => {
        handleReading(obj.done, obj.value);
      });
    const handleReading = (done: Boolean, value: Uint8Array | undefined) => {
      if (done) {
        setMessages((messages) =>
          messages.map((message, i) => {
            return i === messageIndex && message.type === "transfer-message"
              ? {
                  ...message,
                  type: "done-message",
                  content: `${downloadMessageContent} - Done`,
                }
              : message;
          }),
        );
        peerRef.current?.write(
          JSON.stringify({
            type: "download-done",
            content: messageIndex,
            user: userId,
          }),
        );
        return;
      }
      if (
        peerRef.current &&
        downloadsRef.current[downloadIndex].status === "ongoing"
      ) {
        const downloadIndex = downloadsRef.current.findIndex(
          (download) => download.messageIndex === messageIndex,
        );
        const currentProgress = calculateProgress(
          downloadsRef.current[downloadIndex].currentFileSize +
            value!.buffer.byteLength,
          downloadsRef.current[downloadIndex].totalFileSize,
        );
        setMessages((messages) => {
          return messages.map((message, i) =>
            i === messageIndex && message.type === "transfer-message"
              ? {
                  ...message,
                  content: `${downloadMessageContent} - ${currentProgress}%`,
                }
              : message,
          );
        });
        downloadsRef.current = downloadsRef.current.map((download) =>
          download.messageIndex === messageIndex
            ? {
                ...download,
                currentFileSize:
                  download.currentFileSize + value!.buffer.byteLength,
              }
            : download,
        );
        const packet = new Uint8Array(1 + value!.length);
        packet[0] = messageIndex;
        if (value) {
          packet.set(value, 1);
        }
        peerRef.current?.write(packet);
        reader
          .read()
          .then((obj: ReadableStreamReadResult<Uint8Array<ArrayBuffer>>) => {
            handleReading(obj.done, obj.value);
          });
      }
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
    socketRef.current = io("wss://api.quickchat.rokux9.com/");
    socketRef.current.on("connected", (id: String) => {
      setUserId(id);
      socketRef.current?.on(`search-${id}`, initiateConnection);
      socketRef.current?.on(`initiate-connection-${id}`, acceptConnection);
      socketRef.current?.on(`connection-accepted-${id}`, finializeConnection);
    });
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
                cancelDownload={cancelDownload}
              />
            }
          />
        </Routes>
      </Paper>
    </ThemeProvider>
  );
}

export default App;
