export async function dislike({ request, env }) {
	const url = new URL(request.url);

	if (request.method === 'POST') {
		const { jokeId } = await request.json();
		const ip = request.headers.get("CF-Connecting-IP");

		if (!jokeId) return new Response(JSON.stringify({ message: 'Missing jokeId' }), { status: 400 });

		const voteKey = `voted:${ip}:${jokeId}`;
		const alreadyVoted = await env.LIKES.get(voteKey);
		if (alreadyVoted === 'disliked') {
			return new Response(JSON.stringify({ message: 'Already disliked' }), { status: 400 });
		}

		const key = `dislikes:${jokeId}`;
		const count = parseInt(await env.LIKES.get(key) || '0', 10);
		await env.LIKES.put(key, (count + 1).toString());
		await env.LIKES.put(voteKey, 'disliked', { expirationTtl: 86400 });

		return new Response(JSON.stringify({ message: 'Disliked', count: count + 1 }), {
			headers: { 'Content-Type': 'application/json',
				"Access-Control-Allow-Origin": "*"  },
		});
	}

	if (request.method === 'GET') {
		const jokeId = url.searchParams.get('jokeId');
		if (!jokeId) return new Response(JSON.stringify({ message: 'Missing jokeId' }), { status: 400 });

		const key = `dislikes:${jokeId}`;
		const count = parseInt(await env.LIKES.get(key) || '0', 10);

		return new Response(JSON.stringify({ count }), {
			headers: { 'Content-Type': 'application/json' ,
				"Access-Control-Allow-Origin": "*" },
		});
	}

	return new Response('Method not allowed', { status: 405 });
}
