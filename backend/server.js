const { Server } = require("socket.io");
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const nanoid = customAlphabet(alphabet, 10);
const server = new Server({
	cors: {
		origin: "http://localhost:5173",
	},
});
server.on("connection", (socket) => {
	const socketId = nanoid();
	socket.emit("connected", socketId);

	socket.on("search-id", (id) => {
		socket.broadcast.emit(`search-${id}`, socketId);
	});

	socket.on("answer-search-id", ({ data, id }) => {
		socket.broadcast.emit(`initiate-connection-${id}`, data);
	});

	socket.on("accept-connection", ({ data, id }) => {
		socket.broadcast.emit(`connection-accepted-${id}`, data);
	});
});

server.listen(3000);
console.log("Server Running");
