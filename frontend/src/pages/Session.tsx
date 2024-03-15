import React from "react";

export default function Session({
	sendMessage,
	checkSession,
}: {
	sendMessage: (message: String) => void;
	checkSession: () => void;
}): React.JSX.Element {
	const inputRef = React.useRef<HTMLInputElement | null>(null);

	React.useEffect(() => {
		checkSession();
	}, []);
	return (
		<div>
			<div></div>
			<input
				type="text"
				ref={inputRef}
			/>
			<button
				onClick={() => {
					sendMessage(inputRef.current!.value);
				}}
			>
				Submit
			</button>
		</div>
	);
}
