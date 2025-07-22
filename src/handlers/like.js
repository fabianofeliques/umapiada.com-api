import { isRateLimited, jsonResponse } from './util';

export async function like(request, env) {
	const url = new URL(request.url);

	const ip = request.headers.get("CF-Connecting-IP");
	if (await isRateLimited(ip, env)) {
		return jsonResponse({ message: "Too many requests"}, 429);
	}

	if (request.method === 'POST') {
		try {
			const { jokeId } = await request.json();
			const ip = request.headers.get("CF-Connecting-IP");

			if (!jokeId)
				return jsonResponse({ message: "Missing jokeId" }, 400);

			const count = parseInt(await env.LIKES.get(jokeId) || '0', 10);
			await env.LIKES.put(jokeId, (count + 1).toString());

			return jsonResponse({ message: 'Liked', count: count + 1 });
		} catch (err) {
			console.log(err)
			return jsonResponse({ message: "Something went wrong. Please try again later." }, 500);
		}
	}

	if (request.method === 'GET') {

		try {
			const jokeId = url.searchParams.get('jokeId');
			if (!jokeId) return jsonResponse({ message: "Missing jokeId" }, 400);

			const count = parseInt(await env.LIKES.get(jokeId) || '0', 10);

			return jsonResponse(count);
		} catch (err) {
			console.log(err)
			return jsonResponse({ message: "Something went wrong. Please try again later." }, 500);
		}
	}

	return jsonResponse({ message: "Method not allowed" }, 405);
}
