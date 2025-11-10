export async function handleDuelJoke(request, env, ctx) {
	const url = new URL(request.url);

	if (url.pathname === "/duel/today" && request.method === "GET") {
		const today = new Date().toISOString().split('T')[0];

		const duel = await env.JOKES_DB.prepare(`
			SELECT d.id    AS duel_id,
						 d.duel_date,
						 d.votes_joke1,
						 d.votes_joke2,
						 j1.id   AS joke1_id,
						 j1.text AS joke1_text,
						 j2.id   AS joke2_id,
						 j2.text AS joke2_text
			FROM joke_duels_br d
						 JOIN jokes_br j1 ON d.joke1_id = j1.id
						 JOIN jokes_br j2 ON d.joke2_id = j2.id
			WHERE d.duel_date = ?
		`).bind(today).first();

		return new Response(JSON.stringify(duel || {}), {
			headers: { "content-type": "application/json" }
		});
	}

	if (url.pathname === "/duel/yesterday_winner" && request.method === "GET") {
		// Get yesterday's date in yyyy-mm-dd format
		const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

		const duel = await env.JOKES_DB.prepare(`
			SELECT d.id    AS duel_id,
						 d.duel_date,
						 d.votes_joke1,
						 d.votes_joke2,
						 d.winner_id,
						 j1.id   AS joke1_id,
						 j1.text AS joke1_text,
						 j2.id   AS joke2_id,
						 j2.text AS joke2_text,
						 w.id    AS winner_joke_id,
						 w.text  AS winner_joke_text
			FROM joke_duels_br d
						 JOIN jokes_br j1 ON d.joke1_id = j1.id
						 JOIN jokes_br j2 ON d.joke2_id = j2.id
						 JOIN jokes_br w ON d.winner_id = w.id
			WHERE d.duel_date = ?
				AND d.winner_id IS NOT NULL
		`).bind(yesterday).first();

		return new Response(JSON.stringify(duel || {}), {
			headers: { "content-type": "application/json" }
		});
	}


	if (url.pathname === "/duel/vote" && request.method === "POST") {
		const { duelId, isJoke1 } = await request.json();
		const column = isJoke1 ? "votes_joke1" : "votes_joke2";

		await env.JOKES_DB.prepare(
			`UPDATE joke_duels_br
			 SET ${column} = ${column} + 1
			 WHERE id = ?`
		).bind(duelId).run();

		return new Response(JSON.stringify({ success: true }), {
			headers: { "content-type": "application/json" }
		});
	}

	return new Response("Not Found", { status: 404 });
}
