export async function like({ request, env }) {
	const url = new URL(request.url);

	if (request.method === 'POST') {
		const { jokeId } = await request.json();
		const ip = request.headers.get("CF-Connecting-IP");

		if (!jokeId) return new Response(JSON.stringify({ message: 'Missing jokeId' }), { status: 400 });

		const voteKey = `voted:${ip}:${jokeId}`;
		const alreadyVoted = await env.LIKES.get(voteKey);
		if (alreadyVoted === 'liked') {
			return new Response(JSON.stringify({ message: 'Already liked' }), { status: 400 });
		}

		const key = `likes:${jokeId}`;
		const count = parseInt(await env.LIKES.get(key) || '0', 10);
		await env.LIKES.put(key, (count + 1).toString());
		await env.LIKES.put(voteKey, 'liked', { expirationTtl: 86400 }); // expire in 1 day

		return new Response(JSON.stringify({ message: 'Liked', count: count + 1 }), {
			headers: { 'Content-Type': 'application/json',
				"Access-Control-Allow-Origin": "*" },
		});
	}

	if (request.method === 'GET') {
		const jokeId = url.searchParams.get('jokeId');
		if (!jokeId) return new Response(JSON.stringify({ message: 'Missing jokeId' }), { status: 400 });

		const key = `likes:${jokeId}`;
		const count = parseInt(await env.LIKES.get(key) || '0', 10);

		return new Response(JSON.stringify({ count }), {
			headers: { 'Content-Type': 'application/json',
				"Access-Control-Allow-Origin": "*" },
		});
	}

	return new Response('Method not allowed', { status: 405 });
}
