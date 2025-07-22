import { jsonResponse } from './responseUtil';

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
		return jsonResponse({ message: "Too many requests"}, 429);
	}

	try {
		const { email } = await request.json();

		if (!email || !email.includes("@")) {
			return jsonResponse({ message: "Invalid email address" }, 400);
		}

		const existing = await env.SUBSCRIBERS.get(email);

		if (existing) {
			return jsonResponse({ message: "Already subscribed" }, 400);
		}

		await env.SUBSCRIBERS.put(email, JSON.stringify({ subscribedAt: Date.now() }));

		return jsonResponse({message: "You are now subscribed!"});
	} catch (err) {
		return jsonResponse({ message: "Something went wrong. Please try again later." }, 500);
	}
}
