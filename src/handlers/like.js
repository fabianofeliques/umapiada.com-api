import { isRateLimited, jsonResponse } from '../util/util';

export async function rating(request, env) {

	const url = new URL(request.url);
	const pathname = url.pathname.toLowerCase();
	const isLike = pathname.includes('/like');
	const actionType = isLike ? 'LIKE' : 'DISLIKE';
	const actionTypeFormatted = actionType.charAt(0) + actionType.slice(1).toLowerCase();
	const timestamp = new Date().toISOString();

	if (request.method === 'POST') {
		const ip = request.headers.get('cf-connecting-ip');
		const isBlocked = await isRateLimited(ip, env);
		const { jokeId, category } = await request.json();

		if (isBlocked) {
			return jsonResponse({ message: 'Muitas requisições em curto tempo' }, 429);
		}

		try {
			if (!jokeId || !category)
				return jsonResponse({ message: 'Categoria ou ID inválidos' }, 400);

			const key = `${category}:${actionType}:${jokeId}`;
			const count = parseInt(await env.JOKE_RATING_BR.get(key) || '0', 10);
			await env.JOKE_RATING_BR.put(key, (count + 1).toString());

			console.log(JSON.stringify({
				timestamp,
				action: actionType,
				jokeId,
				category,
				ip,
				newCount: count + 1
			}));

			return jsonResponse({ message: `${actionTypeFormatted}d`, count: count + 1 });
		} catch (err) {
			console.error(`[${timestamp}] [ERROR] ${err.message}`, err);
			return jsonResponse({ message: 'Algo deu errado. Por favor tente novamente mais tarde.' }, 500);
		}
	}

	if (request.method === 'GET') {
		try {
			const jokeId = url.searchParams.get('jokeId');
			const category = url.searchParams.get('category');

			if (!jokeId || !category) {
				return jsonResponse({ message: 'Categoria ou ID inválidos' }, 400);
			}

			const key = `${category}:${actionType}:${jokeId}`;
			const count = parseInt(await env.JOKE_RATING_BR.get(key) || '0', 10);

			return jsonResponse({ count });
		} catch (err) {
			console.error(`[${timestamp}] [ERROR] ${err.message}`, err);
			return jsonResponse({ message: 'Algo deu errado. Por favor tente novamente mais tarde.' }, 500);
		}
	}

	return jsonResponse({ message: 'Method not allowed' }, 405);
}
