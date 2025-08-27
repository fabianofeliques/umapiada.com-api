import { handleConfirm, handleSubscribe } from './handlers/subscribe';
import { rating } from './handlers/like';
import { handleJokes}  from './handlers/jokes';
import { handleLogin } from './handlers/login';
import { handleDuelJoke } from './handlers/duel_joke';
import { sendJokeOfTheDay } from './handlers/sendDailyJoke';
import { handleUnsubscribe } from './handlers/unsubscribe';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return handleOptions(request);
		}

		function handleOptions() {
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

		if (url.pathname === "/unsubscribe") {
			return handleUnsubscribe(request, env);
		}

		if (url.pathname === "/like" || url.pathname === "/dislike") {
			return rating(request, env);
		}

		if (url.pathname === "/confirm") {
			return handleConfirm(request, env);
		}

		if (url.pathname.startsWith("/jokes")) {
			return handleJokes(request, env);
		}

		if (url.pathname.startsWith("/login")) {
			return handleLogin(request, env);
		}

		if (url.pathname.startsWith("/duel")) {
			return handleDuelJoke(request, env);
		}

		if (url.pathname === "/send-daily-joke") {
			try {
				await sendJokeOfTheDay(env);
				return new Response("Joke of the Day sent successfully!", { status: 200 });
			} catch (err) {
				console.error(err);
				return new Response("Failed to send Joke of the Day", { status: 500 });
			}
		}

		return new Response("Not Found", { status: 404 });
	},
};
