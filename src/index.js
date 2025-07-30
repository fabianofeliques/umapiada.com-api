import { handleConfirm, handleSubscribe } from './handlers/subscribe';
import { handleSendJoke } from "./handlers/sendDailyJoke";
import { rating } from './handlers/like';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return handleOptions(request);
		}

		function handleOptions(request) {
			const headers = {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			};
			return new Response(null, { status: 204, headers });
		}

		if (url.pathname === "/subscribe") {
			return handleSubscribe(request, env);
		}

		if (request.method === "POST" && url.pathname === "/send-joke") {
			return handleSendJoke(request, env);
		}

		if (url.pathname === "/like" || url.pathname === "/dislike") {
			return rating(request, env);
		}

		if (url.pathname === "/confirm") {
			return handleConfirm(request, env);
		}

		return new Response("Not Found", { status: 404 });
	},
};
