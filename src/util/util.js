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

export function generateMeta({ title, text }) {
	const safeTitle = title?.trim() || "";
	const safeText = text?.trim() || "";

	// Grab the first sentence from the text
	const firstSentence = safeText.split(/(?<=[.?!])\s+/)[0] || safeText;

	let metaTitle = safeTitle;

	// If title is missing, too short, or prefix of the text → use first sentence instead
	if (
		!metaTitle ||
		metaTitle.length < 10 ||
		(safeText.toLowerCase().startsWith(metaTitle.toLowerCase()))
	) {
		metaTitle = firstSentence;
	}

	// Meta description: whole text if short, otherwise cut to ~25 words
	let metaDescription = "";
	if (safeText) {
		const words = safeText.split(/\s+/);
		if (words.length <= 25) {
			metaDescription = safeText;
		} else {
			metaDescription = words.slice(0, 25).join(" ") + "...";
		}
	}

	// SEO-friendly length trimming
	if (metaTitle.length > 60) metaTitle = metaTitle.slice(0, 57) + "...";
	if (metaDescription.length > 160) metaDescription = metaDescription.slice(0, 157) + "...";

	return { metaTitle, metaDescription };
}
