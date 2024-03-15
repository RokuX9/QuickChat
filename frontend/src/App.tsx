import "./App.css";
import React from "react";
import { Socket, io } from "socket.io-client";
import { Routes, Route, useNavigate, NavigateFunction } from "react-router-dom";
import Peer, { SignalData } from "simple-peer";
import {
	Paper,
	AppBar,
	Toolbar,
	Typography,
	Switch,
	ThemeProvider,
	createTheme,
} from "@mui/material";

import SiteBar from "./components/siteBar/SiteBar";
import Home from "./pages/Home";
import Session from "./pages/Session";

function App() {
	const socketRef = React.useRef<Socket | null>(null);
	const peerIdRef = React.useRef<String | null>(null);
	const peerRef = React.useRef<Peer.Instance | null>(null);
	const navigateRef = React.useRef<NavigateFunction>(useNavigate());
	const [userId, setUserId] = React.useState<String | null>(null);
	const [messages, setMessages] = React.useState<Array<String>>([]);
	const [darkMode, setDarkMode] = React.useState<Boolean>(false);

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
			console.log("connected");
			navigateRef.current("/session");
		});
		peer.on("data", (data: String | ArrayBuffer | Buffer | Blob) => {
			console.log("Data Recieved: ", data.toString());
		});
		return peer;
	};

	const initiateConnection = (id: String): void => {
		console.log("create peer");
		const newPeer = new Peer({ initiator: true });
		newPeer.on("signal", (data) => {
			socketRef.current?.emit(`answer-search-id`, { data, id });
		});
		peerRef.current = configurePeer(newPeer);
	};

	const acceptConnection = (signalData: SignalData) => {
		if (peerRef.current === null) {
			const newPeer = new Peer();
			console.log("create peer");
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
		const messageObject = { type: "text", content: message };
		console.log(peerRef.current);
		peerRef.current?.send(JSON.stringify(messageObject));
	};

	React.useEffect(() => {
		socketRef.current = io("ws://localhost:3000/");
		socketRef.current.on("connected", (id: String) => {
			socketRef.current?.on(`search-${id}`, initiateConnection);
			socketRef.current?.on(`initiate-connection-${id}`, acceptConnection);
			socketRef.current?.on(`connection-accepted-${id}`, finializeConnection);
			setUserId(id);
		});
	}, []);
	return (
		<ThemeProvider theme={theme}>
			<Paper
				className="app"
				square
			>
				<SiteBar
					switchDarkMode={switchDarkMode}
					darkMode={darkMode}
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
							/>
						}
					/>
				</Routes>
			</Paper>
		</ThemeProvider>
	);
}

export default App;
