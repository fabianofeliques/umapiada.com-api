import { isRateLimited, jsonResponse } from './util';

export async function dislike(request, env) {
	const url = new URL(request.url);

	if (request.method === 'POST') {

		const ip = request.headers.get("cf-connecting-ip");
		const isBlocked = await isRateLimited(ip, env);

		if (isBlocked) {
			return jsonResponse({ message: "Too many requests" }, 429);
		}

		try {
			const { jokeId, category } = await request.json();

			if (!jokeId || !category)
				return jsonResponse({ message: "Missing jokeId or category" }, 400);

			const key = `${category}:${jokeId}`;
			const count = parseInt(await env.LIKES.get(key) || '0', 10);
			await env.DISLIKES.put(key, (count + 1).toString());

			return jsonResponse({ message: 'Disliked', count: count + 1 });
		} catch (err) {
			return jsonResponse({ message: "Something went wrong. Please try again later." }, 500);
		}
	}

	if (request.method === 'GET') {

		try {
			const { jokeId, category } = await request.json();

			if (!jokeId || !category)
				return jsonResponse({ message: "Missing jokeId or category" }, 400);

			const key = `${category}:${jokeId}`;
			const count = parseInt(await env.LIKES.get(key) || '0', 10);
			await env.DISLIKES.put(key, (count + 1).toString());

			return jsonResponse({ count });
		} catch (err) {
			return jsonResponse({ message: "Something went wrong. Please try again later." }, 500);
		}
	}

	return jsonResponse({ message: "Method not allowed" }, 405);
}
