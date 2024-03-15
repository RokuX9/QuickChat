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
				height: 1,
				width: "-webkit-fill-available",
				margin: "10px",
				alignItems: "center",
				justifyContent: "space-around",
			}}
		>
			<Typography variant="h1">QuickChat</Typography>
			<Typography variant="h2">{userId}</Typography>
			<div>
				<Input
					inputRef={inputRef}
					type="text"
					placeholder="Search Remote ID"
					onChange={(e) => {
						setPeerId(e.target.value);
					}}
				/>
				<Button
					onClick={() => {
						if (inputRef.current) {
							socket?.emit("search-id", inputRef.current.value);
						}
					}}
				>
					Search Id
				</Button>
			</div>
		</Paper>
	);
}
