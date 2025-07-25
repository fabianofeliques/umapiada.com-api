import { isRateLimited, jsonResponse } from '../util/util';
import { categoryKVMap } from '../util/categories';

export async function rating(request, env) {

	const url = new URL(request.url);
	const pathname = url.pathname.toLowerCase();
	const isLike = pathname.includes('/like');
	const actionType = isLike ? 'LIKE' : 'DISLIKE';
	const actionTypeFormatted = actionType.charAt(0) + actionType.slice(1).toLowerCase();

	if (request.method === 'POST') {
		const ip = request.headers.get('cf-connecting-ip');
		const isBlocked = await isRateLimited(ip, env);
		const { jokeId, category } = await request.json();
		const categoryKey = category.toLowerCase();
		const kvNamespace = categoryKVMap[categoryKey];

		if (isBlocked) {
			return jsonResponse({ message: 'Too many requests' }, 429);
		}

		try {
			if (!jokeId || !category)
				return jsonResponse({ message: 'Missing jokeId or category' }, 400);

			if (!kvNamespace || !env[kvNamespace]) {
				return jsonResponse({ message: `Unknown or invalid category: ${category}` }, 400);
			}

			const kv = env[kvNamespace];

			const key = `${actionType}:${jokeId}`;
			const count = parseInt(await kv.get(key) || '0', 10);
			await kv.put(key, (count + 1).toString());

			return jsonResponse({ message: `${actionTypeFormatted}d`, count: count + 1 });
		} catch (err) {
			console.error(err);
			return jsonResponse({ message: 'Something went wrong. Please try again later.' }, 500);
		}
	}

	if (request.method === 'GET') {
		try {
			const jokeId = url.searchParams.get('jokeId');
			const category = url.searchParams.get('category');
			const categoryKey = category.toLowerCase();
			const kvNamespace = categoryKVMap[categoryKey];

			if (!jokeId || !category) {
				console.log('missing jokeId or category');
				return jsonResponse({ message: 'Missing jokeId or category' }, 400);
			}

			const kv = env[kvNamespace];

			if (!kv) {
				return jsonResponse({ message: `Unknown category: ${category}` }, 400);
			}

			const key = `${actionType}:${jokeId}`;
			const count = parseInt(await kv.get(key) || '0', 10);

			return jsonResponse({ count });
		} catch (err) {
			console.error(err);
			return jsonResponse({ message: 'Something went wrong. Please try again later.' }, 500);
		}
	}

	return jsonResponse({ message: 'Method not allowed' }, 405);
}
