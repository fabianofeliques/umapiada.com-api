async function isRateLimited(ip, env) {
	const key = `rate-limit:${ip}`;
	const count = await env.SUBSCRIBERS.get(key);
	if (count && parseInt(count) >= 10) return true;
	await env.SUBSCRIBERS.put(key, `${(parseInt(count) || 0) + 1}`, {
		expirationTtl: 3600,
	});
	return false;
}

export async function handleSubscribe(request, env) {

	const ip = request.headers.get("CF-Connecting-IP");
	if (await isRateLimited(ip, env)) {
		return new Response(JSON.stringify({ message: "Too many requests" }), {
			status: 429,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
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

		const existing = await env.SUBSCRIBERS.get(email);
		if (existing) {
			return new Response(JSON.stringify({ message: "Already subscribed!" }), {
				status: 400,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			});
		}

		await env.SUBSCRIBERS.put(email, JSON.stringify({ subscribedAt: Date.now() }));

		return new Response(JSON.stringify({ message: "You're now subscribed!" }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (err) {
		return new Response(JSON.stringify({ message: "Something went wrong. Please try again later." }), {
			status: 500,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	}
}
