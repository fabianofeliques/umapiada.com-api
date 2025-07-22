export function jsonResponse(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
		}
	});
}

export async function isRateLimited(ip) {
	const cacheKey = new Request(`https://rate-limit.local/${ip}`);
	const cache = caches.default;

	let response = await cache.match(cacheKey);

	let count = 0;
	if (response) {
		const data = await response.json();
		count = data.count;
	}

	if (count >= 10) return true;

	await cache.put(
		cacheKey,
		new Response(JSON.stringify({ count: count + 1 }), {
			headers: { 'Content-Type': 'application/json' },
		}),
		{ expirationTtl: 3600 } // expire in 1 hour
	);

	return false;
}
