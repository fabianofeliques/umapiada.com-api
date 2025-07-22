import { jsonResponse } from './responseUtil';

export async function dislike({ request, env }) {
	const url = new URL(request.url);

	console.log("url pathname " + url.pathname);
	console.log("request " + request);

	if (request.method === 'POST') {
		try {
			const { jokeId } = await request.json();
			const ip = request.headers.get("CF-Connecting-IP");

			if (!jokeId)
				return jsonResponse({ message: "Missing jokeId" }, 400);

			const voteKey = `voted:${ip}:${jokeId}`;
			const alreadyVoted = await env.LIKES.get(voteKey);
			if (alreadyVoted === 'disliked') {
				return jsonResponse({ message: "Already disliked" }, 400);
			}

			const key = `dislikes:${jokeId}`;
			const count = parseInt(await env.LIKES.get(key) || '0', 10);
			await env.LIKES.put(key, (count + 1).toString());
			await env.LIKES.put(voteKey, 'disliked', { expirationTtl: 86400 });

			return jsonResponse({ message: 'Disliked', count: count + 1 });
		} catch (err) {
			console.log(err)
			return jsonResponse({ message: "Something went wrong. Please try again later." }, 500);
		}
	}

	if (request.method === 'GET') {

		try {
			const jokeId = url.searchParams.get('jokeId');
			if (!jokeId) return jsonResponse({ message: 'Missing jokeId' }, 400);


			const key = `dislikes:${jokeId}`;
			const count = parseInt(await env.LIKES.get(key) || '0', 10);

			return jsonResponse(count);
		} catch (err) {
			console.log(err)
		}
			return jsonResponse({ message: "Something went wrong. Please try again later." }, 500);
		}

	return jsonResponse({ message: "Method not allowed" }, 405);
}
