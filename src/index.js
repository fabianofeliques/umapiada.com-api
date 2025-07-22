export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		// Handle CORS preflight request
		if (request.method === "OPTIONS") {
			return handleOptions(request);
		}

		if (request.method === "POST" && url.pathname === "/subscribe") {
			return handleSubscribe(request, env);
		}

		return new Response("Not Found", { status: 404 });
	}
};

// CORS handler
function handleOptions(request) {
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	return new Response(null, {
		status: 204,
		headers,
	});
}

async function isRateLimited(ip, env) {
	const key = `rate-limit:${ip}`;
	const count = await env.SUBSCRIBERS.get(key);
	if (count && parseInt(count) >= 10) return true; // max 10 per hour

	// Increase the count
	await env.SUBSCRIBERS.put(key, `${(parseInt(count) || 0) + 1}`, {
		expirationTtl: 3600 // 1 hour
	});
	return false;
}


async function handleSubscribe(request, env) {

	const ip = request.headers.get("CF-Connecting-IP");
	if (await isRateLimited(ip, env)) {
		return new Response(JSON.stringify({ message: "Too many requests" }), {
			status: 429,
			headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
		});
	}

	try {
		const { email } = await request.json();

		if (!email || !email.includes("@")) {
			return new Response(JSON.stringify({ message: "Invalid email." }), {
				status: 400,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			});
		}

		await env.SUBSCRIBERS.put(email, JSON.stringify({ subscribedAt: Date.now() }));

		return new Response(JSON.stringify({ message: "You're subscribed!" }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (err) {
		return new Response(JSON.stringify({ message: "Internal error." }), {
			status: 500,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	}
}
