export function jsonResponse(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
		}
	});
}

export async function isRateLimited(ip, env) {
	const key = `rate-limit:${ip}`;
	const ttl = 3600;

	let count = await env.RATE_LIMIT.get(key);
	count = parseInt(count || "0");

	if (count >= 10000) {
		return true;
	}

	await env.RATE_LIMIT.put(key, (count + 1).toString(), { expirationTtl: ttl });
	return false;
}
