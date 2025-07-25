import { isRateLimited, jsonResponse } from '../util/util';
import { categoryKVMap } from '../util/categories';

export async function rating(request, env) {

	const url = new URL(request.url);
	const pathname = url.pathname.toLowerCase();
	const isLike = pathname.includes('/like');
	const actionType = isLike ? 'LIKE' : 'DISLIKE';
	const categoryKey = category.toLowerCase();
	const kvNamespace = categoryKVMap[categoryKey];

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

			if (!kvNamespace || !env[kvNamespace]) {
				return jsonResponse({ message: `Unknown or invalid category: ${category}` }, 400);
			}

			const kv = env[kvNamespace];

			const key = `${actionType}:${jokeId}`;
			const count = parseInt(await kv.get(key) || '0', 10);
			await kv.put(key, (count + 1).toString());

			return jsonResponse({ message: `${actionType}d`, count: count + 1 });
		} catch (err) {
			console.error(err);
			return jsonResponse({ message: "Something went wrong. Please try again later." }, 500);
		}
	}

	if (request.method === 'GET') {
		try {
			const jokeId = url.searchParams.get('jokeId');
			const category = url.searchParams.get('category');

			if (!jokeId || !category)
				return jsonResponse({ message: "Missing jokeId or category" }, 400);

			const kv = env[category];
			if (!kv)
				return jsonResponse({ message: `Unknown category: ${category}` }, 400);

			const key = `${actionType}:${jokeId}`;
			const count = parseInt(await kv.get(key) || '0', 10);

			return jsonResponse({ count });
		} catch (err) {
			console.error(err);
			return jsonResponse({ message: "Something went wrong. Please try again later." }, 500);
		}
	}

	return jsonResponse({ message: "Method not allowed" }, 405);
}
