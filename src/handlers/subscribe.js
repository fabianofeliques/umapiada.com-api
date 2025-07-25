import { isRateLimited, jsonResponse } from '../util/util';


export async function handleSubscribe(request, env) {

	const ip = request.headers.get("cf-connecting-ip");
	const isBlocked = await isRateLimited(ip, env);

	if (isBlocked) {
		return jsonResponse( {message: "Too many requests" },  429 );
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
